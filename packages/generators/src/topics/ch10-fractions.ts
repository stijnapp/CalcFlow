import { answer, frac, fracTex, gcd, paren, poly, setup, step, sum, times } from '../authoring.js';
import type { Draft, Generator, Latex, Rng } from '../types.js';

/*
 * A fraction with a factored bottom, taken apart before it is integrated. Every
 * practice exam has one, and five of the six put a quadratic that does not
 * factor next to the linear factor — which is where the arctangent comes in.
 */

const PLUS_C = 'Do not forget the constant of integration.';

/** `x - 3`, `x + 2`, `x`. */
const shifted = (h: number): Latex => (h === 0 ? 'x' : poly([[1, 1], [-h, 0]]));

/** n/d over a bracket, as one fraction: `\frac{4}{5(x + 1)}` rather than a fraction on a fraction. */
function piece(n: number, d: number, bracket: Latex): Latex {
  const g = gcd(n, d);
  const [top, bottom] = [Math.abs(n / g), Math.abs(d / g)];
  const sign = n * d < 0 ? '-' : '';
  return `${sign}${frac(String(top), bottom === 1 ? bracket : `${bottom}\\left(${bracket}\\right)`)}`;
}

interface Split {
  integrand: Latex;
  split: Latex;
  anti: Latex;
  how: string;
  rules: string[];
}

/** k over two linear factors: two logs. */
function twoLinear(rng: Rng): Split {
  // Both poles to the left of the origin, so the integrand is smooth
  // everywhere it gets evaluated.
  const p = -rng.int(1, 6);
  let q = -rng.int(1, 6);
  while (q === p) q = -rng.int(1, 6);
  const k = rng.nonZero(-6, 8);
  const left = shifted(p);
  const right = shifted(q);
  const c = fracTex(k, p - q);
  return {
    integrand: frac(String(k), `${paren(left)}${paren(right)}`),
    split: sum([piece(k, p - q, left), piece(-k, p - q, right)]),
    anti: sum([times(c, `\\ln\\left|${left}\\right|`), times(fracTex(-k, p - q), `\\ln\\left|${right}\\right|`)]),
    how: `Both numerators are constants; comparing coefficients gives $\\pm${c}$.`,
    rules: ['partial-fractions', 'log-antiderivative', 'plus-c'],
  };
}

/**
 * A linear factor and a quadratic that stays positive:
 * A/(x + p) + (B(x − h) + E)/((x − h)² + 1). The first is a log, the second a
 * log of the quadratic plus an arctangent. Built from A, B and E, so they come
 * out whole, the way the exams set them.
 */
function withQuadratic(rng: Rng): Split {
  const p = rng.int(1, 3);
  const h = rng.int(-2, 2);
  const A = rng.int(1, 4);
  let B = rng.pick([0, 2, 4, -2]);
  const E = rng.pick([0, 1, 2, 3, -1, -2]);
  if (B === 0 && E === 0) B = 2;

  const quad = poly([[1, 2], [-2 * h, 1], [h * h + 1, 0]]);
  const linear = `x + ${p}`;
  // A·Q + (B(x − h) + E)(x + p), multiplied out.
  const top = poly([
    [A + B, 2],
    [-2 * A * h + B * p - B * h + E, 1],
    [A * (h * h + 1) + p * (E - B * h), 0],
  ]);
  const second = sum([B ? times(String(B), paren(shifted(h))) : '', E ? String(E) : '']);
  const arctan = h === 0 ? '\\arctan x' : `\\arctan\\left(${shifted(h)}\\right)`;

  return {
    integrand: frac(top, `\\left(${linear}\\right)\\left(${quad}\\right)`),
    split: `${frac(String(A), linear)} + ${frac(second, quad)}`,
    anti: sum([
      times(String(A), `\\ln\\left|${linear}\\right|`),
      B ? times(fracTex(B, 2), `\\ln\\left(${quad}\\right)`) : '',
      E ? times(String(E), arctan) : '',
    ]),
    how: `The quadratic has no real roots, so its numerator is linear. Put $x = ${-p}$ to get $A = ${A}$ at once, then compare coefficients. Written around $${shifted(h)}$, the top of the second fraction is part derivative of the bottom and part constant.`,
    rules: ['partial-fractions', ...(E ? ['arctan-antiderivative'] : []), 'log-antiderivative', 'plus-c'],
  };
}

