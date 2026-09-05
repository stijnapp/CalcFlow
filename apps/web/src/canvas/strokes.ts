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
/** Grown in chunks as he pans down; the surface is effectively unbounded. */
const CHUNK = 2000;

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
  private worldHeight = CHUNK;
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

  draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    panY: number,
    surface: CanvasSurface,
  ): void {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#171512';
    ctx.fillRect(0, 0, width, height);
    paintSurface(ctx, width, height, panY, surface);

    this.ensureBitmap(width);
    if (this.dirty) this.repaintBitmap(width);
    if (this.bitmap) ctx.drawImage(this.bitmap, 0, -panY);

    if (this.live) {
      ctx.save();
      ctx.translate(0, -panY);
      paintStroke(ctx, this.live);
      ctx.restore();
    }
  }

  private ensureBitmap(width: number): void {
    const needed = Math.max(this.worldHeight, this.contentBottom() + CHUNK / 2);
    if (!this.bitmap || this.bitmap.width !== width || needed > this.worldHeight) {
      this.worldHeight = Math.ceil(needed / CHUNK) * CHUNK;
      this.bitmap = document.createElement('canvas');
      this.bitmap.width = width;
      this.bitmap.height = this.worldHeight;
      this.dirty = true;
    }
  }

  private repaintBitmap(width: number): void {
    if (!this.bitmap) return;
    const ctx = this.bitmap.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, this.worldHeight);
    for (const s of this.strokes) paintStroke(ctx, s);
    this.dirty = false;
  }
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
