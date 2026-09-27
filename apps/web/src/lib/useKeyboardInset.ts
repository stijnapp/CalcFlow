import { useEffect, useState } from 'react';
import { useKeyBar } from './keyBar';

/**
 * How much of the bottom of the layout is behind the on-screen keyboard.
 *
 * Zero in Chrome, where the viewport asks for `resizes-content` and the page
 * shrinks to the space above the keys, so nothing is ever behind them. Kept
 * for a browser that ignores the request and lays the keyboard over the page:
 * there the answer sheet and the tablet's submit button would otherwise be
 * left underneath it.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const read = () => {
      // Rounded: Android reports fractional pixels that would otherwise make
      // this a new number on every frame of the keyboard's own animation.
      const next = Math.round(Math.max(0, window.innerHeight - vv.height));
      // A stray couple of pixels is the address bar, not a keyboard.
      setInset(next > 120 ? next : 0);
    };
    read();
    vv.addEventListener('resize', read);
    window.addEventListener('resize', read);
    return () => {
      vv.removeEventListener('resize', read);
      window.removeEventListener('resize', read);
    };
  }, []);

  return inset;
}

/**
 * Everything covering the bottom of the layout: the keyboard, and the key bar
 * riding on top of it. What lifts itself clear of the keyboard lifts itself
 * clear of this, or the bar sits over the submit button.
 */
export function useBottomInset(): number {
  const keyboard = useKeyboardInset();
  const bar = useKeyBar((s) => s.height);
  return keyboard + bar;
}
