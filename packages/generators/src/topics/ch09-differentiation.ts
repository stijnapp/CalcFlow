import { TIERS, type Tier } from '@calcflow/shared';
import {
  answer,
  aside,
  frac,
  fracTex,
  gcd,
  ordinal,
  paren,
  poly,
  power,
  rootOf,
  setup,
  step,
  sum,
  term,
  tidy,
  times,
} from '../authoring.js';
import type { Draft, GenContext, Generator, Rng } from '../types.js';

/**
 * REFERENCE IMPLEMENTATION — copy this file when adding a topic.
 * `docs/adding-a-topic.md` walks through it line by line.
 *
 * Three things every generator owes the rest of the app:
 *
 *  1. It picks the parameters, so it knows the whole worked solution. Emit it as
 *     `solution` — the hint ladder is read straight off that array, which is why
 *     hints need no handwriting recognition.
 *  2. It declares `supports`, the tiers it has something to ask at, which
 *     actually fill. The session only draws from generators covering the cell
 *     the sliders are on.
 *  3. It declares `verify`, an independent numeric check on the answer. The fuzz
 *     harness differentiates the prompt numerically and compares — so a slip in
 *     the algebra below fails the build rather than teaching him the wrong rule.
 */

/**
 * An inner function and its derivative, kept in pieces —
 * `(coefficient · symbolic) / denominator` — so the outer rule can fold the
 * coefficients into one collapsed answer instead of leaving `2 · 3 · x` behind.
 */
interface Inner {
  tex: string;
  dCoef: number;
  dSym: string;
  dDen: string;
  /** Rendered derivative, for the hint that names it. */
  dTex: string;
  /** Constants the problem statement has to introduce. */
  note?: string;
  /** Safe as the argument of ln or √. */
  positive: boolean;
}

interface Outer {
  ruleId: string;
  /** f'(u) with the inner substituted, for the chain-rule setup line. */
  outerDerivative: string;
  wrap(inner: string): string;
  derivative(inner: Inner): string;
  /** ln and √ need a positive argument. */
  needsPositive: boolean;
}

/** Splits a leading integer coefficient off a factor. */
function splitCoefficient(tex: string): [number, string] {
  const m = /^(-?\d+)(.+)$/.exec(tex);
  return m ? [Number(m[1]), m[2]!] : [1, tex];
}

/**
 * Joins two denominators into one product, multiplying out the coefficients.
 * `2√x` and `2√(a+√x)` become `4√x√(a+√x)`, not `2√x2√(a+√x)` — the same number
 * either way, but only one of them is readable.
 */
function joinDen(a: string, b: string): string {
  if (a === '1') return b;
  if (b === '1') return a;
  const [ca, ra] = splitCoefficient(a);
  const [cb, rb] = splitCoefficient(b);
  return times(String(ca * cb), `${ra}${rb}`);
}

/** Drops parentheses that wrap the whole expression. */
function unwrap(tex: string): string {
  if (!tex.startsWith('\\left(') || !tex.endsWith('\\right)')) return tex;
  let depth = 0;
  for (let i = 0; i < tex.length; i += 1) {
    if (tex.startsWith('\\left(', i)) depth += 1;
    else if (tex.startsWith('\\right)', i)) {
      depth -= 1;
      // A close before the end means these are not the outermost pair.
      if (depth === 0 && i + '\\right)'.length < tex.length) return tex;
    }
  }
  return tex.slice('\\left('.length, -'\\right)'.length);
}

/**
 * A quotient with the numeric factors cancelled. The problems ask for a fully
 * simplified answer, so the reference had better be one — `6x / 2√(…)` is the
 * right number and the wrong answer to show.
 */
function reducedFrac(numerator: string, denominator: string): string {
  const [cn, rn] = splitCoefficient(numerator);
  const [cd, rd] = splitCoefficient(denominator);
  const g = gcd(cn, cd);
  const top = times(String(cn / g), unwrap(rn));
  const bottom = times(String(cd / g), unwrap(rd));
  return bottom === '1' ? top : frac(top, bottom);
}

export const chainRule: Generator = {
  id: 'diff.chain-rule',
  chapter: 9,
  title: 'Chain rule',
  tags: ['chain-rule', 'differentiation'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }: GenContext): Draft {
    const outer = pickOuter(tier, rng);
    const inner = pickInner(tier, rng, outer.needsPositive);
    const built = outer.wrap(inner.tex);
    const derivative = outer.derivative(inner);

    const solution = [
      // Still carrying an unapplied d/dx, so it is display-only.
      setup(
        'chain-rule',
        'Chain rule',
        `f'(x) = ${outer.outerDerivative.replace(/§/g, inner.tex)} \\cdot \\frac{d}{dx}${paren(inner.tex)}`,
        'The inside stays untouched in the first factor — only the second one differentiates.',
      ),
      step(
        'standard-derivatives',
        'Inner derivative',
        derivative,
        `The inside differentiates to $${inner.dTex}$.`,
      ),
    ];

    return {
      instruction: 'Differentiate',
      prompt: `f(x) = ${built}`,
      note: inner.note
        ? `${inner.note} Give f'(x) in exact, fully simplified form.`
        : "Give f'(x) in exact, fully simplified form.",
      answers: [answer(derivative, { keyboard: 'calculus' })],
      solution,
      ruleIds: [...new Set(['chain-rule', outer.ruleId, 'standard-derivatives'])],
      verify: { kind: 'derivative', of: built, wrt: 'x' },
    };
  },
};

