import { create } from 'zustand';
import { grade, tryParse, equivalent, stripPlusC, type GradeResult } from '@calcflow/engine';
import { draw, rebuild, type Problem } from '@calcflow/generators';
import {
  DEFAULT_SETTINGS,
  MAX_LEVEL,
  levelSpec,
  type Attempt,
  type Confidence,
  type ErrorClass,
  type SessionMode,
  type Settings,
} from '@calcflow/shared';
import { ulid } from '@/lib/ulid';
import {
  clearStoredSession,
  deleteAttempts,
  loadAttempts,
  loadSettings,
  loadStoredSession,
  putAttempts,
  saveAttempt,
  saveSettings,
  saveStoredSession,
  queuedCount,
  queuedIds,
  type StoredSession,
} from './db';
import { sampleAttempts } from './sample';
import { computeStats, slowChapters, weakChapters, type Stats } from './stats';

export type Screen = 'home' | 'practice' | 'summary' | 'stats' | 'settings' | 'rules';

export const SCREEN_PATH: Record<Screen, string> = {
  home: '/',
  practice: '/practice',
  summary: '/summary',
  stats: '/stats',
  settings: '/settings',
  rules: '/rules',
};

/**
 * The router owns the URL; the store only asks for a move. Bound once by the
 * shell so `go('stats')` and the device back button end up in the same history.
 */
let navigateFn: ((to: string, opts?: { replace?: boolean }) => void) | null = null;

export function bindNavigate(fn: typeof navigateFn): void {
  navigateFn = fn;
}

export interface SessionItem {
  problem: Problem;
  correct: boolean;
  errorClass: ErrorClass | null;
  confidence: Confidence;
  durationMs: number;
  hintMaxRung: number;
}

export interface Outcome {
  correct: boolean;
  errorClass: ErrorClass | null;
  /** Per answer field, in order. */
  fields: GradeResult[];
}

export interface Session {
  mode: SessionMode;
  /** null in endless mode. */
  target: number | null;
  chapters: number[];
  /** 1–9; steps and difficulty are derived from it. */
  level: number;
  only?: string[];
  done: SessionItem[];
  problem: Problem;
  startedAt: number;
  /** One raw answer per field. */
  answers: string[];
  activeField: number;
  confidence: Confidence | null;
  hintsOpen: boolean;
  /** Rungs revealed so far, 0–4. */
  rung: number;
  outcome: Outcome | null;
  onTrack: 'yes' | 'no' | null;
}

interface Store {
  ready: boolean;
  settings: Settings;
  attempts: Attempt[];
  stats: Stats;
  session: Session | null;
  canvasFullscreen: boolean;
  toast: string | null;
  /** Bumped per toast, so two identical messages are still two toasts. */
  toastId: number;
  /** Set when a rule card is open over everything else. */
  openRule: string | null;
  /** Attempts written here but not yet accepted by the server. */
  queued: number;

  init(): Promise<void>;
  go(screen: Screen): void;
  showToast(message: string): void;
  dismissToast(): void;
  patchSettings(patch: Partial<Settings>): void;
  toggleChapter(n: number): void;
  replaceAttempts(attempts: Attempt[]): Promise<void>;
  /** Fills the stats screen with a believable history, for judging the design. */
  loadSample(): Promise<void>;
  /** Throws away everything the server has not seen yet, and only that. */
  clearUnsynced(): Promise<void>;
  refreshQueued(): Promise<void>;
  syncNow(): void;

  startSession(mode: SessionMode, opts?: { only?: string[]; chapters?: number[] }): void;
  endSession(): void;

  setAnswer(value: string): void;
  clearAnswer(): void;
  setActiveField(index: number): void;
  setConfidence(c: Confidence): void;

  setHintsOpen(open: boolean): void;
  revealRung(max: number): void;
  checkOnTrack(latex: string): void;
  setOpenRule(id: string | null): void;

