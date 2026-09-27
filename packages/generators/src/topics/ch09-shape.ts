import { answer, aside, fracTex, poly, setup, step, sum, term } from '../authoring.js';
import type { AnswerSpec, Draft, Generator, Latex, Rng, Step } from '../types.js';

/*
 * Four of the six practice exams ask where a function bends: where it is
 * convex, where it is concave, where it switches. Always through f'', and
 * always on a function whose second derivative factors or solves cleanly — a
 * quartic, an exponential against a square, a product with e^x.
 */

interface Shape {
  f: Latex;
  df: Latex;
  ddf: Latex;
  /** f'' = 0, in a form every answer satisfies. */
  equation: Latex;
  answers: AnswerSpec[];
  instruction: string;
  note: string;
  /** How the roots of the equation come out. */
  solve: Step[];
}

const pair = (lo: Latex, hi: Latex, labels: [string, string]): AnswerSpec[] => [
  answer(lo, { label: labels[0], keyboard: 'calculus' }),
  answer(hi, { label: labels[1], keyboard: 'calculus' }),
];

/** x − p, or x + 3 for p = −3. */
const minus = (p: number): Latex => (p === 0 ? 'x' : p > 0 ? `x - ${p}` : `x + ${-p}`);

/** One inflection point, where the cubic's f'' crosses zero. */
function cubic(rng: Rng): Shape {
  const p = rng.nonZero(-4, 4);
  const a = rng.int(1, 2);
  const c = rng.nonZero(-9, 9);
  const d = rng.int(-9, 9);
  const b = -3 * a * p;
  return {
    f: poly([[a, 3], [b, 2], [c, 1], [d, 0]]),
    df: poly([[3 * a, 2], [2 * b, 1], [c, 0]]),
    ddf: poly([[6 * a, 1], [2 * b, 0]]),
    equation: `${poly([[6 * a, 1], [2 * b, 0]])} = 0`,
    answers: [answer(String(p), { label: 'x', keyboard: 'numeric', kind: 'number' })],
    instruction: 'Find the inflection point of f',
    note: 'Give its x-coordinate.',
    solve: [],
  };
}

/** A quartic built from where f'' is zero, as in the first 2025 exam. */
function quartic(rng: Rng, asks: 'points' | 'concave'): Shape {
  const p = rng.int(-3, 2);
  const q = p + rng.int(1, 4);
  const b = -2 * (p + q);
  const c = 6 * p * q;
  const d = rng.int(-9, 9);
  const e = rng.int(-20, 20);
  const ddf = poly([[12, 2], [6 * b, 1], [2 * c, 0]]);
  return {
    f: poly([[1, 4], [b, 3], [c, 2], [d, 1], [e, 0]]),
    df: poly([[4, 3], [3 * b, 2], [2 * c, 1], [d, 0]]),
    ddf,
    equation: `12\\left(${minus(p)}\\right)\\left(${minus(q)}\\right) = 0`,
    answers:
      asks === 'points'
        ? pair(String(p), String(q), ['smaller x', 'larger x'])
        : pair(String(p), String(q), ['from', 'to']),
    instruction: asks === 'points' ? 'Find the inflection points of f' : 'Find where f is concave',
    note:
      asks === 'points'
        ? 'Give the x-coordinates, smaller first.'
        : 'It is concave on one interval. Give the two endpoints, smaller first.',
    solve:
      asks === 'concave'
        ? [
            aside(
              'Which side is negative',
              `f''(x) < 0 \\iff ${p} < x < ${q}`,
              "$f''$ is a parabola opening upwards, so it is negative only between its roots. Concave is where $f''$ is negative.",
            ),
          ]
        : [],
  };
}

/** e^{2x} against a square, as in the second 2025 exam: e^{2x} = m². */
function expSquare(rng: Rng): Shape {
  const m = rng.int(2, 5);
  const b = rng.int(-6, 6);
  const c = rng.int(-6, 6);
  return {
    f: sum(['e^{2x}', poly([[-2 * m * m, 2], [b, 1], [c, 0]])]),
    df: sum(['2e^{2x}', poly([[-4 * m * m, 1], [b, 0]])]),
    ddf: `4e^{2x} - ${4 * m * m}`,
    equation: `4e^{2x} - ${4 * m * m} = 0`,
    answers: [answer(`\\ln ${m}`, { label: 'x', keyboard: 'calculus' })],
    instruction: 'Find the inflection point of f',
    note: 'Give its exact x-coordinate.',
    solve: [aside('Take logs', `e^{2x} = ${m * m} \\Rightarrow 2x = \\ln ${m * m} = 2\\ln ${m}`, 'The $2$ in the exponent and the square cancel.')],
  };
}

