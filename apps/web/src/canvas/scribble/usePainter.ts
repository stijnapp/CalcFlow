import { useCallback, useEffect, useState, type RefObject } from 'react';
import type { CanvasSurface } from '@calcflow/shared';
import { useShade } from '@/lib/theme';
import type { PlaneView } from '../plane';
import { paintScene } from './paint';
import { pixelRatio, type Scene } from './scene';

export interface Painter {
  schedulePaint(): void;
  measureInk(): void;
  /** The canvas's height in CSS pixels, once it has been laid out. */
  viewH: number;
  /** Where the committed strokes start, which is as far up as they may scroll. */
  inkTop: number;
  /** And how far down they reach; both mirrored into state to size the thumb. */
  inkBottom: number;
}

/** Keeps the canvas the size it is on screen, and paints it. */
export function usePainter(
  sceneRef: RefObject<Scene>,
  paper: CanvasSurface,
  plane: PlaneView | null | undefined,
): Painter {
  const [viewH, setViewH] = useState(0);
  const [inkTop, setInkTop] = useState(0);
  const [inkBottom, setInkBottom] = useState(0);
  const shade = useShade();

  const paint = useCallback(() => paintScene(sceneRef.current, paper), [sceneRef, paper]);

  const measureInk = useCallback(() => {
    const { surface } = sceneRef.current;
    setInkBottom(surface.contentBottom());
    setInkTop(surface.contentTop());
  }, [sceneRef]);

  /** Coalesce paints into one per frame; a 480 Hz pen would otherwise flood. */
  const schedulePaint = useCallback(() => {
    const scene = sceneRef.current;
    if (scene.frame) return;
    scene.frame = requestAnimationFrame(() => {
      scene.frame = 0;
      paint();
      // Unchanged while a stroke is still live, so this is a no-op mid-scribble.
      measureInk();
    });
  }, [sceneRef, paint, measureInk]);

  const resize = useCallback(() => {
    const scene = sceneRef.current;
    const canvas = scene.canvas;
    const rect = canvas?.getBoundingClientRect();
    if (!canvas || !rect?.width || !rect.height) return;
    const dpr = pixelRatio();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    scene.size = { w: rect.width, h: rect.height };
    setViewH(rect.height);
    paint();
  }, [sceneRef, paint]);

  useEffect(() => {
    resize();
    const observer = new ResizeObserver(resize);
    const { canvas } = sceneRef.current;
    if (canvas) observer.observe(canvas);
    return () => observer.disconnect();
  }, [sceneRef, resize]);

  // The canvas paints its colours in rather than following the stylesheet, so a
  // change of theme is one more reason to paint.
  useEffect(() => {
    paint();
  }, [paint, plane, shade]);

  return { schedulePaint, measureInk, viewH, inkTop, inkBottom };
}
