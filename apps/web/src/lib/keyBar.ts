import { create } from 'zustand';
import type { LatexKey } from './latexKeys';

/** What the key bar types into: whichever LaTeX field has the caret. */
export interface KeyTarget {
  insert(key: LatexKey): void;
  step(by: -1 | 1): void;
  /** The field's box, which the tablet lines the bar up under. */
  anchor(): HTMLElement | null;
}

interface KeyBarState {
  target: KeyTarget | null;
  /** The bar's height while it is up, so what sits on the keyboard can sit on it instead. */
  height: number;
}

/*
 * One bar for every field, rather than a row of keys inside each one. Inside
 * the field the keys cost every answer box a storey even when he was not
 * typing in it, and with two boxes the sheet was mostly keys. The bar lives on
 * top of the keyboard, only while a field has the caret, and types into
 * whichever field that is.
 */
export const useKeyBar = create<KeyBarState>(() => ({ target: null, height: 0 }));

let releaseTimer: ReturnType<typeof setTimeout> | undefined;

export function claimKeyBar(target: KeyTarget): void {
  clearTimeout(releaseTimer);
  useKeyBar.setState({ target });
}

/**
 * Moving from one field to the next is a blur and then a focus. Letting go a
 * moment late is what keeps the bar from dropping away and coming back between
 * the two.
 */
export function releaseKeyBar(target: KeyTarget): void {
  clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => {
    if (useKeyBar.getState().target === target) useKeyBar.setState({ target: null });
  }, 90);
}
