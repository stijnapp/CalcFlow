import { create } from 'zustand';
import {
  grade,
  readDerivative,
  tryParse,
  equivalent,
  stripPlusC,
  type GradeResult,
} from '@calcflow/engine';
import { draw, rebuild, type Problem } from '@calcflow/generators';
import {
  DEFAULT_SETTINGS,
  type Attempt,
  type Confidence,
  type ErrorClass,
  type SelfGrade,
  type SessionMode,
  type Settings,
  type Tier,
} from '@calcflow/shared';
import type { CanvasState } from '@/canvas/strokes';
import { levelOf, nextLevel, tierFor } from './adaptive';
import { deviceLabel } from '@/lib/deviceName';
import { ulid } from '@/lib/ulid';
import {
  attemptsById,
  clearQueue,
  clearStoredSession,
  deleteAttempts,
  loadAttempts,
  loadCursor,
  loadSettings,
  loadStoredSession,
  mergeAttempts,
  putAttempts,
  saveAttempt,
  saveCursor,
  saveSettings,
  saveStoredSession,
  queuedCount,
  queuedIds,
  type StoredSession,
} from './db';
import {
  DEVICE_LOCAL,
  SyncError,
  type SyncFailure,
  backendOrigin,
  runSync,
  type SyncPorts,
  type SyncReport,
  type Target,
} from './sync';
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
  /** How long the problem took. Carried here because a graph question's
   *  attempt is not written until the sketch has been marked, and the verdict
   *  card needs the time before then. */
  durationMs: number;
}

export interface Summary {
  target: number | null;
  done: SessionItem[];
}

export interface Session {
  mode: SessionMode;
  /** null in endless mode. */
  target: number | null;
  chapters: number[];
  /**
   * How hard this session is drawing at, from 0 (all easy) to 2 (all hard).
   * Fixed at the tier he picked unless adaptive mode is on; see `adaptive.ts`.
   */
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
  /**
   * Graph questions only. The sketch cannot be graded, so he marks it himself
   * against the answer drawn over it — and until he has, the attempt is not
   * written: half a verdict in the log is worse than a slower one.
   */
  selfGrade: SelfGrade | null;
  /** Which marks the canvas is showing while the answer is up. */
  reveal: 'both' | 'mine' | 'answer';
  onTrack: 'yes' | 'no' | null;
  /** What is typed into the hint panel's "am I on track" box. */
  onTrackLine: string;
  /**
   * The working on the canvas. It is state like any other: closing the app and
   * coming back, or dropping the canvas into fullscreen — which remounts it —
   * used to throw the derivation away and leave him with the question again.
   */
  canvas: CanvasState | null;
}

interface Store {
  ready: boolean;
  settings: Settings;
  attempts: Attempt[];
  stats: Stats;
  session: Session | null;
  /**
   * The set that just ended, for the summary screen. Only in memory: the
   * attempts are in the log, and a summary is something to read on the way
   * out, not somewhere to come back to.
   */
  summary: Summary | null;
  canvasFullscreen: boolean;
  toast: string | null;
  /** Identity of the toast on screen; a change is what replays the animation. */
  toastId: number;
  /** Set when a rule card is open over everything else. */
  openRule: string | null;
  /** Attempts written here but not yet accepted by the server. */
  queued: number;
  /** An exchange with the backend is in flight. */
  syncing: boolean;
  /** Why the last exchange failed, for the settings screen. Cleared by a good one. */
  syncError: string | null;
  /** Which kind of failure it was, so the notice can offer the right way out. */
  syncErrorKind: SyncFailure | null;
  /**
   * The failure he has already waved away. A background sync retries every
   * minute; without this the same notice would come back a minute after he
   * closed it, which is how a notice teaches you to ignore it.
   */
  syncErrorSeen: string | null;

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
  /** Exchanges with the backend and says how it went. */
  syncNow(): void;
  dismissSyncError(): void;
  /** The same exchange, with nothing to say unless it fails. */
  syncQuietly(): void;

