import { useCallback, useEffect, useRef } from 'react';

/** A run of keystrokes closer together than this is one edit, not twenty. */
const BURST_MS = 600;
/** Deep enough to walk back a whole line; shallow enough to stay free. */
const LIMIT = 60;

export interface EditHistory {
  undo(): boolean;
  redo(): boolean;
}

/**
 * Undo and redo for a controlled text field. The browser gives a text input its
 * own history, but nothing reaches it from a two-finger tap and the notation
 * keys write through React rather than through the keyboard, so half the edits
 * were not in it anyway. This watches the value instead, which catches both.
 */
export function useEditHistory(value: string, onChange: (next: string) => void): EditHistory {
  const past = useRef<string[]>([]);
  const future = useRef<string[]>([]);
  const last = useRef(value);
  /** Set while a value we pushed ourselves comes back down as a prop. */
  const applying = useRef(false);
  const burst = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(burst.current), []);

  useEffect(() => {
    if (value === last.current) return;
    const before = last.current;
    last.current = value;
    if (applying.current) {
      applying.current = false;
      return;
    }
    if (burst.current === undefined) {
      past.current.push(before);
      if (past.current.length > LIMIT) past.current.shift();
    }
    // Typing after stepping back is a new branch; there is nothing to redo on it.
    future.current = [];
    clearTimeout(burst.current);
    burst.current = setTimeout(() => {
      burst.current = undefined;
    }, BURST_MS);
  }, [value]);

  const step = useCallback(
    (from: typeof past, to: typeof future) => {
      const next = from.current.pop();
      if (next === undefined) return false;
      to.current.push(last.current);
      applying.current = true;
      // Whatever he was typing is finished; the next keystroke starts its own edit.
      clearTimeout(burst.current);
      burst.current = undefined;
      onChange(next);
      return true;
    },
    [onChange],
  );

  return {
    undo: useCallback(() => step(past, future), [step]),
    redo: useCallback(() => step(future, past), [step]),
  };
}
