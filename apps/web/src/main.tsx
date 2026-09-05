import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { useStore } from './state/store';
import './styles/index.css';

registerSW({ immediate: true });

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
