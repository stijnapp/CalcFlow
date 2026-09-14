import type { CanvasSurface } from '@calcflow/shared';

export interface StrokePoint {
  x: number;
  y: number;
  /** 0–1 pen pressure, already mapped to a usable range. */
  p: number;
}

export interface Stroke {
  id: number;
  pts: StrokePoint[];
  width: number;
  color: string;
}

/**
 * A stroke as it goes to storage: the points flattened to `[x, y, p, …]` and
 * rounded to a tenth of a pixel. A pen sampling at 480 Hz fills a page with
 * tens of thousands of points, and `{x,y,p}` per point is four times the JSON
 * of three numbers for a precision nothing can see.
 */
export interface StoredStroke {
  w: number;
  pts: number[];
}

/** A rectangle in world coordinates. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * An arrow drawn on a graph question, in **maths** coordinates rather than
 * pixels — the same vector has to mean the same thing on the phone and on the
 * tablet, where the plane is a different size.
 */
export interface StoredArrow {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Everything on the canvas, small enough to sit inside the stored session. */
export interface CanvasState {
  /** The problem it belongs to; a canvas is never restored onto another one. */
  key: string;
  strokes: StoredStroke[];
  blocks: TexBlock[];
  pan: number;
  /** Only on graph questions, where the answer is an arrow rather than a curve. */
  arrows?: StoredArrow[];
}

export interface TexBlock {
  id: number;
  /** World coordinates — the block pans with the strokes. */
  x: number;
  y: number;
  latex: string;
}

const INK = '#efe7db';
const LINE_HEIGHT = 40;
const DOT_SPACING = 32;
/** Grown in chunks as he pans; the surface is effectively unbounded. */
const CHUNK = 2000;
/** Slack kept past the ink at either end, and the step the bitmap grows by. */
const PAD = 1000;

/**
 * Holds the strokes and paints them. Committed strokes live on an offscreen
 * bitmap in world coordinates, so panning is a blit and only the stroke
 * currently under the pen is redrawn per frame.
 */
export class Surface {
  strokes: Stroke[] = [];
  undone: Stroke[] = [];
  live: Stroke | null = null;

  private bitmap: HTMLCanvasElement | null = null;
  /** World y the bitmap starts at. Negative once he has written above the origin. */
  private worldTop = 0;
  private worldHeight = CHUNK;
  /** The bitmap is kept at device resolution; this is the ratio it was cut at. */
  private bitmapDpr = 1;
  private dirty = true;
  private nextId = 1;

  get isEmpty(): boolean {
    return this.strokes.length === 0;
  }

  begin(point: StrokePoint, width: number): void {
    this.live = { id: this.nextId++, pts: [point], width, color: INK };
  }

  extend(points: StrokePoint[]): void {
    if (!this.live) return;
    this.live.pts.push(...points);
  }

  commit(): void {
    if (!this.live) return;
    if (this.live.pts.length > 0) {
      this.strokes.push(this.live);
      // A new mark makes the redo stack meaningless.
      this.undone = [];
      this.dirty = true;
    }
    this.live = null;
  }

  /** Throws the live stroke away: it turned out to be a gesture, not a mark. */
  discard(): void {
    this.live = null;
  }

  /** Removes whole strokes rather than pixels — cheap, and undo stays trivial. */
  eraseAt(x: number, y: number, radius = 12): boolean {
    const hit = this.strokes.findIndex((s) =>
      s.pts.some((q) => Math.abs(q.x - x) < radius && Math.abs(q.y - y) < radius),
    );
    if (hit < 0) return false;
    this.undone.push(this.strokes.splice(hit, 1)[0]!);
    this.dirty = true;
    return true;
  }

  undo(): boolean {
    const s = this.strokes.pop();
    if (!s) return false;
    this.undone.push(s);
    this.dirty = true;
    return true;
  }

  redo(): boolean {
    const s = this.undone.pop();
    if (!s) return false;
    this.strokes.push(s);
    this.dirty = true;
    return true;
  }

  clear(): void {
    // Undo can still bring them back until the problem moves on.
    this.undone = [...this.strokes].reverse().concat(this.undone);
    this.strokes = [];
    this.dirty = true;
  }

