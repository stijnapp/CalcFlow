import { useEffect, useState } from 'react';
import { useKeyBar } from './keyBar';

/**
 * How much of the bottom of the layout is behind the on-screen keyboard.
 *
 * The viewport is deliberately left at `resizes-visual`: letting the keyboard
 * shrink the page squashed the canvas to a couple of millimetres, which is the
 * one thing this app cannot afford. The cost is that everything anchored to the
 * bottom of the screen — the answer sheet, the submit button at the foot of the
 * tablet column — is still down there behind the keys. This is the number that
 * lets those two lift themselves clear of it and hand back the room they were
 * given as somewhere to scroll.
 *
 * `innerHeight` minus the visual viewport, and not `offsetTop`: the browser
 * scrolls the visual viewport around to keep the focused field in sight, and a
 * measurement that moved with it would chase its own tail.
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
 * Where the top of the keyboard is, as a distance up from the bottom of the
 * layout — which is what `bottom` means to something fixed.
 *
 * The same number as the inset until the browser pans. A field low on the
 * screen is brought into sight by sliding the visual viewport down the page,
 * a moment after the keyboard is up, and anything fixed to the layout rides up
 * with the page and off the keys it was sitting on: the key bar went up into
 * the middle of the fullscreen canvas, or out of sight altogether. It reads
 * this instead, and stays on the keyboard wherever the page has been moved to.
 */
export function useKeyboardTop(): number {
  const [top, setTop] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const read = () => {
      const inset = window.innerHeight - vv.height;
      setTop(inset > 120 ? Math.max(0, Math.round(inset - vv.offsetTop)) : 0);
    };
    read();
    vv.addEventListener('resize', read);
    vv.addEventListener('scroll', read);
    window.addEventListener('resize', read);
    return () => {
      vv.removeEventListener('resize', read);
      vv.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
    };
  }, []);

  return top;
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
