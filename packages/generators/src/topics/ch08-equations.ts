import { TIERS } from '@calcflow/shared';
import { answer, aside, frac, fracTex, paren, poly, setup, step, term } from '../authoring.js';
import type { Draft, Generator } from '../types.js';

export const linearEquation: Generator = {
  id: 'equations.linear',
  chapter: 8,
  title: 'Linear equations',
  tags: ['linear', 'solve'],
  version: 1,
  supports: TIERS,
  invariant: 'solution-set-preserving',

  generate({ tier, rng }): Draft {
    const a = rng.nonZero(-9, 9);
    let c = tier !== 'easy' ? rng.nonZero(-9, 9) : 0;
    while (c === a) c = rng.nonZero(-9, 9);
    const b = rng.nonZero(-12, 12);
    const d = rng.nonZero(-12, 12);

    const lhs = poly([[a, 1], [b, 0]]);
    const rhs = c === 0 ? String(d) : poly([[c, 1], [d, 0]]);
    const equation = `${lhs} = ${rhs}`;
    const result = fracTex(d - b, a - c);

    return {
      instruction: 'Solve for x',
      prompt: equation,
      note: 'Give the exact value.',
      answers: [answer(result, { keyboard: 'numeric', kind: 'number' })],
      solution: [
        step('linear-solve', 'Collect the x terms', `${poly([[a - c, 1]])} = ${d - b}`),
        step('linear-solve', 'Divide', result),
      ],
      ruleIds: ['linear-solve'],
      verify: { kind: 'root', equation, wrt: 'x' },
    };
  },
};

export const quadraticEquation: Generator = {
  id: 'equations.quadratic',
  chapter: 8,
  title: 'Quadratic equations',
  tags: ['quadratic', 'solve', 'factoring'],
  version: 1,
  supports: TIERS,
  invariant: 'solution-set-preserving',

  generate({ tier, rng }): Draft {
    // Built from its roots, so the answers stay exact and the discriminant is a square.
    const r1 = rng.nonZero(-9, 9);
    let r2 = rng.nonZero(-9, 9);
    while (r2 === r1) r2 = rng.nonZero(-9, 9);
    const a = tier === 'hard' ? rng.int(2, 4) : 1;

    const [lo, hi] = r1 < r2 ? [r1, r2] : [r2, r1];
    const b = -a * (r1 + r2);
    const c = a * r1 * r2;
    const equation = `${poly([[a, 2], [b, 1], [c, 0]])} = 0`;

    // Both lines carry ± or a pair of roots, so neither is a single equation the
    // harness can substitute into. Shown, not checked.
    const formulaLine = step(
      'quadratic-formula',
      'Quadratic formula',
      `x = \\frac{${-b} \\pm \\sqrt{${b * b - 4 * a * c}}}{${2 * a}}`,
      `The discriminant is ${b}² − 4·${a}·${c} = ${b * b - 4 * a * c}.`,
    );
    formulaLine.display = true;
    const rootsLine = step(
      'quadratic-formula',
      'Both roots',
      `x = ${lo} \\quad\\text{or}\\quad x = ${hi}`,
    );
    rootsLine.display = true;

    return {
      instruction: 'Solve for x',
      prompt: equation,
      note: 'Two solutions. Give the smaller one first.',
      answers: [
        answer(String(lo), { label: 'smaller x', keyboard: 'numeric', kind: 'number' }),
        answer(String(hi), { label: 'larger x', keyboard: 'numeric', kind: 'number' }),
      ],
      solution: [formulaLine, rootsLine],
      ruleIds: ['quadratic-formula', 'notable-products'],
      verify: { kind: 'root', equation, wrt: 'x' },
    };
  },
};

/**
 * Where an expression is positive or negative, rather than where it is zero.
 * The sign can only change at a root, so the roots are still the thing to find
 * — and dividing by a negative turns the whole question round.
 */
