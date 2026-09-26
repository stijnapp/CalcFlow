import { useEffect, useState, useSyncExternalStore } from 'react';
import { KeyRound, RefreshCw, SlidersHorizontal, WifiOff } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { applyUpdate, subscribeUpdate, updateReady } from '@/lib/appUpdate';
import { useStore } from '@/state/store';
import { Banner } from './Banner';

/** How to get out of each way an exchange with the backend can fail. */
const WAY_OUT = {
  auth: { label: 'Settings', icon: KeyRound, toSettings: true },
  protocol: { label: 'Settings', icon: SlidersHorizontal, toSettings: true },
  offline: { label: 'Retry', icon: WifiOff, toSettings: false },
  server: { label: 'Retry', icon: RefreshCw, toSettings: false },
} as const;

/**
 * Everything the shell has to say for itself, in one column under the header.
 * Clear of the header rather than over it: the way out of a session and the
 * hint button both live up there, and neither should be behind a notice.
 *
 * The conditions live here rather than inside two child components, because
 * `AnimatePresence` only sees a notice leave if the element itself leaves —
 * a child that renders `null` is still a child, and would vanish without its
 * exit.
 */
export function Notices() {
  const update = useSyncExternalStore(subscribeUpdate, updateReady, () => false);
  const [updateHidden, setUpdateHidden] = useState(false);
  const error = useStore((s) => s.syncError);
  const kind = useStore((s) => s.syncErrorKind);
  const dismissed = useStore((s) => s.syncErrorDismissed);
  const store = useStore();

  // Losing the tailnet for a moment is not news — the minute timer would
  // otherwise announce every walk out of wifi range. A minute of it is news,
  // and the retries mean a real outage still surfaces.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!error) {
      setSettled(false);
      return;
    }
    if (kind !== 'offline') {
      setSettled(true);
      return;
    }
    const timer = setTimeout(() => setSettled(true), 60_000);
    return () => clearTimeout(timer);
  }, [error, kind]);

  const out = WAY_OUT[kind ?? 'server'];
  const showSync = Boolean(error) && kind !== dismissed && settled;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-14 z-50 flex flex-col items-center gap-2 px-3">
      <AnimatePresence>
        {update && !updateHidden && (
          <Banner
            key="update"
            message="New version ready"
            actionLabel="Refresh"
            actionIcon={RefreshCw}
            onAction={applyUpdate}
            onDismiss={() => setUpdateHidden(true)}
          />
        )}
        {showSync && (
          <Banner
            key="sync"
            tone="wrong"
            message={error!}
            actionLabel={out.label}
            actionIcon={out.icon}
            onAction={() => {
              store.dismissSyncError();
              if (out.toSettings) store.go('settings');
              else store.syncNow();
            }}
            onDismiss={store.dismissSyncError}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
