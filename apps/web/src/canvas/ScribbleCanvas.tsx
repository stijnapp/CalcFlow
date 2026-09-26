import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { CanvasSurface } from '@calcflow/shared';
import { LatexField } from '@/components/LatexField';
import { Tex } from '@/components/Tex';
import { cx } from '@/lib/cx';
import {
  RULE_SPACING,
  Surface,
  loopContains,
  type Box,
  type CanvasState,
  type StoredArrow,
  type StrokePoint,
  type TexBlock,
} from './strokes';
import {
  paintArrows,
  paintItems,
  paintPlane,
  planeFor,
  snapToLattice,
  toMaths,
  type PlaneView,
} from './plane';
import { TapDetector } from './gestures';

export type CanvasTool = 'pen' | 'eraser' | 'type' | 'lasso' | 'arrow';

export interface CanvasHandle {
  undo(): void;
  redo(): void;
  clear(): void;
  isEmpty(): boolean;
}

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
  className?: string;
}

const SPRING = { type: 'spring' as const, stiffness: 480, damping: 36 };
/** Roughly a block's height, so one hanging off the end still extends the surface. */
const BLOCK_HEIGHT = 56;
/** Per millisecond; a flick below this is a scroll that simply stopped. */
const FLING_MIN = 0.06;
/** Fraction of the fling speed left after a millisecond of coasting. */
const FLING_DECAY = 0.9965;
/** Travel that turns a finger tap into a pan, in px of Manhattan distance. */
const TAP_SLOP = 10;
/** A finger resting this long is not tapping any more. */
const TAP_HOLD_MS = 700;
/** Quiet after a mark before the page is written back. */
const SAVE_MS = 600;
/** A typed block has no measured width here; this is enough to draw a box round. */
const BLOCK_WIDTH = 96;
/** Breathing room between the selection box and what it holds. */
const SELECT_PAD = 10;
/** The accent, as canvas cannot read a CSS variable. */
const ACCENT = '#f5a524';

/** How far a point is from an arrow, in maths units — for the eraser. */
function distanceToSegment(x: number, y: number, a: StoredArrow): number {
  const dx = a.x2 - a.x1;
  const dy = a.y2 - a.y1;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x1) * dx + (y - a.y1) * dy) / lengthSquared));
  return Math.hypot(x - (a.x1 + t * dx), y - (a.y1 + t * dy));
}

/**
 * A fixed viewport onto an infinitely tall surface. The page never scrolls —
 * he pans within the canvas instead.
 */
