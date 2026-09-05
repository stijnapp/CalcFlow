import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useDragControls, useMotionValue } from 'motion/react';
import { cx } from '@/lib/cx';

/** Down at the bottom, sitting at its natural size, or pulled up near the top. */
export type SheetSnap = 'peek' | 'rest' | 'full';

const SPRING = { type: 'spring' as const, stiffness: 420, damping: 40 };
/** How much of the sheet stays on screen when it is down. */
const PEEK = 56;
/** A pull this far past a snap counts as reaching for the next one. */
const REACH = 40;
const FLICK = 600;

/** How much of the screen the top snap leaves showing behind the sheet. */
const FULL = 0.92;

interface Props {
  children: ReactNode;
  /** Dragged all the way down, a closeable sheet leaves; the rest sit and peek. */
  closeable?: boolean;
  onClose?(): void;
  /**
   * Height at the resting snap as a share of the screen. Left out, the sheet is
   * as tall as its content. Given as a ratio rather than a CSS percentage
   * because the sheet's own parent is content-sized, so a percentage there has
   * nothing to resolve against.
   */
  restHeight?: number;
  initial?: SheetSnap;
  className?: string;
}

/**
 * The bottom sheet both the answer and the hints use. Three snaps and nothing
 * in between: dragging follows the finger, and letting go picks the one it was
 * reaching for. The only difference between the two is what the bottom snap
 * means — hints leave, the answer sheet stays as a bar he can pull back up.
 */
export function Sheet({
  children,
  closeable,
  onClose,
  restHeight,
  initial = 'rest',
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const controls = useDragControls();
  const y = useMotionValue(0);
  const [snap, setSnap] = useState<SheetSnap>(initial);
  /** The sheet's height at rest, which is what the peek offset is measured from. */
  const [restPx, setRestPx] = useState(0);
  const [vh, setVh] = useState(() => (typeof window === 'undefined' ? 0 : window.innerHeight));

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useLayoutEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => {
      if (snap !== 'full') setRestPx(el.offsetHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [snap]);

  const downY = Math.max(0, restPx - PEEK);

  useEffect(() => {
    const running = animate(y, snap === 'peek' ? downY : 0, SPRING);
    return () => running.stop();
  }, [snap, downY, y]);

  function settle(velocity: number) {
    const at = y.get();

    if (snap === 'full') {
      if (velocity > FLICK || at > restPx * 0.55) return goDown();
      setSnap(velocity > FLICK / 2 || at > REACH ? 'rest' : 'full');
      void animate(y, 0, SPRING);
      return;
    }

    // Pulled up past the top of its resting position: he wants the whole thing.
    if (at < -REACH || velocity < -FLICK) {
      setSnap('full');
      void animate(y, 0, SPRING);
      return;
    }
    if (velocity > FLICK) return goDown();
    if (velocity < -FLICK / 2 || at < downY / 2) {
      setSnap('rest');
      void animate(y, 0, SPRING);
      return;
    }
    goDown();
  }

  function goDown() {
    if (closeable) {
      onClose?.();
      return;
    }
    setSnap('peek');
    void animate(y, downY, SPRING);
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
        style={{ y, maxHeight: vh ? vh * FULL : undefined }}
        animate={{
          height: snap === 'full' ? (vh || 0) * FULL : restHeight ? (vh || 0) * restHeight : 'auto',
        }}
        transition={SPRING}
        drag="y"
        dragListener={false}
        dragControls={controls}
        dragConstraints={{ top: -120, bottom: restPx }}
        dragElastic={{ top: 0.28, bottom: 0.06 }}
        onDragEnd={(_, info) => settle(info.velocity.y)}
        className={cx(
          'pointer-events-auto flex min-h-0 touch-none flex-col rounded-t-3xl border-t border-border bg-card shadow-[0_-24px_50px_-20px_rgba(0,0,0,0.7)]',
          className,
        )}
      >
        {/* The bar itself is 4px; the target around it is not. */}
        <button
          onPointerDown={(e) => controls.start(e)}
          onClick={() => setSnap((s) => (s === 'peek' ? 'rest' : 'peek'))}
          aria-label={snap === 'peek' ? 'Bring the sheet up' : 'Put the sheet down'}
          className="mx-auto flex h-[30px] w-28 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
        >
          <span className="h-1 w-11 rounded-full bg-rail" />
        </button>
        {children}
      </motion.div>
    </motion.div>
  );
}

/** What the canvas has to stay clear of, so the bar never covers his writing. */
export const SHEET_PEEK = PEEK;
