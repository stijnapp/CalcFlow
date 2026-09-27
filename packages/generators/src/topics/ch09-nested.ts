import {
  answer,
  frac,
  power,
  rootOf,
  setup,
  step,
  term,
  times,
} from '../authoring.js';
import type { Draft, Generator, Rng } from '../types.js';

interface Nested {
  fx: string;
  /** f'(u) with the inner already substituted. */
  outerD: string;
  inner: string;
  innerD: string;
  derivative: string;
}

/** An outer function round an inside that needs a rule of its own. */
const NESTED: Array<(rng: Rng) => Nested> = [
  (rng) => {
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
  (rng) => {
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
  (rng) => {
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
  (rng) => {
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
  (rng) => {
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
    const s = rng.pick(NESTED)(rng);

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
