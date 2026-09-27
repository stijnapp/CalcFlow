import { useLayoutEffect, useState, type RefObject } from 'react';
import { useBottomInset } from '@/lib/useKeyboardInset';

/**
 * The line being typed stands clear of the key bar, which floats over the
 * bottom of the page while the keyboard is up. The page itself already stops
 * at the keyboard; see the viewport in index.html.
 */
export function useTypingLift(rootRef: RefObject<HTMLDivElement | null>): {
  lift: number;
  setTyping(typing: boolean): void;
} {
  const [typing, setTyping] = useState(false);
  const covered = useBottomInset();
  const [lift, setLift] = useState(0);
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!typing || covered === 0 || !el) {
      setLift(0);
      return;
    }
    const below = window.innerHeight - el.getBoundingClientRect().bottom;
    // Room over the bar for the tablet's gap under it, and for a breath; never
    // so high that the canvas's own top edge cuts the field off.
    setLift(Math.min(Math.max(0, covered + 20 - below), Math.max(0, el.clientHeight - 72)));
  }, [rootRef, typing, covered]);
  return { lift, setTyping };
}
