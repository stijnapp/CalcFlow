import { TIERS, type Tier } from '@calcflow/shared';
import {
  answer,
  aside,
  frac,
  fracTex,
  poly,
  rootOf,
  setup,
  step,
  term,
  tidy,
  times,
} from '../authoring.js';
import type { Draft, Generator, Rng } from '../types.js';

/** f, f' and the point, all chosen so f(p) and f'(p) come out whole. */
interface Touching {
  fx: string;
  dfx: string;
  p: number;
  pTex: string;
  y0: number;
  m: number;
}

/** A quadratic, anywhere. */
function quadratic(rng: Rng): Touching {
  const a = rng.nonZero(-3, 4);
  const b = rng.nonZero(-6, 6);
  const c = rng.nonZero(-8, 8);
  const p = rng.nonZero(-3, 3);
  return {
    fx: poly([[a, 2], [b, 1], [c, 0]]),
    dfx: poly([[2 * a, 1], [b, 0]]),
    p,
    pTex: String(p),
    y0: a * p * p + b * p + c,
    m: 2 * a * p + b,
  };
}

/** A cubic, or √x at a perfect square, so both the height and the slope are rational. */
function cubicOrRoot(rng: Rng): Touching {
  if (rng.pick(['cubic', 'root']) === 'cubic') {
    const a = rng.nonZero(-2, 3);
    const b = rng.nonZero(-5, 5);
    const c = rng.nonZero(-6, 6);
    const p = rng.nonZero(-2, 2);
    return {
      fx: poly([[a, 3], [b, 1], [c, 0]]),
      dfx: poly([[3 * a, 2], [b, 0]]),
      p,
      pTex: String(p),
      y0: a * p ** 3 + b * p + c,
      m: 3 * a * p * p + b,
    };
  }
  const q = rng.pick([1, 2, 3, 4]);
  const k = rng.int(1, 4) * 2 * q;
  return {
    fx: times(String(k), rootOf('x')),
    dfx: frac(String(k / 2), rootOf('x')),
    p: q * q,
    pTex: String(q * q),
    y0: k * q,
    m: k / (2 * q),
  };
}

/** e^{ax} at 0, or a logarithm at 1: the two places those are exact. */
function transcendental(rng: Rng): Touching {
  const kind = rng.pick(['exp', 'xln', 'ln']);
  const k = rng.nonZero(-4, 5);
  if (kind === 'exp') {
    const a = rng.int(1, 3);
    // At x = 0 every e^{ax} is 1, which is what keeps the numbers exact.
    const exp = `e^{${a}x}`;
    return { fx: times(String(k), exp), dfx: times(String(k * a), exp), p: 0, pTex: '0', y0: k, m: k * a };
  }
  if (kind === 'xln') {
    return {
      fx: times(String(k), 'x\\ln x'),
      dfx: times(String(k), '\\left(\\ln x + 1\\right)'),
      p: 1,
      pTex: '1',
      y0: 0,
      m: k,
    };
  }
  return { fx: times(String(k), '\\ln x'), dfx: frac(String(k), 'x'), p: 1, pTex: '1', y0: 0, m: k };
}

const TOUCHING: Record<Tier, (rng: Rng) => Touching> = {
  easy: quadratic,
  medium: cubicOrRoot,
  hard: transcendental,
};

/**
 * The derivative used for something rather than computed for its own sake. The
 * exam never asks for f' and stops there — it asks for the tangent at a point,
 * which needs the derivative, the value, and the line through them.
 */
