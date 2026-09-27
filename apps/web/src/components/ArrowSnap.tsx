import { motion } from 'motion/react';
import { cx } from '@/lib/cx';
import { Toggle } from './Toggle';

interface Props {
  snap: boolean;
  onChange(next: boolean): void;
  className?: string;
}

/**
 * The vector tool's second tap, as the pen's is its width: whether an arrow
 * lands on the lattice. Snapping used to switch itself off once a drag had
 * gone on for a moment, which read as the lattice giving up halfway through an
 * arrow — so it is a choice he makes now, and it holds until he changes it.
 */
export function ArrowSnap({ snap, onChange, className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -6 }}
      transition={{ type: 'spring', stiffness: 560, damping: 38 }}
      onPointerDown={(e) => e.stopPropagation()}
      className={cx(
        'z-30 flex w-[230px] items-center gap-3 rounded-lg border border-strong bg-overlay p-3.5 shadow-[0_24px_50px_-18px_var(--color-shadow)]',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-ink">Snap to the grid</p>
        <p className="mt-0.5 text-[12px] leading-snug text-muted">
          {snap ? 'Arrows start and end on whole numbers.' : 'Arrows go exactly where the pen does.'}
        </p>
      </div>
      <Toggle checked={snap} onChange={onChange} label="Snap arrows to the grid" />
    </motion.div>
  );
}
