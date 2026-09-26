import { motion } from 'motion/react';
import { cx } from '@/lib/cx';
import type { LatexKey } from '@/lib/latexKeys';
import { HoverLabel } from './HoverLabel';
import { Tex } from './Tex';

/**
 * The keys, in his order, on the bar over the keyboard. Nothing but
 * pressing them happens here: the row is a plain horizontal scroller, so a swipe
 * across it flings and coasts the way every other list on the phone does.
 *
 * Reordering used to live on this row, behind a half-second hold. It cost the
 * row its scrolling — a hold cannot survive the `pointercancel` a scroller
 * fires the moment it claims the touch, so the keys had to refuse the browser's
 * panning and pan by hand, which meant no momentum. The order is a thing he
 * sets once; it belongs in settings, and this row belongs to the maths.
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
  const size = compact ? 'h-9 min-w-[42px] text-[14px]' : 'h-10 min-w-[46px] text-[16px]';

  return (
    <div className="scroll-x flex min-w-0 flex-1 gap-1.5">
      {keys.map((key) => (
        <HoverLabel key={key.id} label={key.name}>
          <motion.button
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 620, damping: 42 }}
            // The caret must stay where it is: a key types into the field, and a
            // field that loses focus to its own keyboard row is a field he has
            // to tap again. `touch-pan-x` is what keeps that from costing the
            // row its scrolling — naming the gesture the row allows makes the
            // press uncancellable for panning, so the two no longer compete.
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => onInsert(key)}
            aria-label={key.name}
            className={cx(
              'grid shrink-0 touch-pan-x place-items-center rounded-[9px] border border-border bg-raised px-2.5 text-ink transition-colors hover:border-accent active:bg-overlay',
              size,
            )}
          >
            <Tex copy={false}>{key.tex}</Tex>
          </motion.button>
        </HoverLabel>
      ))}
      {keys.length === 0 && (
        <div className="grid h-9 flex-1 place-items-center text-[13px] text-faint">
          Add keys in settings
        </div>
      )}
    </div>
  );
}
