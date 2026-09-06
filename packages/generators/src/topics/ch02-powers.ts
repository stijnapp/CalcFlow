import { answer, paren, poly, power, step, term, tidy } from '../authoring.js';
import type { Draft, Generator } from '../types.js';

export const notableProducts: Generator = {
  id: 'powers.notable-products',
  chapter: 2,
  title: 'Notable products',
  tags: ['notable-products', 'expand'],
  version: 1,
  supports: { steps: [1, 4], difficulty: [1, 4] },
  invariant: 'value-preserving',

  generate({ difficulty, rng }): Draft {
    const a = difficulty >= 3 ? rng.int(2, 6) : 1;
    const b = rng.nonZero(-9, 9);
    const shape = rng.pick(difficulty >= 4 ? ['square', 'difference', 'twin'] : ['square', 'difference']);

    if (shape === 'twin') {
      // (x+k)² − (x−k)² collapses to 4kx — the book's own example.
      const k = rng.int(2, 7);
      const prompt = `${power(paren(poly([[1, 1], [k, 0]])), 2)} - ${power(paren(poly([[1, 1], [-k, 0]])), 2)}`;
      const result = term(4 * k, 'x');
      return {
        instruction: 'Expand and simplify',
        prompt,
        answers: [answer(result)],
        solution: [
          step('notable-products', 'Notable products', `${poly([[1, 2], [2 * k, 1], [k * k, 0]])} - ${paren(poly([[1, 2], [-2 * k, 1], [k * k, 0]]))}`),
          tidy('Collect', result, 'The squares and the constants cancel; only the middle terms survive.'),
        ],
        ruleIds: ['notable-products'],
        verify: { kind: 'identity', of: prompt },
      };
    }

    const inner = poly([[a, 1], [b, 0]]);
    if (shape === 'square') {
      const result = poly([[a * a, 2], [2 * a * b, 1], [b * b, 0]]);
      return {
        instruction: 'Expand and simplify',
        prompt: power(paren(inner), 2),
        answers: [answer(result)],
        solution: [
          step('notable-products', 'Notable products', result, 'Square the first, twice the product, square the last.'),
        ],
        ruleIds: ['notable-products'],
        verify: { kind: 'identity', of: power(paren(inner), 2) },
      };
    }

    const other = poly([[a, 1], [-b, 0]]);
    const prompt = `${paren(inner)}${paren(other)}`;
    const result = poly([[a * a, 2], [-(b * b), 0]]);
    return {
      instruction: 'Expand and simplify',
      prompt,
      answers: [answer(result)],
      solution: [step('difference-of-squares', 'Difference of squares', result, 'The middle terms cancel.')],
      ruleIds: ['difference-of-squares'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};

export const powerRules: Generator = {
  id: 'powers.rules',
  chapter: 2,
  title: 'Power rules',
  tags: ['power-rules', 'simplify'],
  version: 1,
  supports: { steps: [1, 3], difficulty: [1, 5] },
  invariant: 'value-preserving',

  generate({ difficulty, rng }): Draft {
    const m = rng.int(2, 7);
    const n = rng.int(2, 7);
    const k = difficulty >= 4 ? rng.int(2, 4) : 1;

    if (difficulty >= 3 && rng.bool()) {
      // Nested powers over a quotient: (x^m)^k / x^n
      const prompt = `\\frac{${power(paren(power('x', m)), k)}}{${power('x', n)}}`;
      const result = power('x', m * k - n);
      return {
        instruction: 'Simplify to a single power',
        prompt,
        note: 'x is positive. Leave the answer as one power of x.',
        answers: [answer(result)],
        solution: [
          step('power-rules', 'Nested powers multiply', `\\frac{${power('x', m * k)}}{${power('x', n)}}`),
          step('power-rules', 'Dividing subtracts', result),
        ],
        ruleIds: ['power-rules', 'negative-exponent'],
        verify: { kind: 'identity', of: prompt },
      };
    }

    const prompt = `${power('x', m)} \\cdot ${power('x', n)}`;
    const result = power('x', m + n);
    return {
      instruction: 'Simplify to a single power',
      prompt,
      note: 'x is positive. Leave the answer as one power of x.',
      answers: [answer(result)],
      solution: [step('power-rules', 'Same base, add exponents', result)],
      ruleIds: ['power-rules'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};