  reset(): void {
    this.strokes = [];
    this.undone = [];
    this.live = null;
    // A fresh page gets a fresh window on the world; the last one may have been
    // grown a long way in either direction by the problem before it.
    this.worldTop = 0;
    this.worldHeight = CHUNK;
    this.bitmap = null;
    this.dirty = true;
  }

  /** How far down the strokes actually reach. Zero on an empty surface. */
  contentBottom(): number {
    let max = 0;
    for (const s of this.strokes) {
      for (const p of s.pts) if (p.y > max) max = p.y;
    }
    return max;
  }

  /**
   * Every stroke with at least one point inside the loop. The smallest part
   * counts, which is what makes lassoing a line of working forgiving: he
   * circles roughly, and the tails of the letters come along.
   */
  selectIn(loop: readonly StrokePoint[]): number[] {
    if (loop.length < 3) return [];
    return this.strokes.filter((s) => s.pts.some((p) => inside(p, loop))).map((s) => s.id);
  }

  /** The box around a set of strokes, in world coordinates. */
  boundsOf(ids: ReadonlySet<number>): Box | null {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const s of this.strokes) {
      if (!ids.has(s.id)) continue;
      for (const p of s.pts) {
        if (p.x < x0) x0 = p.x;
        if (p.y < y0) y0 = p.y;
        if (p.x > x1) x1 = p.x;
        if (p.y > y1) y1 = p.y;
      }
    }
    return x0 === Infinity ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  /** Takes a selection off the page. Redo brings it back, as the eraser does. */
  remove(ids: ReadonlySet<number>): void {
    const gone = this.strokes.filter((s) => ids.has(s.id));
    if (gone.length === 0) return;
    this.strokes = this.strokes.filter((s) => !ids.has(s.id));
    this.undone.push(...gone);
    this.dirty = true;
  }

  /** Moves a selection bodily. Undo does not follow it — it is not a mark. */
  translate(ids: ReadonlySet<number>, dx: number, dy: number): void {
    for (const s of this.strokes) {
      if (!ids.has(s.id)) continue;
      for (const p of s.pts) {
        p.x += dx;
        p.y += dy;
      }
    }
    this.dirty = true;
  }

  /** Where the topmost mark sits. Zero on an empty surface. */
  contentTop(): number {
    let min = Infinity;
    for (const s of this.strokes) {
      for (const p of s.pts) if (p.y < min) min = p.y;
    }
    return min === Infinity ? 0 : min;
  }

  /** The committed strokes only: a live one is a gesture that has not landed. */
  serialize(): StoredStroke[] {
    return this.strokes.map((s) => {
      const pts: number[] = [];
      for (const p of s.pts) pts.push(round(p.x), round(p.y), round(p.p));
      return { w: s.width, pts };
    });
  }

  /** Redo is deliberately not restored: it belongs to the sitting, not the page. */
  restore(list: StoredStroke[]): void {
    this.strokes = list.map((s) => {
      const pts: StrokePoint[] = [];
      for (let i = 0; i + 2 < s.pts.length; i += 3) {
        pts.push({ x: s.pts[i]!, y: s.pts[i + 1]!, p: s.pts[i + 2]! });
      }
      return { id: this.nextId++, pts, width: s.w, color: INK };
    });
    this.undone = [];
    this.live = null;
    this.dirty = true;
  }

