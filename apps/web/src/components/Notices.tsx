import { useEffect, useState, useSyncExternalStore } from 'react';
import { CircleCheck, KeyRound, RefreshCw, SlidersHorizontal, WifiOff } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { applyUpdate, dismissUpdated, subscribeUpdate, updateState, type UpdateState } from '@/lib/appUpdate';
import { APP_VERSION } from '@/lib/version';
import { useStore } from '@/state/store';
import { Banner } from './Banner';

/** How to get out of each way an exchange with the backend can fail. */
const WAY_OUT = {
  auth: { label: 'Settings', icon: KeyRound, toSettings: true },
  protocol: { label: 'Settings', icon: SlidersHorizontal, toSettings: true },
  offline: { label: 'Retry', icon: WifiOff, toSettings: false },
  server: { label: 'Retry', icon: RefreshCw, toSettings: false },
} as const;

/** Long enough to read on the way into the app; it is news, not a question. */
const UPDATED_MS = 8000;

/**
 * Everything the shell has to say for itself, in one column under the header.
 * Clear of the header rather than over it: the way out of a session and the
 * hint button both live up there, and neither should be behind a notice.
 *
 * The conditions live here rather than inside child components, because
 * `AnimatePresence` only sees a notice leave if the element itself leaves —
 * a child that renders `null` is still a child, and would vanish without its
 * exit.
 */
export function Notices() {
  const update = useSyncExternalStore(subscribeUpdate, updateState, updateState);
  const [updateHidden, setUpdateHidden] = useState(false);
  const sync = useSyncNotice();

  useEffect(() => {
    if (!update.updatedFrom) return;
    const timer = setTimeout(dismissUpdated, UPDATED_MS);
    return () => clearTimeout(timer);
  }, [update.updatedFrom]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-14 z-50 flex flex-col items-center gap-2 px-3">
      <AnimatePresence>
        {update.updatedFrom && !update.ready && (
          <Banner
            key="updated"
            icon={CircleCheck}
            message={`Updated to version ${APP_VERSION}`}
            onDismiss={dismissUpdated}
          />
        )}
        {update.ready && !updateHidden && (
          <Banner
            key="update"
            message={updateMessage(update)}
            actionLabel={update.applying ? 'Updating' : 'Update'}
            actionIcon={RefreshCw}
            busy={update.applying}
            onAction={applyUpdate}
            onDismiss={() => setUpdateHidden(true)}
          />
        )}
        {sync && <Banner key="sync" tone="wrong" {...sync} />}
      </AnimatePresence>
    </div>
  );
}

function updateMessage({ next, applying }: UpdateState): string {
  if (applying) return next ? `Updating to ${next}…` : 'Updating…';
  return next ? `Version ${next} is ready` : 'A new version is ready';
}

/** The sync failure worth a notice, with its way out — or nothing. */
function useSyncNotice() {
  const error = useStore((s) => s.syncError);
  const kind = useStore((s) => s.syncErrorKind);
  const dismissed = useStore((s) => s.syncErrorDismissed);
  const dismissSyncError = useStore((s) => s.dismissSyncError);
  const go = useStore((s) => s.go);
  const syncNow = useStore((s) => s.syncNow);

  // Losing the tailnet for a moment is not news — the minute timer would
  // otherwise announce every walk out of wifi range. A minute of it is news,
  // and the retries mean a real outage still surfaces.
  const [offlineAMinute, setOfflineAMinute] = useState(false);
  useEffect(() => {
    if (!error || kind !== 'offline') return;
    const timer = setTimeout(() => setOfflineAMinute(true), 60_000);
    return () => {
      clearTimeout(timer);
      setOfflineAMinute(false);
    };
  }, [error, kind]);
  const settled = kind !== 'offline' || offlineAMinute;

  if (!error || kind === dismissed || !settled) return null;
  const out = WAY_OUT[kind ?? 'server'];
  return {
    message: error,
    actionLabel: out.label,
    actionIcon: out.icon,
    onAction() {
      dismissSyncError();
      if (out.toSettings) go('settings');
      else syncNow();
    },
    onDismiss: dismissSyncError,
  };
}
