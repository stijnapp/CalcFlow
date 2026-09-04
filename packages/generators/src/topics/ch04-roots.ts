import { answer, frac, paren, poly, power, rootOf, step, term } from '../authoring.js';
import type { Draft, Generator } from '../types.js';

/** The largest square dividing n, and what is left. */
function pullSquare(n: number): { outside: number; inside: number } {
  let outside = 1;
  let inside = n;
  for (let d = 2; d * d <= inside; d += 1) {
    while (inside % (d * d) === 0) {
      inside /= d * d;
      outside *= d;
    }
  }
  return { outside, inside };
}

export const simplifySurd: Generator = {
  id: 'roots.simplify-surd',
  chapter: 4,
  title: 'Simplifying surds',
  tags: ['roots', 'surds'],
  version: 1,
  supports: { steps: [1, 3], difficulty: [1, 4] },
  invariant: 'value-preserving',

  generate({ difficulty, rng }): Draft {
    const square = rng.int(2, difficulty >= 3 ? 9 : 5);
    const rest = rng.pick(difficulty >= 3 ? [2, 3, 5, 6, 7, 10, 11] : [2, 3, 5]);
    const n = square * square * rest;
    const { outside, inside } = pullSquare(n);
    const result = inside === 1 ? String(outside) : term(outside, rootOf(String(inside)));

    return {
      instruction: 'Simplify',
      prompt: rootOf(String(n)),
      note: 'Give the exact value — no decimals.',
      answers: [answer(result, { keyboard: 'numeric' })],
      solution: [
        step('surd-simplify', 'Split off the square factor', rootOf(`${outside * outside} \\cdot ${inside}`)),
        step('surd-simplify', 'Take the root of the square', result),
      ],
      ruleIds: ['surd-simplify'],
      verify: { kind: 'identity', of: rootOf(String(n)) },
    };
  },
};

export const rationalise: Generator = {
  id: 'roots.rationalise',
  chapter: 4,
  title: 'Rationalising a denominator',
  tags: ['roots', 'rationalise'],
  version: 1,
  supports: { steps: [2, 5], difficulty: [2, 5] },
  invariant: 'value-preserving',

  generate({ difficulty, rng }): Draft {
    const r = rng.pick([2, 3, 5, 6, 7, 10]);
    if (difficulty <= 2) {
      // A single root in the denominator.
      const k = rng.int(1, 9);
      const prompt = frac(String(k), rootOf(String(r)));
      const result = frac(term(k, rootOf(String(r))), String(r));
      return {
        instruction: 'Rationalise the denominator',
        prompt,
        note: 'Give the exact value.',
        answers: [answer(result, { keyboard: 'numeric' })],
        solution: [
          step('rationalise', 'Multiply by the root', frac(`${k}${rootOf(String(r))}`, `${rootOf(String(r))}${rootOf(String(r))}`)),
          step('rationalise', 'The denominator loses its root', result),
        ],
        ruleIds: ['rationalise'],
        verify: { kind: 'identity', of: prompt },
      };
    }

    // Conjugate: 1/(√r + b). b² must miss r, or the denominator vanishes.
    let b = rng.nonZero(-5, 5);
    while (r === b * b) b = rng.nonZero(-5, 5);
    const prompt = frac('1', `${rootOf(String(r))} ${b < 0 ? '-' : '+'} ${Math.abs(b)}`);
    const denominator = r - b * b;
    const numerator = `${rootOf(String(r))} ${b < 0 ? '+' : '-'} ${Math.abs(b)}`;
    // A minus belongs in front of the fraction, not underneath it.
    const result =
      denominator < 0
        ? `-${frac(numerator, String(-denominator))}`
        : frac(numerator, String(denominator));
    return {
      instruction: 'Rationalise the denominator',
      prompt,
      note: 'Give the exact value.',
      answers: [answer(result, { keyboard: 'numeric' })],
      solution: [
        step(
          'rationalise',
          'Multiply by the conjugate',
          frac(
            numerator,
            `${paren(`${rootOf(String(r))} ${b < 0 ? '-' : '+'} ${Math.abs(b)}`)}${paren(numerator)}`,
          ),
        ),
        step('notable-products', 'Difference of squares', result, `The denominator becomes ${r} - ${b * b} = ${denominator}.`),
      ],
      ruleIds: ['rationalise', 'notable-products'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};

export const fractionalExponents: Generator = {
  id: 'roots.fractional-exponents',
  chapter: 4,
  title: 'Fractional exponents',
  tags: ['roots', 'exponents'],
  version: 1,
  supports: { steps: [1, 3], difficulty: [2, 5] },
  invariant: 'value-preserving',

  generate({ rng }): Draft {
    // Only perfect powers, so the answer stays an integer.
    const [base, root] = rng.pick([
      [4, 2], [9, 2], [16, 2], [25, 2], [36, 2], [49, 2], [64, 2],
      [8, 3], [27, 3], [64, 3], [125, 3],
    ] as Array<[number, number]>);
    const exp = rng.int(1, 3);
    const rootValue = Math.round(Math.pow(base, 1 / root));
    const value = rootValue ** exp;
    const prompt = power(String(base), frac(String(exp), String(root)));

    return {
      instruction: 'Work out',
      prompt,
      note: 'Give the exact value.',
      answers: [answer(String(value), { keyboard: 'numeric', kind: 'number' })],
      solution: [
        step('fractional-exponent', 'Root first, then power', power(`\\sqrt[${root}]{${base}}`, exp)),
        step('fractional-exponent', 'Evaluate', String(value), `\\sqrt[${root}]{${base}} = ${rootValue}.`),
      ],
      ruleIds: ['fractional-exponent'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};
