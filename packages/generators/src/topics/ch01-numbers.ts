import { answer, frac, fracTex, paren, poly, step, sum, tidy } from '../authoring.js';
import type { Draft, Generator } from '../types.js';

/*
 * Chapter 1 is the arithmetic everything else stands on: signs, the
 * distributive law, and an equation with the unknown under a fraction bar. The
 * book's set-membership questions (is this number in ℕ, ℤ, ℚ, ℝ?) are not here
 * — they want a multiple-choice answer field, and every field in the app today
 * takes an expression.
 */

export const signedArithmetic: Generator = {
  id: 'numbers.signed',
  chapter: 1,
  title: 'Adding and subtracting signed numbers',
  tags: ['arithmetic', 'signs'],
  version: 1,
  supports: { steps: [1, 4], difficulty: [1, 3] },
  invariant: 'value-preserving',

  generate({ steps, difficulty, rng }): Draft {
    const size = difficulty >= 3 ? 400 : difficulty === 2 ? 90 : 20;
    // One term per step, and never fewer than two — a single number is not a sum.
    const count = Math.max(2, steps + 1);
    const values: number[] = [];
    for (let i = 0; i < count; i += 1) values.push(rng.nonZero(-size, size));

    /*
     * A signed number inside brackets is the whole point of the chapter, so one
     * term after the first always gets written that way: `- (-8)` for a term
     * that adds, `+ (-8)` for one that subtracts. Written as bare signs there
     * would be nothing to clear and the first hint would repeat the question.
     */
    const bracketed = new Set<number>([rng.int(1, count - 1)]);
    for (let i = 1; i < count; i += 1) if (rng.bool()) bracketed.add(i);

    const parts = values.map((v, i) => {
      if (i === 0) return String(v);
      // `paren` drops the brackets around a lone number, which is exactly the
      // punctuation being taught here, so they are written out.
      // Whichever sign it takes, the number inside the brackets is the negative
      // one: `- (-8)` for a term that adds, `+ (-8)` for one that subtracts.
      if (bracketed.has(i)) return `${v > 0 ? '-' : '+'} \\left(${-Math.abs(v)}\\right)`;
      return v < 0 ? `- ${-v}` : `+ ${v}`;
    });
    const prompt = parts.join(' ');
    const total = values.reduce((a, b) => a + b, 0);

    // Same terms, every bracket resolved — the line he should be able to write
    // before adding anything up.
    const plain = sum(values.map(String));

    return {
      instruction: 'Work out',
      prompt,
      note: 'Watch the signs on the bracketed terms.',
      answers: [answer(String(total), { keyboard: 'numeric', kind: 'number' })],
      solution: [
        step(
          'sign-rules',
          'Clear the brackets',
          plain,
          'Subtracting a negative adds it, and adding a negative subtracts it.',
        ),
        tidy('Add them up', String(total)),
      ],
      ruleIds: ['sign-rules'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};

export const distributiveShortcut: Generator = {
  id: 'numbers.distributive',
  chapter: 1,
  title: 'Multiplying the short way',
  tags: ['arithmetic', 'distributive'],
  version: 1,
  supports: { steps: [1, 3], difficulty: [1, 4] },
  invariant: 'value-preserving',

  generate({ difficulty, rng }): Draft {
    // A factor a hair off a round number: 99 is 100 − 1, 102 is 100 + 2. Doing
    // it that way round is the whole trick, and it is worth practising by hand.
    const round = difficulty >= 3 ? 1000 : 100;
    const off = rng.int(1, difficulty >= 2 ? 4 : 2);
    const high = rng.bool();
    const near = high ? round + off : round - off;
    const factor = rng.int(difficulty >= 4 ? 24 : 3, difficulty >= 4 ? 89 : 19);

    const prompt = `${factor} \\cdot ${near}`;
    const total = factor * near;
    const split = high
      ? `${factor} \\cdot ${round} + ${factor} \\cdot ${off}`
      : `${factor} \\cdot ${round} - ${factor} \\cdot ${off}`;
    const parts = high
      ? `${factor * round} + ${factor * off}`
      : `${factor * round} - ${factor * off}`;

    return {
      instruction: 'Work out without a calculator',
      prompt,
      note: `Split ${near} around ${round}.`,
      answers: [answer(String(total), { keyboard: 'numeric', kind: 'number' })],
      solution: [
        step(
          'distributive',
          'Split the awkward factor',
          split,
          `${near} is ${round} ${high ? 'plus' : 'minus'} ${off}, and the factor multiplies both parts.`,
        ),
        tidy('Multiply each part', parts),
        tidy(high ? 'Add' : 'Subtract', String(total)),
      ],
      ruleIds: ['distributive'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};

export const rationalEquation: Generator = {
  id: 'numbers.rational-equation',
  chapter: 1,
  title: 'Equations with the unknown in a denominator',
  tags: ['solve', 'fractions'],
  version: 1,
  supports: { steps: [2, 5], difficulty: [2, 5] },
  invariant: 'solution-set-preserving',

  generate({ difficulty, rng }): Draft {
    const a = rng.nonZero(-9, 9);
    const b = rng.nonZero(-9, 9);

    if (difficulty >= 4) {
      // a/(x+b) = c/(x+d). Cross-multiplying leaves a linear equation, and
      // keeping b ≠ d and a ≠ c is what keeps the root off both excluded values.
      let c = rng.nonZero(-9, 9);
      while (c === a) c = rng.nonZero(-9, 9);
      let d = rng.nonZero(-9, 9);
      while (d === b) d = rng.nonZero(-9, 9);

      const left = poly([[1, 1], [b, 0]]);
      const right = poly([[1, 1], [d, 0]]);
      const equation = `${frac(String(a), left)} = ${frac(String(c), right)}`;
      const result = fracTex(c * b - a * d, a - c);

      return {
        instruction: 'Solve for x',
        prompt: equation,
        note: `Give the exact value. x may not be ${-b} or ${-d}.`,
        answers: [answer(result, { keyboard: 'numeric', kind: 'number' })],
        solution: [
          step(
            'rational-equation',
            'Cross-multiply',
            `${a}${paren(right)} = ${c}${paren(left)}`,
            'Both denominators are non-zero, so multiplying by them both keeps the same solution.',
          ),
          step('linear-solve', 'Collect the x terms', `${poly([[a - c, 1]])} = ${c * b - a * d}`),
          step('linear-solve', 'Divide', result),
        ],
        ruleIds: ['rational-equation', 'linear-solve'],
        verify: { kind: 'root', equation, wrt: 'x' },
      };
    }

    // a/(x+b) = c
    const c = rng.nonZero(-9, 9);
    const left = poly([[1, 1], [b, 0]]);
    const equation = `${frac(String(a), left)} = ${c}`;
    const result = fracTex(a - b * c, c);

    return {
      instruction: 'Solve for x',
      prompt: equation,
      note: `Give the exact value. x may not be ${-b}.`,
      answers: [answer(result, { keyboard: 'numeric', kind: 'number' })],
      solution: [
        step(
          'rational-equation',
          'Multiply by the denominator',
          `${a} = ${c}${paren(left)}`,
          'The unknown comes out from under the bar before anything else happens.',
        ),
        step('linear-solve', 'Isolate x', result),
      ],
      ruleIds: ['rational-equation', 'linear-solve'],
      verify: { kind: 'root', equation, wrt: 'x' },
    };
  },
};
