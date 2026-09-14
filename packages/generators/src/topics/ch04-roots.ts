import { TIERS } from '@calcflow/shared';
import { answer, frac, fracTex, paren, poly, power, rootOf, setup, step, term } from '../authoring.js';
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
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const square = rng.int(2, tier !== 'easy' ? 9 : 5);
    const rest = rng.pick(tier !== 'easy' ? [2, 3, 5, 6, 7, 10, 11] : [2, 3, 5]);
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
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const r = rng.pick([2, 3, 5, 6, 7, 10]);
    if (tier === 'easy') {
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
        step('difference-of-squares', 'Difference of squares', result, `The denominator becomes ${r} - ${b * b} = ${denominator}.`),
      ],
      ruleIds: ['rationalise', 'difference-of-squares'],
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
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    // Only perfect powers, so the answer stays an integer.
    const [base, root] = rng.pick([
      [4, 2], [9, 2], [16, 2], [25, 2], [36, 2], [49, 2], [64, 2],
      [8, 3], [27, 3], [64, 3], [125, 3],
    ] as Array<[number, number]>);
    const exp = rng.int(1, 3);
    const rootValue = Math.round(Math.pow(base, 1 / root));
    const value = rootValue ** exp;
    // A negative exponent as well, once he is past easy: the two rules meet in
    // one expression and that is where the exam puts them.
    const negative = tier !== 'easy' && rng.bool();
    const exponent = negative ? `-${frac(String(exp), String(root))}` : frac(String(exp), String(root));
    const prompt = power(String(base), exponent);
    const result = negative ? fracTex(1, value) : String(value);

    return {
      instruction: 'Work out',
      prompt,
      note: 'Give the exact value.',
      answers: [answer(result, { keyboard: 'numeric', kind: 'number' })],
      solution: [
        ...(negative
          ? [
              step(
                'negative-exponent',
                'Negative exponent flips it',
                frac('1', power(String(base), frac(String(exp), String(root)))),
              ),
            ]
          : []),
        step('fractional-exponent', 'Root first, then power', negative ? frac('1', power(`\\sqrt[${root}]{${base}}`, exp)) : power(`\\sqrt[${root}]{${base}}`, exp)),
        step('fractional-exponent', 'Evaluate', result, `\\sqrt[${root}]{${base}} = ${rootValue}.`),
      ],
      ruleIds: negative ? ['fractional-exponent', 'negative-exponent'] : ['fractional-exponent'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};

/**
 * An equation with the unknown under a root. Squaring is the only way in, and
 * squaring is exactly the step that can invent a solution that was never there
 * — so the check at the end is part of the method, not an optional tidy-up.
 */
export const rootEquation: Generator = {
  id: 'roots.equation',
  chapter: 4,
  title: 'Equations with a root',
  tags: ['roots', 'solve'],
  version: 1,
  supports: TIERS,
  invariant: 'solution-set-preserving',

  generate({ tier, rng }): Draft {
    if (tier === 'hard') {
      // √(x + a) = x − b, built backwards from the root it is meant to have.
      const b = rng.int(0, 3);
      // t = 1 would put the second root at x = b, where the right-hand side is
      // zero — a perfectly good solution, and then the question has two.
      const t = rng.int(2, 4);
      const r = b + t;
      const a = t * t - r;
      const equation = `${rootOf(poly([[1, 1], [a, 0]]))} = ${poly([[1, 1], [-b, 0]])}`;
      const other = 2 * b + 1 - r;
      return {
        instruction: 'Solve for x',
        prompt: equation,
        note: 'Check every solution in the original equation.',
        answers: [answer(String(r), { keyboard: 'numeric', kind: 'number' })],
        solution: [
          step(
            'root-equation',
            'Square both sides',
            `${poly([[1, 1], [a, 0]])} = ${poly([[1, 2], [-2 * b, 1], [b * b, 0]])}`,
          ),
          setup(
            'quadratic-formula',
            'Solve the quadratic',
            `x = ${r} \\quad\\text{or}\\quad x = ${other}`,
          ),
          step(
            'root-equation',
            'Check both',
            `x = ${r}`,
            `x = ${other} makes the right-hand side negative, and a square root never is — so it is not a solution of the original equation.`,
          ),
        ],
        ruleIds: ['root-equation', 'quadratic-formula'],
        verify: { kind: 'root', equation, wrt: 'x' },
      };
    }

    // √(ax + b) = c, with c positive so the equation has a solution at all.
    const a = rng.int(1, 5);
    const c = rng.int(2, 7);
    const b = rng.nonZero(-8, 8);
    const equation = `${rootOf(poly([[a, 1], [b, 0]]))} = ${c}`;
    const result = fracTex(c * c - b, a);

    return {
      instruction: 'Solve for x',
      prompt: equation,
      note: 'Give the exact value.',
      answers: [answer(result, { keyboard: 'numeric', kind: 'number' })],
      solution: [
        step(
          'root-equation',
          'Square both sides',
          `${poly([[a, 1], [b, 0]])} = ${c * c}`,
          'The right-hand side is positive, so squaring is safe here.',
        ),
        step('linear-solve', 'Isolate x', `x = ${result}`),
      ],
      ruleIds: ['root-equation', 'linear-solve'],
      verify: { kind: 'root', equation, wrt: 'x' },
    };
  },
};

/** Absolute value: two cases, because the bars threw the sign away. */
export const absoluteValue: Generator = {
  id: 'roots.absolute-value',
  chapter: 4,
  title: 'Absolute value equations',
  tags: ['absolute-value', 'solve'],
  version: 1,
  supports: TIERS,
  invariant: 'solution-set-preserving',

  generate({ tier, rng }): Draft {
    const a = tier === 'easy' ? 1 : rng.int(2, 5);
    const b = rng.nonZero(-9, 9);
    const c = rng.int(1, 9);
    const inner = poly([[a, 1], [b, 0]]);
    const equation = `\\left|${inner}\\right| = ${c}`;
    const first = fracTex(c - b, a);
    const second = fracTex(-c - b, a);

    return {
      instruction: 'Solve for x',
      prompt: equation,
      note: 'There are two solutions. Give the larger one first.',
      answers: [
        answer(first, { label: 'larger', keyboard: 'numeric', kind: 'number' }),
        answer(second, { label: 'smaller', keyboard: 'numeric', kind: 'number' }),
      ],
      solution: [
        setup(
          'absolute-value',
          'Two cases',
          `${inner} = ${c} \\quad\\text{or}\\quad ${inner} = ${-c}`,
          'Whatever is inside the bars has size ' + c + ', so it is either ' + c + ' or ' + -c + '.',
        ),
        setup('linear-solve', 'Solve each', `x = ${first} \\quad\\text{or}\\quad x = ${second}`),
      ],
      ruleIds: ['absolute-value', 'linear-solve'],
      verify: { kind: 'root', equation, wrt: 'x' },
    };
  },
};

/**
 * Rationalising with a letter under the root. The numeric version can be done
 * by recognising the answer; this one cannot, so it is the one that shows
 * whether the method is actually there.
 */
export const rationaliseSymbolic: Generator = {
  id: 'roots.rationalise-symbolic',
  chapter: 4,
  title: 'Rationalising with letters',
  tags: ['roots', 'rationalise', 'algebra'],
  version: 1,
  supports: ['medium', 'hard'] as const,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const a = rng.nonZero(-7, 8);

    if (tier === 'medium') {
      const prompt = frac(String(a), rootOf('x'));
      const result = frac(term(a, rootOf('x')), 'x');
      return {
        instruction: 'Rationalise the denominator',
        prompt,
        note: 'x is positive.',
        answers: [answer(result, { keyboard: 'algebra' })],
        solution: [
          step(
            'rationalise',
            'Multiply top and bottom by √x',
            frac(term(a, rootOf('x')), `${rootOf('x')}${rootOf('x')}`),
          ),
          step('fraction-simplify', 'The bottom loses its root', result, '√x · √x is just x.'),
        ],
        ruleIds: ['rationalise', 'fraction-simplify'],
        verify: { kind: 'identity', of: prompt },
      };
    }

    // b ≥ 3 keeps the pole at x = b² well away from anything he would try.
    const b = rng.int(3, 6);
    const prompt = frac(String(a), `${rootOf('x')} + ${b}`);
    const numerator = `${term(a, `\\left(${rootOf('x')} - ${b}\\right)`)}`;
    const result = frac(numerator, poly([[1, 1], [-(b * b), 0]]));

    return {
      instruction: 'Rationalise the denominator',
      prompt,
      note: `x is positive and not ${b * b}.`,
      answers: [answer(result, { keyboard: 'algebra' })],
      solution: [
        step(
          'rationalise',
          'Multiply by the conjugate',
          frac(numerator, `\\left(${rootOf('x')} + ${b}\\right)\\left(${rootOf('x')} - ${b}\\right)`),
          'The conjugate is the same two terms with the sign between them flipped.',
        ),
        step(
          'difference-of-squares',
          'Difference of squares',
          result,
          `The bottom becomes x - ${b * b}, with no root left in it.`,
        ),
      ],
      ruleIds: ['rationalise', 'difference-of-squares'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};

/**
 * Same base on both sides, so the exponents can simply be equated. The book
 * puts this in the powers chapter, long before logarithms — and it is the
 * quickest way to solve an exponential equation when it works.
 */
export const sameBaseEquation: Generator = {
  id: 'roots.same-base',
  chapter: 4,
  title: 'Same base, equal exponents',
  tags: ['exponents', 'solve'],
  version: 1,
  supports: TIERS,
  invariant: 'solution-set-preserving',

  generate({ tier, rng }): Draft {
    const base = rng.pick([2, 3, 5]);

    if (tier === 'hard') {
      // Different-looking bases that are powers of the same number: 4^x = 8.
      const m = rng.int(2, 3);
      const n = rng.int(2, 5);
      const equation = `${power(String(base ** m), 'x')} = ${power(String(base), n)}`;
      const result = fracTex(n, m);
      return {
        instruction: 'Solve for x',
        prompt: equation,
        note: 'Give the exact value.',
        answers: [answer(result, { keyboard: 'numeric', kind: 'number' })],
        solution: [
          setup(
            'exponential-equation',
            'Write both sides to the same base',
            `${power(paren(power(String(base), m)), 'x')} = ${power(String(base), n)}`,
            `${base ** m} is ${base}^{${m}}.`,
          ),
          setup('power-rules', 'Nested powers multiply', `${base}^{${m}x} = ${base}^{${n}}`),
          step('exponential-equation', 'Equate the exponents', `${m}x = ${n}`),
          step('linear-solve', 'Divide', `x = ${result}`),
        ],
        ruleIds: ['exponential-equation', 'power-rules', 'linear-solve'],
        verify: { kind: 'root', equation, wrt: 'x' },
      };
    }

    const a = tier === 'easy' ? 1 : rng.int(2, 3);
    const b = rng.nonZero(-4, 4);
    const n = rng.int(1, 5);
    const exponent = poly([[a, 1], [b, 0]]);
    const equation = `${power(String(base), exponent)} = ${power(String(base), n)}`;
    const result = fracTex(n - b, a);

    return {
      instruction: 'Solve for x',
      prompt: equation,
      note: `Give the exact value. ${base ** n} is ${base}^{${n}}.`,
      answers: [answer(result, { keyboard: 'numeric', kind: 'number' })],
      solution: [
        step(
          'exponential-equation',
          'Equate the exponents',
          `${exponent} = ${n}`,
          'Same base on both sides, and the function only takes each value once — so the exponents match.',
        ),
        step('linear-solve', 'Isolate x', `x = ${result}`),
      ],
      ruleIds: ['exponential-equation', 'linear-solve'],
      verify: { kind: 'root', equation, wrt: 'x' },
    };
  },
};
