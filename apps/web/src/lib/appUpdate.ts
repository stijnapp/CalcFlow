import { registerSW } from 'virtual:pwa-register';
import { APP_VERSION } from './version';

/**
 * The service worker, and the one question it is allowed to ask. A new build
 * reaching the device is not a reason to replace the app under their hands, so
 * the worker installs, waits, and says so; `applyUpdate` is what lets it through.
 *
 * Deliberately not in the store: this runs before React does, and the store is
 * about a practice session rather than about the shell it runs in.
 */

export interface UpdateState {
  /** A new build is installed and waiting. */
  ready: boolean;
  /** The waiting build's version, once it has said. */
  next: string | null;
  /** They said yes, and the page is about to reload onto it. */
  applying: boolean;
  /** This build replaced another since it was last opened: the one it replaced. */
  updatedFrom: string | null;
}

type Listener = () => void;

const listeners = new Set<Listener>();
let apply: ((reload?: boolean) => Promise<void>) | null = null;

/** Where the version last opened on this device is kept. */
const SEEN_KEY = 'calcflow.version';

/**
 * The version this device last ran, swapped for this one. Read once, at load:
 * an update can arrive through the banner or simply by closing the app and
 * opening it again, and either way the first screen of the new build says so.
 */
function takeUpdatedFrom(): string | null {
  try {
    const seen = localStorage.getItem(SEEN_KEY);
    localStorage.setItem(SEEN_KEY, APP_VERSION);
    if (seen) return seen !== APP_VERSION ? seen : null;
    // Nothing kept: a first visit, or a build from before versions were kept.
    // A worker already in charge of the page means the app was here before.
    return navigator.serviceWorker?.controller ? 'an earlier version' : null;
  } catch {
    return null;
  }
}

let state: UpdateState = { ready: false, next: null, applying: false, updatedFrom: takeUpdatedFrom() };

function patch(next: Partial<UpdateState>): void {
  state = { ...state, ...next };
  for (const fn of listeners) fn();
}

/** An hour is often enough for a build pushed this morning to arrive today. */
const CHECK_MS = 60 * 60 * 1000;

/**
 * The waiting build's version, from the file every build writes beside its
 * shell. Not precached, and asked for past every cache, so it is the server's
 * copy — which is the build the waiting worker came from.
 */
async function fetchNextVersion(): Promise<string | null> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const body = (await res.json()) as { version?: unknown };
    return typeof body.version === 'string' ? body.version : null;
  } catch {
    return null;
  }
}

export function startUpdates(): void {
  apply = registerSW({
    immediate: true,
    onNeedRefresh() {
      patch({ ready: true });
      void fetchNextVersion().then((next) => {
        if (next && next !== APP_VERSION) patch({ next });
      });
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // A PWA left open for days never asks again on its own. It asks on a
      // timer, and whenever they come back to it — which is when a reload
      // costs them the least.
      const check = () => {
        if (document.visibilityState === 'visible') void registration.update();
      };
      setInterval(check, CHECK_MS);
      document.addEventListener('visibilitychange', check);
    },
  });
}

export function subscribeUpdate(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function updateState(): UpdateState {
  return state;
}

/** Skips the waiting worker and reloads onto the new build. */
export function applyUpdate(): void {
  if (state.applying) return;
  patch({ applying: true });
  void apply?.(true);
}

/** The "updated" notice has been read. */
export function dismissUpdated(): void {
  patch({ updatedFrom: null });
}
