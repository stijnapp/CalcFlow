import { useRef } from 'react';

/** Long enough not to fire while he is starting a scroll, short enough to find. */
const HOLD_MS = 480;
/** Past this much travel it was a drag, not a hold. */
const SLOP = 12;

/**
 * A press held in one place. Returns props to spread onto the element.
 *
 * It fires while the finger is still down rather than on release, so the buzz
 * and the toast arrive at the moment the hold is recognised — releasing first
 * would make it feel like the app was thinking about it.
 */
export function useLongPress(onHold: () => void) {
  const timer = useRef<number | undefined>(undefined);
  const from = useRef({ x: 0, y: 0 });
  /** Several of these sit inside buttons; a hold must not also press one. */
  const held = useRef(false);

  const stop = () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
  };

  return {
    onPointerDown(e: React.PointerEvent) {
      // Right-click and the middle button are not holds.
      if (e.button !== 0) return;
      from.current = { x: e.clientX, y: e.clientY };
      held.current = false;
      stop();
      timer.current = window.setTimeout(() => {
        timer.current = undefined;
        held.current = true;
        navigator.vibrate?.(12);
        onHold();
      }, HOLD_MS);
    },
    onPointerMove(e: React.PointerEvent) {
      if (timer.current === undefined) return;
      const { x, y } = from.current;
      if (Math.abs(e.clientX - x) > SLOP || Math.abs(e.clientY - y) > SLOP) stop();
    },
    onPointerUp: stop,
    onPointerCancel: stop,
    onPointerLeave: stop,
    /*
     * Captured, so the click a hold ends with is swallowed here rather than
     * reaching the rule card or the answer field this maths is sitting inside.
     */
    onClickCapture(e: React.MouseEvent) {
      if (!held.current) return;
      held.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
    /* Android offers its own text menu on a long press, and a right-click on a
       desktop offers another; neither is the one being asked for here. */
    onContextMenu(e: React.MouseEvent) {
      e.preventDefault();
    },
  };
}
