import { answer, frac, fracTex, poly, power, setup, step, sum, times } from '../authoring.js';
import type { Draft, Generator, Latex, Rng, Step, Verification } from '../types.js';

/*
 * Substitution where the derivative of the inside is not simply sitting there:
 * whatever x is left over has to be written in u as well. Every practice exam
 * has one, usually with the substitution given as a hint — x√(x + 1), √(1 + √x),
 * eˣ/(eˣ + 1)² — and one asks for the bounds to be carried across too.
 */

interface Sub {
  integrand: Latex;
  /** `u = x + 3,\quad du = dx` and whatever else the rewrite needs. */
  swap: Latex;
  how: string;
  /** The integral with no x left in it. */
  inU: Latex;
  /** Its antiderivative, still in u. */
  antiU: Latex;
  /** And back in x. */
  anti: Latex;
  rules: string[];
}

/** `u^{\frac{3}{2}}`, `u^{-\frac{1}{2}}`, `u^{4}`, `u`. */
const pw = (base: Latex, p: number, q = 1): Latex =>
  q === 1 ? power(base, p) : `${base}^{${p < 0 ? '-' : ''}${frac(String(Math.abs(p)), String(q))}}`;

/** `x + 3`, `x - 2`. */
const plusC = (c: number): Latex => poly([[1, 1], [c, 0]]);

/** Replaces the u in a u-expression with the bracketed inside. */
const backTo = (tex: Latex, inside: Latex): Latex => tex.replaceAll('u', `\\left(${inside}\\right)`);

/** x(x + c)ⁿ: the leftover x is u − c. */
function linearPower(rng: Rng): Sub {
  const c = rng.nonZero(-4, 4);
  const n = rng.int(3, 6);
  const antiU = sum([times(fracTex(1, n + 2), pw('u', n + 2)), times(fracTex(-c, n + 1), pw('u', n + 1))]);
  return {
    integrand: `x\\left(${plusC(c)}\\right)^{${n}}`,
    swap: `u = ${plusC(c)},\\quad du = dx,\\quad x = ${poly([[1, 1], [-c, 0]], 'u')}`,
    how: `Expanding the ${n}th power would work, but slowly.`,
    inU: `\\int \\left(${sum([pw('u', n + 1), times(String(-c), pw('u', n))])}\\right)du`,
    antiU,
    anti: backTo(antiU, plusC(c)),
    rules: ['substitution', 'antiderivative-power', 'plus-c'],
  };
}

/** x√(x + c) or x/√(x + c): the same trade, with half powers. */
function linearRoot(rng: Rng): Sub {
  const c = rng.int(1, 5);
  const over = rng.bool();
  // x·u^{s/2} with s = ±1 becomes u^{s/2 + 1} − c·u^{s/2}.
  const s = over ? -1 : 1;
  const antiU = sum([
    times(fracTex(2, s + 4), pw('u', s + 4, 2)),
    times(fracTex(-2 * c, s + 2), pw('u', s + 2, 2)),
  ]);
  const root = `\\sqrt{${plusC(c)}}`;
  return {
    integrand: over ? frac('x', root) : `x${root}`,
    swap: `u = ${plusC(c)},\\quad du = dx,\\quad x = u - ${c}`,
    how: 'The root is what makes it hard, so its inside is the new variable.',
    inU: `\\int \\left(${sum([pw('u', s + 2, 2), times(String(-c), pw('u', s, 2))])}\\right)du`,
    antiU,
    anti: backTo(antiU, plusC(c)),
    rules: ['substitution', 'antiderivative-power', 'plus-c'],
  };
}

