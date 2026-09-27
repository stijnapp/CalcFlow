import { create } from 'zustand';
import { persistSession } from './persist';
import { createAppSlice, type AppSlice } from './slices/app';
import { createPracticeSlice, type PracticeSlice } from './slices/practice';
import { createSavedSlice, type SavedSlice } from './slices/saved';
import { createSyncSlice, type SyncSlice } from './slices/sync';
import { createUiSlice, type UiSlice } from './slices/ui';
import { createWorkingSlice, type WorkingSlice } from './slices/working';

export { bindNavigate, SCREEN_PATH, type Screen } from './navigation';
export type { Outcome, Session, SessionItem, Summary } from './session';

/**
 * The whole app's state, one slice per concern: the local log and settings,
 * what is on screen around the maths, the exchange with the backend, the set
 * being practised, the problems put aside for later, and the working on the
 * problem in front of them.
 */
export type Store = AppSlice & UiSlice & SyncSlice & PracticeSlice & SavedSlice & WorkingSlice;

export const useStore = create<Store>()((...api) => ({
  ...createAppSlice(...api),
  ...createUiSlice(...api),
  ...createSyncSlice(...api),
  ...createPracticeSlice(...api),
  ...createSavedSlice(...api),
  ...createWorkingSlice(...api),
}));

persistSession(useStore);
