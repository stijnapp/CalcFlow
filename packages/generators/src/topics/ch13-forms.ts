import { answer, aside, frac, fracTex, poly, rootOf, setup, step, term } from '../authoring.js';
import type { Draft, Generator, Latex, Rng, Step, Verification } from '../types.js';

/*
 * The indeterminate forms the exams build their limits from, beyond 0/0:
 * 1^∞ and its relatives, ∞ − ∞, and an absolute value far out, where the bars
 * come off with a sign that depends on which way x is going.
 */

/** One limit: what is asked, how it is worked, and the check. */
interface Form {
  prompt: Latex;
  value: Latex;
  steps: Step[];
  rules: string[];
  verify: Verification;
  note?: string;
}

function draft(f: Form, keyboard: 'calculus' | 'logs' = 'calculus'): Draft {
  return {
    instruction: 'Find the limit',
    prompt: f.prompt,
    note: f.note ?? 'Give the exact value.',
    answers: [answer(f.value, { keyboard, kind: 'number' })],
    solution: [...f.steps, step(f.rules[0]!, 'So the limit is', f.value)],
    ruleIds: f.rules,
    verify: f.verify,
  };
}

/** `e`, `e^{2}`, `e^{\frac{1}{4}}`. */
function ePower(p: number, q: number): Latex {
  const f = fracTex(p, q);
  return f === '1' ? 'e' : `e^{${f}}`;
}

// ------------------------------------------------------------------ 1^∞

/** ((x + a)/(x + b))^{x + c} → e^{a − b}: the exponent's own constant washes out. */
function ratioPower(rng: Rng): Form {
  const a = rng.int(2, 8);
  const b = rng.int(1, 4);
  const c = rng.int(0, 5);
  const expr = `\\left(${frac(`x + ${a}`, `x + ${b}`)}\\right)^{x + ${c}}`;
  const k = a - b;
  return {
    prompt: `\\lim_{x\\to\\infty} ${expr}`,
    value: ePower(k, 1),
    note: 'Exact value. The base goes to 1 and the exponent to infinity, which settles nothing on its own.',
    steps: [
      setup(
        'limit-exponential',
        'Split off the 1',
        `\\left(1 + ${frac(String(k), `x + ${b}`)}\\right)^{x + ${c}}`,
        `${a} - ${b} = ${k} is what is left after dividing $x + ${a}$ by $x + ${b}$.`,
      ),
      setup(
        'limit-exponential',
        'Which is the standard shape',
        `\\left(\\left(1 + ${frac(String(k), `x + ${b}`)}\\right)^{\\frac{x + ${b}}{${k}}}\\right)^{\\frac{${k}\\left(x + ${c}\\right)}{x + ${b}}}`,
        `The inner bracket goes to e; the outer exponent goes to ${k}, since the ${b} and the ${c} stop mattering once x is large.`,
      ),
    ],
    rules: ['limit-exponential', 'limit-infinity'],
    verify: { kind: 'limit', of: expr, wrt: 'x', at: 'inf' },
  };
}

/**
 * (x − c + 1)^{k/(x² − c²)} as x comes down to c: the base goes to 1, the
 * exponent blows up. The logarithm turns it into a 0/0 for l'Hôpital, which
 * gives k/(2c).
 */
function nearOne(rng: Rng): Form {
  const c = rng.int(1, 3);
  const k = rng.int(1, 4);
  const inside = c === 1 ? 'x' : `x - ${c - 1}`;
  const base = c === 1 ? 'x' : `\\left(${inside}\\right)`;
  const bottom = `x^{2} - ${c * c}`;
  const expr = `${base}^{${frac(String(k), bottom)}}`;
  const log = `\\ln\\left(${inside}\\right)`;
  return {
    prompt: `\\lim_{x\\to ${c}^{+}} ${expr}`,
    value: ePower(k, 2 * c),
    steps: [
      setup(
        'limit-exponential',
        'Take the logarithm',
        `\\ln L = \\lim_{x\\to ${c}^{+}} ${frac(`${k === 1 ? '' : k}${log}`, bottom)}`,
        'The exponent comes down as a factor, and what is left is 0/0.',
      ),
      setup(
        'lhopital',
        "L'Hôpital",
        `\\ln L = \\lim_{x\\to ${c}^{+}} ${frac(frac(String(k), inside), '2x')} = ${fracTex(k, 2 * c)}`,
      ),
      aside('Undo the logarithm', `L = e^{\\ln L}`),
    ],
    rules: ['limit-exponential', 'lhopital'],
    verify: { kind: 'limit', of: expr, wrt: 'x', at: c, side: 'right' },
  };
}

