import { rebuild } from '@calcflow/generators';
import type { SavedProblem } from '@calcflow/shared';
import type { StateCreator } from 'zustand';
import { levelOf } from '../adaptive';
import { SCREEN_PATH, navigate } from '../navigation';
import { withSaved, withoutSaved } from '../saved';
import { drawAfter, fresh } from '../session';
import type { Store } from '../store';

/** Problems put aside for later, and the way back to them. */
export interface SavedSlice {
  /**
   * Puts the problem on screen on the saved list. Before it is answered that
   * is a skip: nothing goes in the log, and the set draws another in its
   * place. After, it only keeps it — a wrong answer worth coming back to.
   */
  saveForLater(): void;
  forgetSaved(problem: SavedProblem): void;
  /** One problem off the list, on its own, on the practice screen. */
  practiseSaved(problem: SavedProblem): void;
}

export const createSavedSlice: StateCreator<Store, [], [], SavedSlice> = (set, get) => ({
  saveForLater() {
    const { session, settings } = get();
    if (!session) return;
    get().patchSettings({ saved: withSaved(settings.saved, session.problem) });
    if (session.outcome) {
      get().showToast('Saved for later');
      return;
    }
    // Skipping the one saved problem on screen leaves it where it was.
    if (session.fromSaved) {
      get().endSession();
      get().showToast('Still saved for later');
      return;
    }
    const problem = drawAfter(session);
    if (!problem) {
      get().showToast('Saved for later');
      return;
    }
    set({ canvasFullscreen: false, session: { ...session, ...fresh(problem) } });
    get().showToast('Skipped — saved for later');
  },

  forgetSaved(problem) {
    get().patchSettings({ saved: withoutSaved(get().settings.saved, problem) });
  },

  practiseSaved(saved) {
    const problem = rebuild(saved.generatorId, saved.seed, saved.tier);
    if (!problem) {
      get().showToast('That kind of problem is no longer in the app');
      return;
    }
    set({
      canvasFullscreen: false,
      session: {
        mode: 'set10',
        target: 1,
        chapters: [problem.chapter],
        level: levelOf(saved.tier),
        only: [saved.generatorId],
        fromSaved: true,
        done: [],
        ...fresh(problem),
      },
    });
    navigate(SCREEN_PATH.practice);
  },
});
