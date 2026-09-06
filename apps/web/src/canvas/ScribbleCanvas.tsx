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
import { RULE_SPACING, Surface, type StrokePoint, type TexBlock } from './strokes';
import { TapDetector } from './gestures';

export type CanvasTool = 'pen' | 'eraser' | 'type';

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
  surface: CanvasSurface;
  /** Changes when the problem does; strokes are discarded, not persisted. */
  problemKey: string;
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

/**
 * A fixed viewport onto an infinitely tall surface. The page never scrolls —
 * he pans within the canvas instead.
 */
const ScribbleCanvasImpl = forwardRef<CanvasHandle, Props>(function ScribbleCanvas(
  { tool, penWidth, penOnly, surface, problemKey, onToast, className },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  const [panY, setPanY] = useState(0);
  const [viewH, setViewH] = useState(0);
  /** How far the committed strokes reach; mirrored into state to size the thumb. */
  const [inkBottom, setInkBottom] = useState(0);
  const [blocks, setBlocks] = useState<TexBlock[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const nextBlockId = useRef(1);

  const active = blocks.find((b) => b.id === activeId) ?? null;

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    surfaceRef.current.draw(ctx, w, h, panRef.current, surface, dpr);
  }, [surface]);

  /** Coalesce paints into one per frame; a 480 Hz pen would otherwise flood. */
  const schedulePaint = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      paint();
      // Unchanged while a stroke is still live, so this is a no-op mid-scribble.
      setInkBottom(surfaceRef.current.contentBottom());
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
  }, [paint, surface]);

  // Strokes belong to one problem and are thrown away with it.
  useEffect(() => {
    surfaceRef.current.reset();
    setBlocks([]);
    setActiveId(null);
    setInkBottom(0);
    panRef.current = 0;
    setPanY(0);
    schedulePaint();
  }, [problemKey, schedulePaint]);

  /**
   * Down is unbounded — he can always scroll into empty paper, and the thumb
   * shrinks to say so. Coming back up, the surface shrinks to the ink again.
   */
  const setPan = useCallback(
    (value: number) => {
      panRef.current = Math.max(0, value);
      setPanY(panRef.current);
      schedulePaint();
    },
    [schedulePaint],
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
      if (next <= 0 || Math.abs(state.v) < 0.015) {
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
    onToast(surfaceRef.current.undo() ? 'Undo' : 'Nothing to undo');
    schedulePaint();
  }, [onToast, schedulePaint]);

  const redo = useCallback(() => {
    onToast(surfaceRef.current.redo() ? 'Redo' : 'Nothing to redo');
    schedulePaint();
  }, [onToast, schedulePaint]);

  useImperativeHandle(
    ref,
    () => ({
      undo,
      redo,
      clear() {
        surfaceRef.current.clear();
        setBlocks([]);
        setActiveId(null);
        schedulePaint();
      },
      isEmpty: () => surfaceRef.current.isEmpty && blocks.length === 0,
    }),
    [undo, redo, schedulePaint, blocks.length],
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

    if (tool === 'type') {
      typeTap(e);
      return;
    }
    if (tool === 'eraser') {
      erasingRef.current = true;
      const p = toWorld(e);
      if (surfaceRef.current.eraseAt(p.x, p.y)) schedulePaint();
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
          const v = (Math.max(0, next) - panRef.current) / dt;
          flingRef.current.v = flingRef.current.v * 0.6 + v * 0.4;
          flingRef.current.at = e.timeStamp;
        }
        setPan(next);
        return;
      }
    }
    if (erasingRef.current) {
      const p = toWorld(e);
      if (surfaceRef.current.eraseAt(p.x, p.y)) schedulePaint();
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

    if (erasingRef.current) {
      erasingRef.current = false;
      return;
    }
    if (drawingRef.current) {
      surfaceRef.current.commit();
      drawingRef.current = false;
      schedulePaint();
    }
  }

  function onPointerCancel(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === 'touch') tapsRef.current.cancel(e.pointerId);
    if (e.pointerType === 'pen') penDownRef.current = false;
    panFromRef.current = null;
    tapRef.current = null;
    erasingRef.current = false;
    if (drawingRef.current) {
      surfaceRef.current.commit();
      drawingRef.current = false;
      schedulePaint();
    }
  }

  function onWheel(e: React.WheelEvent) {
    stopFling();
    setPan(panRef.current + e.deltaY);
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

  function placeBlock(x: number, y: number) {
    const id = nextBlockId.current++;
    setBlocks((bs) => [...dropEmpties(bs), { id, x, y, latex: '' }]);
    setActiveId(id);
    inputRef.current?.focus();
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

  // Leaving the type tool settles whatever was being written.
  useEffect(() => {
    if (tool !== 'type') deselect();
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
    target.setPointerCapture(e.pointerId);

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
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
  }

  // The surface is 4/3 of a screen to begin with, grows past whatever he has
  // written, and always reaches at least one screen below where he is now —
  // so scrolling down never stops and the thumb resizes as he goes.
  const view = viewH || 1;
  const written = blocks.reduce((m, b) => Math.max(m, b.y + BLOCK_HEIGHT), inkBottom);
  const extent = Math.max(view * (4 / 3), written + view / 3, panY + view);
  const thumbHeight = Math.max(10, (view / extent) * 100);
  const thumbTop = Math.min(100 - thumbHeight, (panY / extent) * 100);

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
                inputRef.current?.focus();
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

      {tool === 'type' && (
        <div className="absolute inset-x-3 bottom-3 rounded-lg shadow-[0_18px_44px_-16px_#000]">
          <LatexField
            fieldRef={inputRef}
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
        </div>
      )}

      {tool !== 'type' && (
        <div className="pointer-events-none absolute bottom-4 left-4 font-mono text-[11px] tracking-[0.08em] text-ghost">
          {penOnly
            ? 'PEN DRAWS · FINGER PANS · 2-FINGER TAP UNDOES'
            : 'FINGER DRAWS · 2 FINGERS PAN · 2-FINGER TAP UNDOES'}
        </div>
      )}
    </div>
  );
});

/**
 * Memoised: the control column re-renders on every keystroke, and the canvas
 * has nothing to say about the answer being typed next to it.
 */
export const ScribbleCanvas = memo(ScribbleCanvasImpl);
