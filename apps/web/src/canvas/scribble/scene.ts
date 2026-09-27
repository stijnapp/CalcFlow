import { planeFor, type Plane, type PlaneView } from '../plane';
import { TapDetector } from '../gestures';
import {
  Surface,
  type Box,
  type CanvasState,
  type StoredArrow,
  type StrokePoint,
  type TexBlock,
} from '../strokes';

export type CanvasTool = 'pen' | 'eraser' | 'type' | 'lasso' | 'arrow';

export interface CanvasHandle {
  undo(): void;
  redo(): void;
  clear(): void;
  isEmpty(): boolean;
}

export interface CanvasInsets {
  top: number;
  bottom: number;
}

/** Roughly a block's height, so one hanging off the end still extends the surface. */
export const BLOCK_HEIGHT = 56;
/** A typed block has no measured width here; this is enough to draw a box round. */
export const BLOCK_WIDTH = 96;
/** Quiet after a mark before the page is written back. */
const SAVE_MS = 600;

export interface ClientPoint {
  clientX: number;
  clientY: number;
}

/** What a change asks for: a paint on the next frame, and a save once things go quiet. */
export interface Redraw {
  schedulePaint(): void;
  markDirty(): void;
}

/**
 * Everything a canvas keeps outside React: what the pointer handlers read and
 * write between renders, and what a paint reads every frame. It sits on one
 * ref, so the hooks the canvas is made of share it by passing that ref along.
 */
export interface Scene {
  canvas: HTMLCanvasElement | null;
  surface: Surface;
  taps: TapDetector;
  size: { w: number; h: number };
  pan: number;
  /** As far up as the page goes, recomputed each render from where the ink is. */
  minPan: number;
  /** The finger that is moving the page; `id: null` means the next one may. */
  panFrom: { id: number | null; y: number; pan: number } | null;
  drawing: boolean;
  erasing: boolean;
  penDown: boolean;
  /** The paint waiting for the next frame, if there is one. */
  frame: number;
  /** Pan speed in px/ms, kept alive after the finger leaves. */
  fling: { v: number; at: number; frame: number };
  /** A single finger that has not travelled yet — a candidate tap in type mode. */
  tap: { x: number; y: number; t: number } | null;
  /** The loop being drawn, in world coordinates; null when none is. */
  lasso: StrokePoint[] | null;
  /** Their arrows on a graph question, in maths coordinates. */
  arrows: StoredArrow[];
  arrowsUndone: StoredArrow[];
  /** The arrow under the pen. */
  drawingArrow: StoredArrow | null;
  blocks: TexBlock[];
  nextBlockId: number;
  saveTimer: ReturnType<typeof setTimeout> | undefined;
  // The newest props, for the handlers and the timers that outlive a render.
  problemKey: string;
  plane?: PlaneView | null;
  snap: boolean;
  getInitial?(): CanvasState | null;
  onPersist?(state: CanvasState): void;
}

export function createScene(): Scene {
  return {
    canvas: null,
    surface: new Surface(),
    taps: new TapDetector(),
    size: { w: 0, h: 0 },
    pan: 0,
    minPan: 0,
    panFrom: null,
    drawing: false,
    erasing: false,
    penDown: false,
    frame: 0,
    fling: { v: 0, at: 0, frame: 0 },
    tap: null,
    lasso: null,
    arrows: [],
    arrowsUndone: [],
    drawingArrow: null,
    blocks: [],
    nextBlockId: 1,
    saveTimer: undefined,
    problemKey: '',
    plane: null,
    snap: false,
  };
}

/** Writes the page back now, and cancels the save that was waiting. */
export function persist(scene: Scene): void {
  clearTimeout(scene.saveTimer);
  scene.saveTimer = undefined;
  scene.onPersist?.({
    key: scene.problemKey,
    strokes: scene.surface.serialize(),
    blocks: scene.blocks,
    pan: scene.pan,
    arrows: scene.arrows,
  });
}

/** Written back once they stop, so a page of working is never a page of writes. */
export function persistSoon(scene: Scene): void {
  clearTimeout(scene.saveTimer);
  scene.saveTimer = setTimeout(() => persist(scene), SAVE_MS);
}

/** The plane in pixels, recomputed whenever the canvas is a different width. */
export function geometryOf(scene: Scene): Plane | null {
  const spec = scene.plane?.spec;
  const { w } = scene.size;
  return spec && w > 0 ? planeFor(spec.window, w) : null;
}

export function toWorld(scene: Scene, e: ClientPoint): StrokePoint {
  const rect = scene.canvas!.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top + scene.pan, p: 1 };
}

export function pixelRatio(): number {
  return Math.min(window.devicePixelRatio || 1, 2);
}

/**
 * The surface is 4/3 of a screen to begin with, grows past whatever they have
 * written, and always reaches at least one screen below where they are now —
 * so scrolling down never stops and the thumb resizes as they go.
 *
 * Upwards it stops half a screen above the first mark. That much is enough to
 * park the top line clear of the on-screen keyboard, and stopping there is
 * what keeps a flick back up from sailing into nothing.
 */
export function scrollbar(page: {
  viewH: number;
  panY: number;
  inkTop: number;
  inkBottom: number;
  blocks: readonly TexBlock[];
}): { ceiling: number; thumbTop: number; thumbHeight: number } {
  const view = page.viewH || 1;
  const written = page.blocks.reduce((m, b) => Math.max(m, b.y + BLOCK_HEIGHT), page.inkBottom);
  const started = page.blocks.reduce((m, b) => Math.min(m, b.y), page.inkTop);
  const ceiling = Math.min(0, started - view / 2);
  const below = page.panY - ceiling;
  const extent = Math.max(view * (4 / 3), written - ceiling + view / 3, below + view);
  const thumbHeight = Math.max(10, (view / extent) * 100);
  const thumbTop = Math.min(100 - thumbHeight, Math.max(0, (below / extent) * 100));
  return { ceiling, thumbTop, thumbHeight };
}

/** How far a point is from an arrow, in maths units — for the eraser. */
export function distanceToSegment(x: number, y: number, a: StoredArrow): number {
  const dx = a.x2 - a.x1;
  const dy = a.y2 - a.y1;
  const lengthSquared = dx * dx + dy * dy;
  const along = lengthSquared === 0 ? 0 : ((x - a.x1) * dx + (y - a.y1) * dy) / lengthSquared;
  const t = Math.max(0, Math.min(1, along));
  return Math.hypot(x - (a.x1 + t * dx), y - (a.y1 + t * dy));
}

/** A pointer that has already gone cannot be captured, and the drag survives it. */
export function capture(el: Element, pointerId: number): void {
  try {
    el.setPointerCapture(pointerId);
  } catch {
    // Nothing to hold on to; the move and up listeners still do the work.
  }
}

/** Follows one pointer across an element until it lifts. */
export function follow(
  e: { currentTarget: HTMLElement; pointerId: number },
  onMove: (ev: PointerEvent) => void,
  onUp: () => void,
): void {
  const target = e.currentTarget;
  capture(target, e.pointerId);
  const up = () => {
    target.removeEventListener('pointermove', onMove);
    target.removeEventListener('pointerup', up);
    onUp();
  };
  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerup', up);
}

export function union(a: Box, b: Box): Box {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}