function pickInner(tier: Tier, rng: Rng, positiveOnly: boolean): Inner {
  const kinds =
    tier === 'hard' ? ['root', 'quadratic'] : tier === 'medium' ? ['quadratic', 'linear'] : ['linear'];
  const kind = rng.pick(kinds);

  if (kind === 'root') {
    return {
      tex: `a + ${rootOf('x')}`,
      dCoef: 1,
      dSym: '1',
      dDen: `2${rootOf('x')}`,
      dTex: frac('1', `2${rootOf('x')}`),
      note: 'a is a positive constant.',
      positive: true,
    };
  }
  if (kind === 'quadratic') {
    const a = positiveOnly ? rng.int(1, 5) : rng.nonZero(-4, 5);
    const b = positiveOnly ? rng.int(1, 8) : rng.nonZero(-8, 8);
    return {
      tex: poly([[a, 2], [b, 0]]),
      dCoef: 2 * a,
      dSym: 'x',
      dDen: '1',
      dTex: term(2 * a, 'x'),
      positive: a > 0 && b > 0,
    };
  }
  const k = positiveOnly ? rng.int(1, 5) : rng.nonZero(-4, 5);
  const b = positiveOnly ? rng.int(1, 9) : rng.nonZero(-7, 7);
  return {
    tex: poly([[k, 1], [b, 0]]),
    dCoef: k,
    dSym: '1',
    dDen: '1',
    dTex: String(k),
    positive: k > 0 && b > 0,
  };
}

function pickOuter(tier: Tier, rng: Rng): Outer {
  const pool: Outer[] = [];
  const n = rng.int(2, tier === 'hard' ? 6 : 4);

  pool.push({
    ruleId: 'power-rule',
    outerDerivative: `${n}${power(paren('§'), n - 1)}`,
    needsPositive: false,
    wrap: (u) => power(paren(u), n),
    derivative: (i) => {
      const numerator = times(String(n * i.dCoef), times(i.dSym, power(paren(i.tex), n - 1)));
      return i.dDen === '1' ? numerator : reducedFrac(numerator, i.dDen);
    },
  });

  if (tier !== 'easy') {
    pool.push({
      ruleId: 'standard-derivatives',
      outerDerivative: frac('1', paren('§')),
      needsPositive: true,
      wrap: (u) => `\\ln${paren(u)}`,
      derivative: (i) => reducedFrac(times(String(i.dCoef), i.dSym), joinDen(i.dDen, paren(i.tex))),
    });
    pool.push({
      ruleId: 'standard-derivatives',
      outerDerivative: 'e^{§}',
      needsPositive: false,
      wrap: (u) => `e^{${u}}`,
      derivative: (i) => {
        const numerator = times(times(String(i.dCoef), i.dSym), `e^{${i.tex}}`);
        return i.dDen === '1' ? numerator : reducedFrac(numerator, i.dDen);
      },
    });
  }
  if (tier !== 'easy') {
    pool.push({
      ruleId: 'standard-derivatives',
      outerDerivative: '\\cos\\left(§\\right)',
      needsPositive: false,
      wrap: (u) => `\\sin${paren(u)}`,
      derivative: (i) => {
        const numerator = times(times(String(i.dCoef), i.dSym), `\\cos${paren(i.tex)}`);
        return i.dDen === '1' ? numerator : reducedFrac(numerator, i.dDen);
      },
    });
  }
  if (tier === 'hard') {
    pool.push({
      ruleId: 'standard-derivatives',
      outerDerivative: frac('1', '\\cos^{2}\\left(§\\right)'),
      needsPositive: false,
      wrap: (u) => `\\tan\\left(${u}\\right)`,
      derivative: (i) =>
        reducedFrac(
          times(String(i.dCoef), i.dSym),
          joinDen(i.dDen, `\\cos^{2}\\left(${i.tex}\\right)`),
        ),
    });
  }
  if (tier !== 'easy') {
    pool.push({
      ruleId: 'surd-simplify',
      outerDerivative: frac('1', `2\\sqrt{§}`),
      needsPositive: true,
      wrap: (u) => rootOf(u),
      derivative: (i) =>
        reducedFrac(times(String(i.dCoef), i.dSym), joinDen(i.dDen, `2${rootOf(i.tex)}`)),
    });
  }
  return rng.pick(pool);
}

export const powerSum: Generator = {
  id: 'diff.power-sum',
  chapter: 9,
  title: 'Power and sum rules',
  tags: ['power-rule', 'differentiation'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const count = tier === 'easy' ? 2 : tier === 'medium' ? 3 : 3;
    const exponents = new Set<number>();
    while (exponents.size < count) {
      exponents.add(tier !== 'easy' ? rng.pick([-2, -1, 2, 3, 4]) : rng.int(1, 4));
    }
    const pairs = [...exponents]
      .sort((a, b) => b - a)
      .map((p) => [rng.nonZero(-6, 8), p] as [number, number]);
    if (tier !== 'easy') pairs.push([rng.nonZero(-9, 9), 0]);

    const fx = poly(pairs);
    const derivativePairs = pairs
      .filter(([, p]) => p !== 0)
      .map(([c, p]) => [c * p, p - 1] as [number, number]);

    return {
      instruction: 'Differentiate',
      prompt: `f(x) = ${fx}`,
      note: "Give f'(x) in exact, fully simplified form.",
      answers: [answer(poly(derivativePairs), { keyboard: 'calculus' })],
      solution: [
        step(
          'power-rule',
          'Power rule',
          poly(derivativePairs),
          'Multiply by the exponent, then drop it by one.',
        ),
      ],
      ruleIds: ['power-rule'],
      verify: { kind: 'derivative', of: fx, wrt: 'x' },
    };
  },
};

