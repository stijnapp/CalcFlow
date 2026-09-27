import { TIERS, type Tier } from '@calcflow/shared';
import { answer, aside, frac, fracTex, gcd, paren, poly, step, sum, tidy } from '../authoring.js';
import type { Draft, Generator } from '../types.js';

export const combineNumeric: Generator = {
  id: 'fractions.combine',
  chapter: 3,
  title: 'Adding fractions',
  tags: ['fractions', 'arithmetic'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const denominators = [rng.int(2, tier !== 'easy' ? 12 : 6), rng.int(2, tier !== 'easy' ? 12 : 6)];
    if (tier !== 'easy') denominators.push(rng.int(2, 9));
    const numerators = denominators.map(() => rng.nonZero(-9, 9));

    const parts = numerators.map((n, i) => fracTex(n, denominators[i]!));
    const prompt = sum(parts);

    const common = denominators.reduce((a, b) => (a * b) / gcd(a, b), 1);
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
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const a = rng.nonZero(-6, 6);
    const b = rng.int(1, 7);
    const c = rng.nonZero(-6, 6);

    if (tier === 'hard') {
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
          tidy('Collect the numerator', result),
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
      note: 'Cancel as far as it goes.',
      answers: [answer(result)],
      solution: [
        step('difference-of-squares', 'Factor the numerator', frac(`${paren(poly([[1, 1], [k, 0]]))}${paren(result)}`, poly([[1, 1], [k, 0]])), 'Difference of squares.'),
        step('fraction-simplify', 'Cancel the common factor', result),
      ],
      ruleIds: ['difference-of-squares', 'fraction-simplify'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};

/** The reduced form of `p/q` as a pair, so a fraction can be built around it. */
function reduce(p: number, q: number): [number, number] {
  const g = gcd(p, q) * (q < 0 ? -1 : 1);
  return [p / g, q / g];
}

/**
 * Multiplying and dividing fractions, which need no common denominator — the
 * mistake the book warns about, because adding does.
 */
export const multiplyDivide: Generator = {
  id: 'fractions.multiply-divide',
  chapter: 3,
  title: 'Multiplying and dividing fractions',
  tags: ['fractions', 'arithmetic'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    if (tier === 'easy') {
      const a = rng.nonZero(-9, 9);
      const b = rng.int(2, 9);
      const c = rng.nonZero(-9, 9);
      const d = rng.int(2, 9);
      const divide = rng.bool();
      const prompt = `${frac(String(a), String(b))} ${divide ? '\\div' : '\\cdot'} ${frac(String(c), String(d))}`;
      const [p, q] = divide ? [a * d, b * c] : [a * c, b * d];
      return {
        instruction: 'Work out and simplify',
        prompt,
        note: 'Give a single fraction in lowest terms.',
        answers: [answer(fracTex(p, q), { keyboard: 'numeric', kind: 'number' })],
        solution: [
          step(
            'fraction-multiply',
            divide ? 'Flip the second one and multiply' : 'Multiply across',
            frac(String(p), String(q)),
            divide ? 'Dividing by a fraction is multiplying by its reciprocal.' : 'Tops together, bottoms together — no common denominator needed.',
          ),
          step('fraction-simplify', 'Cancel', fracTex(p, q)),
        ],
        ruleIds: ['fraction-multiply', 'fraction-simplify'],
        verify: { kind: 'identity', of: prompt },
      };
    }

    if (tier === 'medium') {
      const a = rng.nonZero(-6, 6);
      const b = rng.int(2, 8);
      const c = rng.nonZero(-6, 6);
      const d = rng.int(2, 8);
      const prompt = `${frac(`${a}x`, String(b))} \\cdot ${frac(String(c), `${d}x^{2}`)}`;
      const [p, q] = reduce(a * c, b * d);
      const result = q === 1 ? frac(String(p), 'x') : frac(String(p), `${q}x`);
      return {
        instruction: 'Simplify',
        prompt,
        note: 'x is not zero. Give a single fraction in lowest terms.',
        answers: [answer(result)],
        solution: [
          step('fraction-multiply', 'Multiply across', frac(`${a * c}x`, `${b * d}x^{2}`), 'Tops together, bottoms together.'),
          step('fraction-simplify', 'Cancel', result, 'One x cancels top and bottom, and so does the common factor of the numbers.'),
        ],
        ruleIds: ['fraction-multiply', 'fraction-simplify'],
        verify: { kind: 'identity', of: prompt },
      };
    }

    const k = rng.int(1, 6);
    const prompt = `${frac(poly([[1, 2], [-(k * k), 0]]), 'x')} \\div ${frac(poly([[1, 1], [k, 0]]), 'x^{2}')}`;
    const result = `x${paren(poly([[1, 1], [-k, 0]]))}`;
    return {
      instruction: 'Simplify',
      prompt,
      note: `x is positive and not ${k}. Factor before cancelling.`,
      answers: [answer(result)],
      solution: [
        step(
          'fraction-multiply',
          'Flip the second one and multiply',
          `${frac(`${paren(poly([[1, 1], [k, 0]]))}${paren(poly([[1, 1], [-k, 0]]))}`, 'x')} \\cdot ${frac('x^{2}', poly([[1, 1], [k, 0]]))}`,
          'And factor the numerator while you are there — difference of squares.',
        ),
        step('fraction-simplify', 'Cancel', result),
      ],
      ruleIds: ['fraction-multiply', 'difference-of-squares', 'fraction-simplify'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};

/** A fraction whose parts are fractions. The main bar is a division sign. */
export const compoundFraction: Generator = {
  id: 'fractions.compound',
  chapter: 3,
  title: 'Fractions inside fractions',
  tags: ['fractions', 'algebra'],
  version: 1,
  supports: ['medium', 'hard'] as const,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    if (tier === 'hard') {
      const k = rng.int(2, 6);
      const prompt = frac(`1 + ${frac(String(k), 'x')}`, `1 - ${frac(String(k), 'x')}`);
      const result = frac(poly([[1, 1], [k, 0]]), poly([[1, 1], [-k, 0]]));
      return {
        instruction: 'Simplify',
        prompt,
        note: `x is positive and not ${k}.`,
        answers: [answer(result)],
        solution: [
          step(
            'compound-fraction',
            'Multiply top and bottom by x',
            result,
            'One multiplication clears every small fraction at once, and x is not zero so it changes nothing.',
          ),
        ],
        ruleIds: ['compound-fraction', 'fraction-simplify'],
        verify: { kind: 'identity', of: prompt },
      };
    }

    const a = rng.nonZero(-6, 6);
    const b = rng.int(2, 8);
    const prompt = frac(frac(String(a), 'x'), frac(String(b), 'x^{2}'));
    const [p, q] = reduce(a, b);
    const result = q === 1 ? `${p === 1 ? '' : p === -1 ? '-' : p}x` : frac(`${p}x`, String(q));
    return {
      instruction: 'Simplify',
      prompt,
      note: 'x is positive.',
      answers: [answer(result)],
      solution: [
        step(
          'compound-fraction',
          'The big bar is a division',
          `${frac(String(a), 'x')} \\cdot ${frac('x^{2}', String(b))}`,
          'So flip the bottom fraction and multiply.',
        ),
        step('fraction-simplify', 'Cancel', result),
      ],
      ruleIds: ['compound-fraction', 'fraction-multiply', 'fraction-simplify'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};

/**
 * Cancelling that only works after factoring. Nothing cancels out of a sum, and
 * the only way past that is to turn the sum into a product first.
 */
export const factorThenCancel: Generator = {
  id: 'fractions.factor-cancel',
  chapter: 3,
  title: 'Factor, then cancel',
  tags: ['fractions', 'factoring'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    // (x + r)(x + s) over (x + r): r positive keeps the excluded value away from
    // the positive x the check samples.
    const r = rng.int(1, 7);
    const s = rng.nonZero(-7, 7);
    const a = tier === 'hard' ? rng.int(2, 4) : 1;

    if (a > 1) {
      // (ax + r)(x + s) over (ax + r).
      const numerator = poly([[a, 2], [a * s + r, 1], [r * s, 0]]);
      const denominator = poly([[a, 1], [r, 0]]);
      const result = poly([[1, 1], [s, 0]]);
      return {
        instruction: 'Simplify',
        prompt: frac(numerator, denominator),
        note: 'Cancel as far as it goes.',
        answers: [answer(result)],
        solution: [
          step(
            'fraction-simplify',
            'Factor the numerator',
            frac(`${paren(denominator)}${paren(result)}`, denominator),
            `The bottom has to be one of the factors — that is what makes the other one ${result}.`,
          ),
          step('fraction-simplify', 'Cancel the common factor', result),
        ],
        ruleIds: ['fraction-simplify'],
        verify: { kind: 'identity', of: frac(numerator, denominator) },
      };
    }

    const numerator = poly([[1, 2], [r + s, 1], [r * s, 0]]);
    const denominator = poly([[1, 1], [r, 0]]);
    const result = poly([[1, 1], [s, 0]]);
    return {
      instruction: 'Simplify',
      prompt: frac(numerator, denominator),
      note: 'Cancel as far as it goes.',
      answers: [answer(result)],
      solution: [
        step(
          'fraction-simplify',
          'Factor the numerator',
          frac(`${paren(denominator)}${paren(result)}`, denominator),
          `Two numbers multiplying to ${r * s} and adding to ${r + s}.`,
        ),
        step('fraction-simplify', 'Cancel the common factor', result),
      ],
      ruleIds: ['fraction-simplify'],
      verify: { kind: 'identity', of: frac(numerator, denominator) },
    };
  },
};

interface Formula {
  formula: string;
  wanted: string;
  result: string;
  /** Each move, and the line it leaves. */
  steps: Array<[string, string]>;
}

const FORMULAS: Record<Tier, Formula[]> = {
  easy: [
    {
      formula: 'A = \\frac{1}{2}bh',
      wanted: 'h',
      result: frac('2A', 'b'),
      steps: [
        ['Multiply by 2', '2A = bh'],
        ['Divide by b', `h = ${frac('2A', 'b')}`],
      ],
    },
    {
      formula: 'C = 2\\pi r',
      wanted: 'r',
      result: frac('C', '2\\pi'),
      steps: [['Divide by 2\\pi', `r = ${frac('C', '2\\pi')}`]],
    },
    {
      formula: 'y = ax + b',
      wanted: 'x',
      result: frac('y - b', 'a'),
      steps: [
        ['Subtract b', 'y - b = ax'],
        ['Divide by a', `x = ${frac('y - b', 'a')}`],
      ],
    },
  ],
  medium: [
    {
      formula: 'V = \\pi r^{2}h',
      wanted: 'h',
      result: frac('V', '\\pi r^{2}'),
      steps: [['Divide by everything else', `h = ${frac('V', '\\pi r^{2}')}`]],
    },
    {
      formula: 'C = \\frac{5}{9}\\left(F - 32\\right)',
      wanted: 'F',
      result: `${frac('9C', '5')} + 32`,
      steps: [
        ['Multiply by 9/5', `${frac('9C', '5')} = F - 32`],
        ['Add 32', `F = ${frac('9C', '5')} + 32`],
      ],
    },
    {
      formula: 'y = \\frac{ax + b}{c}',
      wanted: 'x',
      result: frac('cy - b', 'a'),
      steps: [
        ['Multiply by c', 'cy = ax + b'],
        ['Subtract b, divide by a', `x = ${frac('cy - b', 'a')}`],
      ],
    },
  ],
  hard: [
    {
      formula: 's = ut + \\frac{1}{2}at^{2}',
      wanted: 'a',
      result: frac('2\\left(s - ut\\right)', 't^{2}'),
      steps: [
        ['Subtract ut', `s - ut = ${frac('1', '2')}at^{2}`],
        ['Multiply by 2, divide by t²', `a = ${frac('2\\left(s - ut\\right)', 't^{2}')}`],
      ],
    },
    {
      formula: `${frac('1', 'R')} = ${frac('1', 'a')} + ${frac('1', 'b')}`,
      wanted: 'R',
      result: frac('ab', 'a + b'),
      steps: [
        ['One fraction on the right', `${frac('1', 'R')} = ${frac('a + b', 'ab')}`],
        ['Turn both sides over', `R = ${frac('ab', 'a + b')}`],
      ],
    },
    {
      formula: 'T = 2\\pi\\sqrt{\\frac{L}{g}}',
      wanted: 'L',
      result: frac('gT^{2}', '4\\pi^{2}'),
      steps: [
        ['Divide by 2π, then square', `${frac('T^{2}', '4\\pi^{2}')} = ${frac('L', 'g')}`],
        ['Multiply by g', `L = ${frac('gT^{2}', '4\\pi^{2}')}`],
      ],
    },
  ],
};

/**
 * Solving for a letter instead of for x. Every applied question arrives as a
 * formula that has to be turned round before anything can be substituted, and
 * the moves are the ones from solving an equation.
 */
export const rearrangeFormula: Generator = {
  id: 'fractions.rearrange',
  chapter: 3,
  title: 'Rearranging a formula',
  tags: ['algebra', 'solve'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const f = rng.pick(FORMULAS[tier]);
    return {
      instruction: `Make ${f.wanted} the subject`,
      prompt: f.formula,
      note: `Give ${f.wanted} in terms of the other letters. Every letter is positive.`,
      answers: [answer(f.result, { keyboard: 'algebra' })],
      solution: [
        ...f.steps.map(([label, expr]) => aside(label, expr)),
        step('rearrange-formula', 'The subject, alone', f.result),
      ],
      ruleIds: ['rearrange-formula'],
    };
  },
};