  submit(): void;
  next(): void;
  setCanvasFullscreen(on: boolean): void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useStore = create<Store>((set, get) => ({
  ready: false,
  settings: DEFAULT_SETTINGS,
  attempts: [],
  stats: computeStats([]),
  session: null,
  canvasFullscreen: false,
  toast: null,
  toastId: 0,
  openRule: null,
  queued: 0,

  async init() {
    let settings = DEFAULT_SETTINGS;
    let attempts: Attempt[] = [];
    let session: Session | null = null;
    try {
      const [loadedSettings, loadedAttempts, stored] = await Promise.all([
        loadSettings(),
        loadAttempts(),
        loadStoredSession(),
      ]);
      settings = loadedSettings;
      attempts = loadedAttempts;
      session = stored ? reviveSession(stored) : null;
    } catch (err) {
      // A store that will not open — private mode, a corrupted database — must
      // still leave a usable app rather than a splash screen that never ends.
      console.error('CalcFlow: starting with an empty local store', err);
    }
    set({ settings, attempts, stats: computeStats(attempts), session, ready: true });
    void get().refreshQueued();

    // Coming back after Android reclaimed the tab should land where he left off,
    // mid-problem, rather than on the home screen with the working lost.
    if (session && window.location.pathname === SCREEN_PATH.home) {
      navigateFn?.(SCREEN_PATH.practice, { replace: true });
    }
  },

  go(screen) {
    set({ canvasFullscreen: false });
    navigateFn?.(SCREEN_PATH[screen]);
  },

  showToast(message) {
    clearTimeout(toastTimer);
    set({ toast: message, toastId: get().toastId + 1 });
    toastTimer = setTimeout(() => set({ toast: null }), 3300);
  },

  dismissToast() {
    clearTimeout(toastTimer);
    set({ toast: null });
  },

  patchSettings(patch) {
    const settings = { ...get().settings, ...patch, updatedAt: Date.now() };
    set({ settings });
    void saveSettings(settings);
  },

  toggleChapter(n) {
    const { chapters } = get().settings;
    const next = chapters.includes(n)
      ? chapters.filter((c) => c !== n)
      : [...chapters, n].sort((a, b) => a - b);
    get().patchSettings({ chapters: next });
  },

  async replaceAttempts(attempts) {
    set({ attempts, stats: computeStats(attempts) });
    await putAttempts(attempts, true);
    await get().refreshQueued();
  },

  async loadSample() {
    const attempts = sampleAttempts();
    await get().replaceAttempts(attempts);
    get().showToast(`Loaded ${attempts.length} sample attempts`);
  },

  async clearUnsynced() {
    const ids = new Set(await queuedIds());
    if (ids.size === 0) {
      get().showToast('Nothing local to clear');
      return;
    }
    await deleteAttempts([...ids]);
    const attempts = get().attempts.filter((a) => !ids.has(a.id));
    set({ attempts, stats: computeStats(attempts) });
    await get().refreshQueued();
    get().showToast(`Cleared ${ids.size} unsynced ${ids.size === 1 ? 'attempt' : 'attempts'}`);
  },

  async refreshQueued() {
    try {
      set({ queued: await queuedCount() });
    } catch {
      // The badge is a nicety; a store that cannot be read must not throw here.
    }
  },

  syncNow() {
    const { settings, queued } = get();
    if (!settings.backendUrl) {
      get().showToast('Set a backend URL first');
      return;
    }
    // The transport lands with the backend; the button and its count are real.
    get().showToast(`Sync lands with the backend — ${queued} queued`);
  },

  startSession(mode, opts) {
    const { settings, stats } = get();
    const chapters = opts?.chapters ?? chaptersFor(mode, settings, stats);
    if (chapters.length === 0) {
      get().showToast('Pick at least one chapter first');
      return;
    }
    const { steps, difficulty } = levelSpec(settings.level);

    const problem = draw({ chapters, steps, difficulty, only: opts?.only });
    if (!problem) {
      get().showToast('No topics match those settings');
      return;
    }

    set({
      canvasFullscreen: false,
      session: {
        mode,
        target: mode === 'endless' ? null : 10,
        chapters,
        level: settings.level,
        only: opts?.only,
        done: [],
        problem,
        startedAt: Date.now(),
        answers: problem.answers.map(() => ''),
        activeField: 0,
        confidence: null,
        hintsOpen: false,
        rung: 0,
        outcome: null,
        onTrack: null,
      },
    });
    navigateFn?.(SCREEN_PATH.practice);
  },

  endSession() {
    const session = get().session;
    const done = session ? session.done.length > 0 : false;
    set({ session: null, canvasFullscreen: false });
    navigateFn?.(done ? SCREEN_PATH.summary : SCREEN_PATH.home, { replace: true });
  },

  setAnswer(value) {
    patchSession(set, get, (s) => {
      const answers = [...s.answers];
      answers[s.activeField] = value;
      return { answers };
    });
  },

  clearAnswer() {
    patchSession(set, get, (s) => {
      const answers = [...s.answers];
      answers[s.activeField] = '';
      return { answers };
    });
  },

  setActiveField(index) {
    patchSession(set, get, () => ({ activeField: index }));
  },

  setConfidence(confidence) {
    patchSession(set, get, () => ({ confidence }));
  },

  setHintsOpen(hintsOpen) {
    // Reading the hints after the answer is in costs nothing: the attempt is
    // already written, and the rung it was solved at must not move under it.
    patchSession(set, get, (s) => ({
      hintsOpen,
      rung: hintsOpen && s.rung === 0 && !s.outcome ? 1 : s.rung,
    }));
  },

  revealRung(max) {
    patchSession(set, get, (s) => ({ rung: Math.min(max, s.rung + 1) }));
  },

  checkOnTrack(latex) {
    const session = get().session;
    if (!session) return;
    const line = tryParse(latex);
    if (!line) {
      patchSession(set, get, () => ({ onTrack: 'no' }));
      return;
    }
    // Any line from any solution path counts, so long as it is equivalent to
    // something on the way to the answer.
    const targets = [
      ...session.problem.solution.filter((s) => !s.display).map((s) => s.expr),
      ...session.problem.answers.map((a) => a.tex),
    ];
    const hit = targets.some((tex) => {
      const target = tryParse(tex);
      return target ? equivalent(stripPlusC(line), stripPlusC(target)) : false;
    });
    patchSession(set, get, () => ({ onTrack: hit ? 'yes' : 'no' }));
  },

  setOpenRule(openRule) {
    set({ openRule });
  },

  submit() {
    const { session, settings } = get();
    if (!session || session.outcome || session.confidence === null) return;
    // Enter reaches this too, so the guard lives here and not only on the button.
    if (session.problem.answers.some((_, i) => (session.answers[i] ?? '').trim() === '')) return;

    const fields = gradeFields(session.problem, session.answers);
    const correct = fields.every((f) => f.correct);
    const errorClass = correct ? null : worstClass(fields);
    const durationMs = Date.now() - session.startedAt;

    const attempt: Attempt = {
      id: ulid(),
      device: settings.deviceName,
      ts: Date.now(),
      generatorId: session.problem.generatorId,
      seed: session.problem.seed,
      genVersion: session.problem.genVersion,
      chapter: session.problem.chapter,
      steps: session.problem.steps,
      difficulty: session.problem.difficulty,
      correct,
      confidence: session.confidence,
      hintsUsed: session.rung > 0 ? 1 : 0,
      hintMaxRung: session.rung,
      durationMs,
      answerRaw: session.answers.join(' | '),
      errorClass,
    };

    const attempts = [...get().attempts, attempt];
    void saveAttempt(attempt).then(() => get().refreshQueued());

    set({
      attempts,
      stats: computeStats(attempts),
      session: {
        ...session,
        hintsOpen: false,
        outcome: { correct, errorClass, fields },
        done: [
          ...session.done,
          {
            problem: session.problem,
            correct,
            errorClass,
            confidence: session.confidence,
            durationMs,
            hintMaxRung: session.rung,
          },
        ],
      },
    });
  },

  next() {
    const { session, settings } = get();
    if (!session) return;

    if (session.target !== null && session.done.length >= session.target) {
      navigateFn?.(SCREEN_PATH.summary);
      return;
    }

    const level = settings.adaptive ? adapt(session) : session.level;
    const { steps, difficulty } = levelSpec(level);
    const problem = draw({
      chapters: session.chapters,
      steps,
      difficulty,
      only: session.only,
      avoid: session.problem.generatorId,
    });
    if (!problem) {
      get().showToast('No topics match those settings');
      return;
    }

    set({
      canvasFullscreen: false,
      session: {
        ...session,
        level,
        problem,
        startedAt: Date.now(),
        answers: problem.answers.map(() => ''),
        activeField: 0,
        confidence: null,
        hintsOpen: false,
        rung: 0,
        outcome: null,
        onTrack: null,
      },
    });
  },

  setCanvasFullscreen(canvasFullscreen) {
    set({ canvasFullscreen });
  },
}));

// --------------------------------------------------------------- persistence

let saveTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * The live session is written back on every change so that being swapped out —
 * which Android does freely to a browser tab — costs him nothing.
 */
useStore.subscribe((state, prev) => {
  if (state.session === prev.session) return;
  clearTimeout(saveTimer);
  const session = state.session;
  saveTimer = setTimeout(() => {
    void (session ? saveStoredSession(freezeSession(session)) : clearStoredSession());
  }, 250);
});

/** A backgrounded tab can be killed without warning; don't wait out the debounce. */
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    clearTimeout(saveTimer);
    const session = useStore.getState().session;
    void (session ? saveStoredSession(freezeSession(session)) : clearStoredSession());
  });
}

