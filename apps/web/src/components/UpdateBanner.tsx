import { useState, useSyncExternalStore } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { applyUpdate, subscribeUpdate, updateReady } from '@/lib/appUpdate';

/**
 * A new build has downloaded and is waiting. Installed, the app has no address
 * bar and no reload button, so without this the only way onto a new version was
 * to close it and hope — and the worker deliberately does not swap itself in
 * mid-problem. Dismissing it is a "not now": the build is still there, and it
 * comes back the next time the app starts.
 */
export function UpdateBanner() {
  const ready = useSyncExternalStore(subscribeUpdate, updateReady, () => false);
  const [hidden, setHidden] = useState(false);

  return (
    /* Clear of the header rather than over it: the way out of a session and the
       hint button both live up there, and neither should be behind a notice. */
    <div className="pointer-events-none absolute inset-x-0 top-14 z-50 flex justify-center px-3">
      <AnimatePresence>
        {ready && !hidden && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 520, damping: 38 }}
            className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-strong bg-overlay py-1.5 pl-4 pr-1.5 shadow-[0_16px_36px_-10px_#000]"
          >
            <span className="text-[13px] text-ink">New version ready</span>
            <button
              onClick={applyUpdate}
              className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[12px] font-semibold text-on-accent"
            >
              <RefreshCw className="size-3.5" />
              Refresh
            </button>
            <button
              onClick={() => setHidden(true)}
              aria-label="Not now"
              className="grid size-7 shrink-0 place-items-center rounded-full text-muted hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
