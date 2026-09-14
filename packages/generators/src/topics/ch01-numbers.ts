import { TIERS } from '@calcflow/shared';
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
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const size = tier === 'hard' ? 400 : tier === 'medium' ? 90 : 20;
    // One term per step, and never fewer than two — a single number is not a sum.
    const count = tier === 'easy' ? 2 : tier === 'medium' ? 3 : 4;
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
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    // A factor a hair off a round number: 99 is 100 − 1, 102 is 100 + 2. Doing
    // it that way round is the whole trick, and it is worth practising by hand.
    const round = tier !== 'easy' ? 1000 : 100;
    const off = rng.int(1, tier !== 'easy' ? 4 : 2);
    const high = rng.bool();
    const near = high ? round + off : round - off;
    const factor = rng.int(tier === 'hard' ? 24 : 3, tier === 'hard' ? 89 : 19);

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
  supports: TIERS,
  invariant: 'solution-set-preserving',

  generate({ tier, rng }): Draft {
    const a = rng.nonZero(-9, 9);
    const b = rng.nonZero(-9, 9);

    if (tier === 'hard') {
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

/**
 * The unknown on top of the fraction rather than underneath. Nothing is
 * excluded and nothing can blow up — the only move is to clear the denominators
 * before collecting, which is the move most of chapter 8 then takes for granted.
 */
export const fractionEquation: Generator = {
  id: 'numbers.fraction-equation',
  chapter: 1,
  title: 'Equations with fractions',
  tags: ['solve', 'fractions'],
  version: 1,
  supports: TIERS,
  invariant: 'solution-set-preserving',

  generate({ tier, rng }): Draft {
    if (tier === 'easy') {
      // (x + b)/a = c
      const a = rng.int(2, 9);
      const b = rng.nonZero(-9, 9);
      const c = rng.nonZero(-8, 8);
      const equation = `${frac(poly([[1, 1], [b, 0]]), String(a))} = ${c}`;
      const result = String(a * c - b);
      return {
        instruction: 'Solve for x',
        prompt: equation,
        answers: [answer(result, { keyboard: 'numeric', kind: 'number' })],
        solution: [
          step(
            'rational-equation',
            'Multiply by the denominator',
            `${poly([[1, 1], [b, 0]])} = ${a * c}`,
            'One multiplication and the fraction is gone.',
          ),
          step('linear-solve', 'Isolate x', `x = ${result}`),
        ],
        ruleIds: ['rational-equation', 'linear-solve'],
        verify: { kind: 'root', equation, wrt: 'x' },
      };
    }

    // (ax + b)/c ± (dx + e)/f = g, cleared by multiplying through by cf.
    const a = rng.nonZero(-5, 5);
    const c = rng.int(2, 7);
    const b = rng.nonZero(-8, 8);
    const e = rng.nonZero(-8, 8);
    const f = tier === 'hard' ? rng.int(2, 7) : c;
    const g = rng.nonZero(-6, 6);
    let d = rng.nonZero(-5, 5);
    // The x terms must not cancel, or there is no equation left to solve.
    while (a * f + c * d === 0) d = rng.nonZero(-5, 5);

    const left = `${frac(poly([[a, 1], [b, 0]]), String(c))} + ${frac(poly([[d, 1], [e, 0]]), String(f))}`;
    const equation = `${left} = ${g}`;
    const coefficient = a * f + c * d;
    const constant = g * c * f - f * b - c * e;
    const result = fracTex(constant, coefficient);

    return {
      instruction: 'Solve for x',
      prompt: equation,
      note: 'Give the exact value.',
      answers: [answer(result, { keyboard: 'numeric', kind: 'number' })],
      solution: [
        step(
          'rational-equation',
          `Multiply through by ${c * f}`,
          `${poly([[a * f, 1], [b * f, 0]])} + ${paren(poly([[c * d, 1], [c * e, 0]]))} = ${g * c * f}`,
          `${c * f} is a common multiple of both denominators, so every fraction clears at once.`,
        ),
        step('linear-solve', 'Collect', `${poly([[coefficient, 1]])} = ${constant}`),
        step('linear-solve', 'Divide', `x = ${result}`),
      ],
      ruleIds: ['rational-equation', 'linear-solve'],
      verify: { kind: 'root', equation, wrt: 'x' },
    };
  },
};
