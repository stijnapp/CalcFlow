import { TIERS, type Tier } from '@calcflow/shared';
import {
  answer,
  aside,
  frac,
  fracTex,
  poly,
  setup,
  step,
  term,
} from '../authoring.js';
import type { Draft, Generator, Rng } from '../types.js';

/*
 * From the course's own assignments rather than the practice book. The book
 * teaches the rules; the assignments also ask where the rules came from.
 */

/**
 * A quadratic at a point: the h² term is the whole lesson — it survives the
 * division and then dies in the limit, which is what a derivative *is*.
 */
function quadraticAtPoint(rng: Rng): Draft {
  const a = rng.nonZero(-4, 4);
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

/**
 * 1/(x + c) at a point: the subtraction has to be put over a common
 * denominator before anything cancels.
 */
function reciprocalAtPoint(rng: Rng): Draft {
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
      setup('derivative-definition', 'Cancel the h', frac('-1', `${d}\\left(${d} + h\\right)`)),
      step('derivative-definition', 'And let h go to 0', value),
    ],
    ruleIds: ['derivative-definition', 'quotient-rule'],
    verify: { kind: 'limit', of: quotient, wrt: 'h', at: 0 },
  };
}

/** A general point on a linear-over-linear: the answer is a function of x. */
function linearOverLinear(rng: Rng): Draft {
  const [p, q, r, s] = [rng.int(2, 6), rng.nonZero(-8, 8), rng.int(2, 5), rng.nonZero(-6, 6)];
  const top = (v: string) => `\\left(${poly([[p, 1], [q, 0]], v)}\\right)`;
  const bottom = (v: string) => `\\left(${poly([[r, 1], [s, 0]], v)}\\right)`;
  const fx = frac(poly([[p, 1], [q, 0]]), poly([[r, 1], [s, 0]]));
  const det = p * s - q * r;
  const derivative = frac(String(det), `${bottom('x')}^{2}`);
  const shifted = '(x+h)';

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
            `${top(shifted)}${bottom('x')} - ${top('x')}${bottom(shifted)}`,
            `${bottom(shifted)}${bottom('x')}`,
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
}

const BY_TIER: Record<Tier, (rng: Rng) => Draft> = {
  easy: quadraticAtPoint,
  medium: reciprocalAtPoint,
  hard: linearOverLinear,
};

/** The derivative from its definition, not from the rules. */
export const fromDefinition: Generator = {
  id: 'diff.from-definition',
  chapter: 9,
  title: 'Differentiate from the definition',
  tags: ['definition', 'limits', 'differentiation'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate: ({ tier, rng }) => BY_TIER[tier](rng),
};
