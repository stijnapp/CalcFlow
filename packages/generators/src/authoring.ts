import { freeVars, parse } from '@calcflow/engine';
import type { AnswerSpec, Latex, Step } from './types.js';

/**
 * Builds an AnswerSpec from LaTeX. Generators write the answer once, as the
 * string the app will render, and the AST for grading is derived from it — so
 * the two can never drift apart.
 */
export function answer(tex: Latex, opts: Partial<AnswerSpec> = {}): AnswerSpec {
  const value = parse(tex);
  return {
    kind: 'expression',
    keyboard: 'algebra',
    ...opts,
    tex,
    value,
    vars: opts.vars ?? freeVars(value),
  };
}

export function step(ruleId: string, ruleLabel: string, expr: Latex, note?: string): Step {
  return note ? { ruleId, ruleLabel, expr, note } : { ruleId, ruleLabel, expr };
}

/**
 * A line that still carries an unapplied operator — an integral sign, a
 * `d/dx` — and so cannot be compared against the answer. Rewriting the
 * question into the form a rule can be applied to is a real step in the
 * working, and often the only one he is actually missing.
 */
export function setup(ruleId: string, ruleLabel: string, expr: Latex, note?: string): Step {
  return { ruleId, ruleLabel, expr, display: true, ...(note ? { note } : {}) };
}

/**
 * A line that applies no boxed rule and cannot be evaluated either — `f'(2) = 11`
 * names a value the engine has no function to compute. Working, not a claim the
 * harness can check.
 */
export function aside(ruleLabel: string, expr: Latex, note?: string): Step {
  return { ruleLabel, expr, display: true, ...(note ? { note } : {}) };
}

/**
 * A line that applies no boxed rule — collecting like terms, tidying a
 * numerator. Naming one of the cards here would put a rule in the rules-used
 * list that the problem never actually taught.
 */
export function tidy(ruleLabel: string, expr: Latex, note?: string): Step {
  return note ? { ruleLabel, expr, note } : { ruleLabel, expr };
}

// ---------------------------------------------------------------- LaTeX bits

export const frac = (a: Latex, b: Latex): Latex => `\\frac{${a}}{${b}}`;
export const rootOf = (x: Latex): Latex => `\\sqrt{${x}}`;

/** `x`, `x^{2}`, `x^{-1}` — the exponent disappears when it is 1. */
export function power(base: Latex, n: number | Latex): Latex {
  if (n === 1) return base;
  if (n === 0) return '1';
  return `${base}^{${n}}`;
}

/** A coefficient glued to a body: 1 vanishes, -1 becomes a bare minus. */
export function term(coef: number, body: Latex = ''): Latex {
  if (body === '') return String(coef);
  if (coef === 1) return body;
  if (coef === -1) return `-${body}`;
  return `${coef}${body}`;
}

/** Joins signed terms into a sum, turning `+ -3x` into `- 3x`. */
export function sum(parts: Latex[]): Latex {
  const kept = parts.filter((p) => p !== '' && p !== '0');
  if (kept.length === 0) return '0';
  return kept.reduce((acc, p) => (p.startsWith('-') ? `${acc} - ${p.slice(1)}` : `${acc} + ${p}`));
}

/** A polynomial from [coefficient, power] pairs, highest power first. */
export function poly(pairs: Array<[number, number]>, v = 'x'): Latex {
  const parts = pairs
    .filter(([c]) => c !== 0)
    .map(([c, p]) => (p === 0 ? String(c) : term(c, power(v, p))));
  return sum(parts);
}

/** Wraps in parentheses unless it is already a single atom. */
export function paren(x: Latex): Latex {
  return /^[-]?[0-9a-zA-Z]+$/.test(x) ? x : `\\left(${x}\\right)`;
}

/** An integer or a plain fraction — something that can sit against its factor. */
const isCoefficient = (a: Latex): boolean =>
  /^-?\d+$/.test(a) || /^-?\\d?frac\{\d+\}\{\d+\}$/.test(a) || /^-?\\frac\{\d+\}\{\d+\}$/.test(a);

/** Multiplies two LaTeX factors, folding away the coefficients that vanish. */
export function times(a: Latex, b: Latex): Latex {
  if (a === '1') return b;
  if (b === '1') return a;
  if (a === '-1') return `-${b}`;
  // A bare coefficient sits straight against its factor; anything else gets an
  // explicit dot, which reads better in a worked solution.
  if (isCoefficient(a) && !/^[-\d.]/.test(b)) return `${a}${b}`;
  return `${a} \\cdot ${b}`;
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

/** A reduced fraction as LaTeX, collapsing to an integer where it can. */
export function fracTex(p: number, q: number): Latex {
  const g = gcd(p, q);
  let n = p / g;
  let d = q / g;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  if (d === 1) return String(n);
  return n < 0 ? `-\\frac{${-n}}{${d}}` : frac(String(n), String(d));
}