export const inequality: Generator = {
  id: 'equations.inequality',
  chapter: 8,
  title: 'Inequalities',
  tags: ['inequality', 'solve'],
  version: 1,
  supports: TIERS,
  invariant: 'solution-set-preserving',

  generate({ tier, rng }): Draft {
    if (tier === 'easy') {
      // A negative coefficient, so solving it turns the sign round.
      const a = -rng.int(2, 7);
      const b = rng.nonZero(-9, 9);
      const c = rng.nonZero(-20, 20);
      const equation = `${poly([[a, 1], [b, 0]])} = ${c}`;
      const result = fracTex(c - b, a);
      return {
        instruction: 'Solve the inequality',
        prompt: `${poly([[a, 1], [b, 0]])} > ${c}`,
        note: 'The answer has the form x < k. Give k exactly.',
        answers: [answer(result, { label: 'k', keyboard: 'numeric', kind: 'number' })],
        solution: [
          setup('linear-solve', 'Get the x term alone', `${poly([[a, 1]])} > ${c - b}`),
          setup(
            'inequality',
            `Divide by ${a} — and turn the sign round`,
            `x < ${result}`,
            'Dividing by a negative reverses the inequality. This is the one step that is different from solving an equation.',
          ),
        ],
        ruleIds: ['inequality', 'linear-solve'],
        verify: { kind: 'root', equation, wrt: 'x' },
      };
    }

    // A quadratic, negative exactly between its two roots.
    const r1 = rng.int(-7, 3);
    const r2 = r1 + rng.int(1, 6);
    const equation = `${poly([[1, 2], [-(r1 + r2), 1], [r1 * r2, 0]])} = 0`;

    return {
      instruction: 'Solve the inequality',
      prompt: `${poly([[1, 2], [-(r1 + r2), 1], [r1 * r2, 0]])} < 0`,
      note: 'It holds on one interval. Give the two endpoints, smaller first.',
      answers: [
        answer(String(r1), { label: 'from', keyboard: 'numeric', kind: 'number' }),
        answer(String(r2), { label: 'to', keyboard: 'numeric', kind: 'number' }),
      ],
      solution: [
        setup(
          'inequality',
          'Find the roots first',
          `x = ${r1} \\quad\\text{or}\\quad x = ${r2}`,
          'The sign can only change where the expression is zero.',
        ),
        setup(
          'inequality',
          'Which side is negative',
          `${r1} < x < ${r2}`,
          'The parabola opens upwards, so it dips below the axis between the roots and is positive outside them.',
        ),
      ],
      ruleIds: ['inequality', 'quadratic-formula'],
      verify: { kind: 'root', equation, wrt: 'x' },
    };
  },
};

/**
 * The quadratic rewritten so that x appears once instead of twice. That is what
 * makes the vertex readable, and it is where the quadratic formula comes from.
 */
