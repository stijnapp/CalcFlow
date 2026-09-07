import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';

/**
 * The name of a control, shown when the pen hovers over it. Holding an S-Pen a
 * few millimetres off the glass puts a cursor on screen and fires the same
 * hover events a mouse does, which is a whole channel the app was not using:
 * he can read what a key does without pressing it and finding out.
 *
 * The wrapper is `display: contents`, so it has no box of its own and the
 * control inside keeps exactly the geometry it had before it was wrapped. A
 * wrapper with a box was the bug where only part of a key answered the pen: a
 * key wider than its own content — every one with a `min-w` — grew past the
 * span around it, and the overhang belonged to the neighbour. Enter and leave
 * come off React's fiber tree rather than off layout, so a box-less wrapper
 * still hears them; the label is measured from the child element instead.
 *
 * A portal, because the notation row and the tool rail both live inside
 * scrollers, and a label positioned inside one is clipped by it. Touch is left
 * out on purpose — a finger tap would flash a label nobody asked for on its way
 * to pressing the thing.
 */

/** Which edge of the control the label sits on. */
export type HoverSide = 'top' | 'right';

/**
 * Long enough that the label is not flickering past on the way somewhere else,
 * short enough to feel like an answer to resting the pen on something.
 */
const DELAY_MS = 450;
/** Clear of the control, close enough to read as belonging to it. */
const GAP = 8;

export function HoverLabel({
  label,
  side = 'top',
  children,
}: {
  label: string;
  side?: HoverSide;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function hide() {
    clearTimeout(timer.current);
    setAt(null);
  }

  // Nothing should be left pointing at a control that has since gone.
  useEffect(() => () => clearTimeout(timer.current), []);

  function arm() {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      // Measured now rather than when the pen arrived: a scroller may have
      // moved the key under it in the meantime.
      const box = ref.current?.firstElementChild?.getBoundingClientRect();
      if (!box) return;
      setAt(
        side === 'right'
          ? { x: box.right + GAP, y: box.top + box.height / 2 }
          : { x: box.left + box.width / 2, y: box.top - GAP },
      );
    }, DELAY_MS);
  }

  return (
    <span
      ref={ref}
      className="contents"
      onPointerEnter={(e) => {
        if (e.pointerType === 'touch') return;
        arm();
      }}
      onPointerLeave={hide}
      onPointerDown={hide}
      onPointerCancel={hide}
    >
      {children}
      {createPortal(
        <AnimatePresence>
          {at && (
            /* Two elements, because the animation and the centring both want
               the transform: the outer one parks the label against the control,
               the inner one is free to move. */
            <span
              style={{
                left: Math.round(at.x),
                top: Math.round(at.y),
                // Clamped by the translate rather than by measuring: the label
                // is small and never near enough to an edge for it to matter.
                transform: side === 'right' ? 'translateY(-50%)' : 'translate(-50%, -100%)',
              }}
              className="pointer-events-none fixed z-50"
            >
              <motion.span
                role="tooltip"
                /* Arrives from the control it belongs to, so which one it names
                   is legible even when two are next to each other. */
                initial={{ opacity: 0, x: side === 'right' ? -4 : 0, y: side === 'right' ? 0 : 4 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: side === 'right' ? -4 : 0, y: side === 'right' ? 0 : 4 }}
                transition={{ duration: 0.12 }}
                className="block max-w-[60vw] whitespace-nowrap rounded-md border border-strong bg-overlay px-2 py-1 text-[12px] text-ink shadow-[0_8px_20px_-6px_#000]"
              >
                {label}
              </motion.span>
            </span>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </span>
  );
}
