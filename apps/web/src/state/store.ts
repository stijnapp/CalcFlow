import { create } from 'zustand';
import { grade, tryParse, equivalent, stripPlusC, type GradeResult } from '@calcflow/engine';
import { draw, type Problem } from '@calcflow/generators';
import {
  DEFAULT_SETTINGS,
  type Attempt,
  type Confidence,
  type ErrorClass,
  type SessionMode,
  type Settings,
} from '@calcflow/shared';
import { ulid } from '@/lib/ulid';
import { loadAttempts, loadSettings, saveAttempt, saveSettings } from './db';
import { computeStats, slowChapters, weakChapters, type Stats } from './stats';

export type Screen = 'home' | 'practice' | 'summary' | 'stats' | 'settings' | 'rules';

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
  steps: number;
  difficulty: number;
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
  screen: Screen;
  settings: Settings;
  attempts: Attempt[];
  stats: Stats;
  session: Session | null;
  canvasFullscreen: boolean;
  toast: string | null;
  /** Set when a rule card is open over everything else. */
  openRule: string | null;

  init(): Promise<void>;
  go(screen: Screen): void;
  showToast(message: string): void;
  patchSettings(patch: Partial<Settings>): void;
  toggleChapter(n: number): void;

  startSession(mode: SessionMode, opts?: { only?: string[]; chapters?: number[] }): void;
  endSession(): void;

  typeKey(latex: string): void;
  backspace(): void;
  clearAnswer(): void;
  setActiveField(index: number): void;
  setConfidence(c: Confidence): void;

  setHintsOpen(open: boolean): void;
  revealRung(): void;
  checkOnTrack(latex: string): void;
  setOpenRule(id: string | null): void;

  submit(): void;
  next(): void;
  setCanvasFullscreen(on: boolean): void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useStore = create<Store>((set, get) => ({
  ready: false,
  screen: 'home',
  settings: DEFAULT_SETTINGS,
  attempts: [],
  stats: computeStats([]),
  session: null,
  canvasFullscreen: false,
  toast: null,
  openRule: null,

  async init() {
    const [settings, attempts] = await Promise.all([loadSettings(), loadAttempts()]);
    set({ settings, attempts, stats: computeStats(attempts), ready: true });
  },

  go(screen) {
    set({ screen, canvasFullscreen: false });
  },

  showToast(message) {
    clearTimeout(toastTimer);
    set({ toast: message });
    toastTimer = setTimeout(() => set({ toast: null }), 1100);
  },

  patchSettings(patch) {
    const settings = { ...get().settings, ...patch, updatedAt: Date.now() };
    set({ settings });
    void saveSettings(settings);
  },

  toggleChapter(n) {
    const { chapters } = get().settings;
    const next = chapters.includes(n) ? chapters.filter((c) => c !== n) : [...chapters, n].sort((a, b) => a - b);
    // At least one chapter has to stay on, or there is nothing to practise.
    if (next.length === 0) {
      get().showToast('Keep at least one chapter');
      return;
    }
    get().patchSettings({ chapters: next });
  },

  startSession(mode, opts) {
    const { settings, stats } = get();
    const chapters = opts?.chapters ?? chaptersFor(mode, settings, stats);
    const { steps, difficulty } = settings;

    const problem = draw({ chapters, steps, difficulty, only: opts?.only });
    if (!problem) {
      get().showToast('No topics match those settings');
      return;
    }

    set({
      screen: 'practice',
      canvasFullscreen: false,
      session: {
        mode,
        target: mode === 'endless' ? null : 10,
        chapters,
        steps,
        difficulty,
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
  },

  endSession() {
    const session = get().session;
    set({ screen: session && session.done.length > 0 ? 'summary' : 'home' });
  },

  typeKey(latex) {
    patchSession(set, get, (s) => {
      const answers = [...s.answers];
      answers[s.activeField] = (answers[s.activeField] ?? '') + latex;
      return { answers };
    });
  },

  backspace() {
    patchSession(set, get, (s) => {
      const answers = [...s.answers];
      const current = answers[s.activeField] ?? '';
      // Delete a whole LaTeX command, not the letter that ends it.
      answers[s.activeField] = current.replace(/(\\[a-zA-Z]+\{?\}?|\^\{\}|.)$/, '');
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
    patchSession(set, get, (s) => ({ hintsOpen, rung: hintsOpen && s.rung === 0 ? 1 : s.rung }));
  },

  revealRung() {
    patchSession(set, get, (s) => ({ rung: Math.min(4, s.rung + 1) }));
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

    const fields = session.problem.answers.map((spec, i) =>
      grade({
        raw: session.answers[i] ?? '',
        reference: spec.value,
        domain: spec.domain,
        requires: spec.requires,
        upToConstant: spec.upToConstant ?? false,
      }),
    );

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
    void saveAttempt(attempt);

    set({
      attempts,
      stats: computeStats(attempts),
      session: {
        ...session,
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
      set({ screen: 'summary' });
      return;
    }

    const difficulty = settings.adaptive ? adapt(session) : session.difficulty;
    const problem = draw({
      chapters: session.chapters,
      steps: session.steps,
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
 * two wrong nudges it down, and it never strays more than one step from the
 * slider he set.
 */
function adapt(session: Session): number {
  const recent = session.done.slice(-3);
  if (recent.length === 3 && recent.every((r) => r.correct)) {
    return Math.min(5, session.difficulty + 1);
  }
  if (recent.length >= 2 && recent.slice(-2).every((r) => !r.correct)) {
    return Math.max(1, session.difficulty - 1);
  }
  return session.difficulty;
}
