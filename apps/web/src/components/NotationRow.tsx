import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { cx } from '@/lib/cx';
import type { LatexKey } from '@/lib/latexKeys';
import { useStore } from '@/state/store';
import { HoverLabel } from './HoverLabel';
import { Tex } from './Tex';

/** Held this long, a key comes off the row and follows his finger. */
const HOLD_MS = 500;
/** Travel before that which means he is scrolling the row, not picking a key up. */
const SLOP = 10;
const SPRING = { type: 'spring' as const, stiffness: 620, damping: 42 };

interface Held {
  id: string;
  from: number;
  /** Where each key sat when he picked one up, so the slots stop moving. */
  mids: number[];
  timer: ReturnType<typeof setTimeout> | undefined;
  pointerId: number;
  startX: number;
  startY: number;
  /** Set once the travel says he is scrolling the row, not lifting a key out. */
  scrolling: boolean;
  lastX: number;
}

/**
 * The keys, in his order. Holding one lifts it out of the row: it follows his
 * finger anywhere on the screen while a ghost shows the gap it will drop into,
 * and the keys on either side slide out of the way as that gap moves.
 *
 * The hold is what makes this safe to put on the live row rather than only in
 * settings — a tap still types, and half a second of stillness is not something
 * that happens while he is working.
 */
