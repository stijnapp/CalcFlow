import { useCallback, useState, type RefObject } from 'react';
import { toMaths } from '../plane';
import type { StoredArrow } from '../strokes';
import { distanceToSegment, geometryOf, type Redraw, type Scene } from './scene';

export interface Arrows {
  /** Their own arrows on a graph question, in maths coordinates. */
  arrows: StoredArrow[];
  /** Rubs out a whole arrow, the way the eraser rubs out a whole stroke. */
  eraseArrowAt(worldX: number, worldY: number): boolean;
  /** Puts down the arrow under the pen, unless it was only a tap. */
  finishArrow(): void;
  /** Takes the newest arrow off, if it went down after the newest stroke. */
  undoArrow(): boolean;
  /** Brings back the arrow that left last, if it left after the last stroke did. */
  redoArrow(): boolean;
  /** Replaces every arrow and forgets the redo stack, for a page restored or cleared. */
  resetArrows(list: StoredArrow[]): void;
}

// Arrows and strokes are two stacks on one clock: undo takes whichever of the
// two went down last, redo brings back whichever left last.
export function useArrows(sceneRef: RefObject<Scene>): Arrows {
  const [arrows, setArrows] = useState<StoredArrow[]>([]);

  /** Into the scene at once, so a second undo before the render sees the first. */
  const putArrows = useCallback(
    (list: StoredArrow[]) => {
      sceneRef.current.arrows = list;
      setArrows(list);
    },
    [sceneRef],
  );

  /** Off the page and onto the redo stack, stamped with when it left. */
  const takeArrowOff = useCallback(
    (index: number) => {
      const scene = sceneRef.current;
      const gone = scene.arrows[index]!;
      scene.arrowsUndone.push({ ...gone, at: scene.surface.tick() });
      putArrows(scene.arrows.filter((_, i) => i !== index));
    },
    [sceneRef, putArrows],
  );

  const eraseArrowAt = useCallback(
    (worldX: number, worldY: number) => {
      const scene = sceneRef.current;
      const geo = geometryOf(scene);
      if (!geo || scene.arrows.length === 0) return false;
      const at = toMaths(geo, worldX, worldY);
      const radius = 14 / geo.scale;
      const hit = scene.arrows.findIndex((a) => distanceToSegment(at.x, at.y, a) <= radius);
      if (hit < 0) return false;
      takeArrowOff(hit);
      return true;
    },
    [sceneRef, takeArrowOff],
  );

  // A tap is not an arrow; anything shorter than a grid square is a slip.
  const finishArrow = useCallback(() => {
    const scene = sceneRef.current;
    const done = scene.drawingArrow;
    scene.drawingArrow = null;
    if (!done || Math.hypot(done.x2 - done.x1, done.y2 - done.y1) < 0.5) return;
    putArrows([...scene.arrows, { ...done, at: scene.surface.tick() }]);
    scene.arrowsUndone = [];
    scene.surface.undone = [];
  }, [sceneRef, putArrows]);

  const undoArrow = useCallback(() => {
    const scene = sceneRef.current;
    const arrow = scene.arrows.at(-1);
    if (!arrow || (arrow.at ?? 0) <= (scene.surface.newest?.at ?? -1)) return false;
    takeArrowOff(scene.arrows.length - 1);
    return true;
  }, [sceneRef, takeArrowOff]);

  const redoArrow = useCallback(() => {
    const scene = sceneRef.current;
    const arrow = scene.arrowsUndone.at(-1);
    if (!arrow || (arrow.at ?? 0) <= (scene.surface.lastUndone?.at ?? -1)) return false;
    scene.arrowsUndone.pop();
    putArrows([...scene.arrows, { ...arrow, at: scene.surface.tick() }]);
    return true;
  }, [sceneRef, putArrows]);

  const resetArrows = useCallback(
    (list: StoredArrow[]) => {
      const scene = sceneRef.current;
      for (const a of list) scene.surface.reserve(a.at ?? 0);
      scene.arrowsUndone = [];
      scene.drawingArrow = null;
      putArrows(list);
    },
    [sceneRef, putArrows],
  );

  return { arrows, eraseArrowAt, finishArrow, undoArrow, redoArrow, resetArrows };
}

export interface History {
  undo(): void;
  redo(): void;
}

/** Undo and redo over the ink and the arrows together, each saying what it did. */
export function useHistory(
  sceneRef: RefObject<Scene>,
  arrows: Pick<Arrows, 'undoArrow' | 'redoArrow'>,
  redraw: Redraw,
  onToast: (message: string) => void,
): History {
  const { undoArrow, redoArrow } = arrows;
  const { schedulePaint, markDirty } = redraw;

  const undo = useCallback(() => {
    if (undoArrow()) {
      onToast('Undo');
      schedulePaint();
      return;
    }
    onToast(sceneRef.current.surface.undo() ? 'Undo' : 'Nothing to undo');
    schedulePaint();
    markDirty();
  }, [sceneRef, undoArrow, onToast, schedulePaint, markDirty]);

  const redo = useCallback(() => {
    if (redoArrow()) {
      onToast('Redo');
      schedulePaint();
      return;
    }
    onToast(sceneRef.current.surface.redo() ? 'Redo' : 'Nothing to redo');
    schedulePaint();
    markDirty();
  }, [sceneRef, redoArrow, onToast, schedulePaint, markDirty]);

  return { undo, redo };
}