/** x^{ln a/(b + n ln x)} far out: the logarithm leaves ln a / n, so the limit is the n-th root of a. */
function logExponent(rng: Rng): Form {
  const n = rng.pick([2, 3]);
  const m = rng.int(2, n === 2 ? 5 : 3);
  const a = m ** n;
  const b = rng.int(1, 5);
  const expr = `x^{${frac(`\\ln ${a}`, `${b} + ${n}\\ln x`)}}`;
  return {
    prompt: `\\lim_{x\\to\\infty} ${expr}`,
    value: String(m),
    steps: [
      setup(
        'limit-exponential',
        'Take the logarithm',
        `\\ln L = \\lim_{x\\to\\infty} ${frac(`\\ln ${a}\\cdot\\ln x`, `${b} + ${n}\\ln x`)}`,
        'The base runs to infinity and the exponent to 0 — an ∞⁰, which the logarithm turns into a quotient.',
      ),
      setup(
        'limit-infinity',
        'Divide by ln x',
        `\\ln L = \\lim_{x\\to\\infty} ${frac(`\\ln ${a}`, `${frac(String(b), '\\ln x')} + ${n}`)} = ${frac(`\\ln ${a}`, String(n))}`,
      ),
      aside('Undo the logarithm', `L = e^{${frac(`\\ln ${a}`, String(n))}} = ${a}^{${frac('1', String(n))}} = ${m}`),
    ],
    rules: ['limit-exponential', 'limit-infinity'],
    // Checked as x = eᵗ: the same limit, but settling like 1/t rather than
    // 1/ln x, which no walk out to any sensible x would ever see the end of.
    verify: { kind: 'limit', of: `e^{${frac(`t\\ln ${a}`, `${b} + ${n}t`)}}`, wrt: 't', at: 'inf' },
  };
}

/** e^{tan(ax)/tan(bx)} at 0: the exponential is continuous, so the limit goes into the exponent. */
function expOfRatio(rng: Rng): Form {
  const a = rng.int(1, 4);
  let b = rng.int(2, 5);
  while (b === a) b = rng.int(2, 5);
  const t = (k: number): Latex => `\\tan\\left(${k === 1 ? '' : k}x\\right)`;
  const expr = `e^{${frac(t(a), t(b))}}`;
  return {
    prompt: `\\lim_{x\\to 0} ${expr}`,
    value: ePower(a, b),
    steps: [
      aside('The exponential is continuous', `\\lim e^{g(x)} = e^{\\lim g(x)}`, 'So only the exponent needs working out.'),
      setup(
        'lhopital',
        "The exponent is 0/0: l'Hôpital",
        `\\lim_{x\\to 0} ${frac(t(a), t(b))} = \\lim_{x\\to 0} ${frac(`${a}\\cos^{2}\\left(${b}x\\right)`, `${b}\\cos^{2}\\left(${a === 1 ? '' : a}x\\right)`)} = ${fracTex(a, b)}`,
        `The derivative of $\\tan\\left(kx\\right)$ is $\\frac{k}{\\cos^{2}\\left(kx\\right)}$, and both cosines go to 1.`,
      ),
    ],
    rules: ['limit-exponential', 'lhopital'],
    verify: { kind: 'limit', of: expr, wrt: 'x', at: 0 },
  };
}

const POWER_FORMS = [ratioPower, nearOne, logExponent, expOfRatio];

/** A base and an exponent that pull in different directions. */
export const exponentialLimit: Generator = {
  id: 'limits.exponential-form',
  chapter: 13,
  title: 'Limits of the form 1 to the infinity',
  tags: ['limits', 'exponentials'],
  version: 2,
  supports: ['hard'] as const,
  invariant: 'value-preserving',

  generate({ rng }): Draft {
    return draft(rng.pick(POWER_FORMS)(rng), 'logs');
  },
};

