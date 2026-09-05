import { AnimatePresence, motion } from 'motion/react';
import { cx } from '@/lib/cx';
import type { Session } from '@/state/store';

const DOT = 7;
const GAP = 4;
const STEP = DOT + GAP;
/** Ten slots whatever the mode; endless slides its history through them. */
const WINDOW = 10;

/**
 * How the set has gone, at a glance, without a number. Endless does not stop at
 * ten: the newest lands on the right, the row ripples one place left behind it,
 * and the oldest fades off the front.
 */
export function ProgressDots({ session }: { session: Session }) {
  const slots = Math.min(WINDOW, session.target ?? WINDOW);
  const offset = Math.max(0, session.done.length - slots);
  const shown = session.done.slice(offset);

  return (
    <div className="relative shrink-0" style={{ width: slots * STEP - GAP, height: DOT }} aria-hidden>
      {Array.from({ length: slots }, (_, i) => (
        <span
          key={i}
          className="absolute size-[7px] rounded-full bg-border"
          style={{ left: i * STEP }}
        />
      ))}

      <AnimatePresence initial={false}>
        {shown.map((item, i) => (
          <motion.span
            key={offset + i}
            initial={{ opacity: 0, scale: 0.2, left: i * STEP }}
            animate={{ opacity: 1, scale: 1, left: i * STEP }}
            exit={{ opacity: 0, scale: 0.2 }}
            /* The shift starts at the newest dot and runs back down the row. */
            transition={{
              type: 'spring',
              stiffness: 520,
              damping: 34,
              delay: (shown.length - 1 - i) * 0.022,
            }}
            className={cx(
              'absolute size-[7px] rounded-full',
              item.correct ? 'bg-correct' : 'bg-wrong',
            )}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