function freezeSession(s: Session): StoredSession {
  return {
    mode: s.mode,
    target: s.target,
    chapters: s.chapters,
    level: s.level,
    only: s.only,
    done: s.done.map((d) => ({
      generatorId: d.problem.generatorId,
      seed: d.problem.seed,
      steps: d.problem.steps,
      difficulty: d.problem.difficulty,
      correct: d.correct,
      errorClass: d.errorClass,
      confidence: d.confidence,
      durationMs: d.durationMs,
      hintMaxRung: d.hintMaxRung,
    })),
    problem: {
      generatorId: s.problem.generatorId,
      seed: s.problem.seed,
      steps: s.problem.steps,
      difficulty: s.problem.difficulty,
    },
    elapsedMs: Date.now() - s.startedAt,
    answers: s.answers,
    activeField: s.activeField,
    confidence: s.confidence,
    rung: s.rung,
    answered: s.outcome !== null,
    savedAt: Date.now(),
  };
}

/**
 * Problems are rebuilt from their seed rather than stored, which is the whole
 * point of generating them that way. The outcome is re-graded from the same
 * answers, so it cannot drift from what he was shown.
 */
function reviveSession(stored: StoredSession): Session | null {
  const problem = rebuild(
    stored.problem.generatorId,
    stored.problem.seed,
    stored.problem.steps,
    stored.problem.difficulty,
  );
  if (!problem) return null;

  const done: SessionItem[] = [];
  for (const d of stored.done) {
    const p = rebuild(d.generatorId, d.seed, d.steps, d.difficulty);
    if (!p) continue;
    done.push({
      problem: p,
      correct: d.correct,
      errorClass: d.errorClass,
      confidence: d.confidence,
      durationMs: d.durationMs,
      hintMaxRung: d.hintMaxRung,
    });
  }

  let outcome: Outcome | null = null;
  if (stored.answered) {
    const fields = gradeFields(problem, stored.answers);
    const correct = fields.every((f) => f.correct);
    outcome = { correct, errorClass: correct ? null : worstClass(fields), fields };
  }

  return {
    mode: stored.mode,
    target: stored.target,
    chapters: stored.chapters,
    level: stored.level,
    only: stored.only,
    done,
    problem,
    // A problem left open overnight should not read as a five-hour attempt.
    startedAt: Date.now() - Math.min(stored.elapsedMs, 15 * 60_000),
    answers: stored.answers,
    activeField: stored.activeField,
    confidence: stored.confidence,
    hintsOpen: false,
    rung: stored.rung,
    outcome,
    onTrack: null,
  };
}

