import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { startUpdates } from './lib/appUpdate';
import { watchForInstall } from './lib/install';
import { useStore } from './state/store';
import './styles/index.css';

if (import.meta.env.DEV) {
  /*
   * The dev server has no business installing a service worker, and one used to.
   * It precached the dev `index.html` — the copy that asks for `/src/main.tsx` —
   * and answered every navigation with it, so pointing the same origin at a
   * built app served that copy, the request 404'd, and the blank page it left
   * could not reach the code that would repair it. Its own script is missing
   * from a build too, so Chrome never replaced it either. Clearing it here is
   * what makes `npm run dev` the way back for a device that is already stuck.
   */
  void (async () => {
    const regs = await navigator.serviceWorker?.getRegistrations();
    if (!regs?.length) return;
    await Promise.all(regs.map((r) => r.unregister()));
    await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
    location.reload();
  })();
} else {
  startUpdates();
}

/*
 * A long press anywhere opens Chrome's own back/forward/reload/share menu over
 * the app — on exactly the gesture a resting palm makes, and with nothing to
 * offer a drawing surface. Text fields keep theirs, so selecting and pasting an
 * answer still works.
 */
document.addEventListener('contextmenu', (e) => {
  const target = e.target as HTMLElement | null;
  if (target?.closest('input, textarea, [contenteditable]')) return;
  e.preventDefault();
});

// A handle on the store from the devtools console — stripped from production
// builds. Handy for driving a session without tapping through the keyboard.
if (import.meta.env.DEV) {
  (window as unknown as { calcflow: typeof useStore }).calcflow = useStore;
}

// Before the render, because Chrome fires the event whether we are ready or not.
watchForInstall();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
