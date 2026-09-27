import { answer, frac, gcd, poly, setup, step, sum, term } from '../authoring.js';
import type { Draft, Generator, Latex, Rng } from '../types.js';

/*
 * Take logs first. The power rule wants a constant exponent and the exponential
 * rule wants a constant base; `x^{x}` has neither, and taking the log turns the
 * exponent into a factor both rules can reach. The exams also use it on a pile
 * of factors — x³∛(3x + 1) over e^{2x}cos x — where the log turns a quotient of
 * products into a sum, one easy term per factor.
 */

interface Shape {
  fx: Latex;
  logged: Latex;
  /** ln f, differentiated — the right-hand side of (ln f)' = f'/f. */
  differentiated: Latex;
  derivative: Latex;
}

/** f, ln f and (ln f)', with the derivative as f times that bracket. */
function shape(fx: Latex, logged: Latex, differentiated: Latex): Shape {
  return { fx, logged, differentiated, derivative: `${fx}\\left(${differentiated}\\right)` };
}

const VARIABLE_EXPONENT: Shape[] = [
  shape('x^{x}', 'x\\ln x', '\\ln x + 1'),
  shape('x^{\\ln x}', '\\left(\\ln x\\right)^{2}', frac('2\\ln x', 'x')),
  shape('\\left(\\sin x\\right)^{x}', 'x\\ln\\left(\\sin x\\right)', `\\ln\\left(\\sin x\\right) + ${frac('x\\cos x', '\\sin x')}`),
];

const HARD_EXPONENT: Shape[] = [
  shape('x^{\\sqrt{x}}', '\\sqrt{x}\\ln x', `${frac('\\ln x', '2\\sqrt{x}')} + ${frac('1', '\\sqrt{x}')}`),
  shape('x^{e^{x}}', 'e^{x}\\ln x', `e^{x}\\ln x + ${frac('e^{x}', 'x')}`),
];

/** One factor of a product: itself, its logarithm, and that logarithm's derivative. */
interface Factor {
  tex: Latex;
  log: Latex;
  dlog: Latex;
  /** The logarithm's derivative comes with a minus sign of its own. */
  negative?: true;
}

/** The nth root of ax + b: ln is (1/n)ln(ax + b), and its derivative a/(n(ax + b)). */
function root(rng: Rng, n: number): Factor {
  const a = rng.int(1, 3);
  // 1 to 4, with nothing in common with a: √(2x + 1), never √(2x + 2).
  const b = rng.pick([1, 2, 3, 4].filter((v) => gcd(a, v) === 1));
  const inner = poly([[a, 1], [b, 0]]);
  const g = gcd(a, n);
  return {
    tex: n === 2 ? `\\sqrt{${inner}}` : `\\sqrt[${n}]{${inner}}`,
    log: `${frac('1', String(n))}\\ln\\left(${inner}\\right)`,
    dlog: frac(String(a / g), n === g ? inner : `${n / g}\\left(${inner}\\right)`),
  };
}

/** In the order they are written in a product: x³e^{2x}(x² + 1)²√(x + 1). */
const ALGEBRAIC: ((rng: Rng) => Factor)[] = [
  (rng) => {
    const n = rng.int(2, 4);
    return { tex: `x^{${n}}`, log: `${n}\\ln x`, dlog: frac(String(n), 'x') };
  },
  (rng) => {
    const k = rng.int(1, 3);
    return { tex: `e^{${term(k, 'x')}}`, log: term(k, 'x'), dlog: String(k) };
  },
  (rng) => {
    const m = rng.int(2, 3);
    return {
      tex: `\\left(x^{2} + 1\\right)^{${m}}`,
      log: `${m}\\ln\\left(x^{2} + 1\\right)`,
      dlog: frac(`${2 * m}x`, 'x^{2} + 1'),
    };
  },
  (rng) => root(rng, 2),
  (rng) => root(rng, 3),
];

/** Last in its product, so nothing after it reads as part of its argument. */
const TRIG: Factor[] = [
  { tex: '\\cos x', log: '\\ln\\left(\\cos x\\right)', dlog: '\\tan x', negative: true },
  { tex: '\\sin x', log: '\\ln\\left(\\sin x\\right)', dlog: frac('\\cos x', '\\sin x') },
];

/** f's own sign times where it sits: + on top, − underneath. */
const signed = (f: Factor, below: boolean): Latex => (below !== Boolean(f.negative) ? `-${f.dlog}` : f.dlog);

/**
 * Distinct algebraic factors split between top and bottom, and a trig one last
 * underneath. Each product keeps the table's order, so xⁿ leads.
 */
function factored(rng: Rng, onTop: number, below: number): Shape {
  const unused = ALGEBRAIC.map((_, i) => i);
  const picked = Array.from(
    { length: onTop + below - 1 },
    () => unused.splice(rng.int(0, unused.length - 1), 1)[0]!,
  );
  const make = (group: number[]) => group.sort((a, b) => a - b).map((i) => ALGEBRAIC[i]!(rng));
  const top = make(picked.slice(0, onTop));
  const bottom = [...make(picked.slice(onTop)), rng.pick(TRIG)];

  return shape(
    frac(top.map((f) => f.tex).join(''), bottom.map((f) => f.tex).join('')),
    sum([...top.map((f) => f.log), ...bottom.map((f) => `-${f.log}`)]),
    sum([...top.map((f) => signed(f, false)), ...bottom.map((f) => signed(f, true))]),
  );
}

export const logarithmicDifferentiation: Generator = {
  id: 'diff.logarithmic',
  chapter: 9,
  title: 'Logarithmic differentiation',
  tags: ['logarithmic-differentiation', 'differentiation'],
  version: 2,
  supports: ['medium', 'hard'],
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const s = rng.bool()
      ? factored(rng, 2, tier === 'hard' ? 2 : 1)
      : rng.pick(tier === 'hard' ? HARD_EXPONENT : VARIABLE_EXPONENT);

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
          'The log turns powers into factors and products into sums — each piece is now easy.',
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
