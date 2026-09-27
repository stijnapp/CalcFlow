import { useLayoutEffect, useState } from 'react';

/**
 * An element's height, kept current as it grows and shrinks. A callback ref
 * rather than an object one, so an element that only mounts later — or that
 * is swapped for another — is still the one being measured.
 */
export function useHeight<T extends HTMLElement>(): [(el: T | null) => void, number] {
  const [el, setEl] = useState<T | null>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);

  return [setEl, height];
}
