import { TIERS } from '@calcflow/shared';
import { answer, frac, fracTex, paren, poly, power, step, term, tidy } from '../authoring.js';
import type { Draft, Generator } from '../types.js';

export const notableProducts: Generator = {
  id: 'powers.notable-products',
  chapter: 2,
  title: 'Notable products',
  tags: ['notable-products', 'expand'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const a = tier !== 'easy' ? rng.int(2, 6) : 1;
    const b = rng.nonZero(-9, 9);
    const shape = rng.pick(tier === 'hard' ? ['square', 'difference', 'twin'] : ['square', 'difference']);

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
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const m = rng.int(2, 7);
    const n = rng.int(2, 7);
    const k = tier === 'hard' ? rng.int(2, 4) : 1;

    if (tier !== 'easy' && rng.bool()) {
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

/**
 * The exponent distributed over a product — `(2x^{2}y)^{3}`, where the 2 gets
 * cubed as well. The book spends a page on it and it is the single most common
 * slip in everything downstream.
 */
export const productPower: Generator = {
  id: 'powers.product-power',
  chapter: 2,
  title: 'Powers of products and quotients',
  tags: ['power-rules', 'simplify'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const n = rng.int(2, tier === 'easy' ? 2 : 3);
    const a = tier === 'easy' ? 1 : rng.int(2, 4);
    const p = rng.int(1, 3);
    const q = tier === 'hard' ? rng.nonZero(-3, 3) : rng.int(1, 3);

    if (tier === 'hard' && rng.bool()) {
      // A quotient, so the exponent has to reach the bottom too.
      const r = rng.int(1, 3);
      const prompt = `\\left(\\frac{${term(a, power('x', p))}}{${power('y', r)}}\\right)^{${n}}`;
      const result = frac(term(a ** n, power('x', p * n)), power('y', r * n));
      return {
        instruction: 'Simplify',
        prompt,
        note: 'x and y are positive. No brackets left in the answer.',
        answers: [answer(result)],
        solution: [
          step(
            'power-of-a-product',
            'Exponent onto every factor',
            frac(`${a}^{${n}}${power('x', p * n)}`, power('y', r * n)),
            `The ${a} is a factor too, so it gets the exponent as well.`,
          ),
          tidy('Work out the number', result),
        ],
        ruleIds: ['power-of-a-product', 'power-rules'],
        verify: { kind: 'identity', of: prompt },
      };
    }

    const inside = `${term(a, power('x', p))}${power('y', q)}`;
    const prompt = power(`\\left(${inside}\\right)`, n);
    const result = `${term(a ** n, power('x', p * n))}${power('y', q * n)}`;
    return {
      instruction: 'Simplify',
      prompt,
      note: 'x and y are positive. No brackets left in the answer.',
      answers: [answer(result)],
      solution: [
        step(
          'power-of-a-product',
          'Exponent onto every factor',
          `${a}^{${n}}${power('x', p * n)}${power('y', q * n)}`,
          a === 1
            ? 'Each factor keeps its own base and multiplies its exponent by the outer one.'
            : `The ${a} is a factor too, so it gets the exponent as well.`,
        ),
        tidy('Work out the number', result),
      ],
      ruleIds: ['power-of-a-product', 'power-rules'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};

/** `(a ± b)³`, which is not `a³ ± b³` however much it would like to be. */
export const cubes: Generator = {
  id: 'powers.cubes',
  chapter: 2,
  title: 'Cubing a sum',
  tags: ['notable-products', 'expand'],
  version: 1,
  supports: ['medium', 'hard'] as const,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const a = tier === 'hard' ? rng.int(2, 4) : 1;
    const b = rng.nonZero(-5, 5);
    const inner = poly([[a, 1], [b, 0]]);
    const prompt = power(paren(inner), 3);
    const result = poly([
      [a ** 3, 3],
      [3 * a * a * b, 2],
      [3 * a * b * b, 1],
      [b ** 3, 0],
    ]);

    return {
      instruction: 'Expand and simplify',
      prompt,
      answers: [answer(result)],
      solution: [
        step(
          'cube-of-a-sum',
          'Cube of a sum',
          result,
          'Cube the first, three times the first squared times the second, three times the first times the second squared, cube the second.',
        ),
      ],
      ruleIds: ['cube-of-a-sum'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};

/**
 * The power rules on numbers rather than letters, where the answer is one
 * integer and the point is not to reach for a calculator.
 */
export const numericPowers: Generator = {
  id: 'powers.numeric',
  chapter: 2,
  title: 'Powers without a calculator',
  tags: ['power-rules', 'arithmetic'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const base = rng.pick([2, 3, 5]);
    const shapes = ['divide', 'zero', 'nested', 'negative'] as const;
    const kind =
      tier === 'easy'
        ? rng.pick(['divide', 'zero'] as const)
        : tier === 'medium'
          ? rng.pick(['divide', 'nested', 'negative'] as const)
          : rng.pick(shapes);

    if (kind === 'zero') {
      const m = rng.int(2, 6);
      const prompt = `\\frac{${power(String(base), m)}}{${power(String(base), m)}}`;
      return {
        instruction: 'Work out without a calculator',
        prompt,
        answers: [answer('1', { keyboard: 'numeric', kind: 'number' })],
        solution: [
          step('power-rules', 'Dividing subtracts', `${base}^{0}`),
          step('power-rules', 'Anything to the zero', '1', 'Except zero itself, every base to the power 0 is 1.'),
        ],
        ruleIds: ['power-rules'],
        verify: { kind: 'identity', of: prompt },
      };
    }

    if (kind === 'negative') {
      const m = rng.int(2, 4);
      const prompt = power(String(base), -m);
      return {
        instruction: 'Work out without a calculator',
        prompt,
        note: 'Give the exact value as a fraction.',
        answers: [answer(fracTex(1, base ** m), { keyboard: 'numeric', kind: 'number' })],
        solution: [
          step('negative-exponent', 'Negative exponent flips it', frac('1', power(String(base), m))),
          tidy('Work out the bottom', fracTex(1, base ** m)),
        ],
        ruleIds: ['negative-exponent'],
        verify: { kind: 'identity', of: prompt },
      };
    }

    if (kind === 'nested') {
      const m = rng.int(2, 3);
      const k = rng.int(2, 3);
      const n = rng.int(1, m * k - 1);
      const prompt = `\\frac{${power(paren(power(String(base), m)), k)}}{${power(String(base), n)}}`;
      const value = base ** (m * k - n);
      return {
        instruction: 'Work out without a calculator',
        prompt,
        answers: [answer(String(value), { keyboard: 'numeric', kind: 'number' })],
        solution: [
          step('power-rules', 'Nested powers multiply', frac(power(String(base), m * k), power(String(base), n))),
          step('power-rules', 'Dividing subtracts', power(String(base), m * k - n)),
          tidy('Work it out', String(value)),
        ],
        ruleIds: ['power-rules'],
        verify: { kind: 'identity', of: prompt },
      };
    }

    const m = rng.int(4, 9);
    const n = rng.int(1, m - 1);
    const prompt = `\\frac{${power(String(base), m)}}{${power(String(base), n)}}`;
    const value = base ** (m - n);
    return {
      instruction: 'Work out without a calculator',
      prompt,
      answers: [answer(String(value), { keyboard: 'numeric', kind: 'number' })],
      solution: [
        step('power-rules', 'Dividing subtracts', power(String(base), m - n), 'Same base, so subtract the exponents — do not divide them.'),
        tidy('Work it out', String(value)),
      ],
      ruleIds: ['power-rules'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};

/**
 * The wrong answer, handed over as the question. Reading a line of algebra and
 * deciding whether it is true is a different skill from producing one, and the
 * book asks for it directly.
 */
export const spotTheError: Generator = {
  id: 'powers.spot-the-error',
  chapter: 2,
  title: 'Correct the mistake',
  tags: ['notable-products', 'power-rules'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const b = rng.int(2, 7);
    const m = rng.int(2, 5);
    const n = rng.int(2, 5);
    const kind = tier === 'easy' ? 'square' : rng.pick(['square', 'power-sum', 'sqrt']);

    if (kind === 'power-sum') {
      const wrong = `${power('x', m)} \\cdot ${power('x', n)} = ${power('x', m * n)}`;
      const right = power('x', m + n);
      return {
        instruction: 'This line is wrong. Give the correct right-hand side',
        prompt: wrong,
        note: 'x is positive.',
        answers: [answer(right)],
        solution: [
          step('power-rules', 'Same base, add exponents', right, 'Multiplying powers adds the exponents; multiplying the exponents is what a nested power does.'),
        ],
        ruleIds: ['power-rules'],
        verify: { kind: 'identity', of: `${power('x', m)} \\cdot ${power('x', n)}` },
      };
    }

    if (kind === 'sqrt') {
      const c = rng.int(2, 6);
      const wrong = `\\sqrt{x^{2} + ${b * b}} = x + ${b}`;
      const right = `\\sqrt{x^{2} + ${b * b}}`;
      return {
        instruction: 'This line is wrong. Give the correct right-hand side',
        prompt: wrong,
        note: `x is positive. There is nothing to take out — say so by giving the left-hand side back, unchanged. (Check it at x = ${c}: the two sides disagree.)`,
        answers: [answer(right, { keyboard: 'algebra' })],
        solution: [
          step(
            'surd-simplify',
            'A root does not split over a sum',
            right,
            'Only products come out of a root. A sum under the root stays there.',
          ),
        ],
        ruleIds: ['surd-simplify'],
        verify: { kind: 'identity', of: right },
      };
    }

    const wrong = `${power(paren(poly([[1, 1], [b, 0]])), 2)} = ${poly([[1, 2], [b * b, 0]])}`;
    const right = poly([[1, 2], [2 * b, 1], [b * b, 0]]);
    return {
      instruction: 'This line is wrong. Give the correct right-hand side',
      prompt: wrong,
      answers: [answer(right)],
      solution: [
        step('notable-products', 'Notable products', right, 'The middle term is what goes missing: twice the product of the two.'),
      ],
      ruleIds: ['notable-products'],
      verify: { kind: 'identity', of: power(paren(poly([[1, 1], [b, 0]])), 2) },
    };
  },
};
