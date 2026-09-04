import { useCallback, useRef, useState } from 'react';
import { useStore } from '@/state/store';
import type { CanvasHandle, CanvasTool } from '@/canvas/ScribbleCanvas';

/** The chrome both practice layouts share: tool state and the clear dialog. */
export function usePractice() {
  const canvas = useRef<CanvasHandle>(null);
  const [tool, setTool] = useState<CanvasTool>('pen2');
  const [clearAsk, setClearAsk] = useState(false);
  const showToast = useStore((s) => s.showToast);

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

  return {
    canvas,
    tool,
    setTool,
    clearAsk,
    setClearAsk,
    askClear,
    confirmClear,
    undo: () => canvas.current?.undo(),
    redo: () => canvas.current?.redo(),
  };
}