const ScribbleCanvasImpl = forwardRef<CanvasHandle, Props>(function ScribbleCanvas(
  { tool, penWidth, penOnly, snap, surface, plane, problemKey, getInitial, onPersist, onToast, className },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef(new Surface());
  const tapsRef = useRef(new TapDetector());
  const sizeRef = useRef({ w: 0, h: 0 });
  const panRef = useRef(0);
  /** The finger that is moving the page; `id: null` means the next one may. */
  const panFromRef = useRef<{ id: number | null; y: number; pan: number } | null>(null);
  const drawingRef = useRef(false);
  const erasingRef = useRef(false);
  const penDownRef = useRef(false);
  const frameRef = useRef(0);
  /** Pan speed in px/ms, kept alive after the finger leaves. */
  const flingRef = useRef({ v: 0, at: 0, frame: 0 });
  /** A single finger that has not travelled yet — a candidate tap in type mode. */
  const tapRef = useRef<{ x: number; y: number; t: number } | null>(null);
  /** The loop being drawn, in world coordinates; null when none is. */
  const lassoRef = useRef<StrokePoint[] | null>(null);
  /** As far up as the page goes, recomputed each render from where the ink is. */
  const minPanRef = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** Handlers are recreated every render; the writer they call must not be. */
  const persistRef = useRef<(() => void) | undefined>(undefined);

  const [panY, setPanY] = useState(0);
  const [viewH, setViewH] = useState(0);
  /** How far the committed strokes reach; mirrored into state to size the thumb. */
  const [inkBottom, setInkBottom] = useState(0);
  /** And where they start, which is as far up as he is allowed to scroll. */
  const [inkTop, setInkTop] = useState(0);
  const [blocks, setBlocks] = useState<TexBlock[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  /** What the lasso caught, and the box he drags to move it. */
  const [selection, setSelection] = useState<{
    strokes: number[];
    blocks: number[];
    box: Box;
  } | null>(null);
  /** His own arrows on a graph question, in maths coordinates. */
  const [arrows, setArrows] = useState<StoredArrow[]>([]);
  const arrowsUndone = useRef<StoredArrow[]>([]);
  /** The arrow under the pen. */
  const drawingArrow = useRef<{ start: StoredArrow } | null>(null);
  /** Whether the newest mark was an arrow, so undo knows which stack to pop. */
  const lastWasArrow = useRef(false);
  const nextBlockId = useRef(1);

  const active = blocks.find((b) => b.id === activeId) ?? null;

  const getInitialRef = useRef(getInitial);
  getInitialRef.current = getInitial;
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const arrowsRef = useRef(arrows);
  arrowsRef.current = arrows;
  const planeRef = useRef(plane);
  planeRef.current = plane;
  persistRef.current = () => {
    clearTimeout(saveTimer.current);
    saveTimer.current = undefined;
    onPersist?.({
      key: problemKey,
      strokes: surfaceRef.current.serialize(),
      blocks: blocksRef.current,
      pan: panRef.current,
      arrows: arrowsRef.current,
    });
  };

  /** Written back once he stops, so a page of working is never a page of writes. */
  const markDirty = useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistRef.current?.(), SAVE_MS);
  }, []);

  // Leaving takes the page with it, debounce or no debounce: going fullscreen
  // unmounts this canvas and mounts another one a frame later.
  useEffect(() => () => persistRef.current?.(), []);

  useEffect(markDirty, [blocks, arrows, markDirty]);

  /** The plane in pixels, recomputed whenever the canvas is a different width. */
  const geometry = useCallback(() => {
    const spec = planeRef.current?.spec;
    const { w } = sizeRef.current;
    return spec && w > 0 ? planeFor(spec.window, w) : null;
  }, []);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const view = planeRef.current;
    const geo = geometry();
    const showMine = !view || view.reveal === 'mine' || view.reveal === 'both' || view.reveal === 'none';
    const showAnswer = !!view && (view.reveal === 'answer' || view.reveal === 'both');

    surfaceRef.current.draw(ctx, w, h, panRef.current, geo ? 'blank' : surface, dpr, {
      hideInk: !showMine,
      underlay: geo
        ? (c, pan) => {
            paintPlane(c, geo, w, h, pan);
            if (view?.spec.given) paintItems(c, geo, view.spec.given, pan, h, 'given');
          }
        : undefined,
      overlay: geo
        ? (c, pan) => {
            const live = drawingArrow.current;
            if (showMine) {
              paintArrows(c, geo, arrowsRef.current, pan);
              if (live) paintArrows(c, geo, [live.start], pan, '#a89e92');
            }
            if (showAnswer) paintItems(c, geo, view!.spec.answer, pan, h, 'answer');
          }
        : undefined,
    });

    // The loop he is drawing lives here rather than in the surface: it is a
    // gesture, and it must never end up in the ink or in the undo stack.
    const loop = lassoRef.current;
    if (loop && loop.length > 1) {
      ctx.save();
      ctx.translate(0, -Math.round(panRef.current * dpr) / dpr);
      ctx.beginPath();
      ctx.moveTo(loop[0]!.x, loop[0]!.y);
      for (let i = 1; i < loop.length; i += 1) ctx.lineTo(loop[i]!.x, loop[i]!.y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(245,165,36,0.08)';
      ctx.fill();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }, [geometry, surface]);

  /** Coalesce paints into one per frame; a 480 Hz pen would otherwise flood. */
  const schedulePaint = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      paint();
      // Unchanged while a stroke is still live, so this is a no-op mid-scribble.
      setInkBottom(surfaceRef.current.contentBottom());
      setInkTop(surfaceRef.current.contentTop());
    });
  }, [paint]);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    sizeRef.current = { w: rect.width, h: rect.height };
    setViewH(rect.height);
    paint();
  }, [paint]);

  useEffect(() => {
    resize();
    const observer = new ResizeObserver(resize);
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [resize]);

  useEffect(() => {
    paint();
  }, [paint, plane, surface]);

  // A canvas belongs to one problem: it comes back with that problem and goes
  // when it does. This runs on the way in as well, which is what makes a
  // remount — going fullscreen, or reopening the app — pick the page back up.
  useEffect(() => {
    const saved = getInitialRef.current?.();
    const mine = saved && saved.key === problemKey ? saved : null;
    surfaceRef.current.reset();
    if (mine) surfaceRef.current.restore(mine.strokes);
    // Into the refs as well as the state: an unmount before the next render —
    // StrictMode's rehearsal, or a fullscreen toggle landing on one — writes
    // the page back from the refs, and the state has not reached them yet. The
    // strokes never had this problem because the surface is restored in place.
    blocksRef.current = mine?.blocks ?? [];
    arrowsRef.current = mine?.arrows ?? [];
    setBlocks(blocksRef.current);
    setArrows(arrowsRef.current);
    arrowsUndone.current = [];
    drawingArrow.current = null;
    lastWasArrow.current = false;
    setSelection(null);
    lassoRef.current = null;
    nextBlockId.current = (mine?.blocks ?? []).reduce((m, b) => Math.max(m, b.id), 0) + 1;
    setActiveId(null);
    setInkBottom(surfaceRef.current.contentBottom());
    setInkTop(surfaceRef.current.contentTop());
    panRef.current = mine?.pan ?? 0;
    setPanY(panRef.current);
    schedulePaint();
  }, [problemKey, schedulePaint]);

  /**
   * Down is unbounded — he can always scroll into empty paper, and the thumb
   * shrinks to say so. Up stops half a screen above the topmost mark, which is
   * the headroom that lets him park the first line clear of the keyboard.
   */
  const setPan = useCallback(
    (value: number) => {
      panRef.current = Math.max(minPanRef.current, value);
      setPanY(panRef.current);
      schedulePaint();
      markDirty();
    },
    [markDirty, schedulePaint],
  );

  // ------------------------------------------------------------------ momentum

  const stopFling = useCallback(() => {
    cancelAnimationFrame(flingRef.current.frame);
    flingRef.current.frame = 0;
    flingRef.current.v = 0;
  }, []);

  /** Coasts on after the finger leaves, so a long derivation is one flick away. */
  const startFling = useCallback(() => {
    const state = flingRef.current;
    if (Math.abs(state.v) < FLING_MIN) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      state.v *= FLING_DECAY ** dt;
      const next = panRef.current + state.v * dt;
      setPan(next);
      // Hitting the top is a wall, not a bounce.
      if (next <= minPanRef.current || Math.abs(state.v) < 0.015) {
        state.frame = 0;
        state.v = 0;
        return;
      }
      state.frame = requestAnimationFrame(tick);
    };
    state.frame = requestAnimationFrame(tick);
  }, [setPan]);

  useEffect(() => stopFling, [stopFling]);

  const toWorld = useCallback((e: { clientX: number; clientY: number }): StrokePoint => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top + panRef.current, p: 1 };
  }, []);

  const undo = useCallback(() => {
    // Arrows and strokes are two stacks; the newest mark decides which is popped.
    if (lastWasArrow.current && arrowsRef.current.length > 0) {
      const rest = arrowsRef.current.slice(0, -1);
      arrowsUndone.current.push(arrowsRef.current.at(-1)!);
      setArrows(rest);
      lastWasArrow.current = rest.length > 0;
      onToast('Undo');
      schedulePaint();
      return;
    }
    onToast(surfaceRef.current.undo() ? 'Undo' : 'Nothing to undo');
    schedulePaint();
    markDirty();
  }, [markDirty, onToast, schedulePaint]);

  const redo = useCallback(() => {
    const back = arrowsUndone.current.pop();
    if (back) {
      setArrows([...arrowsRef.current, back]);
      lastWasArrow.current = true;
      onToast('Redo');
      schedulePaint();
      return;
    }
    onToast(surfaceRef.current.redo() ? 'Redo' : 'Nothing to redo');
    schedulePaint();
    markDirty();
  }, [markDirty, onToast, schedulePaint]);

  useImperativeHandle(
    ref,
    () => ({
      undo,
      redo,
      clear() {
        surfaceRef.current.clear();
        setBlocks([]);
        setArrows([]);
        arrowsUndone.current = [];
        lastWasArrow.current = false;
        setActiveId(null);
        schedulePaint();
        markDirty();
      },
      isEmpty: () =>
        surfaceRef.current.isEmpty && blocks.length === 0 && arrowsRef.current.length === 0,
    }),
    [undo, redo, markDirty, schedulePaint, blocks.length],
  );

  // ------------------------------------------------------------- pointer input

  /**
   * Whether a finger on the surface should move the page rather than mark it.
   * Pen-only and type mode have nothing for a finger to draw, so it always
   * pans there; where the finger does draw, the second one turns the gesture
   * into a pan and it stays a pan until the last finger leaves.
   */
  function fingerPans(): boolean {
    return penOnly || tool === 'type' || tapsRef.current.activeCount > 1 || panFromRef.current !== null;
  }

  /** Rubs out a whole arrow, the way the eraser rubs out a whole stroke. */
  function eraseArrowAt(worldX: number, worldY: number): boolean {
    const geo = geometry();
    if (!geo || arrowsRef.current.length === 0) return false;
    const at = toMaths(geo, worldX, worldY);
    const radius = 14 / geo.scale;
    const hit = arrowsRef.current.findIndex(
      (a) => distanceToSegment(at.x, at.y, a) <= radius,
    );
    if (hit < 0) return false;
    setArrows(arrowsRef.current.filter((_, i) => i !== hit));
    lastWasArrow.current = false;
    return true;
  }

  function pressure(e: { pointerType: string; pressure: number }): number {
    // 12-bit pressure on both target devices; the floor keeps a light touch visible.
    if (e.pointerType === 'pen' && e.pressure > 0) return 0.35 + e.pressure * 0.9;
    return 1;
  }

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    try {
      canvasRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // A pointer that is already gone cannot be captured; the stroke is fine.
    }
    stopFling();

    if (e.pointerType === 'touch') {
      tapsRef.current.down(e.pointerId, e.clientX, e.clientY);
      if (penDownRef.current) tapsRef.current.abort();
      if (fingerPans()) {
        // Whatever the first finger had started was the beginning of a
        // two-finger gesture and not a mark. Drawing it and then undoing it is
        // what used to leave a line across the page and eat the undo with it.
        if (drawingRef.current) {
          surfaceRef.current.discard();
          drawingRef.current = false;
          schedulePaint();
        }
        if (lassoRef.current) {
          lassoRef.current = null;
          schedulePaint();
        }
        erasingRef.current = false;
        // The newest finger takes the pan, so putting one down cannot make the
        // page jump by the distance between his fingers.
        panFromRef.current = { id: e.pointerId, y: e.clientY, pan: panRef.current };
        flingRef.current.at = e.timeStamp;
        tapRef.current =
          tool === 'type' && tapsRef.current.activeCount === 1
            ? { x: e.clientX, y: e.clientY, t: e.timeStamp }
            : null;
        return;
      }
    }
    if (e.pointerType === 'pen') {
      penDownRef.current = true;
      tapsRef.current.abort();
    }

    if (tool === 'arrow') {
      const geo = geometry();
      if (!geo) return;
      const p = toWorld(e);
      const at =
        planeRef.current?.spec.lattice && snap
          ? snapToLattice(geo, p.x, p.y)
          : toMaths(geo, p.x, p.y);
      drawingArrow.current = { start: { x1: at.x, y1: at.y, x2: at.x, y2: at.y } };
      schedulePaint();
      return;
    }
    if (tool === 'lasso') {
      setSelection(null);
      lassoRef.current = [toWorld(e)];
      schedulePaint();
      return;
    }
    if (tool === 'type') {
      typeTap(e);
      return;
    }
    if (tool === 'eraser') {
      erasingRef.current = true;
      const p = toWorld(e);
      if (eraseArrowAt(p.x, p.y) || surfaceRef.current.eraseAt(p.x, p.y)) {
        schedulePaint();
        markDirty();
      }
      return;
    }

    const point = toWorld(e);
    point.p = pressure(e);
    surfaceRef.current.begin(point, penWidth);
    drawingRef.current = true;
    schedulePaint();
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === 'touch') {
      tapsRef.current.move(e.pointerId, e.clientX, e.clientY);
      const tap = tapRef.current;
      if (tap && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > TAP_SLOP) {
        tapRef.current = null;
      }
      if (fingerPans()) {
        const from = panFromRef.current;
        // Nobody owns the pan yet — the finger that was carrying it has lifted
        // and this one is still down, so it takes over from where it is.
        if (!from || from.id === null) {
          panFromRef.current = { id: e.pointerId, y: e.clientY, pan: panRef.current };
          flingRef.current.at = e.timeStamp;
          return;
        }
        if (from.id !== e.pointerId) return;
        const next = from.pan - (e.clientY - from.y);
        const dt = e.timeStamp - flingRef.current.at;
        // Blended rather than sampled, so one jittery frame cannot throw it.
        if (dt > 0) {
          const v = (Math.max(minPanRef.current, next) - panRef.current) / dt;
          flingRef.current.v = flingRef.current.v * 0.6 + v * 0.4;
          flingRef.current.at = e.timeStamp;
        }
        setPan(next);
        return;
      }
    }
    const live = drawingArrow.current;
    if (live) {
      const geo = geometry();
      if (!geo) return;
      const p = toWorld(e);
      const at =
        planeRef.current?.spec.lattice && snap
          ? snapToLattice(geo, p.x, p.y)
          : toMaths(geo, p.x, p.y);
      live.start = { ...live.start, x2: at.x, y2: at.y };
      schedulePaint();
      return;
    }
    if (lassoRef.current) {
      lassoRef.current.push(toWorld(e));
      schedulePaint();
      return;
    }
    if (erasingRef.current) {
      const p = toWorld(e);
      if (eraseArrowAt(p.x, p.y) || surfaceRef.current.eraseAt(p.x, p.y)) {
        schedulePaint();
        markDirty();
      }
      return;
    }
    if (!drawingRef.current) return;

    // Draw from the coalesced events: at ~480 Hz, reading only `pointermove`
    // throws away three quarters of the samples and diagonals visibly facet.
    const native = e.nativeEvent;
    const events = native.getCoalescedEvents?.() ?? [];
    const list = events.length ? events : [native];
    surfaceRef.current.extend(
      list.map((ev) => {
        const p = toWorld(ev);
        p.p = pressure(ev);
        return p;
      }),
    );
    schedulePaint();
  }

  function onPointerUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === 'touch') {
      const from = panFromRef.current;
      const panned = from !== null;
      const fingers = tapsRef.current.up(e.pointerId);
      const left = tapsRef.current.activeCount;
      const tap = tapRef.current;
      tapRef.current = null;
      // The pan survives the finger that was carrying it: lifting one of two
      // hands the page to the other rather than dropping it back into drawing.
      if (left === 0) panFromRef.current = null;
      else if (from?.id === e.pointerId) panFromRef.current = { id: null, y: 0, pan: panRef.current };
      // A pause before letting go means he stopped on purpose.
      if (left === 0 && panned && e.timeStamp - flingRef.current.at < 90) startFling();
      else if (left === 0) flingRef.current.v = 0;
      // Every gesture confirms itself: a tap that failed the movement threshold
      // is otherwise indistinguishable from an undo with nothing left to undo.
      if (fingers >= 3) redo();
      else if (fingers === 2) undo();
      // Placing and deselecting are what he does most in type mode, and he does
      // them with the hand that is not holding the pen.
      else if (tap && e.timeStamp - tap.t < TAP_HOLD_MS) typeTap(e);
    }
    if (e.pointerType === 'pen') penDownRef.current = false;

    const finished = drawingArrow.current;
    if (finished) {
      drawingArrow.current = null;
      const { x1, y1, x2, y2 } = finished.start;
      // A tap is not an arrow; anything shorter than a grid square is a slip.
      if (Math.hypot(x2 - x1, y2 - y1) >= 0.5) {
        setArrows([...arrowsRef.current, finished.start]);
        arrowsUndone.current = [];
        lastWasArrow.current = true;
      }
      schedulePaint();
      return;
    }
    if (lassoRef.current) {
      closeLasso();
      return;
    }
    if (erasingRef.current) {
      erasingRef.current = false;
      return;
    }
    if (drawingRef.current) {
      surfaceRef.current.commit();
      drawingRef.current = false;
      schedulePaint();
      markDirty();
    }
  }

  function onPointerCancel(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === 'touch') tapsRef.current.cancel(e.pointerId);
    if (e.pointerType === 'pen') penDownRef.current = false;
    panFromRef.current = null;
    tapRef.current = null;
    erasingRef.current = false;
    if (drawingArrow.current) {
      drawingArrow.current = null;
      schedulePaint();
    }
    if (lassoRef.current) {
      lassoRef.current = null;
      schedulePaint();
    }
    if (drawingRef.current) {
      surfaceRef.current.commit();
      drawingRef.current = false;
      schedulePaint();
      markDirty();
    }
  }

  function onWheel(e: React.WheelEvent) {
    stopFling();
    setPan(panRef.current + e.deltaY);
  }

  // -------------------------------------------------------------------- lasso

  /**
   * Letting go closes the loop back to where it started, so he never has to
   * meet his own line, and everything the loop touches comes with it: a stroke
   * with one point inside counts, which is how a tail or a minus sign avoids
   * being left behind.
   */
  function closeLasso() {
    const loop = lassoRef.current;
    lassoRef.current = null;
    schedulePaint();
    if (!loop || loop.length < 3) return;

    const strokes = surfaceRef.current.selectIn(loop);
    const caught = blocks.filter(
      (b) =>
        loopContains(loop, b.x, b.y) ||
        loopContains(loop, b.x + BLOCK_WIDTH / 2, b.y + BLOCK_HEIGHT / 2),
    );
    if (strokes.length === 0 && caught.length === 0) return;

    let box = surfaceRef.current.boundsOf(new Set(strokes));
    for (const b of caught) {
      const own = { x: b.x, y: b.y, w: BLOCK_WIDTH, h: BLOCK_HEIGHT };
      box = box ? union(box, own) : own;
    }
    if (!box) return;
    setSelection({
      strokes,
      blocks: caught.map((b) => b.id),
      box: {
        x: box.x - SELECT_PAD,
        y: box.y - SELECT_PAD,
        w: box.w + SELECT_PAD * 2,
        h: box.h + SELECT_PAD * 2,
      },
    });
  }

  /**
   * Rubbing out a whole line with the eraser is a dozen careful passes; having
   * looped it already, the box is the natural place to say "not that".
   */
  function deleteSelection() {
    const picked = selection;
    if (!picked) return;
    surfaceRef.current.remove(new Set(picked.strokes));
    const gone = new Set(picked.blocks);
    if (gone.size > 0) setBlocks((bs) => bs.filter((b) => !gone.has(b.id)));
    setSelection(null);
    schedulePaint();
    markDirty();
    onToast('Deleted the selection');
  }

  /** Dragging the box carries the strokes and the blocks inside it together. */
  function dragSelection(e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    const picked = selection;
    if (!picked) return;
    const target = e.currentTarget;
    capture(target, e.pointerId);
    const strokes = new Set(picked.strokes);
    const inBlocks = new Set(picked.blocks);
    let lastX = e.clientX;
    let lastY = e.clientY;

    // Stepwise rather than from the start point: the strokes move in place, so
    // there is no original left to measure the total offset against.
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      lastX = ev.clientX;
      lastY = ev.clientY;
      surfaceRef.current.translate(strokes, dx, dy);
      if (inBlocks.size > 0) {
        setBlocks((bs) => bs.map((b) => (inBlocks.has(b.id) ? { ...b, x: b.x + dx, y: b.y + dy } : b)));
      }
      setSelection((sel) =>
        sel ? { ...sel, box: { ...sel.box, x: sel.box.x + dx, y: sel.box.y + dy } } : sel,
      );
      schedulePaint();
    };
    const up = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      markDirty();
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
  }

  // ---------------------------------------------------------------- tex blocks

  /**
   * A line in progress is settled by the next tap; only then does the tap after
   * it start a new one, on the line he touched.
   */
  function typeTap(at: { clientX: number; clientY: number }) {
    if (active && active.latex.trim() !== '') {
      deselect();
      return;
    }
    const p = toWorld(at);
    placeBlock(p.x, Math.round(p.y / RULE_SPACING) * RULE_SPACING);
  }

  /** Blocks exist from the first tap; an empty one is dropped on the way out. */
  function dropEmpties(list: TexBlock[]): TexBlock[] {
    return list.filter((b) => b.latex.trim() !== '');
  }

  /**
   * Placing a block does not open the keyboard, and neither does picking one up.
   * Focus arrived on pointerdown, so starting to drag a block raised the
   * keyboard mid-drag, the page moved up to make room, and the block shot out
   * from under his finger. The bar at the bottom is focused by tapping the bar,
   * like every other field in the app.
   */
  function placeBlock(x: number, y: number) {
    const id = nextBlockId.current++;
    setBlocks((bs) => [...dropEmpties(bs), { id, x, y, latex: '' }]);
    setActiveId(id);
  }

  function editActive(latex: string) {
    if (active) {
      setBlocks((bs) => bs.map((b) => (b.id === active.id ? { ...b, latex } : b)));
      return;
    }
    // Typing with nothing placed drops a block on the first free line below.
    const id = nextBlockId.current++;
    const y = Math.round((panRef.current + 80) / RULE_SPACING) * RULE_SPACING;
    setBlocks((bs) => [...dropEmpties(bs), { id, x: 40, y, latex }]);
    setActiveId(id);
  }

  function deselect() {
    setBlocks(dropEmpties);
    setActiveId(null);
  }

  function deleteActive() {
    setBlocks((bs) => bs.filter((b) => b.id !== activeId));
    setActiveId(null);
  }

  // Leaving the type tool settles whatever was being written, and leaving the
  // lasso drops what it was holding — a box he cannot drag is just a box.
  useEffect(() => {
    if (tool !== 'type') deselect();
    if (tool !== 'lasso') setSelection(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  function dragBlock(id: number, e: ReactPointerEvent<HTMLDivElement>) {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const originX = block.x;
    const originY = block.y;
    const target = e.currentTarget;
    capture(target, e.pointerId);

    const move = (ev: PointerEvent) => {
      setBlocks((bs) =>
        bs.map((b) =>
          b.id === id ? { ...b, x: originX + (ev.clientX - startX), y: originY + (ev.clientY - startY) } : b,
        ),
      );
    };
    const up = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      markDirty();
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
  }

  // The surface is 4/3 of a screen to begin with, grows past whatever he has
  // written, and always reaches at least one screen below where he is now —
  // so scrolling down never stops and the thumb resizes as he goes.
  //
  // Upwards it stops half a screen above the first mark. That much is enough to
  // park the top line clear of the on-screen keyboard, and stopping there is
  // what keeps a flick back up from sailing into nothing.
  const view = viewH || 1;
  const written = blocks.reduce((m, b) => Math.max(m, b.y + BLOCK_HEIGHT), inkBottom);
  const started = blocks.reduce((m, b) => Math.min(m, b.y), inkTop);
  const ceiling = Math.min(0, started - view / 2);
  minPanRef.current = ceiling;
  const extent = Math.max(view * (4 / 3), written - ceiling + view / 3, panY - ceiling + view);
  const thumbHeight = Math.max(10, (view / extent) * 100);
  const thumbTop = Math.min(100 - thumbHeight, Math.max(0, ((panY - ceiling) / extent) * 100));

  return (
    <div className={cx('relative min-w-0 overflow-hidden', className)}>
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onWheel={onWheel}
        className="no-touch block h-full w-full"
        style={{ cursor: tool === 'eraser' ? 'cell' : tool === 'type' ? 'text' : 'crosshair' }}
      />

      {/* Where he is on the infinite surface. */}
      <div className="pointer-events-none absolute top-4 bottom-4 right-2 w-1 rounded-full bg-line">
        <div
          className="absolute left-0 w-1 rounded-full bg-rail"
          style={{ top: `${thumbTop}%`, height: `${thumbHeight}%` }}
        />
      </div>

      {selection && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12 }}
          onPointerDown={dragSelection}
          className="absolute cursor-grab touch-none rounded-[10px] border border-dashed border-accent bg-accent/[0.06] active:cursor-grabbing"
          style={{
            left: selection.box.x,
            top: selection.box.y - panY,
            width: selection.box.w,
            height: selection.box.h,
          }}
        >
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={deleteSelection}
            aria-label="Delete the selection"
            className="absolute -right-3.5 -top-3.5 grid size-8 place-items-center rounded-full border border-strong bg-overlay text-muted shadow-[0_8px_20px_-6px_#000] hover:text-wrong-ink"
          >
            <Trash2 className="size-4" />
          </button>
        </motion.div>
      )}

      <AnimatePresence>
        {blocks.map((b) => {
          const on = b.id === activeId;
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={SPRING}
              onPointerDown={(e) => {
                e.stopPropagation();
                setBlocks((bs) => bs.filter((x) => x.id === b.id || x.latex.trim() !== ''));
                setActiveId(b.id);
                dragBlock(b.id, e);
              }}
              className={cx(
                'absolute flex touch-none items-center gap-2 rounded-[10px] border px-3.5 py-2 text-[22px] backdrop-blur-sm',
                tool === 'type' ? 'cursor-grab' : 'pointer-events-none',
                on
                  ? 'border-accent bg-card/95 shadow-[0_0_0_4px_rgba(245,165,36,0.1)]'
                  : 'border-border bg-card/90',
              )}
              style={{ left: b.x, top: b.y - panY }}
            >
              {/* The block is dragged by holding it, so a hold cannot also copy. */}
              {b.latex.trim() ? <Tex copy={false}>{b.latex}</Tex> : <span className="text-faint">…</span>}
              {on && (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={deleteActive}
                  aria-label="Delete this block"
                  className="ml-1 grid size-6 shrink-0 place-items-center rounded-md bg-raised text-muted hover:text-wrong-ink"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Sliding up from the edge says where the bar came from and where it
          goes; appearing fully formed under his hand did not. */}
      <AnimatePresence>
        {tool === 'type' && (
          <motion.div
            key="tex-bar"
            initial={{ y: 'calc(100% + 12px)' }}
            animate={{ y: 0 }}
            exit={{ y: 'calc(100% + 12px)' }}
            transition={SPRING}
            className="absolute inset-x-3 bottom-3 rounded-lg shadow-[0_18px_44px_-16px_#000]"
          >
          <LatexField
            value={active?.latex ?? ''}
            onChange={editActive}
            onSubmit={deselect}
            placeholder="\frac{d}{dx}\ln(x)"
            ariaLabel="The line you are placing on the canvas"
            compact
            trailing={
              active && (
                <button
                  onClick={deleteActive}
                  aria-label="Delete this block"
                  className="grid size-7 shrink-0 place-items-center rounded-[9px] border border-strong bg-raised text-muted hover:text-wrong-ink"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )
            }
            />
          </motion.div>
        )}
      </AnimatePresence>

      {tool !== 'type' && (
        <div className="pointer-events-none absolute bottom-4 left-4 font-mono text-[11px] tracking-[0.08em] text-ghost">
          {tool === 'lasso'
            ? 'LOOP ROUND SOME WORKING · THEN DRAG THE BOX'
            : penOnly
              ? 'PEN DRAWS · FINGER PANS · 2-FINGER TAP UNDOES'
              : 'FINGER DRAWS · 2 FINGERS PAN · 2-FINGER TAP UNDOES'}
        </div>
      )}
    </div>
  );
});

/** A pointer that has already gone cannot be captured, and the drag survives it. */
function capture(el: Element, pointerId: number): void {
  try {
    el.setPointerCapture(pointerId);
  } catch {
    // Nothing to hold on to; the move and up listeners still do the work.
  }
}

function union(a: Box, b: Box): Box {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

/**
 * Memoised: the control column re-renders on every keystroke, and the canvas
 * has nothing to say about the answer being typed next to it.
 */
export const ScribbleCanvas = memo(ScribbleCanvasImpl);