/** x/(x + c)²: one piece is a log, the other a power. */
function linearSquare(rng: Rng): Sub {
  const c = rng.int(1, 5);
  return {
    integrand: frac('x', `\\left(${plusC(c)}\\right)^{2}`),
    swap: `u = ${plusC(c)},\\quad du = dx,\\quad x = u - ${c}`,
    how: 'Split the fraction once the top is written in $u$.',
    inU: `\\int \\left(${frac('1', 'u')} - ${frac(String(c), 'u^{2}')}\\right)du`,
    antiU: `\\ln\\left|u\\right| + ${frac(String(c), 'u')}`,
    anti: `\\ln\\left|${plusC(c)}\\right| + ${frac(String(c), plusC(c))}`,
    rules: ['substitution', 'log-antiderivative', 'antiderivative-power', 'plus-c'],
  };
}

/** √(c + √x): x itself has to be solved for, so dx turns into a multiple of du. */
function rootOfRoot(rng: Rng): Sub {
  const c = rng.int(1, 3);
  const antiU = sum([times(fracTex(4, 5), pw('u', 5, 2)), times(fracTex(-4 * c, 3), pw('u', 3, 2))]);
  return {
    integrand: `\\sqrt{${c} + \\sqrt{x}}`,
    swap: `u = ${c} + \\sqrt{x},\\quad x = \\left(u - ${c}\\right)^{2},\\quad dx = 2\\left(u - ${c}\\right)du`,
    how: 'Solve the substitution for $x$ and differentiate that, rather than differentiating $u$.',
    inU: `\\int 2\\left(u - ${c}\\right)\\sqrt{u}\\,du = \\int \\left(2u^{\\frac{3}{2}} - ${2 * c}u^{\\frac{1}{2}}\\right)du`,
    antiU,
    anti: backTo(antiU, `${c} + \\sqrt{x}`),
    rules: ['substitution', 'antiderivative-power', 'plus-c'],
  };
}

/** eˣ over something in eˣ: u = eˣ + c, du = eˣ dx, and any other eˣ is u − c. */
function expShift(rng: Rng): Sub {
  const c = rng.int(1, 4);
  const inside = `e^{x} + ${c}`;
  const swap = `u = ${inside},\\quad du = e^{x}\\,dx`;
  if (rng.bool()) {
    return {
      integrand: frac('e^{x}', `\\left(${inside}\\right)^{2}`),
      swap,
      how: 'The $e^{x}$ on top is exactly $du$.',
      inU: `\\int ${frac('du', 'u^{2}')}`,
      antiU: `-${frac('1', 'u')}`,
      anti: `-${frac('1', inside)}`,
      rules: ['substitution', 'antiderivative-power', 'plus-c'],
    };
  }
  return {
    integrand: frac('e^{2x}', inside),
    swap: `${swap},\\quad e^{x} = u - ${c}`,
    how: `One $e^{x}$ goes into $du$; the other is $u - ${c}$.`,
    inU: `\\int ${frac(`u - ${c}`, 'u')}\\,du = \\int \\left(1 - ${frac(String(c), 'u')}\\right)du`,
    antiU: sum(['u', times(String(-c), '\\ln\\left|u\\right|')]),
    // u = eˣ + c, and the + c joins the constant.
    anti: sum(['e^{x}', times(String(-c), `\\ln\\left(${inside}\\right)`)]),
    rules: ['substitution', 'log-antiderivative', 'plus-c'],
  };
}

/** (x² + px + p²/4)/√(2x + p), which is ¼(2x + p)² over the root. */
function squareOverRoot(rng: Rng): Sub {
  const p = rng.int(1, 3);
  const inside = poly([[2, 1], [p, 0]]);
  return {
    integrand: frac(sum(['x^{2}', times(String(p), 'x'), fracTex(p * p, 4)]), `\\sqrt{${inside}}`),
    swap: `u = ${inside},\\quad du = 2\\,dx,\\quad ${sum(['x^{2}', times(String(p), 'x'), fracTex(p * p, 4)])} = \\frac{1}{4}u^{2}`,
    how: 'The top is a perfect square, and its root is the thing under the square root.',
    inU: `\\int ${frac('u^{2}', '4\\sqrt{u}')}\\cdot${frac('du', '2')} = \\int \\frac{1}{8}u^{\\frac{3}{2}}\\,du`,
    antiU: `\\frac{1}{20}u^{\\frac{5}{2}}`,
    anti: `\\frac{1}{20}\\left(${inside}\\right)^{\\frac{5}{2}}`,
    rules: ['substitution', 'antiderivative-power', 'plus-c'],
  };
}