  startSession(mode: SessionMode, opts?: { only?: string[]; chapters?: number[] }): void;
  endSession(): void;

  setAnswer(value: string): void;
  clearAnswer(): void;
  setActiveField(index: number): void;
  setConfidence(c: Confidence): void;
  setSelfGrade(grade: SelfGrade): void;
  setReveal(reveal: Session['reveal']): void;

  setHintsOpen(open: boolean): void;
  revealRung(max: number): void;
  setOnTrackLine(latex: string): void;
  setCanvasState(canvas: CanvasState): void;
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
  summary: null,
  canvasFullscreen: false,
  toast: null,
  toastId: 0,
  openRule: null,
  queued: 0,
  syncing: false,
  syncError: null,
  syncErrorKind: null,
  syncErrorSeen: null,

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
      // A set with every answer in has nothing left to come back to: it was
      // finished, and reopening the app on its last verdict read as a question
      // still waiting for him.
      if (session && isComplete(session)) {
        session = null;
        void clearStoredSession();
      }
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

    // Only now: a sync that started before the local log was read would merge
    // into an empty store and then be overwritten by it.
    startAutoSync();
  },

  go(screen) {
    set({ canvasFullscreen: false });
    navigateFn?.(SCREEN_PATH[screen]);
  },

  showToast(message) {
    clearTimeout(toastTimer);
    // The same message again is the same toast still being true — undoing twice
    // says "Undo" twice — so it keeps its identity and only its time is renewed.
    // Fading the identical words out and back in reads as a glitch, not an event.
    const { toast, toastId } = get();
    set({ toast: message, toastId: message === toast ? toastId : toastId + 1 });
    toastTimer = setTimeout(() => set({ toast: null }), 3300);
  },

  dismissToast() {
    clearTimeout(toastTimer);
    set({ toast: null });
  },

  patchSettings(patch) {
    // A device's own name, address and key are not part of the document that
    // travels, so editing one must not make this device win the next race for
    // everything else in it.
    const shared = Object.keys(patch).some((key) => !LOCAL_FIELD.has(key));
    const settings = {
      ...get().settings,
      ...patch,
      ...(shared ? { updatedAt: Date.now() } : {}),
    };
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
    launchSync(true);
  },

  dismissSyncError() {
    set({ syncErrorSeen: get().syncError });
  },

  syncQuietly() {
    launchSync(false);
  },

  startSession(mode, opts) {
    const { settings, stats } = get();
    const chapters = opts?.chapters ?? chaptersFor(mode, settings, stats);
    if (chapters.length === 0) {
      get().showToast('Pick at least one chapter first');
      return;
    }
    const problem = draw({ chapters, tier: settings.tier, only: opts?.only });
    if (!problem) {
      get().showToast('No topics match those settings');
      return;
    }

    set({
      canvasFullscreen: false,
      session: {
        mode,
        target: mode === 'endless' ? null : Math.max(1, Math.round(settings.setLength)),
        chapters,
        level: levelOf(settings.tier),
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
        selfGrade: null,
        reveal: 'both',
        onTrack: null,
        onTrackLine: '',
        canvas: null,
      },
    });
    navigateFn?.(SCREEN_PATH.practice);
  },

  endSession() {
    const session = get().session;
    const summary = session && session.done.length > 0 ? { target: session.target, done: session.done } : null;
    set({ session: null, summary: summary ?? get().summary, canvasFullscreen: false });
    navigateFn?.(summary ? SCREEN_PATH.summary : SCREEN_PATH.home, { replace: true });
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

  // The line he is checking belongs to the problem, not to the panel: closing
  // the hints to look at his working and opening them again is the most likely
  // thing to happen between typing it and pressing Check.
  setOnTrackLine(onTrackLine) {
    patchSession(set, get, () => ({ onTrackLine }));
  },

  setCanvasState(canvas) {
    patchSession(set, get, () => ({ canvas }));
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
    const { session } = get();
    if (!session || session.outcome || session.confidence === null) return;
    // Enter reaches this too, so the guard lives here and not only on the button.
    if (session.problem.answers.some((_, i) => (session.answers[i] ?? '').trim() === '')) return;

    const fields = gradeFields(session.problem, session.answers);
    const correct = fields.every((f) => f.correct);
    const errorClass = correct ? null : worstClass(fields);
    const durationMs = Date.now() - session.startedAt;

    // A graph question is not finished at submit: the answer is now drawn over
    // his sketch and he has still to say how the sketch did. Recording it here
    // would log a verdict on the typed fields alone and call it chapter 5.
    if (session.problem.plot) {
      set({
        session: {
          ...session,
          hintsOpen: false,
          outcome: { correct, errorClass, fields, durationMs },
        },
      });
      return;
    }

    record(set, get, session, { correct, errorClass, fields, durationMs }, durationMs, null);
  },

  setSelfGrade(selfGrade) {
    const session = get().session;
    if (!session?.outcome || session.selfGrade) return;
    const fieldsOk = session.outcome.fields.every((f) => f.correct);
    // The typed features decide whether this counts as understood; the sketch
    // can only pull it down. A near-miss drawing lands in the same near-miss
    // bucket as a missing +C — fluency to work on, not a misconception.
    const correct = fieldsOk && selfGrade === 'got';
    const errorClass: ErrorClass | null = !fieldsOk
      ? worstClass(session.outcome.fields)
      : selfGrade === 'got'
        ? null
        : selfGrade === 'close'
          ? 'sketch'
          : 'wrong';
    // The clock stopped at submit: reading the answer and marking the drawing
    // is not time spent solving it.
    const durationMs = session.outcome.durationMs;
    record(
      set,
      get,
      { ...session, selfGrade },
      { correct, errorClass, fields: session.outcome.fields, durationMs },
      durationMs,
      selfGrade,
    );
  },

  setReveal(reveal) {
    patchSession(set, get, () => ({ reveal }));
  },

  next() {
    const { session, settings } = get();
    if (!session) return;

    // The set is over the moment he moves on from its last answer. Keeping it
    // as the live session is what used to reopen the app on that answer.
    if (isComplete(session)) {
      get().endSession();
      return;
    }

    const tier = tierFor(session.level);
    const problem = draw({
      chapters: session.chapters,
      tier,
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
        selfGrade: null,
        reveal: 'both',
        onTrack: null,
        onTrackLine: '',
        canvas: null,
      },
    });
  },

  setCanvasFullscreen(canvasFullscreen) {
    set({ canvasFullscreen });
  },
}));

