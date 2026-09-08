import { registerSW } from 'virtual:pwa-register';

/**
 * The service worker, and the one question it is allowed to ask. A new build
 * reaching the device is not a reason to replace the app under his hands, so
 * the worker installs, waits, and says so; `apply` is what lets it through.
 *
 * Deliberately not in the store: this runs before React does, and the store is
 * about a practice session rather than about the shell it runs in.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
let ready = false;
let apply: ((reload?: boolean) => Promise<void>) | null = null;

/** An hour is often enough for a build pushed this morning to arrive today. */
const CHECK_MS = 60 * 60 * 1000;

function announce(): void {
  for (const fn of listeners) fn();
}

export function startUpdates(): void {
  apply = registerSW({
    immediate: true,
    onNeedRefresh() {
      ready = true;
      announce();
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // A PWA left open for days never asks again on its own. It asks on a
      // timer, and whenever he comes back to it — which is when a reload costs
      // him the least.
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

export function updateReady(): boolean {
  return ready;
}

/** Skips the waiting worker and reloads onto the new build. */
export function applyUpdate(): void {
  void apply?.(true);
}
