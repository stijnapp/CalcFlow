import { useEffect, useRef } from 'react';

/**
 * Makes an overlay answer the device back button. Opening pushes a history
 * entry at the same URL; back pops it and closes the overlay instead of leaving
 * the app. Closing by any other means removes the entry again, so the back
 * button never has to be pressed twice for one dismissal.
 *
 * The bookkeeping is deliberately module-level rather than per-overlay. Two
 * things break a listener-per-overlay version: a `popstate` is heard by every
 * open overlay, so closing a rule card over the hint panel used to close both;
 * and the pop we generate ourselves on the way out is indistinguishable from a
 * real back press, which is what made every overlay flash open and shut under
 * StrictMode's mount/unmount/mount.
 */
interface Entry {
  token: number;
  close(): void;
}

const stack: Entry[] = [];
/** Pops we asked for ourselves; their `popstate` must not close anything. */
let selfPops = 0;
let seq = 0;
let listening = false;

function onPop() {
  if (selfPops > 0) {
    selfPops -= 1;
    return;
  }
  // Only the topmost overlay owns the entry that was just popped.
  stack.pop()?.close();
}

function listen() {
  if (listening || typeof window === 'undefined') return;
  window.addEventListener('popstate', onPop);
  listening = true;
}

export function useBackDismiss(open: boolean, close: () => void): void {
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open) return;
    listen();

    const token = ++seq;
    stack.push({ token, close: () => closeRef.current() });
    window.history.pushState({ calcflowOverlay: token }, '');

    return () => {
      const at = stack.findIndex((e) => e.token === token);
      // Already gone: a real back press popped it, and the entry with it.
      if (at < 0) return;
      stack.splice(at, 1);
      // A dialog that navigates on its way out — "leave this session" — has
      // already replaced our entry. Going back now would undo that move.
      const state = window.history.state as { calcflowOverlay?: number } | null;
      if (state?.calcflowOverlay === undefined) return;
      selfPops += 1;
      window.history.back();
    };
  }, [open]);
}
