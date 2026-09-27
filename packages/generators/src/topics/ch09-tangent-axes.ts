import {
  answer,
  aside,
  frac,
  fracTex,
  gcd,
  power,
  rootOf,
  setup,
  sum,
  term,
  tidy,
  times,
} from '../authoring.js';
import type { Draft, Generator, Latex } from '../types.js';

/*
 * A tangent used for something: where it crosses the axes. The 2024 exam asks
 * it with a letter in the function — f(x) = x²/a at x = a — so the line and both
 * crossings come out in terms of a. Every f here is c·xⁿ/aⁿ⁻¹, which passes
 * through (a, ca) with slope cn; medium puts a number in for a.
 */

/** A number, or the letter a > 0 standing in for one. */
type A = number | 'a';

/** k·aʲ: `6`, `2a^{2}`, `-a`. */
const scaled = (k: number, a: A, j = 1): Latex =>
  typeof a === 'number' ? String(k * a ** j) : term(k, power('a', j));

/** (num/den)·a: `\frac{3}{2}`, `-\frac{1}{2}a`, `2a`. */
const share = (num: number, den: number, a: A): Latex =>
  typeof a === 'number' ? fracTex(num * a, den) : times(fracTex(num, den), 'a');

/** k·xʲ over aⁱ: `\frac{2x}{a}`, or `\frac{1}{2}x` once a is a number. */
function overA(k: number, j: number, a: A, i: number): Latex {
  const body = power('x', j);
  return typeof a === 'number' ? times(fracTex(k, a ** i), body) : frac(term(k, body), power('a', i));
}

/** k·a over m·√(ax), with whatever they share cancelled. */
function overRoot(k: number, m: number, a: A): Latex {
  const g = gcd(typeof a === 'number' ? k * a : k, m);
  return frac(scaled(k / g, a), term(m / g, rootOf(`${a}x`)));
}

interface Power {
  /** The exponent n as [p, q], so n = p/q. */
  n: [number, number];
  fx: (c: number, a: A) => Latex;
  dfx: (c: number, a: A) => Latex;
}

const POWERS: Power[] = [
  {
    n: [2, 1],
    fx: (c, a) => frac(term(c, 'x^{2}'), scaled(1, a)),
    dfx: (c, a) => overA(2 * c, 1, a, 1),
  },
  {
    n: [3, 1],
    fx: (c, a) => frac(term(c, 'x^{3}'), scaled(1, a, 2)),
    dfx: (c, a) => overA(3 * c, 2, a, 2),
  },
  {
    n: [1, 2],
    fx: (c, a) => term(c, rootOf(`${a}x`)),
    dfx: (c, a) => overRoot(c, 2, a),
  },
  {
    n: [-1, 1],
    fx: (c, a) => frac(scaled(c, a, 2), 'x'),
    dfx: (c, a) => `-${frac(scaled(c, a, 2), 'x^{2}')}`,
  },
  {
    n: [-2, 1],
    fx: (c, a) => frac(scaled(c, a, 3), 'x^{2}'),
    dfx: (c, a) => `-${frac(scaled(2 * c, a, 3), 'x^{3}')}`,
  },
];

export const tangentAxes: Generator = {
  id: 'diff.tangent-axes',
  chapter: 9,
  title: 'Where a tangent meets the axes',
  tags: ['tangent', 'differentiation'],
  version: 1,
  supports: ['medium', 'hard'],
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const shape = rng.pick(POWERS);
    const [p, q] = shape.n;
    const symbolic = tier === 'hard';
    const a: A = symbolic ? 'a' : rng.int(2, 5);
    const c = symbolic ? rng.pick([1, 1, 2, 3]) : 1;

    const fx = shape.fx(c, a);
    const slope = fracTex(c * p, q);
    const height = scaled(c, a);
    // y = cn·x + c(1 − n)·a, which is 0 at x = (n − 1)a/n.
    const line = sum([times(slope, 'x'), share(c * (q - p), q, a)]);
    const xCross = share(p - q, p, a);
    const yCross = share(c * (q - p), q, a);
    const crossing = { kind: symbolic ? 'expression' : 'number', keyboard: symbolic ? 'algebra' : 'numeric' } as const;

    return {
      instruction: `Find the tangent at x = ${a} and where it meets the axes`,
      prompt: `f(x) = ${fx}`,
      note: `Give the tangent as $mx + b$, then the $x$ where it crosses the $x$-axis and the $y$ where it crosses the $y$-axis.${symbolic ? ' Here $a > 0$.' : ''}`,
      answers: [
        answer(line, { label: 'tangent', keyboard: 'algebra' }),
        answer(xCross, { label: 'x-axis', ...crossing }),
        answer(yCross, { label: 'y-axis', ...crossing }),
      ],
      solution: [
        aside('Differentiate', `f'(x) = ${shape.dfx(c, a)}`),
        aside(
          'The slope and the point',
          `f'(${a}) = ${slope},\\quad f(${a}) = ${height}`,
          'The derivative at the point is the slope; the function at the point is the height.',
        ),
        setup('tangent-line', 'Point-slope form', `y = ${times(slope, `\\left(x - ${a}\\right)`)} + ${height}`),
        tidy('Multiply out', line),
        aside('Where it meets the x-axis', `0 = ${line} \\;\\Rightarrow\\; x = ${xCross}`),
        aside('Where it meets the y-axis', `x = 0 \\;\\Rightarrow\\; y = ${yCross}`),
      ],
      ruleIds: ['tangent-line', 'standard-derivatives'],
      verify: { kind: 'tangent', of: fx, wrt: 'x', at: String(a) },
    };
  },
};