// ------------------------------------------------------------------ ∞ − ∞

/** √(x² + px + q) − √(x² + r), or x − √(x² − px): the conjugate turns it into a quotient. */
function rootDifference(rng: Rng): Form {
  const p = rng.nonZero(-6, 6);
  const q = rng.int(-3, 5);
  const r = rng.int(1, 5);
  const bare = rng.bool();
  const left = bare ? 'x' : rootOf(poly([[1, 2], [p, 1], [q, 0]]));
  const right = bare ? rootOf(poly([[1, 2], [-p, 1]])) : rootOf(`x^{2} + ${r}`);
  const expr = `${left} - ${right}`;
  // (left² − right²) over the sum; its x-coefficient over 2 is the limit.
  const top = bare ? poly([[p, 1]]) : poly([[p, 1], [q - r, 0]]);
  const over = (n: number, k: number): Latex => (n === 0 ? '' : ` ${n < 0 ? '-' : '+'} ${frac(String(Math.abs(n)), k === 1 ? 'x' : 'x^{2}')}`);
  const divided = bare
    ? frac(String(p), `1 + ${rootOf(`1${over(-p, 1)}`)}`)
    : frac(`${p}${over(q - r, 1)}`, `${rootOf(`1${over(p, 1)}${over(q, 2)}`)} + ${rootOf(`1${over(r, 2)}`)}`);
  return {
    prompt: `\\lim_{x\\to\\infty} \\left(${expr}\\right)`,
    value: fracTex(p, 2),
    note: 'Give the exact value, without l\'Hôpital.',
    steps: [
      setup(
        'rationalise',
        'Multiply by the conjugate',
        `\\lim_{x\\to\\infty} ${frac(top, `${left} + ${right}`)}`,
        'Both roots run to infinity, and ∞ − ∞ settles nothing. Times the sum over the sum, the squares cancel the $x^{2}$.',
      ),
      setup(
        'limit-infinity',
        'Divide top and bottom by x',
        `\\lim_{x\\to\\infty} ${divided}`,
        'Inside a root, dividing by $x$ means dividing by $x^{2}$. Every term with an $x$ underneath dies, and the bottom goes to 2.',
      ),
    ],
    rules: ['limit-infinity', 'rationalise'],
    verify: { kind: 'limit', of: expr, wrt: 'x', at: 'inf' },
  };
}

/** Two fractions that each blow up at 0. Over one denominator it is 0/0. */
function reciprocalDifference(rng: Rng): Form {
  const k = rng.int(1, 6);
  const shapes = [
    {
      expr: `${frac('1', '\\tan x')} - ${frac('1', '\\sin x')}`,
      one: frac('\\cos x - 1', '\\sin x'),
      after: frac('-\\sin x', '\\cos x'),
      value: '0',
    },
    {
      expr: `${frac('1', '\\sin x')} - ${frac('1', 'x')}`,
      one: frac('x - \\sin x', 'x\\sin x'),
      after: frac('\\sin x', '2\\cos x - x\\sin x'),
      value: '0',
    },
    {
      expr: `${frac(String(k), 'x')} - ${frac(String(k), 'e^{x} - 1')}`,
      one: frac(`${k === 1 ? '' : k}\\left(e^{x} - 1 - x\\right)`, 'x\\left(e^{x} - 1\\right)'),
      after: frac(`${k === 1 ? '' : k}e^{x}`, '2e^{x} + xe^{x}'),
      value: fracTex(k, 2),
    },
    {
      expr: `${frac(String(k), '\\ln\\left(1 + x\\right)')} - ${frac(String(k), 'x')}`,
      one: frac(`${k === 1 ? '' : k}\\left(x - \\ln\\left(1 + x\\right)\\right)`, 'x\\ln\\left(1 + x\\right)'),
      after: frac(String(k), '\\ln\\left(1 + x\\right) + 2'),
      value: fracTex(k, 2),
    },
  ];
  const s = rng.pick(shapes);
  return {
    prompt: `\\lim_{x\\to 0} \\left(${s.expr}\\right)`,
    value: s.value,
    steps: [
      setup('lhopital', 'Put it over one denominator', `\\lim_{x\\to 0} ${s.one}`, 'Each fraction on its own blows up; together they are 0/0.'),
      setup('lhopital', "L'Hôpital, until it can be substituted", `\\lim_{x\\to 0} ${s.after}`),
    ],
    rules: ['lhopital'],
    verify: { kind: 'limit', of: s.expr, wrt: 'x', at: 0 },
  };
}

