import { useCallback, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { loopContains, type Box, type StrokePoint } from '../strokes';
import {
  BLOCK_HEIGHT,
  BLOCK_WIDTH,
  follow,
  union,
  type Redraw,
  type Scene,
} from './scene';
import type { TexBlocks } from './useTexBlocks';

/** Breathing room between the selection box and what it holds. */
const SELECT_PAD = 10;

/** What the lasso caught, and the box they drag to move it. */
export interface Selection {
  strokes: number[];
  blocks: number[];
  box: Box;
}

export interface Lasso {
  selection: Selection | null;
  dropSelection(): void;
  closeLasso(): void;
  deleteSelection(): void;
  dragSelection(e: ReactPointerEvent<HTMLDivElement>): void;
}

/**
 * Everything the loop touches comes with it: a stroke with one point inside
 * counts, which is how a tail or a minus sign avoids being left behind.
 */
function selectionIn(scene: Scene, loop: StrokePoint[]): Selection | null {
  const strokes = scene.surface.selectIn(loop);
  const caught = scene.blocks.filter(
    (b) =>
      loopContains(loop, b.x, b.y) ||
      loopContains(loop, b.x + BLOCK_WIDTH / 2, b.y + BLOCK_HEIGHT / 2),
  );
  if (strokes.length === 0 && caught.length === 0) return null;

  let box = scene.surface.boundsOf(new Set(strokes));
  for (const b of caught) {
    const own = { x: b.x, y: b.y, w: BLOCK_WIDTH, h: BLOCK_HEIGHT };
    box = box ? union(box, own) : own;
  }
  if (!box) return null;
  const pad = SELECT_PAD;
  return {
    strokes,
    blocks: caught.map((b) => b.id),
    box: { x: box.x - pad, y: box.y - pad, w: box.w + pad * 2, h: box.h + pad * 2 },
  };
}

export function useLasso(
  sceneRef: RefObject<Scene>,
  texBlocks: Pick<TexBlocks, 'moveBlocks' | 'removeBlocks'>,
  redraw: Redraw,
  onToast: (message: string) => void,
): Lasso {
  const { moveBlocks, removeBlocks } = texBlocks;
  const { schedulePaint, markDirty } = redraw;
  const [selection, setSelection] = useState<Selection | null>(null);

  const dropSelection = useCallback(() => setSelection(null), []);

  /**
   * Letting go closes the loop back to where it started, so they never have to
   * meet their own line.
   */
  const closeLasso = useCallback(() => {
    const scene = sceneRef.current;
    const loop = scene.lasso;
    scene.lasso = null;
    schedulePaint();
    const caught = loop && loop.length >= 3 ? selectionIn(scene, loop) : null;
    if (caught) setSelection(caught);
  }, [sceneRef, schedulePaint]);

  /**
   * Rubbing out a whole line with the eraser is a dozen careful passes; having
   * looped it already, the box is the natural place to say "not that".
   */
  const deleteSelection = () => {
    if (!selection) return;
    sceneRef.current.surface.remove(new Set(selection.strokes));
    const gone = new Set(selection.blocks);
    if (gone.size > 0) removeBlocks(gone);
    setSelection(null);
    schedulePaint();
    markDirty();
    onToast('Deleted the selection');
  };

  /** Dragging the box carries the strokes and the blocks inside it together. */
  const dragSelection = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!selection) return;
    const strokes = new Set(selection.strokes);
    const inBlocks = new Set(selection.blocks);
    const last = { x: e.clientX, y: e.clientY };
    // Stepwise rather than from the start point: the strokes move in place, so
    // there is no original left to measure the total offset against.
    const drag = (ev: PointerEvent) => {
      const dx = ev.clientX - last.x;
      const dy = ev.clientY - last.y;
      last.x = ev.clientX;
      last.y = ev.clientY;
      sceneRef.current.surface.translate(strokes, dx, dy);
      if (inBlocks.size > 0) moveBlocks(inBlocks, dx, dy);
      setSelection(
        (sel) => sel && { ...sel, box: { ...sel.box, x: sel.box.x + dx, y: sel.box.y + dy } },
      );
      schedulePaint();
    };
    follow(e, drag, markDirty);
  };

  return { selection, dropSelection, closeLasso, deleteSelection, dragSelection };
}
