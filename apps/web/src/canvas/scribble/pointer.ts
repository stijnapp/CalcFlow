import type { PointerEvent as ReactPointerEvent, RefObject, WheelEvent } from 'react';
import { snapToLattice, toMaths } from '../plane';
import {
  capture,
  geometryOf,
  toWorld,
  type CanvasTool,
  type ClientPoint,
  type Redraw,
  type Scene,
} from './scene';
import type { Arrows, History } from './useArrows';
import type { Lasso } from './useLasso';
import type { Pan } from './usePan';

/** Travel that turns a finger tap into a pan, in px of Manhattan distance. */
const TAP_SLOP = 10;
/** A finger resting this long is not tapping any more. */
const TAP_HOLD_MS = 700;

/** What the pointer handlers need: the scene, the props, and the canvas's own actions. */
export interface Gesture {
  sceneRef: RefObject<Scene>;
  tool: CanvasTool;
  penOnly: boolean;
  penWidth: number;
  redraw: Redraw;
  pan: Pick<Pan, 'setPan' | 'stopFling' | 'startFling'>;
  arrows: Pick<Arrows, 'eraseArrowAt' | 'finishArrow'>;
  lasso: Pick<Lasso, 'dropSelection' | 'closeLasso'>;
  history: History;
  typeTap(at: ClientPoint): void;
}

type CanvasPointer = ReactPointerEvent<HTMLCanvasElement>;

/**
 * Whether a finger on the surface should move the page rather than mark it.
 * Pen-only and type mode have nothing for a finger to draw, so it always
 * pans there; where the finger does draw, the second one turns the gesture
 * into a pan and it stays a pan until the last finger leaves.
 */
function fingerPans(g: Gesture): boolean {
  const { taps, panFrom } = g.sceneRef.current;
  return g.penOnly || g.tool === 'type' || taps.activeCount > 1 || panFrom !== null;
}

function pressure(e: { pointerType: string; pressure: number }): number {
  // 12-bit pressure on both target devices; the floor keeps a light touch visible.
  if (e.pointerType === 'pen' && e.pressure > 0) return 0.35 + e.pressure * 0.9;
  return 1;
}

/** Where the pen is on the plane: on the lattice when snapping, anywhere otherwise. */
function aim(scene: Scene, e: ClientPoint): { x: number; y: number } | null {
  const geo = geometryOf(scene);
  if (!geo) return null;
  const p = toWorld(scene, e);
  const snapping = scene.plane?.spec.lattice && scene.snap;
  return snapping ? snapToLattice(geo, p.x, p.y) : toMaths(geo, p.x, p.y);
}

/** Rubs out whatever is under the eraser: a whole arrow, or a whole stroke. */
function erase(g: Gesture, e: ClientPoint): void {
  const scene = g.sceneRef.current;
  const p = toWorld(scene, e);
  if (g.arrows.eraseArrowAt(p.x, p.y) || scene.surface.eraseAt(p.x, p.y)) {
    g.redraw.schedulePaint();
    g.redraw.markDirty();
  }
}

/** A new mark of either kind makes both redo stacks meaningless. */
function commitStroke(g: Gesture): void {
  const scene = g.sceneRef.current;
  if (scene.surface.commit()) scene.arrowsUndone = [];
  scene.drawing = false;
  g.redraw.schedulePaint();
  g.redraw.markDirty();
}

// ---------------------------------------------------------------------- down

/** A finger landing: counted towards a tap, and taking the pan where fingers pan. */
function fingerDown(g: Gesture, e: CanvasPointer): boolean {
  const scene = g.sceneRef.current;
  scene.taps.down(e.pointerId, e.clientX, e.clientY);
  if (scene.penDown) scene.taps.abort();
  if (!fingerPans(g)) return false;
  // Whatever the first finger had started was the beginning of a two-finger
  // gesture and not a mark. Drawing it and then undoing it is what used to
  // leave a line across the page and eat the undo with it.
  if (scene.drawing) {
    scene.surface.discard();
    scene.drawing = false;
    g.redraw.schedulePaint();
  }
  if (scene.lasso) {
    scene.lasso = null;
    g.redraw.schedulePaint();
  }
  scene.erasing = false;
  // The newest finger takes the pan, so putting one down cannot make the page
  // jump by the distance between their fingers.
  scene.panFrom = { id: e.pointerId, y: e.clientY, pan: scene.pan };
  scene.fling.at = e.timeStamp;
  const lone = g.tool === 'type' && scene.taps.activeCount === 1;
  scene.tap = lone ? { x: e.clientX, y: e.clientY, t: e.timeStamp } : null;
  return true;
}

