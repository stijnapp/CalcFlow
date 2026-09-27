import { TIERS, type Tier } from '@calcflow/shared';
import { answer, aside, frac, fracTex, paren, poly, power, step, term, tidy } from '../authoring.js';
import type { Draft, Generator, Latex, Rng } from '../types.js';

/*
 * Where the derivative is zero, and what that point is. Optimisation questions
 * are most of what the exam does with a derivative, and when there are two
 * stationary points it asks for a particular one — so every shape says where to
 * look, and the harness searches there for the max or min it claims.
 */

interface Stationary {
  fx: Latex;
  dfx: Latex;
  /** The part of f'(x) = 0 that can actually be zero. */
  equation: Latex;
  /** Why only that part, when f' has a factor that never vanishes. */
  why?: string;
  x: Latex;
  find: 'max' | 'min';
  local?: boolean;
  /** f at the answer, for the harness. */
  value: Latex;
  /** An interval where the answer is the only max or min. */
  window: [number, number];
  note?: string;
  /** How to tell which stationary point is which. */
  which?: string;
  rules?: string[];
}

function quadratic(rng: Rng): Stationary {
  const a = rng.int(1, 4);
  const b = rng.nonZero(-9, 9);
  const c = rng.nonZero(-8, 8);
  const at = -b / (2 * a);
  const derivative = poly([[2 * a, 1], [b, 0]]);
  return {
    fx: poly([[a, 2], [b, 1], [c, 0]]),
    dfx: derivative,
    equation: `${derivative} = 0`,
    x: fracTex(-b, 2 * a),
    find: 'min',
    value: fracTex(4 * a * c - b * b, 4 * a),
    window: [Math.floor(at) - 2, Math.ceil(at) + 2],
  };
}

function cubic(rng: Rng): Stationary {
  const a = rng.int(1, 4);
  const derivative = poly([[3, 2], [-3 * a * a, 0]]);
  return {
    fx: poly([[1, 3], [-3 * a * a, 1]]),
    dfx: derivative,
    equation: `${derivative} = 0`,
    x: String(a),
    find: 'min',
    local: true,
    value: String(-2 * a ** 3),
    window: [0, 2 * a],
    note: 'There are two stationary points. Give the one that is a minimum.',
    which: `$f'$ goes from negative to positive at $x = ${a}$.`,
  };
}

function reciprocal(rng: Rng): Stationary {
  const q = rng.int(2, 6);
  const derivative = `1 - ${frac(String(q * q), 'x^{2}')}`;
  return {
    fx: `x + ${frac(String(q * q), 'x')}`,
    dfx: derivative,
    equation: `${derivative} = 0`,
    x: String(q),
    find: 'min',
    value: String(2 * q),
    window: [1, 2 * q],
    note: 'x is positive.',
  };
}

/** ln(k² − (x − m)²), highest where the inside is: the exam's ln(16 − x²). */
function logOfQuadratic(rng: Rng): Stationary {
  const m = rng.int(-3, 3);
  const k = rng.int(2, 5);
  const inside = poly([[-1, 2], [2 * m, 1], [k * k - m * m, 0]]);
  const top = poly([[-2, 1], [2 * m, 0]]);
  return {
    fx: `\\ln\\left(${inside}\\right)`,
    dfx: frac(top, inside),
    equation: `${top} = 0`,
    why: 'A fraction is zero where its top is.',
    x: String(m),
    find: 'max',
    value: `\\ln\\left(${k * k}\\right)`,
    window: [m - k + 0.5, m + k - 0.5],
    rules: ['chain-rule'],
  };
}

function powerTimesExp(rng: Rng): Stationary {
  const n = rng.int(1, 3);
  const derivative = `\\left(${term(n, power('x', n - 1))} - ${power('x', n)}\\right)e^{-x}`;
  return {
    fx: `${power('x', n)}e^{-x}`,
    dfx: derivative,
    equation: `${derivative} = 0`,
    x: String(n),
    find: 'max',
    value: term(n ** n, `e^{-${n}}`),
    window: [0, 2 * n + 2],
    note: 'x is positive.',
    rules: ['product-rule'],
  };
}

function logOverX(): Stationary {
  const derivative = frac('1 - \\ln x', 'x^{2}');
  return {
    fx: frac('\\ln x', 'x'),
    dfx: derivative,
    equation: `${derivative} = 0`,
    x: 'e',
    find: 'max',
    value: 'e^{-1}',
    window: [1, 10],
    rules: ['quotient-rule'],
  };
}

/**
 * e^{−x}(x² + bx + c), whose derivative is −e^{−x}(x − r)(x − s): a local
 * minimum at the smaller root and a maximum at the larger. The exam has
 * e^{−x}(x² + 2x − 2), with its minimum at x = −2.
 */
function expTimesQuadratic(rng: Rng): Stationary {
  const r = rng.int(-3, 1);
  const s = r + rng.int(1, 4);
  const b = 2 - r - s;
  const c = b + r * s;
  // A bare x reads best at the front: x(x − 3), not (x − 3)x.
  const factors = [r, s]
    .sort((u, v) => Math.abs(u) - Math.abs(v))
    .map((root) => paren(poly([[1, 1], [-root, 0]])))
    .join('');
  const find = rng.pick(['min', 'max'] as const);
  const at = find === 'min' ? r : s;
  return {
    fx: `e^{-x}\\left(${poly([[1, 2], [b, 1], [c, 0]])}\\right)`,
    dfx: `-${factors}e^{-x}`,
    equation: `${factors} = 0`,
    why: '$e^{-x}$ is never zero, so one of the other factors has to be.',
    x: String(at),
    find,
    local: true,
    value: `\\left(${at * at + b * at + c}\\right)e^{${-at}}`,
    window: find === 'min' ? [r - 1, s] : [r, s + 1],
    which: `$f'$ is negative outside $[${r}, ${s}]$ and positive inside it.`,
    rules: ['product-rule'],
  };
}

const SHAPES: Record<Tier, ((rng: Rng) => Stationary)[]> = {
  easy: [quadratic],
  medium: [cubic, reciprocal, logOfQuadratic],
  hard: [powerTimesExp, logOverX, expTimesQuadratic],
};

export const stationaryPoint: Generator = {
  id: 'diff.stationary',
  chapter: 9,
  title: 'Maxima and minima',
  tags: ['optimisation', 'differentiation'],
  version: 2,
  supports: TIERS,
  invariant: 'solution-set-preserving',

  generate({ tier, rng }): Draft {
    const s = rng.pick(SHAPES[tier])(rng);
    const kind = `${s.local ? 'local ' : ''}${s.find === 'max' ? 'maximum' : 'minimum'}`;
    return {
      instruction: `Find the x-coordinate of the ${kind} of f`,
      prompt: `f(x) = ${s.fx}`,
      note: s.note ? `${s.note} Give the exact value.` : 'Give the exact value.',
      answers: [answer(s.x, { keyboard: 'calculus' })],
      solution: [
        aside('Differentiate', `f'(x) = ${s.dfx}`),
        step('stationary-point', 'Set the derivative to zero', s.equation, s.why),
        tidy('Solve', `x = ${s.x}`, s.which),
      ],
      ruleIds: ['stationary-point', 'standard-derivatives', ...(s.rules ?? [])],
      verify: {
        kind: 'extremum',
        of: s.fx,
        wrt: 'x',
        from: s.window[0],
        to: s.window[1],
        find: s.find,
        at: s.x,
        value: s.value,
      },
    };
  },
};