export const tangentLine: Generator = {
  id: 'diff.tangent-line',
  chapter: 9,
  title: 'Tangent lines',
  tags: ['tangent', 'differentiation'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const { fx, dfx, p, pTex, y0, m } = TOUCHING[tier](rng);
    const line = poly([[m, 1], [y0 - m * p, 0]]);

    return {
      instruction: `Find the tangent line to f at x = ${pTex}`,
      prompt: `f(x) = ${fx}`,
      note: 'Give the right-hand side of y = …, in the form mx + c.',
      answers: [answer(line, { keyboard: 'calculus' })],
      solution: [
        aside('Differentiate', `f'(x) = ${dfx}`),
        aside(
          'The slope and the point',
          `f'(${pTex}) = ${m},\\quad f(${pTex}) = ${y0}`,
          'The derivative at the point is the slope; the function at the point is the height.',
        ),
        setup('tangent-line', 'Point-slope form', `y = ${m}\\left(x - ${pTex}\\right) + ${y0}`),
        tidy('Multiply out', line),
      ],
      ruleIds: ['tangent-line', 'standard-derivatives'],
      verify: { kind: 'tangent', of: fx, wrt: 'x', at: pTex },
    };
  },
};

/** A tangent with a required slope: the derivative is the equation to solve. */
export const perpendicularTangent: Generator = {
  id: 'diff.perpendicular-tangent',
  chapter: 9,
  title: 'Where the tangent has a given slope',
  tags: ['tangent', 'differentiation'],
  version: 1,
  supports: ['medium', 'hard'] as const,
  invariant: 'solution-set-preserving',

  generate({ tier, rng }): Draft {
    const a = rng.int(1, 4);
    const shift = rng.nonZero(-5, 5);
    const b = rng.nonZero(-6, 6);
    // f(x) = a(x − shift)² + b(x − shift), so f'(x) = 2a(x − shift) + b.
    const inside = `\\left(${poly([[1, 1], [-shift, 0]])}\\right)`;
    const fx = `${term(a, `${inside}^{2}`)} ${b < 0 ? '-' : '+'} ${Math.abs(b)}${inside}`;

    // The given line's slope, and the slope the tangent must have.
    const perpendicular = tier === 'hard';
    const lineSlope = perpendicular ? rng.pick([-3, -2, 2, 3]) : rng.nonZero(-4, 4);
    const wanted = perpendicular ? -1 / lineSlope : lineSlope;
    // 2a(x − shift) + b = wanted, so x = shift + (wanted − b)/(2a).
    const numerator = perpendicular ? -(1 + b * lineSlope) : wanted - b;
    const denominator = perpendicular ? 2 * a * lineSlope : 2 * a;
    // One number in the answer: it read "2 + 4/2" when the fraction came out whole.
    const root = fracTex(shift * denominator + numerator, denominator);
    const derivative = `${term(2 * a, inside)} ${b < 0 ? '-' : '+'} ${Math.abs(b)}`;
    const equation = `${derivative} = ${perpendicular ? frac('-1', String(lineSlope)) : String(wanted)}`;

    return {
      instruction: 'Find the x where the tangent has the required slope',
      prompt: `f(x) = ${fx}`,
      promptText: perpendicular
        ? `Find the x at which the tangent to f is perpendicular to the line y = ${term(lineSlope, 'x')} + 1.`
        : `Find the x at which the tangent to f is parallel to the line y = ${term(lineSlope, 'x')} + 1.`,
      note: 'Exact value.',
      answers: [answer(root, { keyboard: 'calculus', kind: 'number' })],
      solution: [
        aside(
          'The slope the tangent needs',
          perpendicular
            ? `m = ${frac('-1', String(lineSlope))}`
            : `m = ${lineSlope}`,
          perpendicular
            ? 'Perpendicular lines have slopes multiplying to -1, so it is the negative reciprocal.'
            : 'Parallel means the same slope.',
        ),
        setup('chain-rule', 'Differentiate', `f'(x) = ${derivative}`),
        step(
          'stationary-point',
          'Set the derivative to the required slope',
          equation,
          'A slope condition is an equation in x — the only new idea is which number goes on the right.',
        ),
        step('linear-solve', 'Solve', `x = ${root}`),
      ],
      ruleIds: ['tangent-line', 'chain-rule', 'stationary-point', 'linear-solve'],
      verify: { kind: 'root', equation, wrt: 'x' },
    };
  },
};
