import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
export type HoverSide = 'top' | 'right' | 'bottom';

/**
 * Long enough that the label is not flickering past on the way somewhere else,
 * short enough to feel like an answer to resting the pen on something.
 */
const DELAY_MS = 450;
/** Clear of the control, close enough to read as belonging to it. */
const GAP = 8;
/** How close to the edge of the screen a label may come before it slides in. */
const EDGE = 8;

interface At {
  x: number;
  y: number;
}

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
  const [at, setAt] = useState<At | null>(null);
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
      if (side === 'right') setAt({ x: box.right + GAP, y: box.top + box.height / 2 });
      else if (side === 'bottom') setAt({ x: box.left + box.width / 2, y: box.bottom + GAP });
      else setAt({ x: box.left + box.width / 2, y: box.top - GAP });
    }, DELAY_MS);
  }

  return (
    <span
      ref={ref}
      className="contents"
      // Over and out rather than enter and leave. Only these two bubble, and
      // the pen crosses into the icon inside a button as often as it lands on
      // the button itself — this is the half of a tool that did not answer.
      // `relatedTarget` gives back the enter/leave semantics: a move from the
      // button to its own icon is not an arrival, and not a departure either.
      onPointerOver={(e) => {
        if (e.pointerType === 'touch') return;
        if (within(ref.current, e.relatedTarget)) return;
        arm();
      }}
      onPointerOut={(e) => {
        if (within(ref.current, e.relatedTarget)) return;
        hide();
      }}
      onPointerDown={hide}
      onPointerCancel={hide}
    >
      {children}
      {createPortal(
        <AnimatePresence>{at && <Label at={at} side={side} label={label} />}</AnimatePresence>,
        document.body,
      )}
    </span>
  );
}

/** Whether the pointer came from, or went to, somewhere inside this control. */
function within(host: HTMLElement | null, other: EventTarget | null): boolean {
  return host !== null && other instanceof Node && host.contains(other);
}

/**
 * Two elements, because the animation and the parking both want the transform:
 * the outer one sits against the control, the inner one is free to move.
 */
function Label({ at, side, label }: { at: At; side: HoverSide; label: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  /** How far the label had to slide to stay on screen. */
  const [shift, setShift] = useState(0);

  // Measured once it is laid out: the width is the whole question, and a label
  // on the first or last tool in a row is otherwise half off the edge.
  useLayoutEffect(() => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const past = box.right - (window.innerWidth - EDGE);
    const before = EDGE - box.left;
    setShift(past > 0 ? -past : before > 0 ? before : 0);
  }, [at, label]);

  const transform =
    side === 'right'
      ? 'translateY(-50%)'
      : side === 'bottom'
        ? 'translateX(-50%)'
        : 'translate(-50%, -100%)';

  return (
    <span
      style={{ left: Math.round(at.x + shift), top: Math.round(at.y), transform }}
      className="pointer-events-none fixed z-50"
    >
      <motion.span
        ref={ref}
        role="tooltip"
        /* Arrives from the control it belongs to, so which one it names is
           legible even when two are next to each other. */
        initial={{ opacity: 0, x: side === 'right' ? -4 : 0, y: side === 'top' ? 4 : side === 'bottom' ? -4 : 0 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: side === 'right' ? -4 : 0, y: side === 'top' ? 4 : side === 'bottom' ? -4 : 0 }}
        transition={{ duration: 0.12 }}
        className="block max-w-[60vw] whitespace-nowrap rounded-md border border-strong bg-overlay px-2 py-1 text-[12px] text-ink shadow-[0_8px_20px_-6px_var(--color-shadow)]"
      >
        {label}
      </motion.span>
    </span>
  );
}