export const productQuotient: Generator = {
  id: 'diff.product-quotient',
  chapter: 9,
  title: 'Product and quotient rules',
  tags: ['product-rule', 'quotient-rule', 'differentiation'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    if (tier === 'hard') return hardPair(rng);

    const a = rng.int(1, 4);
    const b = rng.nonZero(-6, 6);
    const c = rng.int(1, 4);
    const d = rng.nonZero(-6, 6);
    const u = poly([[a, 1], [b, 0]]);
    const v = poly([[c, 1], [d, 0]]);
    const isQuotient = tier !== 'easy' && rng.bool();

    if (isQuotient) {
      const numerator = String(a * d - b * c);
      const fx = frac(u, v);
      return {
        instruction: 'Differentiate',
        prompt: `f(x) = ${fx}`,
        note: "Give f'(x) in exact, fully simplified form.",
        answers: [answer(frac(numerator, power(paren(v), 2)), { keyboard: 'calculus' })],
        solution: [
          step(
            'quotient-rule',
            'Quotient rule',
            frac(`${a}${paren(v)} - ${c}${paren(u)}`, power(paren(v), 2)),
            "u'v − uv′ over v².",
          ),
          step('fraction-simplify', 'Simplify', frac(numerator, power(paren(v), 2)), 'The x terms in the numerator cancel.'),
        ],
        ruleIds: ['quotient-rule', 'fraction-simplify'],
        verify: { kind: 'derivative', of: fx, wrt: 'x' },
      };
    }

    const fx = `${paren(u)}${paren(v)}`;
    const expanded = poly([[2 * a * c, 1], [a * d + b * c, 0]]);
    return {
      instruction: 'Differentiate',
      prompt: `f(x) = ${fx}`,
      note: "Give f'(x) in exact, fully simplified form.",
      answers: [answer(expanded, { keyboard: 'calculus' })],
      solution: [
        step('product-rule', 'Product rule', `${a}${paren(v)} + ${c}${paren(u)}`, "u'v + uv′ — both terms, always."),
        tidy('Collect', expanded),
      ],
      ruleIds: ['product-rule'],
      verify: { kind: 'derivative', of: fx, wrt: 'x' },
    };
  },
};

/** `x^{p/q}` written the way the book writes it — as a root where that is shorter. */
function powerTex(p: number, q: number): string {
  const g = gcd(p, q) * (q < 0 ? -1 : 1);
  const [n, d] = [p / g, q / g];
  if (d === 1) return power('x', n);
  if (n === 1 && d === 2) return rootOf('x');
  if (n === 1 && d === 3) return '\\sqrt[3]{x}';
  if (n === 2 && d === 3) return '\\sqrt[3]{x^{2}}';
  return `x^{${fracTex(n, d)}}`;
}

/**
 * The power rule where the exponent is not a whole number — roots and
 * reciprocals. The book's own worked examples are all `x^{n}` with `n` a
 * positive integer, and the exam asks for `\sqrt{x}` and `1/x^{2}` instead;
 * the rule is the same one, but only once it has been rewritten as a power.
 */
export const rootsAndReciprocals: Generator = {
  id: 'diff.roots',
  chapter: 9,
  title: 'Differentiating roots and reciprocals',
  tags: ['power-rule', 'roots', 'differentiation'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const pool: Array<[number, number]> =
      tier === 'easy'
        ? [[1, 2], [-1, 1], [-2, 1]]
        : tier === 'medium'
          ? [[1, 2], [3, 2], [-1, 2], [-1, 1], [-2, 1], [1, 3]]
          : [[1, 2], [3, 2], [-1, 2], [-3, 2], [1, 3], [2, 3], [-2, 3], [-3, 1], [-1, 1]];

    const chosen: Array<[number, number]> = [];
    while (chosen.length < (tier === 'easy' ? 1 : 2)) {
      const pick = rng.pick(pool);
      if (!chosen.some(([p, q]) => p === pick[0] && q === pick[1])) chosen.push(pick);
    }
    const terms = chosen.map(([p, q]) => [rng.nonZero(-6, 8), p, q] as [number, number, number]);

    const fx = sum(terms.map(([c, p, q]) => times(String(c), powerTex(p, q))));
    const asPowers = sum(terms.map(([c, p, q]) => times(String(c), `x^{${fracTex(p, q)}}`)));
    const derivative = sum(
      terms.map(([c, p, q]) => times(fracTex(c * p, q), powerTex(p - q, q))),
    );

    return {
      instruction: 'Differentiate',
      prompt: `f(x) = ${fx}`,
      note: "Give f'(x) in exact, fully simplified form.",
      answers: [answer(derivative, { keyboard: 'calculus' })],
      solution: [
        setup(
          'fractional-exponent',
          'Everything as a power of x',
          `f(x) = ${asPowers}`,
          'A root is a fractional exponent and a reciprocal is a negative one. The power rule then applies unchanged.',
        ),
        step('power-rule', 'Power rule', derivative, 'Multiply by the exponent, then drop it by one.'),
      ],
      ruleIds: ['power-rule', 'fractional-exponent'],
      verify: { kind: 'derivative', of: fx, wrt: 'x' },
    };
  },
};

interface Nested {
  fx: string;
  /** f'(u) with the inner already substituted. */
  outerD: string;
  inner: string;
  innerD: string;
  derivative: string;
}

/**
 * A chain inside a chain, or a chain whose inner part needs a rule of its own.
 * This is the shape the exam actually asks — `e^{\sin 2x}`, not `(2x+1)^{3}`.
 */
