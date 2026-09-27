import { useState } from 'react';
import { motion } from 'motion/react';
import { cx } from '@/lib/cx';
import { useBackDismiss } from '@/lib/useBackDismiss';

interface Props {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm(): void;
  onCancel(): void;
  /** When set, the confirm button only unlocks once this is typed back. */
  confirmWord?: string;
  /** Paints the confirm button as a destruction rather than a choice. */
  danger?: boolean;
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  confirmWord,
  danger,
}: Props) {
  const [typed, setTyped] = useState('');
  useBackDismiss(true, onCancel);
  const locked = confirmWord !== undefined && typed.trim().toLowerCase() !== confirmWord.toLowerCase();

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="absolute inset-0 z-40 grid place-items-center bg-scrim p-6"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 18, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 10, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 460, damping: 36 }}
        className="flex w-full max-w-[400px] flex-col gap-3 rounded-2xl border border-strong bg-overlay p-[26px] shadow-[0_30px_70px_-20px_var(--color-shadow)]"
      >
        <h2 className="text-[19px] font-semibold">{title}</h2>
        <p className="text-sm leading-relaxed text-muted text-pretty">{body}</p>

        {confirmWord !== undefined && (
          <label className="mt-1 flex flex-col gap-1.5">
            <span className="text-[13px] text-faint">
              Type <span className="font-mono text-ink2">{confirmWord}</span> to confirm
            </span>
            <input
              value={typed}
              autoFocus
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !locked && onConfirm()}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              aria-label={`Type ${confirmWord} to confirm`}
              className="h-11 rounded-sm border border-border bg-well px-3 font-mono text-sm text-ink2 outline-none focus:border-accent"
            />
          </label>
        )}

        <div className="mt-1.5 flex gap-2.5">
          <button
            onClick={onCancel}
            className="grid h-12 flex-1 place-items-center rounded-md border border-strong bg-raised text-[15px]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={locked}
            className={cx(
              'grid h-12 flex-1 place-items-center rounded-md text-[15px] font-semibold transition-colors',
              locked
                ? 'cursor-not-allowed bg-raised text-faint'
                : danger
                  ? 'bg-wrong text-ink hover:brightness-110'
                  : 'bg-accent text-on-accent hover:bg-accent-hi',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
