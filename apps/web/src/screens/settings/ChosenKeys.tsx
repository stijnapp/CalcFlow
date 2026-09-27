import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { Minus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Tex } from '@/components/Tex';
import { cx } from '@/lib/cx';
import type { LatexKey } from '@/lib/latexKeys';

export const KEY_SPRING = { type: 'spring' as const, stiffness: 520, damping: 34 };
/** Short on purpose: a key crosses the divider, it does not fly across the page. */
export const HOP = 14;

/** Held this long, a key comes off the row and follows their finger. */
const HOLD_MS = 400;
/** Travel before that which means they meant to scroll the page. */
const SLOP = 10;

interface Point {
  x: number;
  y: number;
}

interface Held {
  id: string;
  from: number;
  /** Where each key sat when they picked one up, so the slots stop moving. */
  boxes: Point[];
  timer: ReturnType<typeof setTimeout> | undefined;
  pointerId: number;
  startX: number;
  startY: number;
}

interface Drag extends Point {
  id: string;
  from: number;
  to: number;
}

type KeyPointer = ReactPointerEvent<HTMLButtonElement>;

function centres(row: HTMLElement | null): Point[] {
  return [...(row?.children ?? [])].map((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
}

/**
 * The slot nearest the finger. The slots are a wrapping grid rather than a
 * line, so nearest means nearest in both directions; comparing x alone put a
 * key at the end of one line into the start of the next.
 */
function nearest(boxes: readonly Point[], at: Point, fallback: number): number {
  let to = fallback;
  let best = Infinity;
  boxes.forEach((box, i) => {
    const d = (box.x - at.x) ** 2 + (box.y - at.y) ** 2;
    if (d < best) {
      best = d;
      to = i;
    }
  });
  return to;
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || from === to) return list;
  const out = [...list];
  const [item] = out.splice(from, 1);
  if (item === undefined) return list;
  out.splice(to, 0, item);
  return out;
}

/** A hold lifts a key out of the row, a drag carries it, and letting go drops it. */
function useKeyDrag(chosen: LatexKey[], onReorder: (order: string[]) => void) {
  const rowRef = useRef<HTMLDivElement>(null);
  const held = useRef<Held | null>(null);
  /** Set once the hold fires, and read by the click that follows the release. */
  const dragged = useRef(false);
  const [drag, setDrag] = useState<Drag | null>(null);

  // The page scrolls under the finger otherwise, and a key that is being
  // carried across the screen is not a page they are reading.
  useEffect(() => {
    if (!drag) return;
    const block = (e: TouchEvent) => e.preventDefault();
    window.addEventListener('touchmove', block, { passive: false });
    return () => window.removeEventListener('touchmove', block);
  }, [drag]);

  useEffect(() => () => clearTimeout(held.current?.timer), []);

  function release() {
    clearTimeout(held.current?.timer);
    held.current = null;
  }

  function down(e: KeyPointer, id: string, from: number) {
    if (e.button !== undefined && e.button !== 0) return;
    if (chosen.length < 2) return;
    const target = e.currentTarget;
    const startX = e.clientX;
    const startY = e.clientY;
    const timer = setTimeout(() => {
      const grip = held.current;
      if (!grip) return;
      grip.boxes = centres(rowRef.current);
      dragged.current = true;
      navigator.vibrate?.(12);
      try {
        target.setPointerCapture(grip.pointerId);
      } catch {
        // The finger is already gone; the release below tidies up either way.
      }
      setDrag({ id, from, to: from, x: startX, y: startY });
    }, HOLD_MS);
    held.current = { id, from, boxes: [], timer, pointerId: e.pointerId, startX, startY };
  }

  function moveTo(e: KeyPointer) {
    const grip = held.current;
    if (!grip) return;
    const at = { x: e.clientX, y: e.clientY };
    if (!drag) {
      // Still deciding: travel this early is the page being scrolled.
      if (Math.abs(at.x - grip.startX) + Math.abs(at.y - grip.startY) > SLOP) release();
      return;
    }
    setDrag({ id: grip.id, from: grip.from, to: nearest(grip.boxes, at, grip.from), ...at });
  }

  /** The key lands where the ghost is — on a release, and on a cancel too. */
  function up() {
    const grip = held.current;
    release();
    if (!drag || !grip) return;
    setDrag(null);
    if (drag.to !== drag.from) onReorder(move(chosen, drag.from, drag.to).map((k) => k.id));
  }

  /** The release after a drag is not a press; it is a landing. */
  function landed(): boolean {
    if (!dragged.current) return false;
    dragged.current = false;
    return true;
  }

  return { rowRef, drag, down, moveTo, up, landed };
}

/**
 * The keys on the row, in their order. A tap takes one off; a hold lifts it
 * out, and it follows their finger while the others slide around the gap it
 * will drop into. This is the only place the order can be changed — the live
 * row above the answer field is for pressing, and a gesture there fought its
 * scrolling.
 */
export function ChosenKeys({
  chosen,
  onRemove,
  onReorder,
}: {
  chosen: LatexKey[];
  onRemove(id: string): void;
  onReorder(order: string[]): void;
}) {
  const { rowRef, drag, down, moveTo, up, landed } = useKeyDrag(chosen, onReorder);
  const order = drag ? move(chosen, drag.from, drag.to) : chosen;
  const lifted = drag ? chosen[drag.from] : undefined;

  return (
    <>
      <div ref={rowRef} className="relative flex flex-wrap gap-1.5">
        <AnimatePresence initial={false} mode="popLayout">
          {order.map((key) => (
            <motion.button
              key={key.id}
              /* Position only, so the keys still on the row slide to their new
                 places instead of jumping there. Animating the box as well
                 would stretch the maths inside it while it travelled. */
              layout="position"
              initial={{ opacity: 0, scale: 0.85, y: HOP }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: HOP }}
              transition={KEY_SPRING}
              onPointerDown={(e) => down(e, key.id, chosen.findIndex((k) => k.id === key.id))}
              onPointerMove={moveTo}
              onPointerUp={up}
              onPointerCancel={up}
              onContextMenu={(e) => e.preventDefault()}
              onClick={() => {
                if (!landed()) onRemove(key.id);
              }}
              aria-label={`Remove ${key.name}`}
              className={cx(
                'flex h-10 touch-pan-y items-center gap-2 rounded-[10px] border px-3 text-[15px]',
                key.id === drag?.id
                  ? 'border-dashed border-accent bg-accent/5 text-ghost'
                  : 'border-accent bg-accent/10 text-ink',
              )}
            >
              <Tex copy={false}>{key.tex}</Tex>
              <Minus className="size-3 text-accent" />
            </motion.button>
          ))}
        </AnimatePresence>
        {chosen.length === 0 && (
          <span className="py-2 text-[13px] text-faint">Nothing on the row yet.</span>
        )}
      </div>

      {chosen.length > 1 && (
        <span className="text-[12px] text-faint">Tap to remove · hold to drag into a new order</span>
      )}

      {drag && lifted && <LiftedKey at={drag} tex={lifted.tex} />}
    </>
  );
}

/** The key they are holding, free of the row and of everything it sits in. */
function LiftedKey({ at, tex }: { at: Point; tex: string }) {
  return createPortal(
    <div
      aria-hidden
      style={{ left: at.x, top: at.y }}
      className="pointer-events-none fixed z-[80] -translate-x-1/2 -translate-y-1/2"
    >
      <span className="flex h-10 scale-110 items-center gap-2 rounded-[10px] border border-accent bg-overlay px-3 text-[15px] text-ink shadow-[0_14px_30px_-8px_var(--color-shadow)]">
        <Tex copy={false}>{tex}</Tex>
      </span>
    </div>,
    document.body,
  );
}