/** What putting the pen (or a drawing finger) down starts, by tool. */
const START: Record<CanvasTool, (g: Gesture, e: CanvasPointer) => void> = {
  arrow(g, e) {
    const at = aim(g.sceneRef.current, e);
    if (!at) return;
    g.sceneRef.current.drawingArrow = { x1: at.x, y1: at.y, x2: at.x, y2: at.y };
    g.redraw.schedulePaint();
  },
  lasso(g, e) {
    g.lasso.dropSelection();
    g.sceneRef.current.lasso = [toWorld(g.sceneRef.current, e)];
    g.redraw.schedulePaint();
  },
  type(g, e) {
    g.typeTap(e);
  },
  eraser(g, e) {
    g.sceneRef.current.erasing = true;
    erase(g, e);
  },
  pen(g, e) {
    const scene = g.sceneRef.current;
    scene.surface.begin({ ...toWorld(scene, e), p: pressure(e) }, g.penWidth);
    scene.drawing = true;
    g.redraw.schedulePaint();
  },
};

export function pointerDown(g: Gesture, e: CanvasPointer): void {
  const scene = g.sceneRef.current;
  if (scene.canvas) capture(scene.canvas, e.pointerId);
  g.pan.stopFling();
  if (e.pointerType === 'touch' && fingerDown(g, e)) return;
  if (e.pointerType === 'pen') {
    scene.penDown = true;
    scene.taps.abort();
  }
  START[g.tool](g, e);
}

// ---------------------------------------------------------------------- move

/** Moves the page with the finger that owns the pan, keeping up the fling speed. */
function panWith(g: Gesture, e: CanvasPointer): void {
  const scene = g.sceneRef.current;
  const from = scene.panFrom;
  // Nobody owns the pan yet — the finger that was carrying it has lifted and
  // this one is still down, so it takes over from where it is.
  if (!from || from.id === null) {
    scene.panFrom = { id: e.pointerId, y: e.clientY, pan: scene.pan };
    scene.fling.at = e.timeStamp;
    return;
  }
  if (from.id !== e.pointerId) return;
  const next = from.pan - (e.clientY - from.y);
  const dt = e.timeStamp - scene.fling.at;
  // Blended rather than sampled, so one jittery frame cannot throw it.
  if (dt > 0) {
    const v = (Math.max(scene.minPan, next) - scene.pan) / dt;
    scene.fling.v = scene.fling.v * 0.6 + v * 0.4;
    scene.fling.at = e.timeStamp;
  }
  g.pan.setPan(next);
}

function fingerMove(g: Gesture, e: CanvasPointer): boolean {
  const scene = g.sceneRef.current;
  scene.taps.move(e.pointerId, e.clientX, e.clientY);
  const tap = scene.tap;
  if (tap && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > TAP_SLOP) {
    scene.tap = null;
  }
  if (!fingerPans(g)) return false;
  panWith(g, e);
  return true;
}

function arrowMove(g: Gesture, e: CanvasPointer): boolean {
  const scene = g.sceneRef.current;
  const live = scene.drawingArrow;
  if (!live) return false;
  const at = aim(scene, e);
  if (at) {
    scene.drawingArrow = { ...live, x2: at.x, y2: at.y };
    g.redraw.schedulePaint();
  }
  return true;
}

function lassoMove(g: Gesture, e: CanvasPointer): boolean {
  const scene = g.sceneRef.current;
  if (!scene.lasso) return false;
  scene.lasso.push(toWorld(scene, e));
  g.redraw.schedulePaint();
  return true;
}

function eraserMove(g: Gesture, e: CanvasPointer): boolean {
  if (!g.sceneRef.current.erasing) return false;
  erase(g, e);
  return true;
}

