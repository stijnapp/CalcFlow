import { evaluate, freeVars, type Expr } from '@calcflow/engine';

/*
 * The numerical analysis the harness checks answers with: derivatives,
 * integrals, limits and extrema worked out from the prompt by brute force, so a
 * generator's algebra has something independent to be compared against.
 */

/** Values for the free variables. */
export type Point = Record<string, number>;

export function varsOf(...exprs: Expr[]): string[] {
  return Array.from(new Set(exprs.flatMap(freeVars)));
}

/** f as a function of one variable. */
export function along(f: Expr, wrt: string): (x: number) => number {
  return (x) => evaluate(f, { [wrt]: x });
}

/** f as a function of a point. */
export function valueOf(f: Expr): (b: Point) => number {
  return (b) => evaluate(f, b);
}

/**
 * Central difference, Richardson-extrapolated for accuracy.
 *
 * Returns NaN where the two stencils disagree, which the caller skips. A
 * difference quotient says nothing about a point whose neighbourhood contains a
 * pole — `\tan x` a thousandth away from π/2 samples both sides of infinity and
 * comes back with a confident wrong number. The two widths agreeing to a part in
 * a thousand is the cheap test for "smooth across the stencil"; where they do
 * not, the point is unusable rather than failed.
 */
export function numericDerivative(f: Expr, wrt: string, bindings: Point): number {
  const x = bindings[wrt]!;
  const h = Math.max(1e-4, Math.abs(x) * 1e-4);
  const at = (v: number) => evaluate(f, { ...bindings, [wrt]: v });
  const d1 = (at(x + h) - at(x - h)) / (2 * h);
  const d2 = (at(x + h / 2) - at(x - h / 2)) / h;
  if (Math.abs(d1 - d2) > 1e-3 * Math.max(1, Math.abs(d2))) return NaN;
  return (4 * d2 - d1) / 3;
}

/**
 * ∂²f/∂a∂b from the four corners of a square around the point, with the
 * leading error extrapolated away the same way as the one-variable case, and
 * NaN where the two widths disagree.
 */
export function numericMixedPartial(
  f: Expr,
  [u, v]: readonly [string, string],
  bindings: Point,
): number {
  const x = bindings[u]!;
  const y = bindings[v]!;
  const at = (dx: number, dy: number) => evaluate(f, { ...bindings, [u]: x + dx, [v]: y + dy });
  const corners = (h: number) => (at(h, h) - at(h, -h) - at(-h, h) + at(-h, -h)) / (4 * h * h);
  const h = 1e-3 * Math.max(1, Math.abs(x), Math.abs(y));
  const d1 = corners(h);
  const d2 = corners(h / 2);
  if (Math.abs(d1 - d2) > 1e-2 * Math.max(1, Math.abs(d2))) return NaN;
  return (4 * d2 - d1) / 3;
}

/**
 * Walks in towards the point and checks that the function goes where the answer
 * says. Two steps in rather than one, with the leading error extrapolated away:
 * a difference quotient one thousandth from the point is still a thousandth
 * off, which is not precision enough to tell a right answer from a nearly right
 * one.
 */
export function approaches(
  f: Expr,
  v: { wrt: string; at: number | 'inf' | '-inf'; side?: 'left' | 'right' },
  declared: number,
): boolean {
  const at = along(f, v.wrt);

  /** Richardson on a 1/n error term: the pair, with the first order removed. */
  const towards = (near: number, nearer: number): boolean => {
    const v1 = at(near);
    const v2 = at(nearer);
    if (!Number.isFinite(v1) || !Number.isFinite(v2)) return false;
    const extrapolated = (10 * v2 - v1) / 9;
    return Math.abs(extrapolated - declared) <= 1e-4 * Math.max(1, Math.abs(declared));
  };

  if (v.at === 'inf') return towards(1e3, 1e4);
  if (v.at === '-inf') return towards(-1e3, -1e4);

  const a = v.at;
  const left = towards(a - 1e-3, a - 1e-4);
  const right = towards(a + 1e-3, a + 1e-4);
  if (v.side === 'left') return left;
  if (v.side === 'right') return right;
  return left && right;
}