// --------------------------------------------------------------------- helpers

type SessionPatch = (s: Session) => Partial<Session>;

function patchSession(
  set: (partial: Partial<Store>) => void,
  get: () => Store,
  patch: SessionPatch,
): void {
  const session = get().session;
  if (!session) return;
  set({ session: { ...session, ...patch(session) } });
}

function gradeFields(problem: Problem, answers: string[]): GradeResult[] {
  return problem.answers.map((spec, i) =>
    grade({
      raw: answers[i] ?? '',
      reference: spec.value,
      domain: spec.domain,
      requires: spec.requires,
      upToConstant: spec.upToConstant ?? false,
    }),
  );
}

/**
 * A flat wrong beats any near miss: if the maths is wrong somewhere, that is
 * what he needs told. Only when every field is mathematically right does the
 * form complaint become the message.
 */
function worstClass(fields: GradeResult[]): ErrorClass {
  if (fields.some((f) => f.errorClass === 'wrong')) return 'wrong';
  const order: ErrorClass[] = ['plus-c', 'not-exact', 'not-simplified'];
  for (const cls of order) {
    if (fields.some((f) => f.errorClass === cls)) return cls;
  }
  return 'wrong';
}

function chaptersFor(mode: SessionMode, settings: Settings, stats: Stats): number[] {
  if (mode === 'weak') {
    const weak = weakChapters(stats).filter((c) => settings.chapters.includes(c));
    return weak.length ? weak : settings.chapters;
  }
  if (mode === 'speed') {
    const slow = slowChapters(stats).filter((c) => settings.chapters.includes(c));
    return slow.length ? slow : settings.chapters;
  }
  return settings.chapters;
}

/**
 * Adaptive difficulty, deliberately gentle: three right in a row nudges it up,
 * two wrong nudges it down, and it never strays more than one stop from the
 * level he set.
 */
function adapt(session: Session): number {
  const recent = session.done.slice(-3);
  if (recent.length === 3 && recent.every((r) => r.correct)) {
    return Math.min(MAX_LEVEL, session.level + 1);
  }
  if (recent.length >= 2 && recent.slice(-2).every((r) => !r.correct)) {
    return Math.max(1, session.level - 1);
  }
  return session.level;
}