// ---------------------------------------------------------------------- sync

const LOCAL_FIELD = new Set<string>(DEVICE_LOCAL);

/**
 * The local half of the exchange. `merge` also folds what arrived into the
 * screens, because pulling the tablet's afternoon in should show up on the
 * stats page without a reload.
 */
const ports: SyncPorts = {
  queuedIds,
  attemptsById,
  markSent: clearQueue,
  cursor: loadCursor,
  setCursor: saveCursor,

  async merge(incoming) {
    const fresh = await mergeAttempts(incoming);
    if (fresh.length > 0) {
      const attempts = [...useStore.getState().attempts, ...fresh].sort((a, b) => a.ts - b.ts);
      useStore.setState({ attempts, stats: computeStats(attempts) });
    }
    return fresh;
  },

  async settings() {
    return useStore.getState().settings;
  },

  async adoptSettings(settings) {
    // Straight in, not through `patchSettings`: the stamp came from the device
    // that won, and restamping it here would make this one win the next round
    // with the same document.
    useStore.setState({ settings });
    await saveSettings(settings);
  },
};

/**
 * Where the API is. An empty field means wherever the app was served from,
 * which is the deployed case: one container answering for both halves. In dev
 * there is no such server behind Vite, so an empty field means unconfigured.
 */
function backend(): Target | 'unset' | 'unusable' {
  const { backendUrl, token } = useStore.getState().settings;
  const sameOrigin = import.meta.env.DEV ? undefined : window.location.origin;
  if (!backendUrl.trim() && !sameOrigin) return 'unset';
  const origin = backendOrigin(backendUrl, sameOrigin);
  return origin ? { origin, token } : 'unusable';
}