function indefinite(s: Sub): Draft {
  const result = `${s.anti} + C`;
  return {
    instruction: 'Find the antiderivative',
    prompt: `\\int ${s.integrand}\\,dx`,
    note: 'Do not forget the constant of integration.',
    answers: [answer(result, { keyboard: 'calculus', requires: { plusC: true }, upToConstant: true })],
    solution: [
      setup('substitution', 'Substitute', s.swap, s.how),
      setup('substitution', 'Everything in u', s.inU),
      setup(s.rules[1]!, 'Integrate in u', s.antiU),
      step('substitution', 'Back to x', s.anti),
      step('plus-c', 'Add the constant', result),
    ],
    ruleIds: s.rules,
    verify: { kind: 'antiderivative', of: s.integrand, wrt: 'x' },
  };
}

/**
 * ∫₀ˣ x√(x + c) dx with both ends of u perfect squares, so the bounds carry
 * across and the answer is a fraction. Once in u, it stays in u.
 */
function definite(rng: Rng): Draft {
  const r = rng.pick([1, 2]);
  const c = r * r;
  const R = rng.int(r + 1, 4);
  const upper = R * R - c;
  // [2/5 u^{5/2} − 2c/3 u^{3/2}] from r² to R², with √u = r and R.
  const at = (t: number): number => 6 * t ** 5 - 10 * c * t ** 3;
  const value = fracTex(at(R) - at(r), 15);
  const integrand = `x\\sqrt{${plusC(c)}}`;
  const antiU = sum([times(fracTex(2, 5), pw('u', 5, 2)), times(fracTex(-2 * c, 3), pw('u', 3, 2))]);
  const verify: Verification = { kind: 'definite-integral', of: integrand, wrt: 'x', from: 0, to: upper };
  const solution: Step[] = [
    setup(
      'substitution',
      'Substitute, bounds and all',
      `u = ${plusC(c)}:\\quad x = 0 \\Rightarrow u = ${c},\\quad x = ${upper} \\Rightarrow u = ${R * R}`,
      'Carry the bounds across with it, and there is no need to go back to $x$.',
    ),
    setup('substitution', 'Everything in u', `\\int_{${c}}^{${R * R}} \\left(${sum(['u^{\\frac{3}{2}}', times(String(-c), 'u^{\\frac{1}{2}}')])}\\right)du`),
    setup('antiderivative-power', 'Integrate in u', `\\left[${antiU}\\right]_{${c}}^{${R * R}}`),
    step('definite-integral', 'Substitute the bounds', value, `$\\sqrt{${R * R}} = ${R}$ and $\\sqrt{${c}} = ${r}$, which is why those bounds were chosen.`),
  ];
  return {
    instruction: 'Evaluate',
    prompt: `\\int_{0}^{${upper}} ${integrand}\\,dx`,
    note: 'Give the exact value.',
    answers: [answer(value, { keyboard: 'numeric', kind: 'number' })],
    solution,
    ruleIds: ['substitution', 'antiderivative-power', 'definite-integral'],
    verify,
  };
}

const MEDIUM = [linearPower, linearRoot, linearSquare];
const HARD = [rootOfRoot, expShift, squareOverRoot, linearRoot];

export const substitution: Generator = {
  id: 'anti.substitution',
  chapter: 10,
  title: 'Substitution, with x left over',
  tags: ['antiderivative', 'substitution'],
  version: 1,
  supports: ['medium', 'hard'],
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    if (tier === 'hard' && rng.int(1, 5) === 1) return definite(rng);
    return indefinite(rng.pick(tier === 'hard' ? HARD : MEDIUM)(rng));
  },
};
