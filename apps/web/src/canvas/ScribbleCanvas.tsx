import { forwardRef, memo, useEffect, useRef } from 'react';
import type { CanvasSurface } from '@calcflow/shared';
import { cx } from '@/lib/cx';
import type { CanvasState } from './strokes';
import type { PlaneView } from './plane';
import {
  scrollbar,
  type CanvasHandle,
  type CanvasInsets,
  type CanvasTool,
} from './scribble/scene';
import { useCanvasHandle, useLatest, useRestore, useSaver, useScene } from './scribble/useScene';
import { usePainter } from './scribble/usePainter';
import { usePan } from './scribble/usePan';
import { useArrows, useHistory } from './scribble/useArrows';
import { useTexBlocks } from './scribble/useTexBlocks';
import { useLasso } from './scribble/useLasso';
import { useTypingLift } from './scribble/useTypingLift';
import { usePointer } from './scribble/pointer';
import {
  GestureHint,
  ScrollThumb,
  SelectionBox,
  TexBar,
  TexBlockList,
} from './scribble/overlays';

export type { CanvasHandle, CanvasInsets, CanvasTool };

interface Props {
  tool: CanvasTool;
  penWidth: number;
  penOnly: boolean;
  /** On a lattice question, whether a vector's ends land on whole numbers. */
  snap: boolean;
  surface: CanvasSurface;
  /**
   * Set on a graph question: real axes under the ink, and the answer drawn over
   * it once it is revealed. The paper setting is ignored while it is on — a
   * coordinate plane and ruled lines are two different backgrounds.
   */
  plane?: PlaneView | null;
  /** Changes when the problem does; a canvas from another problem is dropped. */
  problemKey: string;
  /**
   * Read on the way in rather than passed as a value, so restoring costs no
   * re-render and always sees the newest save — the canvas remounts every time
   * it goes fullscreen, and what it must come back with is what it had a
   * moment ago, not what the props held when the screen first rendered.
   */
  getInitial?(): CanvasState | null;
  onPersist?(state: CanvasState): void;
  onToast(message: string): void;
  /**
   * How far bars floating over the canvas reach in from its top and bottom
   * edges. The ink runs on underneath them; the scroll thumb, the gesture hint
   * and the line being typed keep clear.
   */
  insets?: CanvasInsets;
  className?: string;
}

const NO_INSETS: CanvasInsets = { top: 0, bottom: 0 };

const CURSOR: Record<CanvasTool, string> = {
  pen: 'crosshair',
  eraser: 'cell',
  type: 'text',
  lasso: 'crosshair',
  arrow: 'crosshair',
};

/**
 * A fixed viewport onto an infinitely tall surface: ink, typed lines, and on a
 * graph question the plane and their arrows. The page never scrolls — they pan
 * within the canvas instead. The parts live in ./scribble; this puts them
 * together.
 */
const ScribbleCanvasImpl = forwardRef<CanvasHandle, Props>(function ScribbleCanvas(props, ref) {
  const { tool, penOnly, problemKey, onToast, insets = NO_INSETS, className } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const { sceneRef, attach } = useScene();
  const markDirty = useSaver(sceneRef);
  const painter = usePainter(sceneRef, props.surface, props.plane);
  const { schedulePaint } = painter;
  const redraw = { schedulePaint, markDirty };
  const pan = usePan(sceneRef, redraw);
  const arrows = useArrows(sceneRef);
  const history = useHistory(sceneRef, arrows, redraw, onToast);
  const tex = useTexBlocks(sceneRef, markDirty);
  const lasso = useLasso(sceneRef, tex, redraw, onToast);
  const { lift, setTyping } = useTypingLift(rootRef);
  const bar = scrollbar({ ...painter, panY: pan.panY, blocks: tex.blocks });
  const { deselect } = tex;
  const { dropSelection } = lasso;

  useLatest(sceneRef, props, { blocks: tex.blocks, arrows: arrows.arrows, minPan: bar.ceiling });
  useEffect(markDirty, [tex.blocks, arrows.arrows, markDirty]);
  useRestore(sceneRef, problemKey, { ...tex, ...arrows, ...painter, ...pan, dropSelection });
  useCanvasHandle(ref, sceneRef, { ...history, ...tex, ...arrows, schedulePaint, markDirty });

  // Leaving the type tool settles whatever was being written, and leaving the
  // lasso drops what it was holding — a box they cannot drag is just a box.
  useEffect(() => {
    if (tool !== 'type') {
      deselect();
      // The field goes with the tool, and a field taken away while it has the
      // caret does not always say it has lost it.
      setTyping(false);
    }
    if (tool !== 'lasso') dropSelection();
  }, [tool, deselect, setTyping, dropSelection]);

  const input = usePointer({
    sceneRef,
    tool,
    penOnly,
    penWidth: props.penWidth,
    redraw,
    pan,
    arrows,
    lasso,
    history,
    typeTap: tex.typeTap,
  });

  return (
    <div ref={rootRef} className={cx('relative min-w-0 overflow-hidden', className)}>
      <canvas
        ref={attach}
        {...input}
        className="no-touch block h-full w-full"
        style={{ cursor: CURSOR[tool] }}
      />
      <ScrollThumb insets={insets} top={bar.thumbTop} height={bar.thumbHeight} />
      <SelectionBox
        selection={lasso.selection}
        panY={pan.panY}
        onDrag={lasso.dragSelection}
        onDelete={lasso.deleteSelection}
      />
      <TexBlockList
        blocks={tex.blocks}
        activeId={tex.activeId}
        panY={pan.panY}
        movable={tool === 'type'}
        onPick={tex.pickBlock}
        onDelete={tex.deleteActive}
      />
      <TexBar
        open={tool === 'type'}
        bottom={12 + Math.max(insets.bottom, lift)}
        frosted={insets.bottom > 0}
        active={tex.active}
        onChange={tex.editActive}
        onSubmit={tex.deselect}
        onTyping={setTyping}
        onDelete={tex.deleteActive}
      />
      <GestureHint tool={tool} penOnly={penOnly} bottom={insets.bottom + 16} />
    </div>
  );
});

/**
 * Memoised: the control column re-renders on every keystroke, and the canvas
 * has nothing to say about the answer being typed next to it.
 */
export const ScribbleCanvas = memo(ScribbleCanvasImpl);