export function NotationRow({
  keys,
  compact,
  onInsert,
}: {
  keys: LatexKey[];
  compact?: boolean;
  onInsert(key: LatexKey): void;
}) {
  const patchSettings = useStore((s) => s.patchSettings);
  const rowRef = useRef<HTMLDivElement>(null);
  const held = useRef<Held | null>(null);
  /** Set once the hold fires, and read by the click that follows the release. */
  const dragged = useRef(false);
  const [drag, setDrag] = useState<{ id: string; from: number; to: number; x: number; y: number } | null>(
    null,
  );

  // A drag has to win over the row's own scrolling, and the only thing that
  // beats a touch scroll is refusing the move outright.
  useEffect(() => {
    if (!drag) return;
    const block = (e: TouchEvent) => e.preventDefault();
    window.addEventListener('touchmove', block, { passive: false });
    return () => window.removeEventListener('touchmove', block);
  }, [drag]);

  useEffect(() => () => clearTimeout(held.current?.timer), []);

  const order = drag ? move(keys, drag.from, drag.to) : keys;

  function cancelHold() {
    if (held.current) clearTimeout(held.current.timer);
    held.current = null;
  }

  function down(e: React.PointerEvent<HTMLButtonElement>, id: string, from: number) {
    // The caret must stay where it is: a key types into the field, and a field
    // that loses focus to its own keyboard row is a field he has to tap again.
    e.preventDefault();
    if (keys.length < 2) return;
    const target = e.currentTarget;
    const startX = e.clientX;
    const startY = e.clientY;
    const timer = setTimeout(() => {
      // The children are the hover wrappers, which are `display: contents` and
      // have no box of their own; the key inside each one is what to measure.
      const mids = [...(rowRef.current?.children ?? [])].map((el) => {
        const r = (el.firstElementChild ?? el).getBoundingClientRect();
        return r.left + r.width / 2;
      });
      held.current = { ...held.current!, mids };
      dragged.current = true;
      navigator.vibrate?.(12);
      try {
        target.setPointerCapture(held.current.pointerId);
      } catch {
        // The finger is already gone; the release below tidies up either way.
      }
      setDrag({ id, from, to: from, x: startX, y: startY });
    }, HOLD_MS);
    held.current = {
      id,
      from,
      mids: [],
      timer,
      pointerId: e.pointerId,
      startX,
      startY,
      scrolling: false,
      lastX: startX,
    };
  }

  function moveTo(e: React.PointerEvent<HTMLButtonElement>) {
    const grip = held.current;
    if (!grip) return;
    if (grip.scrolling) {
      // The row's own panning, handed back. It has to be done here because the
      // keys refuse the browser's: a scroller claims the touch on the first
      // millimetre of travel and cancels the pointer to say so, and a cancelled
      // pointer is a hold that can never finish. Refusing the pan is what lets
      // a still finger reach half a second; this is the other half of that deal.
      if (rowRef.current) rowRef.current.scrollLeft -= e.clientX - grip.lastX;
      grip.lastX = e.clientX;
      return;
    }
    if (!drag) {
      // Still deciding: travel this early is a scroll, and the key stays put.
      if (Math.abs(e.clientX - grip.startX) + Math.abs(e.clientY - grip.startY) > SLOP) {
        clearTimeout(grip.timer);
        grip.timer = undefined;
        grip.scrolling = true;
        grip.lastX = e.clientX;
      }
      return;
    }
    const others = grip.mids.filter((_, i) => i !== grip.from);
    let to = 0;
    while (to < others.length && others[to]! < e.clientX) to += 1;
    setDrag({ id: grip.id, from: grip.from, to, x: e.clientX, y: e.clientY });
  }

  /** The key lands where the ghost is — on a release, and on a cancel too. */
  function up() {
    const grip = held.current;
    cancelHold();
    if (!drag || !grip) return;
    setDrag(null);
    if (drag.to !== drag.from) {
      patchSettings({ keys: move(keys, drag.from, drag.to).map((k) => k.id) });
    }
  }

  const size = compact ? 'h-9 min-w-[42px] text-[14px]' : 'h-10 min-w-[46px] text-[16px]';
  const lifted = drag ? keys[drag.from] : undefined;

  return (
    <>
      <div ref={rowRef} className="scroll-x flex min-w-0 flex-1 gap-1.5">
        {order.map((key) => {
          const ghost = key.id === drag?.id;
          return (
            <HoverLabel key={key.id} label={key.name}>
              <motion.button
                layout="position"
                transition={SPRING}
                whileTap={ghost ? undefined : { scale: 0.92 }}
                onPointerDown={(e) => {
                  if (e.button !== undefined && e.button !== 0) return;
                  down(e, key.id, keys.findIndex((k) => k.id === key.id));
                }}
                onPointerMove={moveTo}
                onPointerUp={up}
                onPointerCancel={up}
                onContextMenu={(e) => e.preventDefault()}
                onClick={() => {
                  // The release after a drag is not a press; it is a landing.
                  if (dragged.current) {
                    dragged.current = false;
                    return;
                  }
                  onInsert(key);
                }}
                aria-label={key.name}
                className={cx(
                  // No browser gesture on a key: panning the row is done above,
                  // by hand, so that a hold on one is never taken for a scroll.
                  'grid shrink-0 touch-none place-items-center rounded-[9px] border px-2.5 transition-colors',
                  size,
                  ghost
                    ? 'border-dashed border-accent bg-accent/5 text-ghost'
                    : 'border-border bg-raised text-ink hover:border-accent active:bg-overlay',
                )}
              >
                <Tex copy={false}>{key.tex}</Tex>
              </motion.button>
            </HoverLabel>
          );
        })}
        {keys.length === 0 && (
          <div className="grid h-9 flex-1 place-items-center text-[13px] text-faint">
            Add keys in settings
          </div>
        )}
      </div>

      {/* The key he is holding, free of the row and of every scroller it sits in. */}
      {drag &&
        lifted &&
        createPortal(
          <div
            aria-hidden
            style={{ left: drag.x, top: drag.y }}
            className="pointer-events-none fixed z-[80] -translate-x-1/2 -translate-y-1/2"
          >
            <span
              className={cx(
                'grid scale-110 place-items-center rounded-[9px] border border-accent bg-overlay px-2.5 text-ink shadow-[0_14px_30px_-8px_#000]',
                size,
              )}
            >
              <Tex copy={false}>{lifted.tex}</Tex>
            </span>
          </div>,
          document.body,
        )}
    </>
  );
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || from === to) return list;
  const out = [...list];
  const [item] = out.splice(from, 1);
  if (item === undefined) return list;
  out.splice(to, 0, item);
  return out;
}
