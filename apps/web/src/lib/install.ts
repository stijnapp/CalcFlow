import { useSyncExternalStore } from 'react';

/**
 * Chrome decides on its own when an app is installable and fires
 * `beforeinstallprompt` to say so — once, early, and often before React has
 * mounted. Left alone it shows a mini-infobar that is easy to miss and, once
 * dismissed, does not come back for months. So the event is caught at startup
 * and kept, and Settings gets a button that spends it whenever he is ready.
 */

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let waiting: InstallPrompt | null = null;
const watchers = new Set<() => void>();

function changed(): void {
  for (const w of watchers) w();
}

/** Called before the app renders, because the event does not wait for it. */
export function watchForInstall(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    // Holds back Chrome's own banner; the button in Settings replaces it.
    e.preventDefault();
    waiting = e as InstallPrompt;
    changed();
  });
  window.addEventListener('appinstalled', () => {
    waiting = null;
    changed();
  });
}

/**
 * Already running as an app rather than in a tab. The manifest asks for
 * fullscreen and lists two fallbacks, so all three count.
 */
export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const asApp = ['fullscreen', 'standalone', 'minimal-ui'].some(
    (mode) => window.matchMedia(`(display-mode: ${mode})`).matches,
  );
  // Safari's own spelling of the same thing.
  const legacy = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return asApp || legacy;
}

function subscribe(onChange: () => void): () => void {
  watchers.add(onChange);
  return () => watchers.delete(onChange);
}

/** Whether there is an install to offer. False once it has been spent. */
export function useCanInstall(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => waiting !== null,
    () => false,
  );
}

/** Answers whether he accepted, so the caller can say so. */
export async function promptInstall(): Promise<boolean> {
  const prompt = waiting;
  if (!prompt) return false;
  // An event can only be spent once, whichever way he answers.
  waiting = null;
  changed();
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  return outcome === 'accepted';
}
