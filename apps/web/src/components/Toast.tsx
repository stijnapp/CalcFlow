import { AnimatePresence, motion } from 'motion/react';
import { useStore } from '@/state/store';

/** Brief, non-blocking, and always says what happened. */
export function Toast() {
  const toast = useStore((s) => s.toast);
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 520, damping: 36 }}
          className="pointer-events-none absolute bottom-7 left-1/2 z-40 -translate-x-1/2 rounded-full border border-strong bg-overlay px-5 py-2.5 text-sm shadow-[0_12px_30px_-8px_#000]"
        >
          {toast}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
