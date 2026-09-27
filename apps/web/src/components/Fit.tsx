import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from '@/lib/cx';

interface Props {
  children: ReactNode;
  /** How small the type may get before it scrolls instead of shrinking further. */
  min?: number;
  /** Font size and colour for the content; keep padding on a parent. */
  className?: string;
  /** Centred in the width it was given while it fits, rather than hung off the left. */
  center?: boolean;
}

interface Size {
  scale: number;
  width: number;
  height: number;
}

/**
 * Shrinks whatever is inside it until it fits the width it was given. A long
 * question either ran off the side of its card or broke across lines, and both
 * hide half an expression — so the type gets smaller instead and the whole
 * thing stays on one line. Past the floor, where it would be too small to read,
 * it goes back to scrolling.
 *
 * There is no styling-only version of this: container units scale with the box
 * and know nothing about the content, so the ratio between the two has to be
 * measured. It is one measurement and a transform.
 */
export function Fit({ children, min = 0.45, className, center }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const inkRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size | null>(null);

  const measure = useCallback(() => {
    const box = boxRef.current;
    const ink = inkRef.current;
    if (!box || !ink) return;
    // `offsetWidth` is the laid-out width and ignores the transform, so this
    // reads the natural size however small the ink is currently drawn.
    const natural = ink.offsetWidth;
    const room = box.clientWidth;
    const wanted = room > 0 && natural > room ? room / natural : 1;
    const scale = Math.max(min, wanted);
    setSize((prev) =>
      prev && prev.scale === scale && prev.width === natural * scale ? prev : {
        scale,
        // A transform does not change the space an element takes, so the box is
        // given the footprint the scaled line actually covers. Without it a
        // long expression would scroll through the width it used to have.
        width: natural * scale,
        height: ink.offsetHeight * scale,
      },
    );
  }, [min]);

  // Again whenever what it holds changes — not after every render, which
  // includes the one its own measurement causes. A scrollbar that the new
  // height brings in (or takes away) changes the room it measures, and the two
  // sizes took turns until React gave up and blanked the screen.
  useLayoutEffect(measure, [measure, children]);

  useEffect(() => {
    const ro = new ResizeObserver(measure);
    ro.observe(boxRef.current!);
    // The ink resizes on its own when a webfont or KaTeX arrives late.
    ro.observe(inkRef.current!);
    return () => ro.disconnect();
  }, [measure]);

  const scrolls = size !== null && size.scale <= min && size.width > 0;

  return (
    <div
      ref={boxRef}
      className={cx('min-w-0', scrolls ? 'scroll-x' : 'overflow-hidden', className)}
      style={{ height: size?.height }}
    >
      <div className={cx(center && 'mx-auto')} style={{ width: size?.width, height: size?.height }}>
        <div
          ref={inkRef}
          className="w-max origin-top-left"
          style={{ transform: size ? `scale(${size.scale})` : undefined }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
