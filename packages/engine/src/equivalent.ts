import { type Expr, freeVars } from './expr.js';
import { evaluate, type Bindings } from './evaluate.js';

export interface VarRange {
  min: number;
  max: number;
}
export type Domain = Record<string, VarRange>;

export interface EquivalenceOptions {
  /** Per-variable sampling range. Anything unlisted uses DEFAULT_RANGE. */
  domain?: Domain;
  /**
   * `value` requires the two expressions to agree everywhere.
   * `constant-difference` only requires their difference to be constant, which
   * is what makes an antiderivative correct up to +C.
   */
  mode?: 'value' | 'constant-difference';
  samples?: number;
  minValid?: number;
  tolerance?: number;
}

/**
 * Positive and non-integral: positive keeps logs and even roots in their
 * domain, and staying off the integers stops two different expressions from
 * agreeing by accident at a lattice of nice points.
 */
export const DEFAULT_RANGE: VarRange = { min: 0.17, max: 2.83 };

const HUGE = 1e12;

/**
 * Decides symbolic equivalence numerically: evaluate both expressions at a
 * spread of points and see whether they agree. No CAS, no server — and it
 * accepts any correct answer regardless of the route taken to it.
 *
 * Points are drawn from a seed derived from the two expressions, so the same
 * pair always gets the same verdict.
 */
export function equivalent(a: Expr, b: Expr, opts: EquivalenceOptions = {}): boolean {
  const {
    domain = {},
    mode = 'value',
    samples = 24,
    minValid = 20,
    tolerance = 1e-9,
  } = opts;

  const vars = Array.from(new Set([...freeVars(a), ...freeVars(b)]));
  if (vars.length === 0) return close(evaluate(a), evaluate(b), tolerance);

  const pairs = samplePairs([a, b], vars, domain, samples);
  if (pairs.length < Math.min(minValid, samples)) return false;
  if (mode === 'constant-difference') return constantDifference(pairs, tolerance);
  return pairs.every(([va, vb]) => close(va, vb, tolerance));
}

/**
 * Both sides' values at up to `samples` points where both have one. It
 * over-samples: a point that lands outside a domain is skipped, not counted.
 */
function samplePairs(
  [a, b]: [Expr, Expr],
  vars: string[],
  domain: Domain,
  samples: number,
): [number, number][] {
  const rng = mulberry32(seedOf(a, b));
  const pairs: [number, number][] = [];
  for (let i = 0; i < samples * 12 && pairs.length < samples; i += 1) {
    const bindings: Bindings = {};
    for (const v of vars) {
      const r = domain[v] ?? DEFAULT_RANGE;
      bindings[v] = r.min + rng() * (r.max - r.min);
    }
    const va = evaluate(a, bindings);
    const vb = evaluate(b, bindings);
    if (usable(va) && usable(vb)) pairs.push([va, vb]);
  }
  return pairs;
}

/** Right up to +C: the differences spread no wider than rounding would spread them. */
function constantDifference(pairs: [number, number][], tolerance: number): boolean {
  const diffs = pairs.map(([va, vb]) => va - vb);
  const lo = Math.min(...diffs);
  const hi = Math.max(...diffs);
  const scale = Math.max(1, Math.abs(lo), Math.abs(hi));
  return hi - lo <= tolerance * scale * 1e3;
}

function usable(v: number): boolean {
  return Number.isFinite(v) && Math.abs(v) < HUGE;
}

function close(a: number, b: number, tol: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
}

function seedOf(a: Expr, b: Expr): number {
  const s = JSON.stringify(a) + '|' + JSON.stringify(b);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