export const differenceLimit: Generator = {
  id: 'limits.difference',
  chapter: 13,
  title: 'Infinity minus infinity',
  tags: ['limits', 'lhopital', 'conjugate'],
  version: 1,
  supports: ['medium', 'hard'],
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    return draft(tier === 'hard' && rng.bool() ? reciprocalDifference(rng) : rootDifference(rng));
  },
};

// ------------------------------------------------------------------ |x| far out

/** `2x + 5`, `2x - 1` with the bars on. */
const bars = (p: number, q: number): Latex => `\\left|${poly([[p, 1], [q, 0]])}\\right|`;

/** (ax + b)/|cx + d| at ±∞: the bars come off as + or − depending on the side. */
function linearOverBars(rng: Rng): Form {
  const a = rng.nonZero(-6, 6);
  const b = rng.nonZero(-6, 6);
  const c = rng.int(1, 4);
  const d = rng.nonZero(-6, 6);
  const neg = rng.bool();
  const expr = frac(poly([[a, 1], [b, 0]]), bars(c, d));
  const inside = poly([[c, 1], [d, 0]]);
  return {
    prompt: `\\lim_{x\\to ${neg ? '-' : ''}\\infty} ${expr}`,
    value: fracTex(neg ? -a : a, c),
    steps: [
      setup(
        'limit-infinity',
        'Take the bars off',
        `${bars(c, d)} = ${neg ? `-\\left(${inside}\\right)` : inside}`,
        neg ? 'For large negative $x$ the inside is negative, so the bars flip its sign.' : 'For large positive $x$ the inside is positive, so the bars change nothing.',
      ),
      setup('limit-infinity', 'Compare the leading terms', frac(term(a, 'x'), term(neg ? -c : c, 'x'))),
    ],
    rules: ['limit-infinity'],
    verify: { kind: 'limit', of: expr, wrt: 'x', at: neg ? '-inf' : 'inf' },
  };
}

/** A quadratic over k·|px + q|·|rx + s|: two bars that together behave like |p||r|x². */
function quadraticOverBars(rng: Rng): Form {
  const a = rng.int(2, 9);
  const top = poly([[a, 2], [rng.nonZero(-9, 9), 1], [rng.nonZero(-9, 9), 0]]);
  const k = rng.pick([1, -1, 2, -3]);
  const [p, q, r, s] = [rng.int(1, 3), rng.nonZero(-5, 5), rng.int(1, 3), rng.nonZero(-5, 5)];
  const bottom = `${k === 1 ? '' : k === -1 ? '-' : `${k}\\cdot `}${bars(p, q)}\\cdot ${bars(r, s)}`;
  const expr = frac(top, bottom);
  return {
    prompt: `\\lim_{x\\to\\infty} ${expr}`,
    value: fracTex(a, k * p * r),
    steps: [
      setup(
        'limit-infinity',
        'The bars far out',
        `${bars(p, q)}\\cdot ${bars(r, s)} \\approx ${p * r}x^{2}`,
        'For large $x$ both insides are positive, so each pair of bars is just its inside, and only the leading terms matter.',
      ),
      setup('limit-infinity', 'Compare the leading terms', frac(`${a}x^{2}`, `${k * p * r}x^{2}`)),
    ],
    rules: ['limit-infinity'],
    verify: { kind: 'limit', of: expr, wrt: 'x', at: 'inf' },
  };
}

export const absoluteLimit: Generator = {
  id: 'limits.absolute',
  chapter: 13,
  title: 'Absolute values at infinity',
  tags: ['limits', 'absolute-value'],
  version: 1,
  supports: ['medium', 'hard'],
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    return draft(tier === 'hard' && rng.bool() ? quadraticOverBars(rng) : linearOverBars(rng));
  },
};
