import type { Confidence } from '@calcflow/shared';
import type { StateCreator } from 'zustand';
import type { CanvasState } from '@/canvas/strokes';
import { onTrackOf, type Session } from '../session';
import type { Store } from '../store';

/** Everything done to the problem on screen before, and just after, it is answered. */
export interface WorkingSlice {
  setAnswer(value: string): void;
  clearAnswer(): void;
  setActiveField(index: number): void;
  setConfidence(c: Confidence): void;
  setReveal(reveal: Session['reveal']): void;

  setHintsOpen(open: boolean): void;
  revealRung(max: number): void;
  setOnTrackLine(latex: string): void;
  checkOnTrack(latex: string): void;
  setCanvasState(canvas: CanvasState): void;
  toggleQuestion(): void;
}

type Patch = (s: Session) => Partial<Session>;

export const createWorkingSlice: StateCreator<Store, [], [], WorkingSlice> = (set, get) => {
  const patch = (fn: Patch): void => {
    const session = get().session;
    if (session) set({ session: { ...session, ...fn(session) } });
  };
  const typeInto = (value: string): void =>
    patch((s) => ({ answers: s.answers.map((a, i) => (i === s.activeField ? value : a)) }));

  return {
    setAnswer: typeInto,
    clearAnswer: () => typeInto(''),
    setActiveField: (activeField) => patch(() => ({ activeField })),
    setConfidence: (confidence) => patch(() => ({ confidence })),
    setReveal: (reveal) => patch(() => ({ reveal })),

    // Reading the hints after the answer is in costs nothing: the attempt is
    // already written, and the rung it was solved at must not move under it.
    setHintsOpen: (hintsOpen) =>
      patch((s) => ({ hintsOpen, rung: hintsOpen && s.rung === 0 && !s.outcome ? 1 : s.rung })),
    revealRung: (max) => patch((s) => ({ rung: Math.min(max, s.rung + 1) })),

    // The line they are checking belongs to the problem, not to the panel:
    // closing the hints to look at the working and opening them again is the
    // most likely thing to happen between typing it and pressing Check.
    setOnTrackLine: (onTrackLine) => patch(() => ({ onTrackLine })),
    checkOnTrack: (latex) => patch((s) => ({ onTrack: onTrackOf(s.problem, latex) })),

    setCanvasState: (canvas) => patch(() => ({ canvas })),
    toggleQuestion: () => patch((s) => ({ questionOpen: !s.questionOpen })),
  };
};
