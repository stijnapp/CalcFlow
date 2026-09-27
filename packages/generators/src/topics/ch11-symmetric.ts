import { answer, frac, setup, step, sum, term } from '../authoring.js';
import type { Draft, Generator, Latex, Rng, Step } from '../types.js';

/*
 * Bounds symmetric about 0 around an odd integrand nobody could antidifferentiate
 * in an exam — the 2024 one has cos(x + π/2)/(b + x²) — so the only way through
 * is to notice it is odd. On hard an even part rides along, which doubles
 * instead of cancelling, so the answer is not always 0.
 */

interface Part {
  tex: Latex;
  why: string;
}

const ODD: ((rng: Rng) => Part)[] = [
  (rng) => {
    const b = rng.int(1, 3);
    return {
      tex: frac('\\cos\\left(x + \\frac{\\pi}{2}\\right)', `${b} + x^{2}`),
      why: `$\\cos(x + \\frac{\\pi}{2}) = -\\sin x$ is odd and $${b} + x^{2}$ is even, so the quotient is odd.`,
    };
  },
  () => ({ tex: 'x^{3}e^{x^{2}}', why: '$x^{3}$ is odd and $e^{x^{2}}$ is even, so the product is odd.' }),
  () => ({
    tex: '\\sin x\\ln\\left(1 + x^{2}\\right)',
    why: '$\\sin x$ is odd and $\\ln(1 + x^{2})$ is even, so the product is odd.',
  }),
  () => ({ tex: '\\arctan\\left(x\\right)\\cos x', why: 'An odd arctangent times an even cosine is odd.' }),
  () => ({ tex: '\\sin\\left(x^{3}\\right)', why: 'An odd function of an odd function is odd.' }),
  (rng) => {
    const b = rng.int(1, 4);
    return {
      tex: frac('x', `\\sqrt{${b} + x^{4}}`),
      why: 'An odd $x$ over an even root is odd.',
    };
  },
];

/** An even part and what it integrates to over [−a, a]. */
interface Even extends Part {
  value: (a: number) => Latex;
  /** More than one term, so it needs brackets under an integral sign. */
  sum?: true;
}

const constant = (rng: Rng): Even => {
  const k = rng.int(1, 5);
  return { tex: String(k), why: 'A constant is even.', value: (a) => String(2 * k * a) };
};

const EVEN: ((rng: Rng) => Even)[] = [
  constant,
  (rng) => {
    const k = rng.int(1, 3) * 3;
    return { tex: term(k, 'x^{2}'), why: 'An even power is even.', value: (a) => String((2 * k * a ** 3) / 3) };
  },
  () => ({
    tex: '\\sin^{2}x + \\cos^{2}x',
    why: 'This one is just $1$ in disguise.',
    value: (a) => String(2 * a),
    sum: true,
  }),
  (rng) => {
    const k = rng.int(1, 4);
    return {
      tex: term(k, '\\left|x\\right|'),
      why: 'Past 0 the bars come off: $|x| = x$.',
      value: (a) => String(k * a * a),
    };
  },
  () => ({
    tex: 'e^{x} + e^{-x}',
    why: 'Swapping $x$ for $-x$ swaps the two terms.',
    value: (a) => `2e^{${a}} - 2e^{-${a}}`,
    sum: true,
  }),
];

function working(odd: Part, even: Even | null, a: number, value: Latex): Step[] {
  const over = (from: Latex, f: Latex) => `\\int_{${from}}^{${a}} ${f}\\,dx`;
  const cancel = setup('symmetric-integral', 'The odd part cancels', `${over(`-${a}`, odd.tex)} = 0`, odd.why);
  if (!even) return [cancel, step('symmetric-integral', 'So the integral is', '0')];
  const body = even.sum ? `\\left(${even.tex}\\right)` : even.tex;
  return [
    setup('symmetric-integral', 'Split it', sum([over(`-${a}`, odd.tex), over(`-${a}`, body)])),
    cancel,
    setup('symmetric-integral', 'The even part doubles', `2${over('0', body)}`, even.why),
    step('definite-integral', 'Evaluate', value),
  ];
}

export const symmetricIntegral: Generator = {
  id: 'integ.symmetric',
  chapter: 11,
  title: 'Odd integrands on symmetric bounds',
  tags: ['definite-integral', 'parity'],
  version: 1,
  supports: ['medium', 'hard'],
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const a = rng.int(1, 2);
    const odd = rng.pick(ODD)(rng);
    const even = tier === 'hard' ? rng.pick(EVEN)(rng) : rng.bool() ? constant(rng) : null;
    const integrand = even ? sum([odd.tex, even.tex]) : odd.tex;
    const bracketed = even ? `\\left(${integrand}\\right)` : integrand;
    const value = even ? even.value(a) : '0';

    return {
      instruction: 'Evaluate the integral',
      prompt: `\\int_{-${a}}^{${a}} ${bracketed}\\,dx`,
      note: 'Look at the bounds before looking for an antiderivative.',
      answers: [answer(value, { keyboard: 'numeric', kind: 'number' })],
      solution: working(odd, even, a, value),
      ruleIds: ['symmetric-integral', 'parity', 'definite-integral'],
      verify: { kind: 'definite-integral', of: integrand, wrt: 'x', from: -a, to: a },
    };
  },
};
