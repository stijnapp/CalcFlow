import { useCallback, useRef, useState } from 'react';
import { useBackGuard } from '@/lib/useBackDismiss';
import { useStore } from '@/state/store';
import type { CanvasHandle, CanvasTool } from '@/canvas/ScribbleCanvas';
import type { CanvasState } from '@/canvas/strokes';

/** The chrome both practice layouts share: tool state and the two dialogs. */
export function usePractice() {
  const canvas = useRef<CanvasHandle>(null);
  const [tool, setToolState] = useState<CanvasTool>('pen');
  const [penMenu, setPenMenu] = useState(false);
  const [clearAsk, setClearAsk] = useState(false);
  const [leaveAsk, setLeaveAsk] = useState(false);
  const showToast = useStore((s) => s.showToast);
  const endSession = useStore((s) => s.endSession);
  const setCanvasFullscreen = useStore((s) => s.setCanvasFullscreen);

  // Read and written straight off the store rather than through props: the
  // canvas is memoised on purpose, and a page of strokes flowing back down
  // through it on every save would undo that.
  const getCanvas = useCallback(() => useStore.getState().session?.canvas ?? null, []);
  const saveCanvas = useCallback((canvas: CanvasState) => {
    useStore.getState().setCanvasState(canvas);
  }, []);

  // The back gesture used to walk straight out of the session and take the
  // working with it. It asks first now — and while the canvas is filling the
  // screen, it is read as a way out of that rather than out of the session.
  useBackGuard(true, () => {
    if (useStore.getState().canvasFullscreen) {
      setCanvasFullscreen(false);
      return;
    }
    setLeaveAsk(true);
  });

  /** Tapping the pen a second time is what opens its width picker. */
  const setTool = useCallback(
    (next: CanvasTool) => {
      setPenMenu(next === 'pen' && tool === 'pen' ? (open) => !open : false);
      setToolState(next);
    },
    [tool],
  );

  const askClear = useCallback(() => {
    if (canvas.current?.isEmpty()) {
      showToast('Canvas already empty');
      return;
    }
    setClearAsk(true);
  }, [showToast]);

  const confirmClear = useCallback(() => {
    canvas.current?.clear();
    setClearAsk(false);
    showToast('Cleared');
  }, [showToast]);

  const confirmLeave = useCallback(() => {
    setLeaveAsk(false);
    endSession();
  }, [endSession]);

  return {
    canvas,
    getCanvas,
    saveCanvas,
    tool,
    setTool,
    penMenu,
    setPenMenu,
    clearAsk,
    setClearAsk,
    askClear,
    confirmClear,
    leaveAsk,
    setLeaveAsk,
    confirmLeave,
    undo: () => canvas.current?.undo(),
    redo: () => canvas.current?.redo(),
  };
}