export const nestedChain: Generator = {
  id: 'diff.nested-chain',
  chapter: 9,
  title: 'Chains inside chains',
  tags: ['chain-rule', 'differentiation'],
  version: 1,
  supports: ['hard'],
  invariant: 'value-preserving',

  generate({ rng }): Draft {
    const shapes: Array<() => Nested> = [
      () => {
        const a = rng.int(2, 4);
        const inner = `x^{${a}}`;
        const innerD = term(a, power('x', a - 1));
        return {
          fx: `e^{${inner}}`,
          outerD: `e^{${inner}}`,
          inner,
          innerD,
          derivative: times(innerD, `e^{${inner}}`),
        };
      },
      () => {
        const inner = `x^{2} + e^{x}`;
        const innerD = `2x + e^{x}`;
        return {
          fx: `\\ln\\left(${inner}\\right)`,
          outerD: frac('1', `\\left(${inner}\\right)`),
          inner,
          innerD,
          derivative: frac(innerD, inner),
        };
      },
      () => {
        // No coefficient on the exponential: `e^{4x}` at the far end of the
        // sample range is 22000, and nothing can check the derivative of a sine
        // oscillating that fast.
        const inner = 'x + e^{x}';
        const innerD = '1 + e^{x}';
        return {
          fx: `\\sin\\left(${inner}\\right)`,
          outerD: `\\cos\\left(${inner}\\right)`,
          inner,
          innerD,
          derivative: `\\left(${innerD}\\right)\\cos\\left(${inner}\\right)`,
        };
      },
      () => {
        const n = rng.int(2, 4);
        const inner = '\\sin x + \\cos x';
        const innerD = '\\cos x - \\sin x';
        return {
          fx: power(`\\left(${inner}\\right)`, n),
          outerD: `${n}${power(`\\left(${inner}\\right)`, n - 1)}`,
          inner,
          innerD,
          derivative: `${n}${power(`\\left(${inner}\\right)`, n - 1)}\\left(${innerD}\\right)`,
        };
      },
      () => {
        const a = rng.int(2, 4);
        const inner = `1 + \\sin\\left(${a}x\\right)`;
        const innerD = `${a}\\cos\\left(${a}x\\right)`;
        return {
          fx: rootOf(inner),
          outerD: frac('1', `2${rootOf(inner)}`),
          inner,
          innerD,
          derivative: frac(innerD, `2${rootOf(inner)}`),
        };
      },
      () => {
        const a = rng.int(2, 4);
        const inner = `\\sin\\left(${a}x\\right)`;
        const innerD = `${a}\\cos\\left(${a}x\\right)`;
        return {
          fx: `e^{${inner}}`,
          outerD: `e^{${inner}}`,
          inner,
          innerD,
          derivative: times(innerD, `e^{${inner}}`),
        };
      },
      () => {
        const inner = '2 + \\cos\\left(x^{2}\\right)';
        const innerD = '-2x\\sin\\left(x^{2}\\right)';
        return {
          fx: `\\ln\\left(${inner}\\right)`,
          outerD: frac('1', `\\left(${inner}\\right)`),
          inner,
          innerD,
          derivative: frac(innerD, inner),
        };
      },
      () => {
        const n = rng.int(2, 4);
        const inner = '\\ln x';
        return {
          fx: power(`\\left(${inner}\\right)`, n),
          outerD: `${n}${power(`\\left(${inner}\\right)`, n - 1)}`,
          inner,
          innerD: frac('1', 'x'),
          derivative: frac(`${n}${power(`\\left(${inner}\\right)`, n - 1)}`, 'x'),
        };
      },
    ];

    const s = rng.pick(shapes)();

    return {
      instruction: 'Differentiate',
      prompt: `f(x) = ${s.fx}`,
      note: "Give f'(x) in exact, fully simplified form.",
      answers: [answer(s.derivative, { keyboard: 'calculus' })],
      solution: [
        setup(
          'chain-rule',
          'Name the inside',
          `u = ${s.inner}`,
          'Whatever sits under the outer operation is the inside — and here differentiating it is a job of its own.',
        ),
        setup(
          'chain-rule',
          'Chain rule',
          `f'(x) = ${s.outerD} \\cdot \\frac{d}{dx}\\left(${s.inner}\\right)`,
        ),
        step('standard-derivatives', 'Inner derivative', s.derivative, `The inside differentiates to $${s.innerD}$.`),
      ],
      ruleIds: ['chain-rule', 'standard-derivatives'],
      verify: { kind: 'derivative', of: s.fx, wrt: 'x' },
    };
  },
};

interface Pair {
  u: string;
  v: string;
  du: string;
  dv: string;
  quotient: boolean;
  /** The rule applied but not yet tidied, where tidying is a step of its own. */
  raw?: string;
  simplified: string;
}

/**
 * The product and quotient rules with something other than two linear factors.
 * `(2x+1)(3x-4)` can be multiplied out and never needs the rule at all; these
 * cannot, which is the whole reason the rule exists.
 */
