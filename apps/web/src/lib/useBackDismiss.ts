import { useEffect, useRef } from 'react';

/**
 * Makes an overlay answer the device back button. Opening pushes a history
 * entry at the same URL; back pops it and closes the overlay instead of leaving
 * the app. Closing by any other means removes the entry again, so the back
 * button never has to be pressed twice for one dismissal.
 */
export function useBackDismiss(open: boolean, close: () => void): void {
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open) return;

    let pushed = true;
    window.history.pushState({ calcflowOverlay: true }, '');

    const onPop = () => {
      pushed = false;
      closeRef.current();
    };
    window.addEventListener('popstate', onPop);

    return () => {
      window.removeEventListener('popstate', onPop);
      if (pushed) window.history.back();
    };
  }, [open]);
}