let inFlight = false;

/** One exchange at a time; a second request while one is running is that one. */
function launchSync(loud: boolean): void {
  if (inFlight) return;
  inFlight = true;
  void exchange(loud).finally(() => {
    inFlight = false;
  });
}

async function exchange(loud: boolean): Promise<void> {
  const store = useStore.getState();
  const target = backend();
  if (target === 'unset') {
    if (loud) store.showToast('Set a backend URL first');
    return;
  }
  if (target === 'unusable') {
    if (loud) store.showToast('That backend address is not a URL');
    return;
  }

  useStore.setState({ syncing: true });
  try {
    const report = await runSync(ports, target);
    useStore.setState({ syncError: null, syncErrorKind: null, syncErrorSeen: null });
    useStore.getState().patchSettings({ lastSyncedAt: Date.now() });
    await useStore.getState().refreshQueued();
    if (loud) useStore.getState().showToast(summarise(report));
  } catch (err) {
    // A failed exchange changes nothing: the queue is intact and the cursor has
    // not moved, so the next one picks up exactly where this one stopped.
    const message = err instanceof SyncError ? err.message : 'Sync failed';
    if (!(err instanceof SyncError)) console.error('CalcFlow: sync failed', err);
    useStore.setState({
      syncError: message,
      syncErrorKind: err instanceof SyncError ? err.kind : 'server',
    });
    if (loud) useStore.getState().showToast(message);
  } finally {
    useStore.setState({ syncing: false });
  }
}

function summarise(report: SyncReport): string {
  const parts: string[] = [];
  if (report.sent > 0) parts.push(`sent ${report.sent}`);
  if (report.received > 0) parts.push(`received ${report.received}`);
  if (report.settings === 'received') parts.push('settings updated');
  return parts.length > 0 ? `Synced — ${parts.join(' · ')}` : 'Already up to date';
}

let autoSync = false;

/**
 * Flushes when the app comes to the front, when the network comes back, and
 * every minute it is being looked at. A hidden tab syncing is battery spent for
 * nobody: what it would have sent is still there when he returns to it.
 */
function startAutoSync(): void {
  if (autoSync || typeof window === 'undefined') return;
  autoSync = true;

  const tick = (): void => {
    if (document.visibilityState !== 'visible') return;
    if (navigator.onLine === false) return;
    useStore.getState().syncQuietly();
  };

  window.addEventListener('focus', tick);
  window.addEventListener('online', tick);
  document.addEventListener('visibilitychange', tick);
  setInterval(tick, 60_000);
  tick();
}

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
      tier: d.problem.tier,
      correct: d.correct,
      errorClass: d.errorClass,
      confidence: d.confidence,
      durationMs: d.durationMs,
      hintMaxRung: d.hintMaxRung,
    })),
    problem: {
      generatorId: s.problem.generatorId,
      seed: s.problem.seed,
      tier: s.problem.tier,
    },
    elapsedMs: Date.now() - s.startedAt,
    answers: s.answers,
    activeField: s.activeField,
    confidence: s.confidence,
    rung: s.rung,
    onTrackLine: s.onTrackLine,
    canvas: s.canvas ?? undefined,
    selfGrade: s.selfGrade,
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
  // Saved before the session had a level. Not carried forward: nothing stored
  // before the first deploy is.
  if (typeof stored.level !== 'number') return null;
  const problem = rebuild(stored.problem.generatorId, stored.problem.seed, stored.problem.tier);
  if (!problem) return null;

  const done: SessionItem[] = [];
  for (const d of stored.done) {
    const p = rebuild(d.generatorId, d.seed, d.tier);
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
    outcome = {
      correct,
      errorClass: correct ? null : worstClass(fields),
      fields,
      durationMs: stored.elapsedMs,
    };
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
    selfGrade: stored.selfGrade ?? null,
    reveal: 'both',
    onTrack: null,
    onTrackLine: stored.onTrackLine ?? '',
    canvas: stored.canvas ?? null,
  };
}

