import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { cx } from '@/lib/cx';

interface Props {
  /** What happened, in one short line. */
  message: string;
  /** The way out, if there is one worth offering. */
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onAction?(): void;
  onDismiss(): void;
  /** A problem rather than an offer — the pill picks up the warning colour. */
  tone?: 'accent' | 'wrong';
}

/**
 * The pill that drops from under the header. Installed, the app has no address
 * bar and no error console, so anything it needs to say about itself — a new
 * build waiting, a backend that would not talk — has to say it here or not at
 * all. Every one of them is dismissable: a notice that cannot be closed is a
 * notice he learns to read past.
 */
export function Banner({
  message,
  actionLabel,
  actionIcon: Icon,
  onAction,
  onDismiss,
  tone = 'accent',
}: Props) {
  return (
    <motion.div
      role="status"
      layout
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 520, damping: 38 }}
      className={cx(
        'pointer-events-auto flex max-w-full items-center gap-2.5 rounded-full border bg-overlay py-1.5 pl-4 pr-1.5 shadow-[0_16px_36px_-10px_#000]',
        tone === 'wrong' ? 'border-wrong' : 'border-strong',
      )}
    >
      <span className={cx('min-w-0 truncate text-[13px]', tone === 'wrong' ? 'text-wrong-ink' : 'text-ink')}>
        {message}
      </span>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[12px] font-semibold text-on-accent"
        >
          {Icon && <Icon className="size-3.5" />}
          {actionLabel}
        </button>
      )}
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="grid size-7 shrink-0 place-items-center rounded-full text-muted hover:text-ink"
      >
        <X className="size-3.5" />
      </button>
    </motion.div>
  );
}