function hardPair(rng: Rng): Draft {
  const shapes: Array<() => Pair> = [
    () => {
      const a = rng.int(2, 4);
      return {
        u: 'x',
        v: `\\sin\\left(${a}x\\right)`,
        du: '1',
        dv: `${a}\\cos\\left(${a}x\\right)`,
        quotient: false,
        simplified: `\\sin\\left(${a}x\\right) + ${a}x\\cos\\left(${a}x\\right)`,
      };
    },
    () => {
      const a = rng.int(2, 3);
      return {
        u: 'x^{2}',
        v: `e^{${a}x}`,
        du: '2x',
        dv: `${a}e^{${a}x}`,
        quotient: false,
        raw: `2xe^{${a}x} + ${a}x^{2}e^{${a}x}`,
        simplified: `x\\left(2 + ${a}x\\right)e^{${a}x}`,
      };
    },
    () => ({
      u: 'x^{2}',
      v: '\\ln x',
      du: '2x',
      dv: frac('1', 'x'),
      quotient: false,
      raw: `2x\\ln x + x^{2} \\cdot ${frac('1', 'x')}`,
      simplified: 'x\\left(2\\ln x + 1\\right)',
    }),
    () => ({
      u: 'e^{x}',
      v: '\\cos x',
      du: 'e^{x}',
      dv: '-\\sin x',
      quotient: false,
      raw: 'e^{x}\\cos x - e^{x}\\sin x',
      simplified: 'e^{x}\\left(\\cos x - \\sin x\\right)',
    }),
    () => {
      const c = rng.int(1, 5);
      return {
        u: `x^{2} - ${c}`,
        v: `x^{2} + ${c}`,
        du: '2x',
        dv: '2x',
        quotient: true,
        raw: frac(
          `2x\\left(x^{2} + ${c}\\right) - \\left(x^{2} - ${c}\\right)2x`,
          `\\left(x^{2} + ${c}\\right)^{2}`,
        ),
        simplified: frac(`${4 * c}x`, `\\left(x^{2} + ${c}\\right)^{2}`),
      };
    },
    () => ({
      u: '\\sin x',
      v: 'x',
      du: '\\cos x',
      dv: '1',
      quotient: true,
      simplified: frac('x\\cos x - \\sin x', 'x^{2}'),
    }),
    () => ({
      u: '\\ln x',
      v: 'x',
      du: frac('1', 'x'),
      dv: '1',
      quotient: true,
      raw: frac(`${frac('1', 'x')} \\cdot x - \\ln x`, 'x^{2}'),
      simplified: frac('1 - \\ln x', 'x^{2}'),
    }),
    () => ({
      u: 'e^{x}',
      v: 'x^{2} + 1',
      du: 'e^{x}',
      dv: '2x',
      quotient: true,
      raw: frac('e^{x}\\left(x^{2} + 1\\right) - e^{x} \\cdot 2x', '\\left(x^{2} + 1\\right)^{2}'),
      simplified: frac('e^{x}\\left(x - 1\\right)^{2}', '\\left(x^{2} + 1\\right)^{2}'),
    }),
  ];

  const s = rng.pick(shapes)();
  const fx = s.quotient ? frac(s.u, `\\left(${s.v}\\right)`) : `${paren(s.u)}${paren(s.v)}`;
  const ruleId = s.quotient ? 'quotient-rule' : 'product-rule';

  const applied = s.quotient
    ? frac(
        `\\left(${s.du}\\right)\\left(${s.v}\\right) - \\left(${s.u}\\right)\\left(${s.dv}\\right)`,
        `\\left(${s.v}\\right)^{2}`,
      )
    : `\\left(${s.du}\\right)\\left(${s.v}\\right) + \\left(${s.u}\\right)\\left(${s.dv}\\right)`;

  return {
    instruction: 'Differentiate',
    prompt: `f(x) = ${fx}`,
    note: "Give f'(x) in exact, fully simplified form.",
    answers: [answer(s.simplified, { keyboard: 'calculus' })],
    solution: [
      setup(
        ruleId,
        'Name the two parts',
        `u = ${s.u},\\quad v = ${s.v},\\quad u' = ${s.du},\\quad v' = ${s.dv}`,
      ),
      step(
        ruleId,
        s.quotient ? 'Quotient rule' : 'Product rule',
        applied,
        s.quotient ? "u'v − uv′ over v²." : "u'v + uv′ — both terms, always.",
      ),
      ...(s.raw ? [step(ruleId, 'Multiply out', s.raw)] : []),
      tidy('Take out the common factor', s.simplified),
    ],
    ruleIds: [ruleId, 'standard-derivatives'],
    verify: { kind: 'derivative', of: fx, wrt: 'x' },
  };
}

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
    // f, f' and the point, all chosen so f(p) and f'(p) come out whole.
    const shape = (): { fx: string; dfx: string; p: number; pTex: string; y0: number; m: number } => {
      if (tier === 'easy') {
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
      if (tier === 'medium') {
        const kind = rng.pick(['cubic', 'root']);
        if (kind === 'cubic') {
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
        // √x at a perfect square, so both the height and the slope are rational.
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
      const kind = rng.pick(['exp', 'xln', 'ln']);
      const k = rng.nonZero(-4, 5);
      if (kind === 'exp') {
        const a = rng.int(1, 3);
        // At x = 0 every e^{ax} is 1, which is what keeps the numbers exact.
        return { fx: times(String(k), `e^{${a}x}`), dfx: times(String(k * a), `e^{${a}x}`), p: 0, pTex: '0', y0: k, m: k * a };
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
    };

    const { fx, dfx, p, pTex, y0, m } = shape();
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
      verify: { kind: 'identity', of: `${m}\\left(x - ${pTex}\\right) + ${y0}` },
    };
  },
};

/**
 * Where the derivative is zero, and what that point is. Optimisation questions
 * are most of what the exam does with a derivative.
 */
export const stationaryPoint: Generator = {
  id: 'diff.stationary',
  chapter: 9,
  title: 'Maxima and minima',
  tags: ['optimisation', 'differentiation'],
  version: 1,
  supports: TIERS,
  invariant: 'solution-set-preserving',

  generate({ tier, rng }): Draft {
    const shape = (): { fx: string; dfx: string; equation: string; x: string; kind: string; note?: string } => {
      if (tier === 'easy') {
        const a = rng.int(1, 4);
        const b = rng.nonZero(-9, 9);
        const c = rng.nonZero(-8, 8);
        return {
          fx: poly([[a, 2], [b, 1], [c, 0]]),
          dfx: poly([[2 * a, 1], [b, 0]]),
          equation: `${poly([[2 * a, 1], [b, 0]])} = 0`,
          x: fracTex(-b, 2 * a),
          kind: 'minimum',
        };
      }
      if (tier === 'medium') {
        const kind = rng.pick(['cubic', 'reciprocal']);
        if (kind === 'cubic') {
          const a = rng.int(1, 4);
          return {
            fx: poly([[1, 3], [-3 * a * a, 1]]),
            dfx: poly([[3, 2], [-3 * a * a, 0]]),
            equation: `${poly([[3, 2], [-3 * a * a, 0]])} = 0`,
            x: String(a),
            kind: 'local minimum',
            note: 'There are two stationary points. Give the one that is a minimum.',
          };
        }
        const q = rng.int(2, 6);
        return {
          fx: `x + ${frac(String(q * q), 'x')}`,
          dfx: `1 - ${frac(String(q * q), 'x^{2}')}`,
          equation: `1 - ${frac(String(q * q), 'x^{2}')} = 0`,
          x: String(q),
          kind: 'minimum',
          note: 'x is positive.',
        };
      }
      const kind = rng.pick(['xexp', 'lnquotient']);
      if (kind === 'xexp') {
        const n = rng.int(1, 3);
        return {
          fx: `${power('x', n)}e^{-x}`,
          dfx: `\\left(${term(n, power('x', n - 1))} - ${power('x', n)}\\right)e^{-x}`,
          equation: `\\left(${term(n, power('x', n - 1))} - ${power('x', n)}\\right)e^{-x} = 0`,
          x: String(n),
          kind: 'maximum',
          note: 'x is positive.',
        };
      }
      return {
        fx: frac('\\ln x', 'x'),
        dfx: frac('1 - \\ln x', 'x^{2}'),
        equation: `${frac('1 - \\ln x', 'x^{2}')} = 0`,
        x: 'e',
        kind: 'maximum',
      };
    };

    const s = shape();

    return {
      instruction: `Find the x-coordinate of the ${s.kind} of f`,
      prompt: `f(x) = ${s.fx}`,
      note: s.note ? `${s.note} Give the exact value.` : 'Give the exact value.',
      answers: [answer(s.x, { keyboard: 'calculus' })],
      solution: [
        aside('Differentiate', `f'(x) = ${s.dfx}`),
        step('stationary-point', 'Set the derivative to zero', s.equation),
        tidy('Solve', `x = ${s.x}`),
      ],
      ruleIds: ['stationary-point', 'standard-derivatives'],
      verify: { kind: 'root', equation: s.equation, wrt: 'x' },
    };
  },
};

/*
 * The four below come from the course's own assignments rather than the
 * practice book. The book teaches the rules; the assignments ask where the
 * rules came from (the difference quotient), what happens when you apply one
 * repeatedly (higher derivatives), what to do when the rules do not reach
 * (logarithmic differentiation), and how a derivative gets used as a slope.
 */

/** The derivative from its definition, not from the rules. */
export const fromDefinition: Generator = {
  id: 'diff.from-definition',
  chapter: 9,
  title: 'Differentiate from the definition',
  tags: ['definition', 'limits', 'differentiation'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const a = rng.nonZero(-4, 4);

    if (tier === 'easy') {
      // A quadratic: the h² term is the whole lesson — it survives the division
      // and then dies in the limit, which is what a derivative *is*.
      const [p, q] = [rng.nonZero(-4, 4), rng.nonZero(-6, 6)];
      const fx = poly([[p, 2], [q, 1]]);
      const value = 2 * p * a + q;
      const quotient = frac(
        `${term(p, `\\left(${a} + h\\right)^{2}`)} + ${term(q, `\\left(${a} + h\\right)`)} - \\left(${p * a * a + q * a}\\right)`,
        'h',
      );
      return {
        instruction: `Use the definition to find f'(${a})`,
        prompt: `f(x) = ${fx}`,
        promptText: `Use $f'(a) = \\lim_{h\\to 0}\\frac{f(a+h)-f(a)}{h}$, not the power rule.`,
        note: 'A number, not a function.',
        answers: [answer(String(value), { keyboard: 'calculus', kind: 'number' })],
        solution: [
          setup('derivative-definition', 'Write the difference quotient', quotient),
          setup(
            'derivative-definition',
            'Expand the top',
            frac(`${term(2 * p * a + q, 'h')} + ${term(p, 'h^{2}')}`, 'h'),
            `f(${a}) = ${p * a * a + q * a} cancels every term without an h in it — it has to, or the quotient would blow up.`,
          ),
          setup(
            'derivative-definition',
            'Divide by h',
            `${2 * p * a + q} + ${term(p, 'h')}`,
            'Legal because h is never actually 0 — it only goes there.',
          ),
          step('derivative-definition', 'Now let h go to 0', String(value)),
        ],
        ruleIds: ['derivative-definition', 'power-rule'],
        verify: { kind: 'limit', of: quotient, wrt: 'h', at: 0 },
      };
    }

    if (tier === 'medium') {
      // 1/(x + c): the subtraction has to be put over a common denominator
      // before anything cancels.
      const c = rng.int(1, 5);
      const at = rng.int(1, 4);
      const fx = frac('1', `x + ${c}`);
      const d = at + c;
      const value = fracTex(-1, d * d);
      const quotient = frac(`${frac('1', `${at} + h + ${c}`)} - ${fracTex(1, d)}`, 'h');
      return {
        instruction: `Use the definition to find f'(${at})`,
        prompt: `f(x) = ${fx}`,
        promptText: `Use $f'(a) = \\lim_{h\\to 0}\\frac{f(a+h)-f(a)}{h}$, not the quotient rule.`,
        note: 'Exact value.',
        answers: [answer(value, { keyboard: 'calculus', kind: 'number' })],
        solution: [
          setup('derivative-definition', 'Write the difference quotient', quotient),
          setup(
            'derivative-definition',
            'Combine the top over one bar',
            frac(frac(`-h`, `${d}\\left(${d} + h\\right)`), 'h'),
            `${d} - (${d} + h) = -h, and there is the factor of h that lets the division happen.`,
          ),
          setup(
            'derivative-definition',
            'Cancel the h',
            frac('-1', `${d}\\left(${d} + h\\right)`),
          ),
          step('derivative-definition', 'And let h go to 0', value),
        ],
        ruleIds: ['derivative-definition', 'quotient-rule'],
        verify: { kind: 'limit', of: quotient, wrt: 'h', at: 0 },
      };
    }

    // A general point on a linear-over-linear: the answer is a function of a.
    const [p, q, r, s] = [rng.int(2, 6), rng.nonZero(-8, 8), rng.int(2, 5), rng.nonZero(-6, 6)];
    const fx = frac(poly([[p, 1], [q, 0]]), poly([[r, 1], [s, 0]]));
    const det = p * s - q * r;
    const derivative = frac(String(det), `\\left(${poly([[r, 1], [s, 0]])}\\right)^{2}`);

    return {
      instruction: "Use the definition to find f'(x)",
      prompt: `f(x) = ${fx}`,
      promptText: `Use $f'(x) = \\lim_{h\\to 0}\\frac{f(x+h)-f(x)}{h}$. The answer holds at every x where f is defined.`,
      note: 'Exact, simplified.',
      answers: [answer(derivative, { keyboard: 'calculus' })],
      solution: [
        setup(
          'derivative-definition',
          'Put the two fractions over one bar',
          frac(
            frac(
              `\\left(${poly([[p, 1], [q, 0]]).replace(/x/g, '(x+h)')}\\right)\\left(${poly([[r, 1], [s, 0]])}\\right) - \\left(${poly([[p, 1], [q, 0]])}\\right)\\left(${poly([[r, 1], [s, 0]]).replace(/x/g, '(x+h)')}\\right)`,
              `\\left(${poly([[r, 1], [s, 0]]).replace(/x/g, '(x+h)')}\\right)\\left(${poly([[r, 1], [s, 0]])}\\right)`,
            ),
            'h',
          ),
          'Everything hangs on the top collapsing — and it does.',
        ),
        aside(
          'The top, multiplied out',
          `${det}h`,
          `Every term with an x in it cancels; what is left is $\\left(${p}\\cdot${s} - ${q}\\cdot${r}\\right)h = ${det}h$.`,
        ),
        setup(
          'derivative-definition',
          'Cancel the h and let it go to 0',
          derivative,
          'Both brackets in the bottom become the same one.',
        ),
      ],
      ruleIds: ['derivative-definition', 'quotient-rule'],
      verify: { kind: 'derivative', of: fx, wrt: 'x' },
    };
  },
};

/** Differentiate n times, by spotting the pattern rather than grinding. */
export const higherDerivatives: Generator = {
  id: 'diff.higher-order',
  chapter: 9,
  title: 'The nth derivative',
  tags: ['higher-derivatives', 'differentiation'],
  version: 1,
  supports: ['medium', 'hard'] as const,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    /*
     * `verify` can only check one differentiation, so it is pointed at the last
     * one: `of` is the (n-1)th derivative that the same closed form produces and
     * the answer is the nth. The pattern is what is being taught, and this
     * checks that the pattern's own successive terms really are derivatives of
     * one another — the induction step, which is the only part that can be wrong.
     */
    const a = rng.int(2, 3);
    const useSin = rng.bool();

    if (tier === 'medium') {
      const n = rng.int(3, 6);
      // sin and cos come back to themselves every four derivatives, picking up
      // a factor of a each time.
      const cycle = (k: number): string => {
        const base = ['\\sin', '\\cos', '-\\sin', '-\\cos'][(k + (useSin ? 0 : 1)) % 4]!;
        const coefficient = a ** k;
        const arg = `\\left(${term(a, 'x')}\\right)`;
        return base.startsWith('-')
          ? `${term(-coefficient, `${base.slice(1)}${arg}`)}`
          : `${term(coefficient, `${base}${arg}`)}`;
      };
      return {
        instruction: `Find the ${ordinal(n)} derivative`,
        prompt: `f(x) = \\${useSin ? 'sin' : 'cos'}\\left(${term(a, 'x')}\\right)`,
        note: `Give $f^{(${n})}(x)$. Differentiating four times gets you back where you started.`,
        answers: [answer(cycle(n), { keyboard: 'trig' })],
        solution: [
          aside(
            'The first few',
            `f' = ${cycle(1)},\\quad f'' = ${cycle(2)},\\quad f''' = ${cycle(3)}`,
            `Each one picks up another factor of ${a} from the chain rule and moves one place round the cycle sin → cos → -sin → -cos.`,
          ),
          aside(
            'So the pattern is',
            `f^{(k)}(x) = ${a}^{k}\\cdot\\left(\\text{the } k \\text{th entry of the cycle}\\right)`,
            `$${n} \\bmod 4 = ${n % 4}$, which is the entry to use.`,
          ),
          step('higher-derivatives', `The ${ordinal(n)}`, cycle(n)),
        ],
        ruleIds: ['higher-derivatives', 'chain-rule', 'standard-derivatives'],
        verify: { kind: 'derivative', of: cycle(n - 1), wrt: 'x' },
      };
    }

    // 1/(x + c): every derivative flips a sign and adds a factorial.
    const c = rng.int(1, 5);
    const n = rng.int(2, 4);
    const factorial = (k: number): number => (k <= 1 ? 1 : k * factorial(k - 1));
    const nth = (k: number): string =>
      k === 0
        ? frac('1', `x + ${c}`)
        : frac(String((k % 2 === 0 ? 1 : -1) * factorial(k)), `\\left(x + ${c}\\right)^{${k + 1}}`);

    return {
      instruction: `Find the ${ordinal(n)} derivative`,
      prompt: `f(x) = ${frac('1', `x + ${c}`)}`,
      note: `Give $f^{(${n})}(x)$.`,
      answers: [answer(nth(n), { keyboard: 'calculus' })],
      solution: [
        aside(
          'Write it as a power first',
          `f(x) = \\left(x + ${c}\\right)^{-1}`,
          'The power rule handles negative exponents perfectly well; the fraction bar is what hides that.',
        ),
        aside('The first two', `f' = ${nth(1)},\\quad f'' = ${nth(2)}`),
        aside(
          'The pattern',
          `f^{(k)}(x) = \\frac{\\left(-1\\right)^{k}k!}{\\left(x + ${c}\\right)^{k+1}}`,
          'Each step drops the exponent by one, which supplies the next factor of the factorial and one more minus sign.',
        ),
        step('higher-derivatives', `The ${ordinal(n)}`, nth(n)),
      ],
      ruleIds: ['higher-derivatives', 'power-rule', 'chain-rule'],
      verify: { kind: 'derivative', of: nth(n - 1), wrt: 'x' },
    };
  },
};

