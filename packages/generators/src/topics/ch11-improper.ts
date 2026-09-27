import { answer, frac, fracTex, gcd, power, setup, step, term, times } from '../authoring.js';
import type { Draft, Generator, Latex, Rng } from '../types.js';

/*
 * An integral with an infinite bound, or a bound where the integrand blows up:
 * integrate up to a letter, then let the letter go. The exams ask for the value
 * of one of each — ∫₀^∞ e^{−sx} sin x dx, ∫₀⁸ dx/∛x — and every one here
 * converges, since there is no way yet to answer "it diverges".
 */

interface Improper {
  integrand: Latex;
  /** The bounds as printed, and as the harness integrates them. */
  from: number;
  to: number | 'inf';
  /** The integral up to a letter, with the limit in front. */
  limit: Latex;
  /** The antiderivative between the bounds, the limit still in front. */
  bracket: Latex;
  value: Latex;
  /** Why the term in the letter goes away. */
  why: string;
  rules: string[];
}

const TO_INF = '\\lim_{b \\to \\infty}';
const FROM_ZERO = '\\lim_{t \\to 0^{+}}';

/** kπ/d for positive k and d, as one fraction. */
function piOver(k: number, d: number): Latex {
  const g = gcd(k, d);
  const top = k / g === 1 ? '\\pi' : `${k / g}\\pi`;
  return d / g === 1 ? top : frac(top, String(d / g));
}

/** −k/(m xᵐ) in lowest terms: the antiderivative of k/x^{m + 1}. */
function minusOverPower(k: number, m: number): Latex {
  const g = gcd(k, m);
  return `-${frac(String(k / g), term(m / g, power('x', m)))}`;
}

/** k/xᵖ from 1: converges because p > 1. */
function tailPower(rng: Rng, powers: readonly number[]): Improper {
  const p = rng.pick(powers);
  const k = rng.int(1, 6);
  const half = p === 1.5;
  const integrand = frac(String(k), half ? 'x\\sqrt{x}' : `x^{${p}}`);
  const anti = half ? `-${frac(String(2 * k), '\\sqrt{x}')}` : minusOverPower(k, p - 1);
  return {
    integrand,
    from: 1,
    to: 'inf',
    limit: `${TO_INF}\\int_{1}^{b} ${integrand}\\,dx`,
    bracket: `${TO_INF}\\left[${anti}\\right]_{1}^{b}`,
    value: half ? String(2 * k) : fracTex(k, p - 1),
    why: `The term in $b$ goes to $0$ because the power is above $1$. With a power of $1$ or less it would grow instead, and the integral would diverge.`,
    rules: ['improper-integral', 'antiderivative-power'],
  };
}

/** 1/ⁿ√x from 0 to aⁿ: blows up at 0, but slowly enough, since 1/n < 1. */
function poleRoot(rng: Rng): Improper {
  const n = rng.pick([2, 3]);
  const a = rng.int(2, n === 2 ? 5 : 4);
  const top = a ** n;
  const root = n === 2 ? '\\sqrt{x}' : '\\sqrt[3]{x}';
  const integrand = frac('1', root);
  const up = `x^{${frac(String(n - 1), String(n))}}`;
  return {
    integrand,
    from: 0,
    to: top,
    limit: `${FROM_ZERO}\\int_{t}^{${top}} x^{-${frac('1', String(n))}}\\,dx`,
    bracket: `${FROM_ZERO}\\left[${times(fracTex(n, n - 1), up)}\\right]_{t}^{${top}}`,
    value: fracTex(n * a ** (n - 1), n - 1),
    why: `The integrand blows up at $0$, so that is the bound to approach. The term in $t$ goes to $0$ because the power under the $x$ was below $1$; $\\sqrt[${n}]{${top}} = ${a}$.`,
    rules: ['improper-integral', 'antiderivative-power'],
  };
}

