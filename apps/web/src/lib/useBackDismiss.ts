import { useEffect, useRef } from 'react';

/**
 * Makes overlays answer the device back button. While anything dismissable is
 * open the app holds one extra history entry — the sentinel — at the same URL.
 * Back spends it, the innermost overlay closes instead of the app, and the
 * sentinel is taken again if anything is still open.
 *
 * One entry for all of them, rather than one each, and it is re-armed by
 * stepping *forward* onto the entry the press just left rather than by pushing
 * a fresh one. Both of those are Chrome's doing. Its history-manipulation
 * intervention marks every same-document entry as skippable the moment a page
 * calls `pushState` without a live user gesture — and a back press is not a
 * gesture, so re-arming from inside `popstate` marked the whole session,
 * homepage included. The next press then skipped the lot and left the site.
 * That is invisible to `history.back()` and to a test driver, which navigate by
 * entry and never skip: it only ever showed up under a real thumb.
 *
 * So: push only while a tap is still warm, and travel to an entry that already
 * exists the rest of the time.
 */
interface Entry {
  token: number;
  close(): void;
  /** A guard is not dismissed by being triggered: what it protects stays open. */
  guard: boolean;
}

const stack: Entry[] = [];
/** Our sentinel is the entry the browser is standing on. */
let live = false;
/** The sentinel sits one step forward, spent but not yet gone. */
let spare = false;
/** A move of our own is in flight; the `popstate` it lands is not a press. */
let pending: 'arm' | 'disarm' | null = null;
let scheduled = false;
let seq = 0;
let listening = false;

function onSentinel(): boolean {
  const state = window.history.state as { calcflowOverlay?: boolean } | null;
  return state?.calcflowOverlay === true;
}

/** Brings the history entry into line with whatever is open. */
function sync(): void {
  if (pending) return;
  const want = stack.length > 0;
  if (want === live) return;

  if (!want) {
    live = false;
    // A dialog that navigates on its way out — "leave this session" — has
    // already replaced the sentinel. Stepping back now would undo that move.
    if (!onSentinel()) return;
    pending = 'disarm';
    window.history.back();
    return;
  }

  // A tap is what makes a new entry safe to create; the rest of the time the
  // sentinel is still there, one step forward, and going to it costs nothing.
  if (!navigator.userActivation?.isActive && spare) {
    pending = 'arm';
    window.history.forward();
    return;
  }
  live = true;
  spare = false;
  window.history.pushState({ ...window.history.state, calcflowOverlay: true }, '');
}

/** Several overlays can open and close in one commit; they settle together. */
function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    sync();
  });
}

function onPop(): void {
  if (pending) {
    live = pending === 'arm';
    spare = pending === 'disarm';
    pending = null;
    schedule();
    return;
  }
  // Not ours: a real move between screens. Whatever lies forward is not the
  // sentinel any more, so it cannot be reclaimed.
  if (!live) {
    spare = false;
    return;
  }
  live = false;
  spare = true;
  const entry = stack.pop();
  if (entry) {
    entry.close();
    if (entry.guard) stack.push(entry);
  }
  schedule();
}

function listen(): void {
  if (listening || typeof window === 'undefined') return;
  window.addEventListener('popstate', onPop);
  listening = true;
}

export function useBackDismiss(open: boolean, close: () => void): void {
  useEntry(open, close, false);
}

/**
 * Holds the back button on a screen that must not be left by accident. The same
 * sentinel, except a press spends it on a question — "leave this session?" —
 * rather than on the move, and the guard stays up to catch the next one.
 */
export function useBackGuard(active: boolean, onBack: () => void): void {
  useEntry(active, onBack, true);
}

function useEntry(open: boolean, close: () => void, guard: boolean): void {
  const closeRef = useRef(close);
  closeRef.current = close;
  // One token per overlay, not per effect run: a ref outlives the unmount
  // StrictMode simulates, and so the entry it names is the same one afterwards.
  const tokenRef = useRef(0);
  if (tokenRef.current === 0) tokenRef.current = ++seq;

  useEffect(() => {
    if (!open) return;
    listen();
    const token = tokenRef.current;
    stack.push({ token, guard, close: () => closeRef.current() });
    schedule();

    return () => {
      const at = stack.findIndex((e) => e.token === token);
      if (at >= 0) stack.splice(at, 1);
      schedule();
    };
  }, [open, guard]);
}
