import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useDragControls, useMotionValue } from 'motion/react';
import { cx } from '@/lib/cx';

/** Open, or put away at the bottom of the screen. There is nothing in between. */
export type SheetSnap = 'open' | 'down';

const SPRING = { type: 'spring' as const, stiffness: 420, damping: 40 };
/** How much of a sheet that cannot close stays on screen when it is down. */
const PEEK = 56;
/** Dragged past this share of its own height, letting go puts it away. */
const AWAY = 0.25;
const FLICK = 600;
/** A tall sheet stops short of the very top; the strip of page behind it is the way out. */
const TALL = 0.92;

interface Props {
  children: ReactNode;
  /** Dragged down, a closeable sheet leaves; one that cannot becomes a bar. */
  closeable?: boolean;
  onClose?(): void;
  /**
   * Open at this share of the screen rather than at the height of its content.
   * A ratio and not a CSS percentage: the sheet's parent is content-sized, so a
   * percentage there has nothing to resolve against.
   */
  height?: number;
  /** Classes for the content under the handle, which is where the padding goes. */
  className?: string;
}

/**
 * The bottom sheet both the answer and the hints use. One state or the other —
 * a half-open sheet is either an answer box with a screen of empty space above
 * it or a hint list cut off mid-sentence, so neither gets one. The only
 * difference between the two is what down means: hints leave, the answer sheet
 * stays as a bar he can pull back up.
 */
export function Sheet({ children, closeable, onClose, height, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const controls = useDragControls();
  const y = useMotionValue(0);
  const [snap, setSnap] = useState<SheetSnap>('open');
  /** The sheet's open height, which is what the peek offset is measured from. */
  const [openPx, setOpenPx] = useState(0);
  const [vh, setVh] = useState(() => (typeof window === 'undefined' ? 0 : window.innerHeight));

  // The on-screen keyboard changes the height the sheet has to work with, and
  // on Android that arrives as a visual-viewport resize rather than a window one.
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, []);

  useLayoutEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => setOpenPx(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const downY = Math.max(0, openPx - PEEK);

  useEffect(() => {
    const running = animate(y, snap === 'down' ? downY : 0, SPRING);
    return () => running.stop();
  }, [snap, downY, y]);

  function goDown() {
    if (closeable) {
      onClose?.();
      return;
    }
    setSnap('down');
    void animate(y, downY, SPRING);
  }

  function settle(velocity: number) {
    if (velocity > FLICK || y.get() > openPx * AWAY) {
      goDown();
      return;
    }
    setSnap('open');
    void animate(y, 0, SPRING);
  }

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={SPRING}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end"
    >
      <motion.div
        ref={ref}
        /* Never taller than the screen, however much content it holds. */
        style={{ y, maxHeight: vh ? vh * TALL : undefined }}
        animate={{ height: height ? (vh || 0) * height : 'auto' }}
        transition={SPRING}
        drag="y"
        dragListener={false}
        dragControls={controls}
        /* Nothing above the open position: pulling harder would lift the sheet
           off the bottom of the screen and show the page under it. */
        dragConstraints={{ top: 0, bottom: downY }}
        dragElastic={{ top: 0.14, bottom: 0.06 }}
        onDragEnd={(_, info) => settle(info.velocity.y)}
        className="pointer-events-auto relative flex min-h-0 flex-col rounded-t-3xl border-t border-border bg-card shadow-[0_-24px_50px_-20px_rgba(0,0,0,0.7)]"
      >
        {/* Whatever the rubber band gives back on an upward pull is more sheet,
            not the page behind it. */}
        <div className="absolute inset-x-0 top-full h-40 bg-card" aria-hidden />

        {/* The whole top edge is the grab target, not a strip in the middle. */}
        <button
          onPointerDown={(e) => controls.start(e)}
          onClick={() => (snap === 'down' ? setSnap('open') : goDown())}
          aria-label={snap === 'down' ? 'Bring the sheet up' : 'Put the sheet down'}
          className="flex h-[30px] w-full shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
        >
          <span className="h-1 w-11 rounded-full bg-rail" />
        </button>

        {/* Padding belongs to the content and not to the sheet, so the grab
            target above it can run edge to edge. */}
        <div className={cx('flex min-h-0 flex-1 flex-col', className)}>{children}</div>
      </motion.div>
    </motion.div>
  );
}

/** What the canvas has to stay clear of, so the bar never covers his writing. */
export const SHEET_PEEK = PEEK;
/** For a sheet that should open to the whole screen rather than to its content. */
export const SHEET_TALL = TALL;