/** x e^{kx}: f'' = (2k + k²x)e^{kx}, zero at x = −2/k. */
function xExp(rng: Rng): Shape {
  const k = rng.pick([-3, -2, -1, 1, 2, 3]);
  const e = `e^{${term(k, 'x')}}`;
  return {
    f: `x${e}`,
    df: `\\left(${sum(['1', term(k, 'x')])}\\right)${e}`,
    ddf: `\\left(${2 * k} + ${term(k * k, 'x')}\\right)${e}`,
    equation: `\\left(${2 * k} + ${term(k * k, 'x')}\\right)${e} = 0`,
    answers: [answer(fracTex(-2, k), { label: 'x', keyboard: 'calculus' })],
    instruction: 'Find the inflection point of f',
    note: 'Give its x-coordinate.',
    solve: [aside('The exponential is never zero', `${2 * k} + ${term(k * k, 'x')} = 0`, 'So only the bracket can be.')],
  };
}

/** ln(x² + a²): f'' = 2(a² − x²)/(x² + a²)², zero at ±a. */
function logSquare(rng: Rng): Shape {
  const a = rng.int(1, 4);
  const inner = `x^{2} + ${a * a}`;
  return {
    f: `\\ln\\left(${inner}\\right)`,
    df: `\\frac{2x}{${inner}}`,
    ddf: `\\frac{2\\left(${a * a} - x^{2}\\right)}{\\left(${inner}\\right)^{2}}`,
    equation: `\\frac{2\\left(${a * a} - x^{2}\\right)}{\\left(${inner}\\right)^{2}} = 0`,
    answers: pair(String(-a), String(a), ['smaller x', 'larger x']),
    instruction: 'Find the inflection points of f',
    note: 'Give the x-coordinates, smaller first.',
    solve: [aside('Only the top can be zero', `${a * a} - x^{2} = 0 \\Rightarrow x = \\pm ${a}`)],
  };
}

/** x²e^{±x}: f'' = (x² ± 4x + 2)e^{±x}, zero at ∓2 ± √2. */
function squareExp(rng: Rng): Shape {
  const k = rng.pick([1, -1]);
  const e = k === 1 ? 'e^{x}' : 'e^{-x}';
  const quad = poly([[1, 2], [4 * k, 1], [2, 0]]);
  const base = -2 * k;
  return {
    f: `x^{2}${e}`,
    df: `${k === 1 ? '\\left(x^{2} + 2x\\right)' : '\\left(2x - x^{2}\\right)'}${e}`,
    ddf: `\\left(${quad}\\right)${e}`,
    equation: `\\left(${quad}\\right)${e} = 0`,
    answers: pair(`${base} - \\sqrt{2}`, `${base} + \\sqrt{2}`, ['smaller x', 'larger x']),
    instruction: 'Find the inflection points of f',
    note: 'Give the exact x-coordinates, smaller first.',
    solve: [aside('The quadratic formula on the bracket', `x = \\frac{${-4 * k} \\pm \\sqrt{16 - 8}}{2} = ${base} \\pm \\sqrt{2}`)],
  };
}

/** Where f bends which way: the sign of f'', and where it changes. */
export const concavity: Generator = {
  id: 'diff.concavity',
  chapter: 9,
  title: 'Convex, concave and inflection points',
  tags: ['differentiation', 'concavity'],
  version: 1,
  supports: ['medium', 'hard'],
  invariant: 'solution-set-preserving',

  generate({ tier, rng }): Draft {
    const s =
      tier === 'medium'
        ? rng.pick([cubic, (r: Rng) => quartic(r, 'points')])(rng)
        : rng.pick([
            (r: Rng) => quartic(r, rng.pick(['points', 'concave'] as const)),
            expSquare,
            xExp,
            logSquare,
            squareExp,
          ])(rng);
    return {
      instruction: s.instruction,
      prompt: `f(x) = ${s.f}`,
      note: s.note,
      answers: s.answers,
      solution: [
        aside('Differentiate twice', `f'(x) = ${s.df},\\quad f''(x) = ${s.ddf}`),
        step('inflection-point', 'Set the second derivative to zero', s.equation, "The bend can only switch where $f''$ is zero."),
        ...s.solve,
        setup('inflection-point', 'Check the sign changes', `f'' \\text{ changes sign at each root}`, "A zero of $f''$ is only an inflection point if the sign really flips there — $x^{4}$ has $f''(0) = 0$ and bends the same way either side."),
      ],
      ruleIds: ['inflection-point', 'standard-derivatives'],
      verify: { kind: 'inflection', of: s.f, wrt: 'x' },
    };
  },
};
