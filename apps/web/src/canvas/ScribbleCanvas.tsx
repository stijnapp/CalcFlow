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
import { Check, Trash2, X } from 'lucide-react';
import type { CanvasSurface } from '@calcflow/shared';
import { Tex } from '@/components/Tex';
import { cx } from '@/lib/cx';
import { RULE_SPACING, Surface, type StrokePoint, type TexBlock } from './strokes';
import { TapDetector } from './gestures';

export type CanvasTool = 'pen1' | 'pen2' | 'eraser' | 'type';

export interface CanvasHandle {
  undo(): void;
  redo(): void;
  clear(): void;
  isEmpty(): boolean;
}

interface Props {
  tool: CanvasTool;
  penOnly: boolean;
  surface: CanvasSurface;
  /** Changes when the problem does; strokes are discarded, not persisted. */
  problemKey: string;
  onToast(message: string): void;
  className?: string;
}

const PEN_WIDTH: Record<string, number> = { pen1: 3.2, pen2: 6.4 };

/**
 * A fixed viewport onto an infinitely tall surface. The page never scrolls —
 * he pans within the canvas instead.
 */
const ScribbleCanvasImpl = forwardRef<CanvasHandle, Props>(function ScribbleCanvas(
  { tool, penOnly, surface, problemKey, onToast, className },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef(new Surface());
  const tapsRef = useRef(new TapDetector());
  const sizeRef = useRef({ w: 0, h: 0 });
  const panRef = useRef(0);
  const panFromRef = useRef<{ y: number; pan: number } | null>(null);
  const drawingRef = useRef(false);
  const erasingRef = useRef(false);
  const penDownRef = useRef(false);
  const frameRef = useRef(0);

  const [panY, setPanY] = useState(0);
  const [blocks, setBlocks] = useState<TexBlock[]>([]);
  const [draft, setDraft] = useState<{ x: number; y: number; latex: string } | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  const nextBlockId = useRef(1);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    surfaceRef.current.draw(ctx, w, h, panRef.current, surface);
  }, [surface]);

  /** Coalesce paints into one per frame; a 480 Hz pen would otherwise flood. */
  const schedulePaint = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      paint();
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
    setDraft(null);
    setSelectedBlock(null);
    panRef.current = 0;
    setPanY(0);
    schedulePaint();
  }, [problemKey, schedulePaint]);

  const setPan = useCallback(
    (value: number) => {
      const { h } = sizeRef.current;
      const max = Math.max(0, surfaceRef.current.extent(h) - h);
      panRef.current = Math.min(max, Math.max(0, value));
      setPanY(panRef.current);
      schedulePaint();
    },
    [schedulePaint],
  );

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
        schedulePaint();
      },
      isEmpty: () => surfaceRef.current.isEmpty && blocks.length === 0,
    }),
    [undo, redo, schedulePaint, blocks.length],
  );

  // ------------------------------------------------------------- pointer input

  function pressure(e: { pointerType: string; pressure: number }): number {
    // 12-bit pressure on both target devices; the floor keeps a light touch visible.
    if (e.pointerType === 'pen' && e.pressure > 0) return 0.35 + e.pressure * 0.9;
    return 1;
  }

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    canvasRef.current?.setPointerCapture(e.pointerId);

    if (e.pointerType === 'touch') {
      tapsRef.current.down(e.pointerId, e.clientX, e.clientY);
      if (penDownRef.current) tapsRef.current.abort();
      if (penOnly) {
        // Finger pans instead of drawing; that is what keeps the palm harmless.
        if (tapsRef.current.activeCount === 1) panFromRef.current = { y: e.clientY, pan: panRef.current };
        return;
      }
    }
    if (e.pointerType === 'pen') {
      penDownRef.current = true;
      tapsRef.current.abort();
    }

    if (tool === 'type') {
      const p = toWorld(e);
      setSelectedBlock(null);
      setDraft((d) => ({ x: p.x, y: Math.round(p.y / RULE_SPACING) * RULE_SPACING, latex: d?.latex ?? '' }));
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
    surfaceRef.current.begin(point, PEN_WIDTH[tool] ?? 3.2);
    drawingRef.current = true;
    schedulePaint();
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === 'touch') {
      tapsRef.current.move(e.pointerId, e.clientX, e.clientY);
      if (penOnly) {
        const from = panFromRef.current;
        if (from && tapsRef.current.activeCount === 1) setPan(from.pan - (e.clientY - from.y));
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
      const fingers = tapsRef.current.up(e.pointerId);
      panFromRef.current = null;
      // Every gesture confirms itself: a tap that failed the movement threshold
      // is otherwise indistinguishable from an undo with nothing left to undo.
      if (fingers >= 3) redo();
      else if (fingers === 2) undo();
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
    erasingRef.current = false;
    if (drawingRef.current) {
      surfaceRef.current.commit();
      drawingRef.current = false;
      schedulePaint();
    }
  }

  function onWheel(e: React.WheelEvent) {
    setPan(panRef.current + e.deltaY);
  }

  // ---------------------------------------------------------------- tex blocks

  function commitDraft() {
    if (!draft || !draft.latex.trim()) {
      setDraft(null);
      return;
    }
    setBlocks((bs) => [...bs, { id: nextBlockId.current++, x: draft.x, y: draft.y, latex: draft.latex }]);
    setDraft(null);
  }

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

  const extent = surfaceRef.current.extent(sizeRef.current.h || 1);
  const thumbHeight = Math.max(12, ((sizeRef.current.h || 1) / extent) * 100);
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
          className="absolute left-0 w-1 rounded-full bg-rail transition-[top] duration-75"
          style={{ top: `${thumbTop}%`, height: `${thumbHeight}%` }}
        />
      </div>

      {blocks.map((b) => (
        <div
          key={b.id}
          onPointerDown={(e) => {
            e.stopPropagation();
            setSelectedBlock(b.id);
            dragBlock(b.id, e);
          }}
          className={cx(
            'absolute flex cursor-grab touch-none items-center gap-2 rounded-[10px] border px-3.5 py-2 text-[22px] backdrop-blur-sm',
            selectedBlock === b.id ? 'border-accent bg-card/95' : 'border-border bg-card/90',
          )}
          style={{ left: b.x, top: b.y - panY }}
        >
          <Tex>{b.latex}</Tex>
          {selectedBlock === b.id && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                setBlocks((bs) => bs.filter((x) => x.id !== b.id));
                setSelectedBlock(null);
              }}
              aria-label="Delete this block"
              className="ml-1 grid size-6 place-items-center rounded-md bg-raised text-muted hover:text-ink"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      ))}

      {draft && (
        <div
          className="absolute flex items-center gap-2"
          style={{ left: draft.x, top: draft.y - panY }}
        >
          <div className="flex items-center gap-1 rounded-[10px] border border-accent bg-card/95 px-3.5 py-2 text-[22px] shadow-[0_0_0_4px_rgba(245,165,36,0.1)]">
            {draft.latex ? <Tex>{draft.latex}</Tex> : <span className="text-faint">…</span>}
            <span className="ml-0.5 h-6 w-0.5 animate-pulse bg-accent" />
          </div>
          <button
            onClick={commitDraft}
            aria-label="Place this block"
            className="grid size-8 place-items-center rounded-[9px] bg-accent text-on-accent"
          >
            <Check className="size-4" />
          </button>
          <button
            onClick={() => setDraft(null)}
            aria-label="Discard this block"
            className="grid size-8 place-items-center rounded-[9px] border border-strong bg-raised text-muted"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {tool === 'type' && (
        <div className="absolute inset-x-4 bottom-12 flex items-center gap-3 rounded-md border border-strong bg-sunken px-4 py-3 shadow-[0_16px_40px_-16px_#000]">
          <span className="shrink-0 font-mono text-[10px] tracking-[0.1em] text-accent">LATEX</span>
          <input
            value={draft?.latex ?? ''}
            onChange={(e) =>
              setDraft((d) => ({ x: d?.x ?? 40, y: d?.y ?? panY + 80, latex: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitDraft();
              if (e.key === 'Escape') setDraft(null);
            }}
            placeholder="\frac{d}{dx}\ln(x)"
            className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-ink2 outline-none placeholder:text-ghost"
          />
          <span className="shrink-0 font-mono text-[10px] tracking-[0.06em] text-faint">
            TAP A LINE TO PLACE · ENTER COMMITS
          </span>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-4 left-4 font-mono text-[11px] tracking-[0.08em] text-ghost">
        {tool === 'type'
          ? 'TYPING MATH · TAP A RULED LINE TO PLACE A BLOCK'
          : penOnly
            ? 'PEN DRAWS · FINGER PANS · 2-FINGER TAP UNDOES'
            : 'FINGER DRAWS · 2-FINGER TAP UNDOES'}
      </div>
    </div>
  );
});

/**
 * Memoised: the control column re-renders on every keystroke, and the canvas
 * has nothing to say about the answer being typed next to it.
 */
export const ScribbleCanvas = memo(ScribbleCanvasImpl);