/**
 * Double-exponential quadrature: tanh-sinh on a finite interval, exp-sinh on a
 * half-line. Both crowd their points towards the ends fast enough that an
 * integrable blow-up there, or a tail out to infinity, costs nothing — which is
 * exactly what Simpson cannot do. Two step sizes have to agree, or the answer
 * is NaN rather than a confident wrong number.
 */
export function improper(g: (x: number) => number, a: number, b: number | 'inf'): number {
  const run = (h: number): number => {
    let total = 0;
    for (let k = -Math.ceil(4 / h); k <= Math.ceil(4 / h); k += 1) {
      const t = k * h;
      const u = (Math.PI / 2) * Math.sinh(t);
      let x: number;
      let w: number;
      if (b === 'inf') {
        x = a + Math.exp(u);
        w = Math.exp(u) * (Math.PI / 2) * Math.cosh(t);
      } else {
        const half = (b - a) / 2;
        // How far from the nearer end, worked out without the cancellation
        // that would put the point exactly on the end it is approaching.
        const gap = (2 * half) / (Math.exp(2 * Math.abs(u)) + 1);
        x = u >= 0 ? b - gap : a + gap;
        w = (half * (Math.PI / 2) * Math.cosh(t)) / Math.cosh(u) ** 2;
      }
      if (w === 0 || x === a || x === b) continue;
      const fx = g(x);
      if (Number.isFinite(fx)) total += w * fx;
    }
    return total * h;
  };
  const coarse = run(1 / 16);
  const fine = run(1 / 32);
  return Math.abs(coarse - fine) <= 1e-8 * Math.max(1, Math.abs(fine)) ? fine : NaN;
}

/** Where g is largest on [a, b]: a grid to find the hill, then golden sections to its top. */
export function search(g: (x: number) => number, a: number, b: number): { at: number } {
  const n = 4000;
  let best = a;
  let top = -Infinity;
  for (let i = 0; i <= n; i += 1) {
    const x = a + ((b - a) * i) / n;
    const y = g(x);
    if (Number.isFinite(y) && y > top) [best, top] = [x, y];
  }
  const step = (b - a) / n;
  let lo = Math.max(a, best - step);
  let hi = Math.min(b, best + step);
  const phi = (Math.sqrt(5) - 1) / 2;
  for (let i = 0; i < 80; i += 1) {
    const m1 = hi - phi * (hi - lo);
    const m2 = lo + phi * (hi - lo);
    if (g(m1) >= g(m2)) hi = m2;
    else lo = m1;
  }
  return { at: (lo + hi) / 2 };
}

export function simpson(g: (x: number) => number, a: number, b: number, n = 2000): number {
  const h = (b - a) / n;
  let total = g(a) + g(b);
  for (let i = 1; i < n; i += 1) total += (i % 2 ? 4 : 2) * g(a + i * h);
  return (total * h) / 3;
}

/**
 * Compares two numeric functions over a spread of points. The tolerance is loose
 * because one side is a finite difference — this is checking for an algebra
 * mistake, not for floating-point drift.
 */
export function matchesNumerically(
  left: (b: Point) => number,
  right: (b: Point) => number,
  vars: string[],
): boolean {
  let agreed = 0;
  let seen = 0;
  for (let i = 0; i < 40 && agreed < 12; i += 1) {
    const bindings: Point = {};
    // Each variable walks its own way, or every function of x − y would only
    // ever be sampled where it is ln 0.
    for (const [j, v] of vars.entries()) bindings[v] = 0.3 + ((i * 0.37 + j * 0.71) % 2.2);
    const l = left(bindings);
    const r = right(bindings);
    if (!Number.isFinite(l) || !Number.isFinite(r)) continue;
    seen += 1;
    if (Math.abs(l - r) > 1e-4 * Math.max(1, Math.abs(l), Math.abs(r))) return false;
    agreed += 1;
  }
  return seen > 0 && agreed >= Math.min(6, seen);
}

export function finiteSomewhere(e: Expr): boolean {
  const vars = freeVars(e);
  for (let i = 0; i < 32; i += 1) {
    const bindings: Point = {};
    for (const [j, v] of vars.entries()) bindings[v] = 0.3 + ((i * 0.11 + j * 0.9) % 3);
    if (Number.isFinite(evaluate(e, bindings))) return true;
  }
  return false;
}
