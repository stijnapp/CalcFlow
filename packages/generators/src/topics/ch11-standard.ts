import { TIERS, type Tier } from '@calcflow/shared';
import { answer, frac, fracTex, rootOf, setup, step, times } from '../authoring.js';
import type { Draft, Generator, Rng } from '../types.js';

interface DefiniteShape {
  integrand: string;
  loTex: string;
  hiTex: string;
  lo: number;
  hi: number;
  anti: string;
  value: string;
  ruleIds: string[];
}

/** Each shape with the tiers that ask it; k is the constant factor in front. */
const SHAPES: Array<[Tier[], (rng: Rng, k: number) => DefiniteShape]> = [
  [
    ['easy', 'medium', 'hard'],
    (rng, k) => {
      const b = rng.int(1, 3);
      return {
        integrand: times(String(k), 'e^{x}'),
        loTex: '0',
        hiTex: String(b),
        lo: 0,
        hi: b,
        anti: times(String(k), 'e^{x}'),
        value: times(String(k), `\\left(e^{${b}} - 1\\right)`),
        ruleIds: ['standard-antiderivatives'],
      };
    },
  ],
  [
    ['easy', 'medium', 'hard'],
    (_, k) => ({
      integrand: times(String(k), '\\sin x'),
      loTex: '0',
      hiTex: '\\pi',
      lo: 0,
      hi: Math.PI,
      anti: times(String(-k), '\\cos x'),
      value: String(2 * k),
      ruleIds: ['standard-antiderivatives'],
    }),
  ],
  [
    ['easy', 'medium', 'hard'],
    (rng, k) => {
      const b = rng.int(2, 6);
      return {
        integrand: frac(String(k), 'x'),
        loTex: '1',
        hiTex: String(b),
        lo: 1,
        hi: b,
        anti: times(String(k), '\\ln x'),
        value: times(String(k), `\\ln ${b}`),
        ruleIds: ['log-antiderivative'],
      };
    },
  ],
  [
    ['medium', 'hard'],
    (_, k) => ({
      integrand: times(String(k), '\\cos x'),
      loTex: '0',
      hiTex: '\\frac{\\pi}{2}',
      lo: 0,
      hi: Math.PI / 2,
      anti: times(String(k), '\\sin x'),
      value: String(k),
      ruleIds: ['standard-antiderivatives'],
    }),
  ],
  [
    ['medium', 'hard'],
    (rng, k) => {
      // From 1, not from 0: √x has a vertical tangent at the origin, and the
      // harness integrates numerically — the check would fail on its own
      // quadrature error rather than on anything wrong here.
      const q = rng.int(2, 4);
      return {
        integrand: times(String(k), rootOf('x')),
        loTex: '1',
        hiTex: String(q * q),
        lo: 1,
        hi: q * q,
        anti: times(fracTex(2 * k, 3), 'x^{\\frac{3}{2}}'),
        value: fracTex(2 * k * (q ** 3 - 1), 3),
        ruleIds: ['antiderivative-power', 'fractional-exponent'],
      };
    },
  ],
  [
    ['hard'],
    (rng, k) => {
      const a = rng.int(2, 3);
      return {
        integrand: times(String(k), `e^{${a}x}`),
        loTex: '0',
        hiTex: '1',
        lo: 0,
        hi: 1,
        anti: times(fracTex(k, a), `e^{${a}x}`),
        value: times(fracTex(k, a), `\\left(e^{${a}} - 1\\right)`),
        ruleIds: ['linear-substitution', 'standard-antiderivatives'],
      };
    },
  ],
  [
    ['hard'],
    (rng, k) => {
      const a = rng.int(2, 4);
      return {
        integrand: times(String(k), `\\sin\\left(${a}x\\right)`),
        loTex: '0',
        hiTex: `\\frac{\\pi}{${a}}`,
        lo: 0,
        hi: Math.PI / a,
        anti: times(fracTex(-k, a), `\\cos\\left(${a}x\\right)`),
        value: fracTex(2 * k, a),
        ruleIds: ['linear-substitution', 'standard-antiderivatives'],
      };
    },
  ],
  [
    ['hard'],
    (rng, k) => {
      const b = rng.int(2, 4);
      return {
        integrand: `${times(String(k), 'e^{x}')} + ${frac(String(b), 'x')}`,
        loTex: '1',
        hiTex: '2',
        lo: 1,
        hi: 2,
        anti: `${times(String(k), 'e^{x}')} + ${times(String(b), '\\ln x')}`,
        value: `${times(String(k), `\\left(e^{2} - e\\right)`)} + ${times(String(b), '\\ln 2')}`,
        ruleIds: ['standard-antiderivatives', 'log-antiderivative'],
      };
    },
  ],
];

/**
 * A definite integral of something that is not a polynomial. The book's own
 * exercises stop at powers of x; every exam question has an exponential, a sine
 * or a reciprocal under the integral sign, and the bounds are chosen to leave an
 * exact value rather than a decimal.
 */
export const definiteStandard: Generator = {
  id: 'integ.definite-standard',
  chapter: 11,
  title: 'Definite integrals of standard functions',
  tags: ['definite-integral', 'exponential', 'trigonometry'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const k = rng.nonZero(-5, 6);
    const pool = SHAPES.filter(([tiers]) => tiers.includes(tier));
    const s = rng.pick(pool)[1](rng, k);

    return {
      instruction: 'Evaluate',
      prompt: `\\int_{${s.loTex}}^{${s.hiTex}} \\left(${s.integrand}\\right) dx`,
      note: 'Give the exact value — no decimals.',
      answers: [answer(s.value, { keyboard: 'numeric', kind: 'number' })],
      solution: [
        setup(
          s.ruleIds[0]!,
          'Antidifferentiate',
          `\\left[${s.anti}\\right]_{${s.loTex}}^{${s.hiTex}}`,
          'Read the derivative table backwards.',
        ),
        step(
          'definite-integral',
          'Substitute the bounds',
          s.value,
          'Top bound minus bottom bound. No +C — it cancels.',
        ),
      ],
      ruleIds: ['definite-integral', ...s.ruleIds],
      verify: { kind: 'definite-integral', of: s.integrand, wrt: 'x', from: s.lo, to: s.hi },
    };
  },
};
