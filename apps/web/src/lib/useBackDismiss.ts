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
  /** A guard puts its entry straight back: what it protects is still open. */
  guard?: boolean;
}

const stack: Entry[] = [];
/** Entries whose overlay has unmounted but might be mounting straight back. */
const leaving = new Set<number>();
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
  const entry = stack.pop();
  if (!entry) return;
  entry.close();
  // A guard is not dismissed by being triggered — the screen behind it stays —
  // so it takes a fresh entry immediately and can catch the next press too.
  if (entry.guard) {
    stack.push(entry);
    window.history.pushState({ calcflowOverlay: entry.token }, '');
  }
}

function listen() {
  if (listening || typeof window === 'undefined') return;
  window.addEventListener('popstate', onPop);
  listening = true;
}

export function useBackDismiss(open: boolean, close: () => void): void {
  useEntry(open, close, false);
}

/**
 * Holds the back button on a screen that must not be left by accident. The
 * same borrowed history entry, except pressing back spends it on a question —
 * "leave this session?" — rather than on the move itself, and the entry is put
 * back so the next press finds the guard still standing.
 */
export function useBackGuard(active: boolean, onBack: () => void): void {
  useEntry(active, onBack, true);
}

function unwind(token: number): void {
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
}

function useEntry(open: boolean, close: () => void, guard: boolean): void {
  const closeRef = useRef(close);
  closeRef.current = close;
  // One token per overlay, not per effect run: a ref outlives the unmount
  // StrictMode simulates, and the entry is meant to outlive it too.
  const tokenRef = useRef(0);
  if (tokenRef.current === 0) tokenRef.current = ++seq;

  useEffect(() => {
    if (!open) return;
    listen();
    const token = tokenRef.current;

    // Mounting over an entry that was on its way out is StrictMode's second
    // pass. The entry is still on the stack and the history entry is still
    // ours, so it is reclaimed rather than doubled: taking a second one here
    // left the stack one entry short of the presses it had to answer, which is
    // why the back gesture walked out of a session against `npm run dev` while
    // the built app held it.
    if (!leaving.delete(token)) {
      stack.push({ token, guard, close: () => closeRef.current() });
      window.history.pushState({ calcflowOverlay: token }, '');
    }

    return () => {
      leaving.add(token);
      // A remount is the very next thing to happen if it happens at all, so a
      // microtask is late enough to tell one apart from a real unmount.
      queueMicrotask(() => {
        if (leaving.delete(token)) unwind(token);
      });
    };
  }, [open, guard]);
}
