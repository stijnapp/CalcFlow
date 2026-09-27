import type { Rng } from '../types.js';

/* The pieces every worked example is written with. */

export interface RuleExample {
  /** What the card's letters stand for here. Omitted where it has none. */
  given?: string;
  /** The working, one LaTeX line per row. */
  steps: string[];
}

export type Build = (rng: Rng) => RuleExample;

export function gcd(a: number, b: number): number {
  let [x, y] = [Math.abs(a), Math.abs(b)];
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

/** A fraction in lowest terms, written as an integer when it is one. */
export function frac(n: number, d: number): string {
  const s = d < 0 ? -1 : 1;
  const [num, den] = [s * n, s * d];
  const g = gcd(num, den);
  return den / g === 1 ? String(num / g) : `\\frac{${num / g}}{${den / g}}`;
}

/** The same, small — for a fraction sitting inline in a longer line. */
export function tfrac(n: number, d: number): string {
  return frac(n, d).replace('\\frac', '\\tfrac');
}

/** ` + 3` or ` - 3`, for a term joining an expression. */
export function plus(n: number): string {
  return n < 0 ? ` - ${-n}` : ` + ${n}`;
}

/** A number safe to put after an operator: negatives get their own brackets. */
export function signed(n: number): string {
  return n < 0 ? `\\left(${n}\\right)` : String(n);
}

/** `3x`, `-x`, `x` — a coefficient in front of a symbol. */
export function coeff(n: number, sym: string): string {
  if (n === 1) return sym;
  if (n === -1) return `-${sym}`;
  return `${n}${sym}`;
}

/** `x^{4}`, dropping the exponent when it is 1. */
export function pow(base: string, n: number | string): string {
  return n === 1 ? base : `${base}^{${n}}`;
}

/** Joins signed terms, skipping the zero ones: `2 - x - x^{2}`. */
export function terms(parts: Array<[number, string]>): string {
  let out = '';
  for (const [c, sym] of parts) {
    if (c === 0) continue;
    const body = sym ? coeff(Math.abs(c), sym) : String(Math.abs(c));
    if (out === '') out = c < 0 ? `-${body}` : body;
    else out += c < 0 ? ` - ${body}` : ` + ${body}`;
  }
  return out || '0';
}

/** A multiple of π as a fraction of it: `\frac{3\pi}{4}`, `2\pi`, `\pi`. */
export function piFrac(deg: number): string {
  const g = gcd(deg, 180);
  const [n, d] = [deg / g, 180 / g];
  const top = n === 1 ? '\\pi' : `${n}\\pi`;
  return d === 1 ? top : `\\frac{${top}}{${d}}`;
}
