import { TIERS, type Tier } from '@calcflow/shared';
import { answer, aside, frac, fracTex, poly, setup, step } from '../authoring.js';
import type { Draft, Generator, Rng } from '../types.js';

/** (ax + b)/(x − c): the bottom is zero at c and the top is not. */
function vertical(rng: Rng, c: number): Draft {
  const a = rng.nonZero(-5, 5);
  const b = rng.nonZero(-9, 9);
  const denominator = poly([[1, 1], [-c, 0]]);
  const fx = frac(poly([[a, 1], [b, 0]]), denominator);
  return {
    instruction: 'Find the vertical asymptote',
    prompt: `f(x) = ${fx}`,
    note: 'Give the x-value where it is.',
    answers: [answer(String(c), { label: 'x', keyboard: 'calculus', kind: 'number' })],
    solution: [
      setup(
        'asymptote',
        'Where the bottom is zero',
        `${denominator} = 0`,
        'The top is not zero there, so the fraction blows up rather than cancelling.',
      ),
      step(
        'linear-solve',
        'Solve',
        String(c),
        `The line x = ${c} is the one the graph runs along without ever touching.`,
      ),
    ],
    ruleIds: ['asymptote', 'linear-solve'],
    verify: { kind: 'root', equation: `${denominator} = 0`, wrt: 'x' },
  };
}

/** Two quadratics: the line is the ratio of their leading coefficients. */
function horizontal(rng: Rng): Draft {
  const a = rng.nonZero(-6, 6);
  const e = rng.int(1, 6);
  const b = rng.nonZero(-8, 8);
  const d = rng.int(1, 9);
  const fx = frac(poly([[a, 2], [b, 0]]), poly([[e, 2], [d, 0]]));
  const result = fracTex(a, e);
  const divided = frac(`${a} + ${frac(String(b), 'x^{2}')}`, `${e} + ${frac(String(d), 'x^{2}')}`);
  return {
    instruction: 'Find the horizontal asymptote',
    prompt: `f(x) = ${fx}`,
    note: 'Give the y-value of the line.',
    answers: [answer(result, { label: 'y', keyboard: 'calculus', kind: 'number' })],
    solution: [
      setup(
        'asymptote',
        'What it approaches far out',
        `y = \\lim_{x\\to\\infty} ${fx}`,
        'A horizontal asymptote is a limit at infinity, nothing else.',
      ),
      setup('limit-infinity', 'Divide by x²', `\\lim_{x\\to\\infty} ${divided}`),
      step('limit-infinity', 'The line', result),
    ],
    ruleIds: ['asymptote', 'limit-infinity'],
    verify: { kind: 'limit', of: fx, wrt: 'x', at: 'inf' },
  };
}

/** Top one degree higher: divide, and the quotient is the slant asymptote. */
function slant(rng: Rng): Draft {
  const d = rng.nonZero(-5, 5);
  const k = rng.nonZero(-6, 6);
  const r = rng.nonZero(-9, 9);
  // (x − d)(x + k) + r, so the division leaves x + k with remainder r.
  const numerator = poly([[1, 2], [k - d, 1], [-d * k + r, 0]]);
  const denominator = poly([[1, 1], [-d, 0]]);
  const fx = frac(numerator, denominator);
  const line = poly([[1, 1], [k, 0]]);

  return {
    instruction: 'Find the slant asymptote',
    prompt: `f(x) = ${fx}`,
    note: 'Give the right-hand side of y = …',
    answers: [answer(line, { keyboard: 'calculus' })],
    solution: [
      aside(
        'The top is one degree higher',
        `\\deg(${numerator}) = 2,\\quad \\deg(${denominator}) = 1`,
        'That is exactly when a slant asymptote exists.',
      ),
      setup('polynomial-division', 'Divide', `f(x) = ${line} + ${frac(String(r), denominator)}`),
      setup(
        'asymptote',
        'The remainder dies away',
        `\\lim_{x\\to\\infty} ${frac(String(r), denominator)} = 0`,
        'So far out, f is the quotient and nothing else.',
      ),
      step('asymptote', 'The line', line),
    ],
    ruleIds: ['asymptote', 'polynomial-division'],
  };
}

const BY_TIER: Record<Tier, (rng: Rng, c: number) => Draft> = {
  easy: vertical,
  medium: horizontal,
  hard: slant,
};

/** The lines a graph runs into but never reaches. */
export const asymptotes: Generator = {
  id: 'limits.asymptotes',
  chapter: 13,
  title: 'Asymptotes',
  tags: ['limits', 'asymptotes', 'graphs'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  // c is drawn at every tier, not only the one that uses it, so that each seed
  // keeps the problem it has always produced.
  generate: ({ tier, rng }) => BY_TIER[tier](rng, rng.nonZero(-6, 6)),
};
