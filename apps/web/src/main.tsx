import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { useStore } from './state/store';
import './styles/index.css';

registerSW({ immediate: true });

// A handle on the store from the devtools console — stripped from production
// builds. Handy for driving a session without tapping through the keyboard.
if (import.meta.env.DEV) {
  (window as unknown as { calcflow: typeof useStore }).calcflow = useStore;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
