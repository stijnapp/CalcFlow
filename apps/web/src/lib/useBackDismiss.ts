import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Makes overlays answer the device back button. While anything dismissable is
 * open the app keeps a small reserve of history entries — sentinels — at the
 * same URL. A press spends one, the innermost overlay closes instead of the
 * app, and the reserve is topped back up the next time he touches the screen.
 *
 * The reserve is why there is more than one of them. Chrome's history
 * manipulation intervention marks a same-document entry skippable the moment a
 * page calls `pushState` without a live user gesture, and a back press is not a
 * gesture — so an entry pushed to replace the one a press has just spent gets
 * skipped by the *next* press, along with every other same-document entry, and
 * the app closes. Stepping forward onto the spent entry instead escapes the
 * mark, but it is an asynchronous traversal: a second press beating it there
 * finds nothing behind the current entry, and a traversal that cannot land —
 * the entry it wanted is gone — never reports back at all, wedging the
 * mechanism for the rest of the session. Both of those read as "back twice
 * without touching anything closes the app", and both go away once a press no
 * longer has to be answered before the next one arrives.
 *
 * The practice screen is what makes this constant rather than occasional: its
 * guard is never dismissed by being triggered, so something is always open and
 * every single press has to be answered.
 *
 * So: push only while a tap is warm, keep one in hand, and never push at any
 * other time.
 *
 * How deep the reserve is lives in `history.state` rather than in a variable
 * here. A router navigation writes its own state over ours, which reads back as
 * an empty reserve on its own, and no amount of traversing can leave the two
 * disagreeing about what is on the stack.
 */

/** One to spend on the press, one still in hand for the press after it. */
const RESERVE = 2;

interface Entry {
  token: number;
  close(): void;
  /** A guard is not dismissed by being triggered: what it protects stays open. */
  guard: boolean;
}

const stack: Entry[] = [];
/** `depth()` as of the last time we looked, so a press can be told from a move. */
let seen = 0;
/** Our own unwind is in flight; the `popstate` it lands is not a press. */
let unwinding = false;
let scheduled = false;
let seq = 0;
let listening = false;

interface SentinelState {
  calcflowDepth?: number;
}

/** How many sentinels sit at and below the entry we are standing on. */
function depth(): number {
  const state = window.history.state as SentinelState | null;
  const n = state?.calcflowDepth;
  return typeof n === 'number' && n > 0 ? n : 0;
}

/**
 * Tops the reserve up. Only ever called where a gesture is still warm, because
 * an entry pushed without one is an entry the next press walks straight past.
 */
function arm(): void {
  if (!navigator.userActivation?.isActive) return;
  for (let n = depth(); n < RESERVE; n += 1) {
    window.history.pushState({ ...window.history.state, calcflowDepth: n + 1 }, '');
  }
  seen = depth();
}

/** Brings the history entries into line with whatever is open. */
function sync(): void {
  if (unwinding) return;
  seen = depth();

  // Nothing left open but sentinels still underfoot — the summary screen
  // reached by finishing a session lands here. One hop clears the lot, rather
  // than a back press each that appears to do nothing.
  if (stack.length === 0) {
    const n = depth();
    if (n > 0) {
      unwinding = true;
      window.history.go(-n);
    }
    return;
  }

  arm();
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
  if (unwinding) {
    unwinding = false;
    seen = depth();
    schedule();
    return;
  }

  const now = depth();
  const before = seen;
  seen = now;

  // No shallower than we were: a move between screens, or the reserve being
  // rejoined. Either way no sentinel was spent, so nothing here was dismissed.
  if (now >= before) {
    schedule();
    return;
  }

  // One press, one overlay, however many entries the browser chose to skip.
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
  // The reserve can only be refilled while a gesture is warm, and this is where
  // they come from. Capture, so it still counts when the target stops the event.
  const touched = () => {
    if (stack.length > 0) schedule();
  };
  window.addEventListener('pointerdown', touched, { capture: true, passive: true });
  window.addEventListener('keydown', touched, { capture: true, passive: true });
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
  useLayoutEffect(() => {
    closeRef.current = close;
  });
  // One token per overlay, not per effect run: state outlives the unmount
  // StrictMode simulates, and so the entry it names is the same one afterwards.
  const [token] = useState(() => ++seq);

  useEffect(() => {
    if (!open) return;
    listen();
    stack.push({ token, guard, close: () => closeRef.current() });
    schedule();

    return () => {
      const at = stack.findIndex((e) => e.token === token);
      if (at >= 0) stack.splice(at, 1);
      schedule();
    };
  }, [open, guard, token]);
}
