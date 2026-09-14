import { evaluate, tryParse, type Expr } from '@calcflow/engine';
import type { PlotItem, PlotSpec, PlotWindow } from '@calcflow/generators';
import type { StoredArrow } from './strokes';

/**
 * The coordinate plane a graph question is drawn on.
 *
 * It lives in the same world coordinates as the ink, so it pans with the page
 * and a mark stays where it was put. Units are square by construction: the
 * question is often whether a curve is steeper than a line, and a plane that
 * stretches one axis makes that unanswerable.
 */

const AXIS = '#6f665c';
const GRID = '#241f1b';
const GRID_MAJOR = '#2f2823';
const LABEL = '#8a8178';
/** The question's own marks — there before he draws anything. */
const GIVEN = '#7f9f93';
/** The answer, revealed over the sketch. Same accent as everywhere else. */
export const ANSWER_INK = '#f5a524';

export interface Plane {
  /** Pixels per unit, the same on both axes. */
  scale: number;
  /** World coordinates of the maths origin. */
  originX: number;
  originY: number;
  /** How tall the plane is in world pixels — the pannable region of interest. */
  height: number;
  window: PlotWindow;
}

/** Fits the window's full width into the canvas and lets the height follow. */
export function planeFor(window: PlotWindow, widthPx: number): Plane {
  const scale = widthPx / (window.xMax - window.xMin);
  return {
    scale,
    originX: -window.xMin * scale,
    originY: window.yMax * scale,
    height: (window.yMax - window.yMin) * scale,
    window,
  };
}

/** Maths coordinates to world pixels. */
export function toWorld(plane: Plane, x: number, y: number): { x: number; y: number } {
  return { x: plane.originX + x * plane.scale, y: plane.originY - y * plane.scale };
}

/** World pixels back to maths coordinates — what a drawn arrow is read as. */
export function toMaths(plane: Plane, x: number, y: number): { x: number; y: number } {
  return { x: (x - plane.originX) / plane.scale, y: (plane.originY - y) / plane.scale };
}

/** The nearest whole-number point, for a lattice question's arrows. */
export function snapToLattice(plane: Plane, worldX: number, worldY: number): { x: number; y: number } {
  const m = toMaths(plane, worldX, worldY);
  return { x: Math.round(m.x), y: Math.round(m.y) };
}

/** Grid, axes and tick labels. Drawn under everything, in world coordinates. */
export function paintPlane(
  ctx: CanvasRenderingContext2D,
  plane: Plane,
  width: number,
  height: number,
  panY: number,
): void {
  const { window: w, scale } = plane;
  ctx.save();
  ctx.translate(0, -panY);

  ctx.lineWidth = 1;
  for (let x = Math.ceil(w.xMin / w.step) * w.step; x <= w.xMax; x += w.step) {
    const px = Math.round(toWorld(plane, x, 0).x) + 0.5;
    ctx.strokeStyle = x === 0 ? AXIS : Math.abs(x % (w.step * 5)) < 1e-9 ? GRID_MAJOR : GRID;
    ctx.beginPath();
    ctx.moveTo(px, toWorld(plane, 0, w.yMax).y);
    ctx.lineTo(px, toWorld(plane, 0, w.yMin).y);
    ctx.stroke();
  }
  for (let y = Math.ceil(w.yMin / w.step) * w.step; y <= w.yMax; y += w.step) {
    const py = Math.round(toWorld(plane, 0, y).y) + 0.5;
    ctx.strokeStyle = y === 0 ? AXIS : Math.abs(y % (w.step * 5)) < 1e-9 ? GRID_MAJOR : GRID;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(width, py);
    ctx.stroke();
  }

  // Numbers on the axes, every other unit so they do not collide on a phone.
  const every = scale < 26 ? w.step * 2 : w.step;
  ctx.fillStyle = LABEL;
  ctx.font = '11px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const axisY = toWorld(plane, 0, 0).y;
  for (let x = Math.ceil(w.xMin / every) * every; x <= w.xMax; x += every) {
    if (x === 0) continue;
    ctx.fillText(String(x), toWorld(plane, x, 0).x, axisY + 4);
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const axisX = toWorld(plane, 0, 0).x;
  for (let y = Math.ceil(w.yMin / every) * every; y <= w.yMax; y += every) {
    if (y === 0) continue;
    ctx.fillText(String(y), axisX - 6, toWorld(plane, 0, y).y);
  }
  ctx.fillStyle = AXIS;
  ctx.textAlign = 'left';
  ctx.fillText('x', width - 12, axisY - 12);
  ctx.textAlign = 'center';
  ctx.fillText('y', axisX + 12, toWorld(plane, 0, w.yMax).y + 8);

  ctx.restore();
  void height;
}

/** The question's own marks, or the revealed answer. */
export function paintItems(
  ctx: CanvasRenderingContext2D,
  plane: Plane,
  items: readonly PlotItem[],
  panY: number,
  role: 'given' | 'answer',
): void {
  const colour = role === 'answer' ? ANSWER_INK : GIVEN;
  ctx.save();
  ctx.translate(0, -panY);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = role === 'answer' ? 2.4 : 1.8;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.font = '12px ui-sans-serif, system-ui';

  for (const item of items) {
    switch (item.kind) {
      case 'curve':
        paintCurve(ctx, plane, item.of, item.from, item.to);
        break;
      case 'asymptote':
        paintDashed(
          ctx,
          plane,
          item.axis === 'vertical' ? { x: item.at } : { y: item.at },
          item.label,
        );
        break;
      case 'line':
        paintLine(ctx, plane, item.slope, item.intercept, item.dashed ?? false, item.label);
        break;
      case 'point':
        paintPoint(ctx, plane, item.at[0], item.at[1], item.label, item.hollow ?? false, colour);
        break;
      case 'vector':
        paintVector(ctx, plane, item.from ?? [0, 0], item.to, item.label);
        break;
    }
  }
  ctx.restore();
}

/**
 * One sample per pixel column, with the path broken wherever the function stops
 * being finite or jumps further than the window is tall. Without the second
 * test a hyperbola's two branches get joined by a vertical line straight
 * through its own asymptote — which is exactly the mistake the question is
 * asking him not to make.
 */
function paintCurve(
  ctx: CanvasRenderingContext2D,
  plane: Plane,
  latex: string,
  from?: number,
  to?: number,
): void {
  const expr: Expr | null = tryParse(latex);
  if (!expr) return;
  const { window: w } = plane;
  const lo = Math.max(w.xMin, from ?? w.xMin);
  const hi = Math.min(w.xMax, to ?? w.xMax);
  const columns = Math.max(2, Math.round((hi - lo) * plane.scale));
  const jump = (w.yMax - w.yMin) * plane.scale;

  ctx.beginPath();
  let pen = false;
  let lastY = 0;
  for (let i = 0; i <= columns; i += 1) {
    const x = lo + ((hi - lo) * i) / columns;
    let y: number;
    try {
      y = evaluate(expr, { x });
    } catch {
      y = NaN;
    }
    if (!Number.isFinite(y)) {
      pen = false;
      continue;
    }
    const p = toWorld(plane, x, y);
    // Off the top or bottom by more than a window's worth: keep the pen up so
    // the curve leaves the picture instead of racing along its edge.
    if (p.y < -jump || p.y > plane.height + jump) {
      pen = false;
      continue;
    }
    if (pen && Math.abs(p.y - lastY) > jump) pen = false;
    if (pen) ctx.lineTo(p.x, p.y);
    else ctx.moveTo(p.x, p.y);
    pen = true;
    lastY = p.y;
  }
  ctx.stroke();
}

function paintDashed(
  ctx: CanvasRenderingContext2D,
  plane: Plane,
  at: { x: number } | { y: number },
  label?: string,
): void {
  ctx.save();
  ctx.setLineDash([7, 6]);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  if ('x' in at) {
    const px = toWorld(plane, at.x, 0).x;
    ctx.moveTo(px, 0);
    ctx.lineTo(px, plane.height);
    ctx.stroke();
    if (label) {
      ctx.setLineDash([]);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(label, px + 6, 8);
    }
  } else {
    const py = toWorld(plane, 0, at.y).y;
    ctx.moveTo(0, py);
    ctx.lineTo(plane.scale * (plane.window.xMax - plane.window.xMin), py);
    ctx.stroke();
    if (label) {
      ctx.setLineDash([]);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, plane.scale * (plane.window.xMax - plane.window.xMin) - 8, py - 5);
    }
  }
  ctx.restore();
}

