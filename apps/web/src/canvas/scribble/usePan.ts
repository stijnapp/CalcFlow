import { useCallback, useEffect, useState, type RefObject } from 'react';
import type { Redraw, Scene } from './scene';

/** Per millisecond; a flick below this is a scroll that simply stopped. */
const FLING_MIN = 0.06;
/** Fraction of the fling speed left after a millisecond of coasting. */
const FLING_DECAY = 0.9965;

export interface Pan {
  panY: number;
  setPan(value: number): void;
  /** Straight to where a page was left, without saving it back. */
  jumpTo(value: number): void;
  stopFling(): void;
  startFling(): void;
}

/**
 * A fixed viewport onto an infinitely tall surface. The page never scrolls —
 * they pan within the canvas instead.
 */
export function usePan(sceneRef: RefObject<Scene>, redraw: Redraw): Pan {
  const { schedulePaint, markDirty } = redraw;
  const [panY, setPanY] = useState(0);

  /**
   * Down is unbounded — they can always scroll into empty paper, and the thumb
   * shrinks to say so. Up stops half a screen above the topmost mark, which is
   * the headroom that lets them park the first line clear of the keyboard.
   */
  const setPan = useCallback(
    (value: number) => {
      const scene = sceneRef.current;
      scene.pan = Math.max(scene.minPan, value);
      setPanY(scene.pan);
      schedulePaint();
      markDirty();
    },
    [sceneRef, schedulePaint, markDirty],
  );

  const jumpTo = useCallback(
    (value: number) => {
      sceneRef.current.pan = value;
      setPanY(value);
    },
    [sceneRef],
  );

  const stopFling = useCallback(() => {
    const { fling } = sceneRef.current;
    cancelAnimationFrame(fling.frame);
    fling.frame = 0;
    fling.v = 0;
  }, [sceneRef]);

  /** Coasts on after the finger leaves, so a long derivation is one flick away. */
  const startFling = useCallback(() => {
    const scene = sceneRef.current;
    const state = scene.fling;
    if (Math.abs(state.v) < FLING_MIN) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      state.v *= FLING_DECAY ** dt;
      const next = scene.pan + state.v * dt;
      setPan(next);
      // Hitting the top is a wall, not a bounce.
      if (next <= scene.minPan || Math.abs(state.v) < 0.015) {
        state.frame = 0;
        state.v = 0;
        return;
      }
      state.frame = requestAnimationFrame(tick);
    };
    state.frame = requestAnimationFrame(tick);
  }, [sceneRef, setPan]);

  useEffect(() => stopFling, [stopFling]);

  return { panY, setPan, jumpTo, stopFling, startFling };
}