// --------------------------------------------------------------------- helpers

/**
 * Writes the attempt and closes the problem off. One place, because a typed
 * answer and a drawn one finish at different moments — the first at submit, the
 * second when he has marked his own sketch — and everything after that point is
 * identical.
 */
function record(
  set: (partial: Partial<Store>) => void,
  get: () => Store,
  session: Session,
  outcome: Outcome,
  durationMs: number,
  selfGrade: SelfGrade | null,
): void {
  const { settings } = get();
  const attempt: Attempt = {
    id: ulid(),
    device: deviceLabel(settings.deviceName),
    ts: Date.now(),
    generatorId: session.problem.generatorId,
    seed: session.problem.seed,
    genVersion: session.problem.genVersion,
    chapter: session.problem.chapter,
    tier: session.problem.tier,
    correct: outcome.correct,
    confidence: session.confidence ?? 'think',
    hintsUsed: session.rung > 0 ? 1 : 0,
    hintMaxRung: session.rung,
    durationMs,
    answerRaw: session.answers.join(' | '),
    errorClass: outcome.errorClass,
    selfGrade,
  };

  const attempts = [...get().attempts, attempt];
  void saveAttempt(attempt).then(() => get().refreshQueued());

  set({
    attempts,
    stats: computeStats(attempts),
    session: {
      ...session,
      // Once per answer, here where the answer is final: a streak counted
      // again at every draw is what used to carry a session up two tiers.
      level: settings.adaptive ? nextLevel(session.level, attempt) : session.level,
      hintsOpen: false,
      outcome,
      done: [
        ...session.done,
        {
          problem: session.problem,
          correct: outcome.correct,
          errorClass: outcome.errorClass,
          confidence: session.confidence ?? 'think',
          durationMs,
          hintMaxRung: session.rung,
        },
      ],
    },
  });
}

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
 * A derivative may be written with any of the notations in the book, so the
 * label in front of it — `f'(x) =`, `\frac{dy}{dx} =`, `D_x(6x^3) =` — is read
 * off before the expression is graded. A label that does not say what he meant
 * it to say is a near miss, not a wrong answer: the maths behind it is right.
 */
function gradeFields(problem: Problem, answers: string[]): GradeResult[] {
  const derivative = problem.verify?.kind === 'derivative' ? problem.verify : undefined;
  return problem.answers.map((spec, i) => {
    const raw = answers[i] ?? '';
    const read = derivative
      ? readDerivative(raw, { wrt: derivative.wrt, of: derivative.of })
      : undefined;
    const result = grade({
      raw: read?.body ?? raw,
      reference: spec.value,
      domain: spec.domain,
      requires: spec.requires,
      upToConstant: spec.upToConstant ?? false,
    });
    if (result.correct && read?.complaint) {
      return { ...result, correct: false, errorClass: 'notation' as const };
    }
    return result;
  });
}

/**
 * A flat wrong beats any near miss: if the maths is wrong somewhere, that is
 * what he needs told. Only when every field is mathematically right does the
 * form complaint become the message.
 */
function worstClass(fields: GradeResult[]): ErrorClass {
  if (fields.some((f) => f.errorClass === 'wrong')) return 'wrong';
  const order: ErrorClass[] = ['notation', 'plus-c', 'not-exact', 'not-simplified'];
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

/** Every question of a fixed-length set has been answered. */
function isComplete(session: Session): boolean {
  return session.target !== null && session.done.length >= session.target;
}
