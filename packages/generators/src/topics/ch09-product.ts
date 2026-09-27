import { TIERS } from '@calcflow/shared';
import {
  answer,
  frac,
  paren,
  poly,
  power,
  setup,
  step,
  tidy,
} from '../authoring.js';
import type { Draft, Generator, Rng } from '../types.js';

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

/** Two factors the rule cannot be dodged on, and what they come to. */
const PAIRS: Array<(rng: Rng) => Pair> = [
  (rng) => {
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
  (rng) => {
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
  (rng) => {
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

/**
 * The product and quotient rules with something other than two linear factors.
 * `(2x+1)(3x-4)` can be multiplied out and never needs the rule at all; these
 * cannot, which is the whole reason the rule exists.
 */
function hardPair(rng: Rng): Draft {
  const s = rng.pick(PAIRS)(rng);
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