  /**
   * `underlay` paints between the paper and the ink, `overlay` on top of
   * everything — which is how a graph question gets its axes below the sketch
   * and the answer above it. `hideInk` is the Answer-only view of the toggle.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    panY: number,
    surface: CanvasSurface,
    dpr: number,
    layers: {
      underlay?: (ctx: CanvasRenderingContext2D, pan: number) => void;
      overlay?: (ctx: CanvasRenderingContext2D, pan: number) => void;
      hideInk?: boolean;
    } = {},
  ): void {
    // Pan on whole device pixels: half a pixel of offset is enough to make the
    // blit resample, and resampled ink is what reads as "it went soft".
    const pan = Math.round(panY * dpr) / dpr;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#171512';
    ctx.fillRect(0, 0, width, height);
    paintSurface(ctx, width, height, pan, surface);
    layers.underlay?.(ctx, pan);

    if (!layers.hideInk) {
      this.ensureBitmap(width, dpr);
      if (this.dirty) this.repaintBitmap(width);
      if (this.bitmap) {
        ctx.drawImage(this.bitmap, 0, this.worldTop - pan, width, this.worldHeight);
      }

      if (this.live) {
        ctx.save();
        ctx.translate(0, -pan);
        paintStroke(ctx, this.live);
        ctx.restore();
      }
    }

    layers.overlay?.(ctx, pan);
  }

  /**
   * The bitmap holds world coordinates but is cut at device resolution: drawn
   * at CSS size into a context already scaled by the ratio, every committed
   * stroke was being blown up by that same factor the moment it was committed.
   *
   * It is a window on the world rather than the world from zero. Panning stops
   * half a screen above the first mark, so there is paper up there to write on,
   * and a bitmap that began at y = 0 threw every one of those strokes away the
   * moment the pen left the glass — the live stroke was painted straight onto
   * the view, and only the committed copy went to the bitmap.
   */
  private ensureBitmap(width: number, dpr: number): void {
    const top = Math.min(this.worldTop, floorTo(Math.min(0, this.contentTop()) - PAD, PAD));
    const bottom = Math.max(
      this.worldTop + this.worldHeight,
      ceilTo(this.contentBottom() + PAD, PAD),
      top + CHUNK,
    );
    const px = Math.round(width * dpr);
    if (
      !this.bitmap ||
      this.bitmap.width !== px ||
      this.bitmapDpr !== dpr ||
      top !== this.worldTop ||
      bottom - top !== this.worldHeight
    ) {
      this.worldTop = top;
      this.worldHeight = bottom - top;
      this.bitmapDpr = dpr;
      this.bitmap = document.createElement('canvas');
      this.bitmap.width = px;
      this.bitmap.height = Math.round(this.worldHeight * dpr);
      this.dirty = true;
    }
  }

  private repaintBitmap(width: number): void {
    if (!this.bitmap) return;
    const ctx = this.bitmap.getContext('2d');
    if (!ctx) return;
    const dpr = this.bitmapDpr;
    // The offset is in device pixels; the scale below it is not.
    ctx.setTransform(dpr, 0, 0, dpr, 0, Math.round(-this.worldTop * dpr));
    ctx.clearRect(0, this.worldTop, width, this.worldHeight);
    for (const s of this.strokes) paintStroke(ctx, s);
    this.dirty = false;
  }
}

/** Ray casting, so a loop he drew over itself still reads as one region. */
export function loopContains(loop: readonly StrokePoint[], x: number, y: number): boolean {
  return inside({ x, y }, loop);
}

function inside(p: { x: number; y: number }, loop: readonly StrokePoint[]): boolean {
  let hit = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i, i += 1) {
    const a = loop[i]!;
    const b = loop[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      hit = !hit;
    }
  }
  return hit;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function floorTo(n: number, step: number): number {
  return Math.floor(n / step) * step;
}

function ceilTo(n: number, step: number): number {
  return Math.ceil(n / step) * step;
}

function paintStroke(ctx: CanvasRenderingContext2D, s: Stroke): void {
  ctx.strokeStyle = s.color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (s.pts.length < 2) {
    const p = s.pts[0];
    if (!p) return;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1, s.width * p.p) / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // Width follows pressure, so each segment is stroked at its own thickness.
  for (let i = 1; i < s.pts.length; i += 1) {
    const a = s.pts[i - 1]!;
    const b = s.pts[i]!;
    ctx.lineWidth = Math.max(0.7, s.width * ((a.p + b.p) / 2));
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

function paintSurface(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  panY: number,
  surface: CanvasSurface,
): void {
  if (surface === 'blank') return;
  if (surface === 'ruled') {
    ctx.strokeStyle = '#211d19';
    ctx.lineWidth = 1;
    const start = -(((panY % LINE_HEIGHT) + LINE_HEIGHT) % LINE_HEIGHT);
    for (let y = start; y < height; y += LINE_HEIGHT) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }
    return;
  }
  ctx.fillStyle = '#2a2521';
  const start = -(((panY % DOT_SPACING) + DOT_SPACING) % DOT_SPACING);
  for (let y = start; y < height; y += DOT_SPACING) {
    for (let x = DOT_SPACING / 2; x < width; x += DOT_SPACING) {
      ctx.beginPath();
      ctx.arc(x, y, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** The line spacing, so a typed block can snap to a ruled line. */
export const RULE_SPACING = LINE_HEIGHT;
