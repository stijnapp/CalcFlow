import { rebuild } from '@calcflow/generators';
import type { StoreApi } from 'zustand';
import { clearStoredSession, saveStoredSession, type StoredSession } from './db';
import { gradeFields, outcomeOf, type Session, type SessionItem } from './session';

export function freezeSession(s: Session): StoredSession {
  return {
    mode: s.mode,
    target: s.target,
    chapters: s.chapters,
    level: s.level,
    only: s.only,
    topics: s.topics,
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

function reviveDone(stored: StoredSession): SessionItem[] {
  return stored.done.flatMap((d) => {
    const problem = rebuild(d.generatorId, d.seed, d.tier);
    if (!problem) return [];
    const { correct, errorClass, confidence, durationMs, hintMaxRung } = d;
    return [{ problem, correct, errorClass, confidence, durationMs, hintMaxRung }];
  });
}

/**
 * Problems are rebuilt from their seed rather than stored, which is the whole
 * point of generating them that way. The outcome is re-graded from the same
 * answers, so it cannot drift from what they were shown.
 */
export function reviveSession(stored: StoredSession): Session | null {
  // Saved before the session had a level. Not carried forward: nothing stored
  // before the first deploy is.
  if (typeof stored.level !== 'number') return null;
  const problem = rebuild(stored.problem.generatorId, stored.problem.seed, stored.problem.tier);
  if (!problem) return null;

  return {
    mode: stored.mode,
    target: stored.target,
    chapters: stored.chapters,
    level: stored.level,
    only: stored.only,
    topics: stored.topics,
    done: reviveDone(stored),
    problem,
    // A problem left open overnight should not read as a five-hour attempt.
    startedAt: Date.now() - Math.min(stored.elapsedMs, 15 * 60_000),
    answers: stored.answers,
    activeField: stored.activeField,
    confidence: stored.confidence,
    hintsOpen: false,
    rung: stored.rung,
    outcome: stored.answered
      ? outcomeOf(gradeFields(problem, stored.answers), stored.elapsedMs)
      : null,
    selfGrade: stored.selfGrade ?? null,
    reveal: 'both',
    onTrack: null,
    onTrackLine: stored.onTrackLine ?? '',
    questionOpen: false,
    canvas: stored.canvas ?? null,
  };
}

function write(session: Session | null): void {
  void (session ? saveStoredSession(freezeSession(session)) : clearStoredSession());
}

/**
 * The live session is written back on every change so that being swapped out —
 * which Android does freely to a browser tab — costs them nothing.
 */
export function persistSession(store: StoreApi<{ session: Session | null }>): void {
  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  store.subscribe((state, prev) => {
    if (state.session === prev.session) return;
    clearTimeout(saveTimer);
    const session = state.session;
    saveTimer = setTimeout(() => write(session), 250);
  });

  // A backgrounded tab can be killed without warning; don't wait out the debounce.
  if (typeof document === 'undefined') return;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    clearTimeout(saveTimer);
    write(store.getState().session);
  });
}