function inkMove(g: Gesture, e: CanvasPointer): void {
  const scene = g.sceneRef.current;
  if (!scene.drawing) return;
  // Draw from the coalesced events: at ~480 Hz, reading only `pointermove`
  // throws away three quarters of the samples and diagonals visibly facet.
  const native = e.nativeEvent;
  const events = native.getCoalescedEvents?.() ?? [];
  const list = events.length ? events : [native];
  scene.surface.extend(list.map((ev) => ({ ...toWorld(scene, ev), p: pressure(ev) })));
  g.redraw.schedulePaint();
}

export function pointerMove(g: Gesture, e: CanvasPointer): void {
  if (e.pointerType === 'touch' && fingerMove(g, e)) return;
  if (arrowMove(g, e) || lassoMove(g, e) || eraserMove(g, e)) return;
  inkMove(g, e);
}

// ------------------------------------------------------------------------ up

/**
 * The pan survives the finger that was carrying it: lifting one of two hands
 * the page to the other rather than dropping it back into drawing. The last
 * finger up lets the page coast on, unless it paused first — that means they
 * stopped on purpose.
 */
function handOver(g: Gesture, e: CanvasPointer, from: Scene['panFrom']): void {
  const scene = g.sceneRef.current;
  if (scene.taps.activeCount > 0) {
    if (from?.id === e.pointerId) scene.panFrom = { id: null, y: 0, pan: scene.pan };
    return;
  }
  scene.panFrom = null;
  if (from !== null && e.timeStamp - scene.fling.at < 90) g.pan.startFling();
  else scene.fling.v = 0;
}

function fingerUp(g: Gesture, e: CanvasPointer): void {
  const scene = g.sceneRef.current;
  const from = scene.panFrom;
  const fingers = scene.taps.up(e.pointerId);
  const tap = scene.tap;
  scene.tap = null;
  handOver(g, e, from);
  // Every gesture confirms itself: a tap that failed the movement threshold
  // is otherwise indistinguishable from an undo with nothing left to undo.
  if (fingers >= 3) g.history.redo();
  else if (fingers === 2) g.history.undo();
  // Placing and deselecting are what they do most in type mode, and they do
  // them with the hand that is not holding the pen.
  else if (tap && e.timeStamp - tap.t < TAP_HOLD_MS) g.typeTap(e);
}

export function pointerUp(g: Gesture, e: CanvasPointer): void {
  const scene = g.sceneRef.current;
  if (e.pointerType === 'touch') fingerUp(g, e);
  if (e.pointerType === 'pen') scene.penDown = false;
  if (scene.drawingArrow) {
    g.arrows.finishArrow();
    g.redraw.schedulePaint();
  } else if (scene.lasso) {
    g.lasso.closeLasso();
  } else if (scene.erasing) {
    scene.erasing = false;
  } else if (scene.drawing) {
    commitStroke(g);
  }
}

export function pointerCancel(g: Gesture, e: CanvasPointer): void {
  const scene = g.sceneRef.current;
  if (e.pointerType === 'touch') scene.taps.cancel(e.pointerId);
  if (e.pointerType === 'pen') scene.penDown = false;
  scene.panFrom = null;
  scene.tap = null;
  scene.erasing = false;
  if (scene.drawingArrow || scene.lasso) {
    scene.drawingArrow = null;
    scene.lasso = null;
    g.redraw.schedulePaint();
  }
  if (scene.drawing) commitStroke(g);
}

export function wheel(g: Gesture, e: WheelEvent): void {
  g.pan.stopFling();
  g.pan.setPan(g.sceneRef.current.pan + e.deltaY);
}

/** The canvas's pointer and wheel handlers, over the newest props. */
export function usePointer(g: Gesture) {
  return {
    onPointerDown: (e: CanvasPointer) => pointerDown(g, e),
    onPointerMove: (e: CanvasPointer) => pointerMove(g, e),
    onPointerUp: (e: CanvasPointer) => pointerUp(g, e),
    onPointerCancel: (e: CanvasPointer) => pointerCancel(g, e),
    onWheel: (e: WheelEvent) => wheel(g, e),
  };
}