function paintLine(
  ctx: CanvasRenderingContext2D,
  plane: Plane,
  slope: number,
  intercept: number,
  dashed: boolean,
  label?: string,
): void {
  const { window: w } = plane;
  const a = toWorld(plane, w.xMin, slope * w.xMin + intercept);
  const b = toWorld(plane, w.xMax, slope * w.xMax + intercept);
  ctx.save();
  if (dashed) ctx.setLineDash([7, 6]);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  if (label) {
    ctx.setLineDash([]);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, b.x - 8, b.y - 6);
  }
  ctx.restore();
}

function paintPoint(
  ctx: CanvasRenderingContext2D,
  plane: Plane,
  x: number,
  y: number,
  label: string | undefined,
  hollow: boolean,
  colour: string,
): void {
  const p = toWorld(plane, x, y);
  ctx.beginPath();
  ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
  if (hollow) {
    ctx.save();
    ctx.fillStyle = '#171512';
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.fill();
  }
  if (label) {
    ctx.save();
    ctx.fillStyle = colour;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, p.x + 8, p.y - 6);
    ctx.restore();
  }
}

function paintVector(
  ctx: CanvasRenderingContext2D,
  plane: Plane,
  from: readonly [number, number],
  to: readonly [number, number],
  label?: string,
): void {
  const a = toWorld(plane, from[0], from[1]);
  const b = toWorld(plane, to[0], to[1]);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length < 1) return;
  const head = Math.min(13, length * 0.35);
  const angle = Math.atan2(dy, dx);
  // The shaft stops short of the tip so the arrowhead is not drawn over.
  const tipX = b.x - Math.cos(angle) * head * 0.55;
  const tipY = b.y - Math.sin(angle) * head * 0.55;

  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x - Math.cos(angle - 0.42) * head, b.y - Math.sin(angle - 0.42) * head);
  ctx.lineTo(b.x - Math.cos(angle + 0.42) * head, b.y - Math.sin(angle + 0.42) * head);
  ctx.closePath();
  ctx.fill();

  if (label) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, b.x + Math.cos(angle) * 16, b.y + Math.sin(angle) * 16 - 2);
    ctx.restore();
  }
}

/** His own arrows, in the ink colour — the drawn half of a chapter 12 answer. */
export function paintArrows(
  ctx: CanvasRenderingContext2D,
  plane: Plane,
  arrows: readonly StoredArrow[],
  panY: number,
  colour = '#efe7db',
): void {
  ctx.save();
  ctx.translate(0, -panY);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const a of arrows) paintVector(ctx, plane, [a.x1, a.y1], [a.x2, a.y2]);
  ctx.restore();
}

/** What the canvas needs to draw a graph question, gathered in one place. */
export interface PlaneView {
  spec: PlotSpec;
  /** Whether the answer is revealed, and whose marks are on screen. */
  reveal: 'mine' | 'answer' | 'both' | 'none';
}
