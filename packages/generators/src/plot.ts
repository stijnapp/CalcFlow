import type { Latex } from './types.js';

/**
 * What a graph question hands the canvas.
 *
 * Chapters 5 and 12 ask for a drawing, and a drawing cannot be typed into an
 * answer field. The generator therefore emits two things that the LaTeX-only
 * problems never needed: the window to put real axes in, and the picture of the
 * right answer, so it can be drawn over his sketch at the reveal instead of
 * described next to it.
 *
 * Everything here is in maths coordinates. The canvas owns the mapping to
 * pixels — including keeping the units square, which is not optional when the
 * question is whether a curve is steep.
 */

export interface PlotWindow {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  /** Gridline spacing. Ticks are labelled at the same interval. */
  step: number;
}

/** A curve, sampled by the canvas across the window. */
export interface PlotCurve {
  kind: 'curve';
  /** Parsed and evaluated per pixel column. Breaks are handled by the canvas. */
  of: Latex;
  /** Restrict the curve to part of the window — a piecewise branch, a domain. */
  from?: number;
  to?: number;
}

/** A straight line the curve never touches, drawn dashed. */
export interface PlotAsymptote {
  kind: 'asymptote';
  /** `vertical` is x = at; `horizontal` is y = at. */
  axis: 'vertical' | 'horizontal';
  at: number;
  /** `y = 3`, drawn beside the line. */
  label?: string;
}

/** A slant asymptote, or any other straight line worth naming. */
export interface PlotLine {
  kind: 'line';
  slope: number;
  intercept: number;
  dashed?: boolean;
  label?: string;
}

export interface PlotPoint {
  kind: 'point';
  at: readonly [number, number];
  label?: string;
  /** An open circle marks a hole — a point the function does not have. */
  hollow?: boolean;
}

/** An arrow, for chapter 12. `from` defaults to the origin. */
export interface PlotVector {
  kind: 'vector';
  to: readonly [number, number];
  from?: readonly [number, number];
  label?: string;
}

export type PlotItem = PlotCurve | PlotAsymptote | PlotLine | PlotPoint | PlotVector;

export interface PlotSpec {
  window: PlotWindow;
  /**
   * Drawn from the start, in the muted "this is part of the question" ink —
   * chapter 12's two given vectors, or a curve he has to reflect.
   */
  given?: readonly PlotItem[];
  /** Drawn over his own sketch at the reveal, in the answer ink. */
  answer: readonly PlotItem[];
  /**
   * Whole-number coordinates only. Turns on the arrow tool's snapping, which is
   * what makes a drawn vector something the eye can check against the answer.
   */
  lattice?: boolean;
}