/** Two brackets underneath, which nothing integrates whole. */
export const partialFractions: Generator = {
  id: 'anti.partial-fractions',
  chapter: 10,
  title: 'Partial fractions',
  tags: ['antiderivative', 'fractions', 'logarithm'],
  version: 2,
  supports: ['hard'],
  invariant: 'value-preserving',

  generate({ rng }): Draft {
    const s = rng.bool() ? twoLinear(rng) : withQuadratic(rng);
    const result = `${s.anti} + C`;
    return {
      instruction: 'Find the antiderivative',
      prompt: `\\int ${s.integrand}\\,dx`,
      note: `Split it into simpler fractions first. ${PLUS_C}`,
      answers: [answer(result, { keyboard: 'calculus', requires: { plusC: true }, upToConstant: true })],
      solution: [
        setup('partial-fractions', 'Split the fraction', `\\int\\left(${s.split}\\right)dx`, s.how),
        step(s.rules[1]!, 'Integrate each piece', s.anti),
        step('plus-c', 'Add the constant', result),
      ],
      ruleIds: s.rules,
      verify: { kind: 'antiderivative', of: s.integrand, wrt: 'x' },
    };
  },
};

/**
 * One over a quadratic with no roots: complete the square, and it is the
 * derivative of an arctangent. The first 2025 exam scales it so the square is
 * (4x − 3)² + 16; the hard tier does the same.
 */
export const arctanIntegral: Generator = {
  id: 'anti.arctan',
  chapter: 10,
  title: 'Completing the square to an arctangent',
  tags: ['antiderivative', 'arctan', 'completing-square'],
  version: 1,
  supports: ['medium', 'hard'],
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const m = rng.int(1, 4);
    let integrand: Latex;
    let square: Latex;
    let anti: Latex;

    if (tier === 'medium') {
      // k / ((x + b)² + d²) = (k/d²) / (((x + b)/d)² + 1)
      const b = rng.nonZero(-4, 4);
      const d = rng.int(1, 3);
      const k = m * d;
      const bottom = poly([[1, 2], [2 * b, 1], [b * b + d * d, 0]]);
      integrand = frac(String(k), bottom);
      square = `\\left(${shifted(-b)}\\right)^{2} + ${d * d}`;
      const arg = d === 1 ? shifted(-b) : frac(shifted(-b), String(d));
      anti = times(String(m), `\\arctan\\left(${arg}\\right)`);
    } else {
      // k / ((ax + b)² + a²) = (k/a²) / ((x + b/a)² + 1)
      const a = rng.int(2, 4);
      let b = rng.nonZero(-5, 5);
      if (b % a === 0) b += b > 0 ? -1 : 1;
      const k = m * a * a;
      const bottom = poly([[a * a, 2], [2 * a * b, 1], [b * b + a * a, 0]]);
      integrand = frac(String(k), bottom);
      square = `\\left(${poly([[a, 1], [b, 0]])}\\right)^{2} + ${a * a} = ${a * a}\\left(\\left(x ${b > 0 ? '+' : '-'} ${fracTex(Math.abs(b), a)}\\right)^{2} + 1\\right)`;
      anti = times(String(m), `\\arctan\\left(x ${b > 0 ? '+' : '-'} ${fracTex(Math.abs(b), a)}\\right)`);
    }

    const result = `${anti} + C`;
    return {
      instruction: 'Find the antiderivative',
      prompt: `\\int ${integrand}\\,dx`,
      note: `Complete the square in the denominator. ${PLUS_C}`,
      answers: [answer(result, { keyboard: 'calculus', requires: { plusC: true }, upToConstant: true })],
      solution: [
        setup('completing-square', 'Complete the square', square, 'The bottom has no real roots, so it is a square plus a positive number.'),
        step('arctan-antiderivative', 'It is an arctangent', anti, 'Scale the square so the number beside it is $1$; what is left is $\\frac{1}{u^{2} + 1}$ with $u$ linear in $x$.'),
        step('plus-c', 'Add the constant', result),
      ],
      ruleIds: ['arctan-antiderivative', 'completing-square', 'plus-c'],
      verify: { kind: 'antiderivative', of: integrand, wrt: 'x' },
    };
  },
};
