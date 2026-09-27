import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type Ref,
  type RefObject,
} from 'react';
import type { StoredArrow, TexBlock } from '../strokes';
import { createScene, persist, persistSoon, type CanvasHandle, type Scene } from './scene';

type SceneRef = RefObject<Scene>;
type Props = Pick<Scene, 'problemKey' | 'plane' | 'snap' | 'getInitial' | 'onPersist'>;
type Mirrored = Pick<Scene, 'blocks' | 'arrows' | 'minPan'>;

/** The scene, and the ref callback that hands it the canvas element. */
export function useScene(): { sceneRef: SceneRef; attach: (el: HTMLCanvasElement | null) => void } {
  const sceneRef = useRef(createScene());
  const attach = useCallback((el: HTMLCanvasElement | null) => {
    sceneRef.current.canvas = el;
  }, []);
  return { sceneRef, attach };
}

/**
 * Copies the newest props and state into the scene as soon as they are on
 * screen, for the handlers and the timers that run between renders.
 */
export function useLatest(sceneRef: SceneRef, props: Props, state: Mirrored): void {
  useLayoutEffect(() => {
    const scene = sceneRef.current;
    scene.problemKey = props.problemKey;
    scene.plane = props.plane;
    scene.snap = props.snap;
    scene.getInitial = props.getInitial;
    scene.onPersist = props.onPersist;
    scene.blocks = state.blocks;
    scene.arrows = state.arrows;
    scene.minPan = state.minPan;
  });
}

/** Saves a moment after the last change, and at once on the way out. */
export function useSaver(sceneRef: SceneRef): () => void {
  // Leaving takes the page with it, debounce or no debounce: going fullscreen
  // unmounts this canvas and mounts another one a frame later.
  useEffect(() => {
    const scene = sceneRef.current;
    return () => persist(scene);
  }, [sceneRef]);
  return useCallback(() => persistSoon(sceneRef.current), [sceneRef]);
}

export interface Restorers {
  resetBlocks(list: TexBlock[]): void;
  resetArrows(list: StoredArrow[]): void;
  dropSelection(): void;
  measureInk(): void;
  jumpTo(pan: number): void;
  schedulePaint(): void;
}

/**
 * A canvas belongs to one problem: it comes back with that problem and goes
 * when it does. This runs on the way in as well, which is what makes a
 * remount — going fullscreen, or reopening the app — pick the page back up.
 */
export function useRestore(sceneRef: SceneRef, problemKey: string, parts: Restorers): void {
  const { resetBlocks, resetArrows, dropSelection, measureInk, jumpTo, schedulePaint } = parts;
  useEffect(() => {
    const scene = sceneRef.current;
    const saved = scene.getInitial?.();
    const mine = saved && saved.key === problemKey ? saved : null;
    scene.surface.reset();
    if (mine) scene.surface.restore(mine.strokes);
    // Into the scene as well as the state: an unmount before the next render —
    // StrictMode's rehearsal, or a fullscreen toggle landing on one — writes
    // the page back from the scene, and the state has not reached it yet. The
    // strokes never had this problem because the surface is restored in place.
    resetBlocks(mine?.blocks ?? []);
    resetArrows(mine?.arrows ?? []);
    scene.lasso = null;
    dropSelection();
    measureInk();
    jumpTo(mine?.pan ?? 0);
    schedulePaint();
  }, [
    sceneRef,
    problemKey,
    resetBlocks,
    resetArrows,
    dropSelection,
    measureInk,
    jumpTo,
    schedulePaint,
  ]);
}

export interface HandleParts {
  undo(): void;
  redo(): void;
  resetBlocks(list: TexBlock[]): void;
  resetArrows(list: StoredArrow[]): void;
  schedulePaint(): void;
  markDirty(): void;
}

/** What the screen around the canvas can ask of it: the toolbar's undo, redo and clear. */
export function useCanvasHandle(ref: Ref<CanvasHandle>, sceneRef: SceneRef, parts: HandleParts) {
  const { undo, redo, resetBlocks, resetArrows, schedulePaint, markDirty } = parts;
  useImperativeHandle(
    ref,
    () => ({
      undo,
      redo,
      clear() {
        sceneRef.current.surface.clear();
        resetBlocks([]);
        resetArrows([]);
        schedulePaint();
        markDirty();
      },
      isEmpty() {
        const { surface, blocks, arrows } = sceneRef.current;
        return surface.isEmpty && blocks.length === 0 && arrows.length === 0;
      },
    }),
    [sceneRef, undo, redo, resetBlocks, resetArrows, schedulePaint, markDirty],
  );
}
