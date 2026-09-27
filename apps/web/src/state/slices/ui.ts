import type { StateCreator } from 'zustand';
import { SCREEN_PATH, navigate, type Screen } from '../navigation';
import type { Summary } from '../session';
import type { Store } from '../store';

export interface UiSlice {
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

  go(screen: Screen): void;
  showToast(message: string): void;
  dismissToast(): void;
  setOpenRule(id: string | null): void;
  setCanvasFullscreen(on: boolean): void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const createUiSlice: StateCreator<Store, [], [], UiSlice> = (set, get) => ({
  summary: null,
  canvasFullscreen: false,
  toast: null,
  toastId: 0,
  openRule: null,

  go(screen) {
    set({ canvasFullscreen: false });
    navigate(SCREEN_PATH[screen]);
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

  setOpenRule(openRule) {
    set({ openRule });
  },

  setCanvasFullscreen(canvasFullscreen) {
    set({ canvasFullscreen });
  },
});
