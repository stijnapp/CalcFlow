import { motion } from 'motion/react';
import { useBackDismiss } from '@/lib/useBackDismiss';

interface Props {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm(): void;
  onCancel(): void;
}

export function ConfirmDialog({ title, body, confirmLabel, onConfirm, onCancel }: Props) {
  useBackDismiss(true, onCancel);
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="absolute inset-0 z-40 grid place-items-center bg-[rgba(8,7,6,0.62)] p-6"
    >
      <motion.div
        initial={{ y: 18, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 10, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 460, damping: 36 }}
        className="flex w-full max-w-[400px] flex-col gap-3 rounded-2xl border border-strong bg-overlay p-[26px] shadow-[0_30px_70px_-20px_#000]"
      >
        <h2 className="text-[19px] font-semibold">{title}</h2>
        <p className="text-sm leading-relaxed text-muted text-pretty">{body}</p>
        <div className="mt-1.5 flex gap-2.5">
          <button
            onClick={onCancel}
            className="grid h-12 flex-1 place-items-center rounded-md border border-strong bg-raised text-[15px]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="grid h-12 flex-1 place-items-center rounded-md bg-accent text-[15px] font-semibold text-on-accent hover:bg-accent-hi"
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
