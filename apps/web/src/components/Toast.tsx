import { AnimatePresence, motion, useMotionValue, useTransform } from 'motion/react';
import { useStore } from '@/state/store';

/** Past this much sideways travel, letting go throws the toast away. */
const THROW = 90;

/**
 * Brief, non-blocking, and always says what happened. Only ever one: a second
 * message waits for the first to leave rather than landing beside it, so a
 * flurry of two- and three-finger taps reads as a queue and not a scatter.
 */
export function Toast() {
  const toast = useStore((s) => s.toast);
  const toastId = useStore((s) => s.toastId);
  const dismissToast = useStore((s) => s.dismissToast);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-7 z-40 flex justify-center">
      <AnimatePresence mode="wait">
        {toast && <Pill key={toastId} message={toast} onDismiss={dismissToast} />}
      </AnimatePresence>
    </div>
  );
}

/**
 * Two layers on purpose: the outer one owns the entrance and exit, the inner
 * one the swipe, so a throw in progress never fights the spring that brought
 * the pill in.
 */
function Pill({ message, onDismiss }: { message: string; onDismiss(): void }) {
  const x = useMotionValue(0);
  // It fades as it goes, so a half-hearted swipe reads as "not far enough".
  const opacity = useTransform(x, [-THROW * 1.6, 0, THROW * 1.6], [0, 1, 0]);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 520, damping: 36 }}
    >
      <motion.div
        style={{ x, opacity }}
        drag="x"
        dragSnapToOrigin
        dragElastic={0.6}
        onDragEnd={(_, info) => {
          if (Math.abs(info.offset.x) > THROW || Math.abs(info.velocity.x) > 480) onDismiss();
        }}
        className="pointer-events-auto cursor-grab touch-none rounded-full border border-strong bg-overlay px-5 py-2.5 text-sm shadow-[0_12px_30px_-8px_var(--color-shadow)] active:cursor-grabbing"
      >
        {message}
      </motion.div>
    </motion.div>
  );
}
