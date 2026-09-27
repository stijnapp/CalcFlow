import type { StateCreator } from 'zustand';
import {
  attemptsById,
  clearQueue,
  loadCursor,
  mergeAttempts,
  queuedCount,
  queuedIds,
  saveCursor,
  saveSettings,
} from '../db';
import { computeStats } from '../stats';
import type { Store } from '../store';
import {
  SyncError,
  backendOrigin,
  runSync,
  type SyncFailure,
  type SyncPorts,
  type SyncReport,
  type Target,
} from '../sync';

export interface SyncSlice {
  /** Attempts written here but not yet accepted by the server. */
  queued: number;
  /** An exchange with the backend is in flight. */
  syncing: boolean;
  /** Why the last exchange failed, for the settings screen. Cleared by a good one. */
  syncError: string | null;
  /** Which kind of failure it was, so the notice can offer the right way out. */
  syncErrorKind: SyncFailure | null;
  /**
   * The kind of failure they have already waved away. A background sync retries
   * every minute; without this the same notice comes back a minute after they
   * closed it, which is how a notice teaches you to ignore it.
   *
   * Keyed by kind and not by wording — a backend that is down alternates
   * between "did not answer" and "unreachable", and each used to count as news
   * — and kept on the device, so closing the app does not un-dismiss it. It
   * lapses when a sync gets through or the address or token changes: either
   * is the start of a different story.
   */
  syncErrorDismissed: SyncFailure | null;

  refreshQueued(): Promise<void>;
  /** Exchanges with the backend and says how it went. */
  syncNow(): void;
  dismissSyncError(): void;
  /** Lets a dismissed failure show again, for when the story has changed. */
  undismissSyncError(): void;
  /** The same exchange, with nothing to say unless it fails. */
  syncQuietly(): void;
}

type Get = () => Store;
type Set = (partial: Partial<Store>) => void;

const DISMISSED_KEY = 'calcflow.syncDismissed';
const FAILURES: readonly string[] = ['offline', 'auth', 'server', 'protocol'] satisfies SyncFailure[];

/** Storage can be missing or refuse (private mode); the notice then just shows again. */
function loadDismissed(): SyncFailure | null {
  try {
    const value = localStorage.getItem(DISMISSED_KEY);
    return value && FAILURES.includes(value) ? (value as SyncFailure) : null;
  } catch {
    return null;
  }
}

function saveDismissed(kind: SyncFailure | null): void {
  try {
    if (kind) localStorage.setItem(DISMISSED_KEY, kind);
    else localStorage.removeItem(DISMISSED_KEY);
  } catch {
    // Dismissed for this run only.
  }
}

/**
 * The local half of the exchange. `merge` also folds what arrived into the
 * screens, because pulling the tablet's afternoon in should show up on the
 * stats page without a reload.
 */
function portsFor(get: Get, set: Set): SyncPorts {
  return {
    queuedIds,
    attemptsById,
    markSent: clearQueue,
    cursor: loadCursor,
    setCursor: saveCursor,

    async merge(incoming) {
      const fresh = await mergeAttempts(incoming);
      if (fresh.length > 0) {
        const attempts = [...get().attempts, ...fresh].sort((a, b) => a.ts - b.ts);
        set({ attempts, stats: computeStats(attempts) });
      }
      return fresh;
    },

    async settings() {
      return get().settings;
    },

    async adoptSettings(settings) {
      // Straight in, not through `patchSettings`: the stamp came from the device
      // that won, and restamping it here would make this one win the next round
      // with the same document.
      set({ settings });
      await saveSettings(settings);
    },
  };
}

/**
 * Where the API is. An empty field means wherever the app was served from,
 * which is the deployed case: one container answering for both halves. In dev
 * there is no such server behind Vite, so an empty field means unconfigured.
 */
function backend(get: Get): Target | 'unset' | 'unusable' {
  const { backendUrl, token } = get().settings;
  const sameOrigin = import.meta.env.DEV ? undefined : window.location.origin;
  if (!backendUrl.trim() && !sameOrigin) return 'unset';
  const origin = backendOrigin(backendUrl, sameOrigin);
  return origin ? { origin, token } : 'unusable';
}

const UNREACHABLE = {
  unset: 'Set a backend URL first',
  unusable: 'That backend address is not a URL',
} as const;

function summarise(report: SyncReport): string {
  const parts: string[] = [];
  if (report.sent > 0) parts.push(`sent ${report.sent}`);
  if (report.received > 0) parts.push(`received ${report.received}`);
  if (report.settings === 'received') parts.push('settings updated');
  if (report.settings === 'sent') parts.push('settings uploaded');
  return parts.length > 0 ? `Synced — ${parts.join(' · ')}` : 'Already up to date';
}

async function exchange(get: Get, set: Set, loud: boolean): Promise<void> {
  const target = backend(get);
  if (typeof target === 'string') {
    if (loud) get().showToast(UNREACHABLE[target]);
    return;
  }

  set({ syncing: true });
  try {
    const report = await runSync(portsFor(get, set), target);
    set({ syncError: null, syncErrorKind: null });
    get().undismissSyncError();
    get().patchSettings({ lastSyncedAt: Date.now() });
    await get().refreshQueued();
    if (loud) get().showToast(summarise(report));
  } catch (err) {
    // A failed exchange changes nothing: the queue is intact and the cursor has
    // not moved, so the next one picks up exactly where this one stopped.
    const known = err instanceof SyncError;
    if (!known) console.error('CalcFlow: sync failed', err);
    const message = known ? err.message : 'Sync failed';
    set({ syncError: message, syncErrorKind: known ? err.kind : 'server' });
    if (loud) get().showToast(message);
  } finally {
    set({ syncing: false });
  }
}

let inFlight = false;

/** One exchange at a time; a second request while one is running is that one. */
function launch(get: Get, set: Set, loud: boolean): void {
  if (inFlight) return;
  inFlight = true;
  void exchange(get, set, loud).finally(() => {
    inFlight = false;
  });
}

let autoSync = false;

/**
 * Flushes when the app comes to the front, when the network comes back, and
 * every minute it is being looked at. A hidden tab syncing is battery spent for
 * nobody: what it would have sent is still there when they return to it.
 */
export function startAutoSync(get: Get): void {
  if (autoSync || typeof window === 'undefined') return;
  autoSync = true;

  const tick = (): void => {
    if (document.visibilityState !== 'visible') return;
    if (navigator.onLine === false) return;
    get().syncQuietly();
  };

  window.addEventListener('focus', tick);
  window.addEventListener('online', tick);
  document.addEventListener('visibilitychange', tick);
  setInterval(tick, 60_000);
  tick();
}

export const createSyncSlice: StateCreator<Store, [], [], SyncSlice> = (set, get) => ({
  queued: 0,
  syncing: false,
  syncError: null,
  syncErrorKind: null,
  syncErrorDismissed: loadDismissed(),

  async refreshQueued() {
    try {
      set({ queued: await queuedCount() });
    } catch {
      // The badge is a nicety; a store that cannot be read must not throw here.
    }
  },

  syncNow() {
    launch(get, set, true);
  },

  dismissSyncError() {
    const kind = get().syncErrorKind;
    set({ syncErrorDismissed: kind });
    saveDismissed(kind);
  },

  undismissSyncError() {
    set({ syncErrorDismissed: null });
    saveDismissed(null);
  },

  syncQuietly() {
    launch(get, set, false);
  },
});
