import { answer, frac, fracTex, gcd, paren, poly, step } from '../authoring.js';
import type { Draft, Generator } from '../types.js';

export const combineNumeric: Generator = {
  id: 'fractions.combine',
  chapter: 3,
  title: 'Adding fractions',
  tags: ['fractions', 'arithmetic'],
  version: 1,
  supports: { steps: [1, 3], difficulty: [1, 3] },
  invariant: 'value-preserving',

  generate({ steps, difficulty, rng }): Draft {
    const denominators = [rng.int(2, difficulty >= 2 ? 12 : 6), rng.int(2, difficulty >= 2 ? 12 : 6)];
    if (steps >= 3) denominators.push(rng.int(2, 9));
    const numerators = denominators.map(() => rng.nonZero(-9, 9));

    const parts = numerators.map((n, i) => fracTex(n, denominators[i]!));
    const prompt = parts.reduce((acc, p) => (p.startsWith('-') ? `${acc} - ${p.slice(1)}` : `${acc} + ${p}`));

    const common = denominators.reduce((a, b) => (a * b) / gcd(a, b));
    const total = numerators.reduce((acc, n, i) => acc + (n * common) / denominators[i]!, 0);

    return {
      instruction: 'Work out and simplify',
      prompt,
      note: 'Give the answer as a single fraction in lowest terms.',
      answers: [answer(fracTex(total, common), { keyboard: 'numeric', kind: 'number' })],
      solution: [
        step('fraction-add', 'Common denominator', frac(String(total), String(common)), `${common} is the least common denominator.`),
        step('fraction-simplify', 'Cancel', fracTex(total, common)),
      ],
      ruleIds: ['fraction-add', 'fraction-simplify'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};

export const rationalExpressions: Generator = {
  id: 'fractions.rational-expressions',
  chapter: 3,
  title: 'Combining rational expressions',
  tags: ['fractions', 'algebra'],
  version: 1,
  supports: { steps: [2, 5], difficulty: [2, 5] },
  invariant: 'value-preserving',

  generate({ difficulty, rng }): Draft {
    const a = rng.nonZero(-6, 6);
    const b = rng.int(1, 7);
    const c = rng.nonZero(-6, 6);

    if (difficulty >= 4) {
      // a/x + c/(x+b) over a common denominator.
      const left = frac(String(a), 'x');
      const right = frac(String(c), poly([[1, 1], [b, 0]]));
      const prompt = c < 0 ? `${left} - ${frac(String(-c), poly([[1, 1], [b, 0]]))}` : `${left} + ${right}`;
      const numerator = poly([[a + c, 1], [a * b, 0]]);
      const result = frac(numerator, `x${paren(poly([[1, 1], [b, 0]]))}`);
      return {
        instruction: 'Write as a single fraction',
        prompt,
        note: 'Simplify as far as it goes.',
        answers: [answer(result)],
        solution: [
          step('fraction-add', 'Common denominator', frac(`${a}${paren(poly([[1, 1], [b, 0]]))} + ${c}x`, `x${paren(poly([[1, 1], [b, 0]]))}`)),
          step('fraction-simplify', 'Collect the numerator', result),
        ],
        ruleIds: ['fraction-add'],
        verify: { kind: 'identity', of: prompt },
      };
    }

    // (x² − k²)/(x + k) cancels to x − k.
    const k = rng.int(1, 8);
    const prompt = frac(poly([[1, 2], [-(k * k), 0]]), poly([[1, 1], [k, 0]]));
    const result = poly([[1, 1], [-k, 0]]);
    return {
      instruction: 'Simplify',
      prompt,
      note: `x \\neq ${-k}.`,
      answers: [answer(result)],
      solution: [
        step('difference-of-squares', 'Factor the numerator', frac(`${paren(poly([[1, 1], [k, 0]]))}${paren(result)}`, poly([[1, 1], [k, 0]])), 'Difference of squares.'),
        step('fraction-simplify', 'Cancel the common factor', result),
      ],
      ruleIds: ['fraction-simplify', 'difference-of-squares'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};