export const completeTheSquare: Generator = {
  id: 'equations.complete-square',
  chapter: 8,
  title: 'Completing the square',
  tags: ['quadratic', 'algebra'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    // Even b at the easier tiers, so the half is a whole number.
    const half = rng.nonZero(-6, 6);
    const b = tier === 'hard' ? rng.nonZero(-9, 9) : 2 * half;
    const c = rng.nonZero(-15, 15);
    const prompt = poly([[1, 2], [b, 1], [c, 0]]);
    const left = `\\left(x ${b < 0 ? '-' : '+'} ${fracTex(Math.abs(b), 2)}\\right)^{2}`;
    const constant = fracTex(4 * c - b * b, 4);
    const result = `${left} ${constant.startsWith('-') ? `- ${constant.slice(1)}` : `+ ${constant}`}`;

    return {
      instruction: 'Write in the form (x + p)² + q',
      prompt,
      note: 'Give p and q exactly, as fractions if they are not whole.',
      answers: [answer(result)],
      solution: [
        setup(
          'completing-square',
          'Half the coefficient of x',
          `${left} = ${poly([[1, 2], [b, 1]])} + ${fracTex(b * b, 4)}`,
          `Half of ${b} is ${fracTex(b, 2)}, and squaring the bracket puts ${fracTex(b * b, 4)} in that was never there.`,
        ),
        step(
          'completing-square',
          'Subtract what the bracket added',
          result,
          `${c} - ${fracTex(b * b, 4)} = ${constant}.`,
        ),
      ],
      ruleIds: ['completing-square'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};

/** Two equations, two unknowns — eliminate one, then substitute back. */
export const linearSystem: Generator = {
  id: 'equations.system',
  chapter: 8,
  title: 'Systems of equations',
  tags: ['linear', 'system', 'solve'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    // Built from the solution, so both answers are whole numbers.
    const x0 = rng.nonZero(-6, 6);
    const y0 = rng.nonZero(-6, 6);
    const a = rng.nonZero(-5, 5);
    const b = tier === 'easy' ? 1 : rng.nonZero(-5, 5);
    let d = rng.nonZero(-5, 5);
    let e = rng.nonZero(-5, 5);
    // A zero determinant would mean no unique solution — or none at all.
    while (a * e - b * d === 0) {
      d = rng.nonZero(-5, 5);
      e = rng.nonZero(-5, 5);
    }
    const p = a * x0 + b * y0;
    const q = d * x0 + e * y0;

    const first = `${poly([[a, 1]])} ${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}y = ${p}`;
    const second = `${poly([[d, 1]])} ${e < 0 ? '-' : '+'} ${Math.abs(e) === 1 ? '' : Math.abs(e)}y = ${q}`;

    return {
      instruction: 'Solve for x and y',
      prompt: `\\begin{cases} ${first} \\\\ ${second} \\end{cases}`,
      note: 'Both answers are whole numbers.',
      answers: [
        answer(String(x0), { label: 'x', keyboard: 'numeric', kind: 'number' }),
        answer(String(y0), { label: 'y', keyboard: 'numeric', kind: 'number' }),
      ],
      solution: [
        aside(
          'Eliminate y',
          `${e} \\cdot \\left(${first}\\right) - ${b} \\cdot \\left(${second}\\right)`,
          `Multiplying the first by ${e} and the second by ${b} gives both of them the same y term, so subtracting kills it.`,
        ),
        aside('One unknown left', `${poly([[a * e - b * d, 1]])} = ${e * p - b * q}`),
        aside('Solve, then substitute back', `x = ${x0},\\quad y = ${y0}`),
      ],
      ruleIds: ['linear-system', 'linear-solve'],
    };
  },
};

/**
 * A quadratic whose roots are not whole numbers. Factoring will not find them,
 * which is the point: this is where the formula earns its place.
 */
export const irrationalRoots: Generator = {
  id: 'equations.irrational-roots',
  chapter: 8,
  title: 'Roots that are not whole',
  tags: ['quadratic', 'solve', 'roots'],
  version: 1,
  supports: ['medium', 'hard'] as const,
  invariant: 'solution-set-preserving',

  generate({ tier, rng }): Draft {
    const isSquare = (n: number): boolean => Number.isInteger(Math.sqrt(n));
    const a = tier === 'hard' ? rng.int(2, 3) : 1;
    let b = rng.nonZero(-9, 9);
    let c = rng.nonZero(-9, 9);
    let disc = b * b - 4 * a * c;
    // Two real roots, and irrational ones — otherwise it is the other generator.
    while (disc <= 0 || isSquare(disc)) {
      b = rng.nonZero(-9, 9);
      c = rng.nonZero(-9, 9);
      disc = b * b - 4 * a * c;
    }

    const equation = `${poly([[a, 2], [b, 1], [c, 0]])} = 0`;
    const smaller = frac(`${-b} - \\sqrt{${disc}}`, String(2 * a));
    const larger = frac(`${-b} + \\sqrt{${disc}}`, String(2 * a));

    return {
      instruction: 'Solve for x',
      prompt: equation,
      note: 'Two solutions, exact — leave the root in. Give the smaller one first.',
      answers: [
        answer(smaller, { label: 'smaller x', keyboard: 'numeric', kind: 'number' }),
        answer(larger, { label: 'larger x', keyboard: 'numeric', kind: 'number' }),
      ],
      solution: [
        aside(
          'The discriminant',
          `D = ${b}^{2} - 4\\cdot${a}\\cdot${c} = ${disc}`,
          `${disc} is positive but not a square, so there are two solutions and neither is whole.`,
        ),
        setup(
          'quadratic-formula',
          'Quadratic formula',
          `x = \\frac{${-b} \\pm \\sqrt{${disc}}}{${2 * a}}`,
          'No factoring will find these — the formula is the only way in.',
        ),
      ],
      ruleIds: ['quadratic-formula'],
      verify: { kind: 'root', equation, wrt: 'x' },
    };
  },
};

/** A quartic that is a quadratic wearing a disguise. */
export const substitutionQuadratic: Generator = {
  id: 'equations.substitution',
  chapter: 8,
  title: 'Quadratic in disguise',
  tags: ['quadratic', 'substitution', 'solve'],
  version: 1,
  supports: ['hard'] as const,
  invariant: 'solution-set-preserving',

  generate({ rng }): Draft {
    // x⁴ − (m²+n²)x² + m²n² = 0, whose roots are ±m and ±n.
    const m = rng.int(1, 4);
    let n = rng.int(1, 5);
    while (n === m) n = rng.int(1, 5);
    const [lo, hi] = m < n ? [m, n] : [n, m];
    const equation = `x^{4} - ${m * m + n * n}x^{2} + ${m * m * n * n} = 0`;

    return {
      instruction: 'Solve for x',
      prompt: equation,
      note: 'There are four solutions, in ± pairs. Give the two positive ones, smaller first.',
      answers: [
        answer(String(lo), { label: 'smaller', keyboard: 'numeric', kind: 'number' }),
        answer(String(hi), { label: 'larger', keyboard: 'numeric', kind: 'number' }),
      ],
      solution: [
        setup(
          'quadratic-formula',
          'Substitute u = x²',
          `u^{2} - ${m * m + n * n}u + ${m * m * n * n} = 0`,
          'There is no x³ and no x term, so every power of x that appears is a power of x².',
        ),
        setup('quadratic-formula', 'Solve for u', `u = ${lo * lo} \\quad\\text{or}\\quad u = ${hi * hi}`),
        setup(
          'root-equation',
          'Back to x',
          `x = \\pm ${lo} \\quad\\text{or}\\quad x = \\pm ${hi}`,
          'Each positive value of u gives two values of x. A negative one would give none.',
        ),
      ],
      ruleIds: ['quadratic-formula', 'root-equation'],
      verify: { kind: 'root', equation, wrt: 'x' },
    };
  },
};

/**
 * The equation written in words, which is how every applied question arrives.
 * Naming the unknown and writing the sentence as an equation is most of the
 * work; the solving is chapter 8's ordinary business.
 */
export const wordProblem: Generator = {
  id: 'equations.word-problem',
  chapter: 8,
  title: 'Word problems',
  tags: ['quadratic', 'word-problem', 'solve'],
  version: 1,
  supports: ['medium', 'hard'] as const,
  invariant: 'solution-set-preserving',

  generate({ tier, rng }): Draft {
    const kind = tier === 'hard' ? rng.pick(['rectangle', 'consecutive', 'fence']) : rng.pick(['rectangle', 'consecutive']);

    if (kind === 'consecutive') {
      const n = rng.int(4, 20);
      const product = n * (n + 1);
      const equation = `x\\left(x + 1\\right) = ${product}`;
      return {
        instruction: 'Find the smaller number',
        prompt: equation,
        promptText: `Two consecutive whole numbers multiply to ${product}. What is the smaller one?`,
        note: 'Both numbers are positive.',
        answers: [answer(String(n), { keyboard: 'numeric', kind: 'number' })],
        solution: [
          aside('Name the unknown', `x = \\text{the smaller number}`, 'Then the next one is x + 1.'),
          setup('quadratic-formula', 'As an equation', `x^{2} + x - ${product} = 0`),
          setup(
            'quadratic-formula',
            'Solve, and throw one away',
            `x = ${n} \\quad\\text{or}\\quad x = ${-(n + 1)}`,
            `${-(n + 1)} is a solution of the equation but not of the question — the numbers are positive.`,
          ),
        ],
        ruleIds: ['quadratic-formula', 'linear-solve'],
        verify: { kind: 'root', equation, wrt: 'x' },
      };
    }

    if (kind === 'fence') {
      // Perimeter fixed, area given: x(P/2 − x) = A.
      const w = rng.int(3, 12);
      const l = w + rng.int(1, 9);
      const perimeter = 2 * (w + l);
      const area = w * l;
      const equation = `x\\left(${perimeter / 2} - x\\right) = ${area}`;
      return {
        instruction: 'Find the shorter side',
        prompt: equation,
        promptText: `A rectangular pen is fenced with ${perimeter} m of fencing and encloses ${area} m². How long is the shorter side?`,
        note: 'Give the length in metres.',
        answers: [answer(String(w), { keyboard: 'numeric', kind: 'number' })],
        solution: [
          aside(
            'Name the unknown',
            `x = \\text{the shorter side}`,
            `The two sides add to ${perimeter / 2}, so the other one is ${perimeter / 2} - x.`,
          ),
          setup('quadratic-formula', 'As an equation', `x^{2} - ${perimeter / 2}x + ${area} = 0`),
          setup(
            'quadratic-formula',
            'Solve, and pick the shorter',
            `x = ${w} \\quad\\text{or}\\quad x = ${l}`,
            'Both are real sides of the same rectangle — the question asked for the shorter one.',
          ),
        ],
        ruleIds: ['quadratic-formula', 'linear-solve'],
        verify: { kind: 'root', equation, wrt: 'x' },
      };
    }

    const w = rng.int(2, 12);
    const k = rng.int(1, 9);
    const area = w * (w + k);
    const equation = `x\\left(x + ${k}\\right) = ${area}`;
    return {
      instruction: 'Find the width',
      prompt: equation,
      promptText: `A rectangle is ${k} cm longer than it is wide, and its area is ${area} cm². How wide is it?`,
      note: 'Give the width in centimetres.',
      answers: [answer(String(w), { keyboard: 'numeric', kind: 'number' })],
      solution: [
        aside('Name the unknown', `x = \\text{the width}`, `Then the length is x + ${k}.`),
        setup('quadratic-formula', 'As an equation', `x^{2} + ${k}x - ${area} = 0`),
        setup(
          'quadratic-formula',
          'Solve, and throw one away',
          `x = ${w} \\quad\\text{or}\\quad x = ${-(w + k)}`,
          'A width cannot be negative, so only one of the two is an answer to the question.',
        ),
      ],
      ruleIds: ['quadratic-formula', 'linear-solve'],
      verify: { kind: 'root', equation, wrt: 'x' },
    };
  },
};

/**
 * Long division, and the factor theorem that follows from it. From the course's
 * assignment 2, which opens with it: dividing is how a cubic gets factorised
 * once one root is known, and the remainder is how you find out whether it is
 * a root at all.
 */
export const longDivision: Generator = {
  id: 'equations.long-division',
  chapter: 8,
  title: 'Polynomial long division',
  tags: ['long-division', 'factor-theorem'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const r = rng.nonZero(-4, 4);
    // Build the quotient first, then multiply out — so the division has a clean
    // answer by construction and the remainder is exactly what was added on.
    const [q2, q1, q0] = [1, rng.nonZero(-5, 5), rng.nonZero(-8, 8)];
    const remainder = tier === 'easy' ? 0 : rng.nonZero(-9, 9);

    // (x - r)(x² + q1 x + q0) + remainder
    const c3 = q2;
    const c2 = q1 - r * q2;
    const c1 = q0 - r * q1;
    const c0 = -r * q0 + remainder;
    const dividend = poly([[c3, 3], [c2, 2], [c1, 1], [c0, 0]]);
    const divisor = poly([[1, 1], [-r, 0]]);
    const quotient = poly([[q2, 2], [q1, 1], [q0, 0]]);

    return {
      instruction: 'Divide, and give the quotient',
      prompt: `\\frac{${dividend}}{${divisor}}`,
      promptText:
        remainder === 0
          ? `Divide ${dividend} by ${divisor}. The remainder is 0, so ${r} is a root.`
          : `Divide ${dividend} by ${divisor} and give the quotient. The remainder is ${remainder}.`,
      note: 'Just the quotient — the remainder is already given.',
      answers: [answer(quotient, { keyboard: 'algebra' })],
      solution: [
        setup(
          'polynomial-division',
          'What multiplies x to give the leading term',
          `x^{2}`,
          `x² · (${divisor}) = ${poly([[1, 3], [-r, 2]])}, and subtracting that clears the x³.`,
        ),
        setup(
          'polynomial-division',
          'What is left after the first subtraction',
          poly([[q1, 2], [c1, 1], [c0, 0]]),
          `${c2} - (${-r}) = ${q1}, and the rest comes down unchanged.`,
        ),
        setup(
          'polynomial-division',
          'Repeat twice more',
          `${term(q1, 'x')}, \\text{ then } ${q0}`,
          'Each round kills the current leading term; the degree drops by one each time.',
        ),
        step(
          'polynomial-division',
          'The quotient',
          quotient,
          remainder === 0
            ? `Nothing is left over, so ${divisor} is a factor and x = ${r} is a root — that is the factor theorem.`
            : `${remainder} is left over, so ${divisor} is not a factor and x = ${r} is not a root.`,
        ),
      ],
      ruleIds: ['polynomial-division', 'quadratic-formula'],
      verify: { kind: 'identity', of: frac(`${dividend} ${remainder < 0 ? '+' : '-'} ${Math.abs(remainder)}`, divisor) },
    };
  },
};