/** Take logs first, because the exponent has an x in it. */
export const logarithmicDifferentiation: Generator = {
  id: 'diff.logarithmic',
  chapter: 9,
  title: 'Logarithmic differentiation',
  tags: ['logarithmic-differentiation', 'differentiation'],
  version: 1,
  supports: ['medium', 'hard'] as const,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    /*
     * The power rule wants a constant exponent and the exponential rule wants a
     * constant base. `x^{x}` has neither, so neither applies — and no amount of
     * staring makes one of them fit. Taking the log turns the exponent into a
     * factor, which both rules can reach.
     */
    interface Shape {
      fx: string;
      logged: string;
      differentiated: string;
      /** ln f, differentiated — the right-hand side of (ln f)' = f'/f. */
      quotient: string;
      derivative: string;
    }

    const shapes: Shape[] = [
      {
        fx: 'x^{x}',
        logged: 'x\\ln x',
        differentiated: '\\ln x + 1',
        quotient: '\\ln x + 1',
        derivative: 'x^{x}\\left(\\ln x + 1\\right)',
      },
      {
        fx: 'x^{\\ln x}',
        logged: '\\left(\\ln x\\right)^{2}',
        differentiated: frac('2\\ln x', 'x'),
        quotient: frac('2\\ln x', 'x'),
        derivative: frac(`2x^{\\ln x}\\ln x`, 'x'),
      },
      {
        fx: '\\left(\\sin x\\right)^{x}',
        logged: 'x\\ln\\left(\\sin x\\right)',
        differentiated: `\\ln\\left(\\sin x\\right) + ${frac('x\\cos x', '\\sin x')}`,
        quotient: `\\ln\\left(\\sin x\\right) + ${frac('x\\cos x', '\\sin x')}`,
        derivative: `\\left(\\sin x\\right)^{x}\\left(\\ln\\left(\\sin x\\right) + ${frac('x\\cos x', '\\sin x')}\\right)`,
      },
    ];

    const hard: Shape[] = [
      {
        fx: 'x^{\\sqrt{x}}',
        logged: '\\sqrt{x}\\ln x',
        differentiated: `${frac('\\ln x', `2\\sqrt{x}`)} + ${frac('1', '\\sqrt{x}')}`,
        quotient: `${frac('\\ln x', `2\\sqrt{x}`)} + ${frac('1', '\\sqrt{x}')}`,
        derivative: `x^{\\sqrt{x}}\\left(${frac('\\ln x', `2\\sqrt{x}`)} + ${frac('1', '\\sqrt{x}')}\\right)`,
      },
      {
        fx: 'x^{e^{x}}',
        logged: 'e^{x}\\ln x',
        differentiated: `e^{x}\\ln x + ${frac('e^{x}', 'x')}`,
        quotient: `e^{x}\\ln x + ${frac('e^{x}', 'x')}`,
        derivative: `x^{e^{x}}\\left(e^{x}\\ln x + ${frac('e^{x}', 'x')}\\right)`,
      },
    ];

    const s = rng.pick(tier === 'hard' ? hard : shapes);

    return {
      instruction: 'Differentiate using logarithmic differentiation',
      prompt: `f(x) = ${s.fx}`,
      note: 'x is positive. Leave the answer as f(x) times a bracket.',
      answers: [answer(s.derivative, { keyboard: 'calculus' })],
      solution: [
        setup(
          'logarithmic-differentiation',
          'Take the log of both sides',
          `\\ln f(x) = ${s.logged}`,
          'Neither the power rule nor the exponential rule applies while the x is in both places — the log pulls it down into a product.',
        ),
        setup(
          'logarithmic-differentiation',
          'Differentiate both sides',
          `${frac(`f'(x)`, 'f(x)')} = ${s.differentiated}`,
          'The left side is a chain rule: the derivative of ln f is f′/f.',
        ),
        step(
          'logarithmic-differentiation',
          'Multiply back by f(x)',
          s.derivative,
          'And f(x) is what the question already gave you, so nothing is left implicit.',
        ),
      ],
      ruleIds: ['logarithmic-differentiation', 'log-laws', 'chain-rule', 'product-rule'],
      verify: { kind: 'derivative', of: s.fx, wrt: 'x' },
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
    const fx = `${term(a, `\\left(x${-shift < 0 ? ` - ${shift}` : ` + ${-shift}`}\\right)^{2}`)} ${b < 0 ? '-' : '+'} ${Math.abs(b)}\\left(x${-shift < 0 ? ` - ${shift}` : ` + ${-shift}`}\\right)`;

    // The given line's slope, and the slope the tangent must have.
    const perpendicular = tier === 'hard';
    const lineSlope = perpendicular ? rng.pick([-3, -2, 2, 3]) : rng.nonZero(-4, 4);
    const wanted = perpendicular ? -1 / lineSlope : lineSlope;
    // 2a(x − shift) + b = wanted, so x = shift + (wanted − b)/(2a).
    const numerator = perpendicular ? -(1 + b * lineSlope) : wanted - b;
    const denominator = perpendicular ? 2 * a * lineSlope : 2 * a;
    const root = `${shift} + ${frac(String(numerator), String(denominator))}`;
    const derivative = `${term(2 * a, `\\left(x${-shift < 0 ? ` - ${shift}` : ` + ${-shift}`}\\right)`)} ${b < 0 ? '-' : '+'} ${Math.abs(b)}`;
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