/** k e^{−ax} from 0, or x e^{−ax}, which needs a round of parts first. */
function expTail(rng: Rng, withX: boolean): Improper {
  const a = rng.int(1, 4);
  const e = `e^{-${a === 1 ? '' : a}x}`;
  if (withX) {
    const product = `\\left(${a === 1 ? '' : a}x + 1\\right)${e}`;
    return {
      integrand: `x${e}`,
      from: 0,
      to: 'inf',
      limit: `${TO_INF}\\int_{0}^{b} x${e}\\,dx`,
      bracket: `${TO_INF}\\left[-${a === 1 ? product : frac(product, String(a * a))}\\right]_{0}^{b}`,
      value: fracTex(1, a * a),
      why: 'By parts with $u = x$. At $b$ the exponential wins against the $b$ in front of it, so that end goes to $0$.',
      rules: ['improper-integral', 'by-parts'],
    };
  }
  const k = rng.int(1, 6);
  const integrand = times(String(k), e);
  return {
    integrand,
    from: 0,
    to: 'inf',
    limit: `${TO_INF}\\int_{0}^{b} ${integrand}\\,dx`,
    bracket: `${TO_INF}\\left[${times(fracTex(-k, a), e)}\\right]_{0}^{b}`,
    value: fracTex(k, a),
    why: `$e^{-${a === 1 ? '' : a}b} \\to 0$, and the bottom bound leaves $e^{0} = 1$.`,
    rules: ['improper-integral', 'standard-antiderivatives'],
  };
}

/** e^{−sx} sin x or cos x from 0: by parts twice, then the far end vanishes. */
function damped(rng: Rng): Improper {
  const s = rng.int(1, 3);
  const sine = rng.bool();
  const e = `e^{-${s === 1 ? '' : s}x}`;
  const fn = sine ? '\\sin x' : '\\cos x';
  const inner = sine ? `${s === 1 ? '' : s}\\sin x + \\cos x` : `${s === 1 ? '' : s}\\cos x - \\sin x`;
  return {
    integrand: `${e}${fn}`,
    from: 0,
    to: 'inf',
    limit: `${TO_INF}\\int_{0}^{b} ${e}${fn}\\,dx`,
    bracket: `${TO_INF}\\left[-${frac(`${e}\\left(${inner}\\right)`, String(s * s + 1))}\\right]_{0}^{b}`,
    value: fracTex(sine ? 1 : s, s * s + 1),
    why: `By parts twice, and the integral comes back. At $b$ the bracket stays bounded while $e^{-${s === 1 ? '' : s}b} \\to 0$; at $0$ it is $${fracTex(sine ? -1 : -s, s * s + 1)}$.`,
    rules: ['improper-integral', 'by-parts'],
  };
}

/** k/(x² + a²) from 0: an arctangent, which levels off at π/2. */
function arctanTail(rng: Rng): Improper {
  const a = rng.int(1, 3);
  const k = a * rng.int(1, 3);
  const integrand = frac(String(k), `x^{2} + ${a * a}`);
  const arg = a === 1 ? 'x' : frac('x', String(a));
  return {
    integrand,
    from: 0,
    to: 'inf',
    limit: `${TO_INF}\\int_{0}^{b} ${integrand}\\,dx`,
    bracket: `${TO_INF}\\left[${times(fracTex(k, a), `\\arctan${a === 1 ? ' x' : `\\left(${arg}\\right)`}`)}\\right]_{0}^{b}`,
    value: piOver(k, 2 * a),
    why: '$\\arctan$ approaches $\\frac{\\pi}{2}$ as its argument grows, and $\\arctan 0 = 0$.',
    rules: ['improper-integral', 'arctan-antiderivative'],
  };
}

const MEDIUM = [(rng: Rng) => tailPower(rng, [2, 3, 4]), poleRoot, (rng: Rng) => expTail(rng, false)];
const HARD = [(rng: Rng) => expTail(rng, true), damped, arctanTail, (rng: Rng) => tailPower(rng, [1.5])];

export const improperIntegral: Generator = {
  id: 'integ.improper',
  chapter: 11,
  title: 'Improper integrals',
  tags: ['definite-integral', 'improper', 'limit'],
  version: 1,
  supports: ['medium', 'hard'],
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const s = rng.pick(tier === 'hard' ? HARD : MEDIUM)(rng);
    const toTex = s.to === 'inf' ? '\\infty' : String(s.to);
    return {
      instruction: 'Evaluate the improper integral',
      prompt: `\\int_{${s.from}}^{${toTex}} ${s.integrand}\\,dx`,
      note: 'Give the exact value.',
      answers: [answer(s.value, { keyboard: 'calculus', kind: 'number' })],
      solution: [
        setup('improper-integral', 'Write it as a limit', s.limit),
        setup(s.rules[1]!, 'Integrate', s.bracket),
        step('improper-integral', 'Take the limit', s.value, s.why),
      ],
      ruleIds: s.rules,
      verify: { kind: 'improper-integral', of: s.integrand, wrt: 'x', from: s.from, to: s.to },
    };
  },
};
