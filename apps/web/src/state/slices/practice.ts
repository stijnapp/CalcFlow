import { draw, similar } from '@calcflow/generators';
import type { SelfGrade, SessionMode } from '@calcflow/shared';
import type { StateCreator } from 'zustand';
import { levelOf, tierFor } from '../adaptive';
import { saveAttempt } from '../db';
import { SCREEN_PATH, navigate } from '../navigation';
import {
  attemptOf,
  chaptersFor,
  closed,
  fresh,
  gradeFields,
  isComplete,
  outcomeOf,
  owedTopics,
  withSketch,
  type Outcome,
  type Session,
} from '../session';
import { computeStats } from '../stats';
import type { Store } from '../store';

/** A set from its first problem to its summary. */
export interface PracticeSlice {
  session: Session | null;

  startSession(mode: SessionMode, opts?: { only?: string[]; chapters?: number[] }): void;
  endSession(): void;
  submit(): void;
  setSelfGrade(grade: SelfGrade): void;
  next(): void;
  /**
   * Moves on to another problem like the one just missed, added to the set
   * rather than taking the place of one still to come: the second of three,
   * missed, becomes the third of four.
   */
  practiceSimilar(): void;
}

type Get = () => Store;
type Set = (partial: Partial<Store>) => void;

/**
 * Writes the attempt and closes the problem off. One place, because a typed
 * answer and a drawn one finish at different moments — the first at submit, the
 * second when they have marked their own sketch — and everything after that
 * point is identical.
 */
function record(get: Get, set: Set, session: Session, outcome: Outcome): void {
  const { settings } = get();
  const attempt = attemptOf(session, outcome, settings, session.selfGrade);
  const attempts = [...get().attempts, attempt];
  void saveAttempt(attempt).then(() => get().refreshQueued());
  set({
    attempts,
    stats: computeStats(attempts),
    session: closed(session, outcome, attempt, settings.adaptive),
  });
}

/** Every answer field has something in it. Enter reaches submit too, so this is checked there. */
const filledIn = (s: Session): boolean =>
  s.problem.answers.every((_, i) => (s.answers[i] ?? '').trim() !== '');

export const createPracticeSlice: StateCreator<Store, [], [], PracticeSlice> = (set, get) => ({
  session: null,

  startSession(mode, opts) {
    const { settings, stats } = get();
    const chapters = opts?.chapters ?? chaptersFor(mode, settings, stats);
    if (chapters.length === 0) {
      get().showToast('Pick at least one chapter first');
      return;
    }
    const plan = {
      mode,
      target: mode === 'endless' ? null : Math.max(1, Math.round(settings.setLength)),
      chapters,
      level: levelOf(settings.tier),
      only: opts?.only,
      topics: opts?.only ? undefined : { off: settings.topicsOff, always: settings.topicsAlways },
      done: [],
    };
    const problem = draw({ ...plan, tier: settings.tier, owed: owedTopics(plan, settings.tier) });
    if (!problem) {
      get().showToast('No topics match those settings');
      return;
    }
    set({ canvasFullscreen: false, session: { ...plan, ...fresh(problem) } });
    navigate(SCREEN_PATH.practice);
  },

  endSession() {
    const session = get().session;
    const summary = session?.done.length ? { target: session.target, done: session.done } : null;
    set({ session: null, summary: summary ?? get().summary, canvasFullscreen: false });
    navigate(summary ? SCREEN_PATH.summary : SCREEN_PATH.home, { replace: true });
  },

  submit() {
    const { session } = get();
    if (!session || session.outcome || session.confidence === null || !filledIn(session)) return;
    const outcome = outcomeOf(gradeFields(session.problem, session.answers), Date.now() - session.startedAt);

    // A graph question is not finished at submit: the answer is now drawn over
    // their sketch and they have still to say how the sketch did. Recording it
    // here would log a verdict on the typed fields alone and call it chapter 5.
    if (session.problem.plot) {
      set({ session: { ...session, hintsOpen: false, outcome } });
      return;
    }
    record(get, set, session, outcome);
  },

  setSelfGrade(selfGrade) {
    const session = get().session;
    if (!session?.outcome || session.selfGrade) return;
    // The clock stopped at submit, and the outcome carries it: reading the
    // answer and marking the drawing is not time spent solving it.
    record(get, set, { ...session, selfGrade }, withSketch(session.outcome, selfGrade));
  },

  next() {
    const { session } = get();
    if (!session) return;
    // The set is over the moment they move on from its last answer. Keeping it
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
      topics: session.topics,
      avoid: session.problem.generatorId,
      owed: owedTopics(session, tier),
    });
    if (!problem) {
      get().showToast('No topics match those settings');
      return;
    }
    set({ canvasFullscreen: false, session: { ...session, ...fresh(problem) } });
  },

  practiceSimilar() {
    const { session } = get();
    // Only from an answer that is in the log: a sketch not yet marked has not
    // been written, and moving on would throw it away.
    if (!session?.outcome || (session.problem.plot && !session.selfGrade)) return;
    const problem = similar(session.problem);
    if (!problem) return;
    const target = session.target === null ? null : session.target + 1;
    set({ canvasFullscreen: false, session: { ...session, target, ...fresh(problem) } });
  },
});
