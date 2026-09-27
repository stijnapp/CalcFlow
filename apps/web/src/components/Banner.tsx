import type { LucideIcon } from 'lucide-react';
import { LoaderCircle, X } from 'lucide-react';
import { motion } from 'motion/react';
import { cx } from '@/lib/cx';

interface Props {
  /** What happened, in one short line. */
  message: string;
  /** Before the message: what kind of news it is, at a glance. */
  icon?: LucideIcon;
  /** The way out, if there is one worth offering. */
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onAction?(): void;
  /** The action is under way: it spins, and a second press does nothing. */
  busy?: boolean;
  onDismiss(): void;
  /** A problem rather than an offer — the pill picks up the warning colour. */
  tone?: 'accent' | 'wrong';
}

/**
 * The pill that drops from under the header. Installed, the app has no address
 * bar and no error console, so anything it needs to say about itself — a new
 * build waiting, a backend that would not talk — has to say it here or not at
 * all. Every one of them is dismissable: a notice that cannot be closed is a
 * notice they learn to read past.
 *
 * Frosted, like the question bar over the canvas: it floats over whatever is
 * under it, and the page reading through says so.
 */
export function Banner({
  message,
  icon: Lead,
  actionLabel,
  actionIcon: Icon,
  onAction,
  busy,
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
        'pointer-events-auto flex max-w-full items-center gap-2.5 rounded-full border bg-overlay/70 py-1.5 pl-4 pr-1.5 shadow-[0_16px_36px_-10px_rgba(0,0,0,0.6)] backdrop-blur-md',
        tone === 'wrong' ? 'border-wrong' : 'border-strong',
      )}
    >
      {Lead && <Lead className="-ml-1 size-4 shrink-0 text-accent" />}
      <span className={cx('min-w-0 truncate text-[13px]', tone === 'wrong' ? 'text-wrong-ink' : 'text-ink')}>
        {message}
      </span>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          disabled={busy}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[12px] font-semibold text-on-accent disabled:opacity-80"
        >
          {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : Icon && <Icon className="size-3.5" />}
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
