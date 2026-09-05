import { answer, frac, gcd, paren, poly, power, rootOf, step, term, times } from '../authoring.js';
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
 *  2. It declares `supports`, the region of the (steps × difficulty) grid it can
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
  supports: { steps: [2, 5], difficulty: [1, 5] },
  invariant: 'value-preserving',

  generate({ difficulty, rng }: GenContext): Draft {
    const outer = pickOuter(difficulty, rng);
    const inner = pickInner(difficulty, rng, outer.needsPositive);
    const built = outer.wrap(inner.tex);
    const derivative = outer.derivative(inner);

    // The setup line still carries an unapplied d/dx, so it is display-only.
    const setup = step(
      'chain-rule',
      'Chain rule',
      `f'(x) = ${outer.outerDerivative.replace(/§/g, inner.tex)} \\cdot \\frac{d}{dx}${paren(inner.tex)}`,
      'The inside stays untouched in the first factor — only the second one differentiates.',
    );
    setup.display = true;

    const solution = [
      setup,
      step(
        'standard-derivatives',
        'Inner derivative',
        derivative,
        `The inside differentiates to ${inner.dTex}.`,
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
      ruleIds: ['chain-rule', outer.ruleId],
      verify: { kind: 'derivative', of: built, wrt: 'x' },
    };
  },
};

function pickInner(difficulty: number, rng: Rng, positiveOnly: boolean): Inner {
  const kinds = difficulty >= 4 ? ['root', 'quadratic'] : difficulty === 3 ? ['quadratic', 'linear'] : ['linear'];
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

function pickOuter(difficulty: number, rng: Rng): Outer {
  const pool: Outer[] = [];
  const n = rng.int(2, difficulty >= 4 ? 6 : 4);

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

  if (difficulty >= 2) {
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
  if (difficulty >= 3) {
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
  supports: { steps: [1, 4], difficulty: [1, 4] },
  invariant: 'value-preserving',

  generate({ steps, difficulty, rng }): Draft {
    const count = Math.min(1 + Math.floor(steps / 2), 3);
    const exponents = new Set<number>();
    while (exponents.size < count) {
      exponents.add(difficulty >= 3 ? rng.pick([-2, -1, 2, 3, 4]) : rng.int(1, 4));
    }
    const pairs = [...exponents]
      .sort((a, b) => b - a)
      .map((p) => [rng.nonZero(-6, 8), p] as [number, number]);
    if (difficulty >= 2) pairs.push([rng.nonZero(-9, 9), 0]);

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
  supports: { steps: [3, 5], difficulty: [2, 5] },
  invariant: 'value-preserving',

  generate({ difficulty, rng }): Draft {
    const a = rng.int(1, 4);
    const b = rng.nonZero(-6, 6);
    const c = rng.int(1, 4);
    const d = rng.nonZero(-6, 6);
    const u = poly([[a, 1], [b, 0]]);
    const v = poly([[c, 1], [d, 0]]);
    const isQuotient = difficulty >= 3 && rng.bool();

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
        ruleIds: ['quotient-rule'],
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
        step('fraction-simplify', 'Collect', expanded),
      ],
      ruleIds: ['product-rule'],
      verify: { kind: 'derivative', of: fx, wrt: 'x' },
    };
  },
};
