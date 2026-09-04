import { answer, fracTex, paren, poly, step } from '../authoring.js';
import type { Draft, Generator } from '../types.js';

export const linearEquation: Generator = {
  id: 'equations.linear',
  chapter: 8,
  title: 'Linear equations',
  tags: ['linear', 'solve'],
  version: 1,
  supports: { steps: [1, 4], difficulty: [1, 3] },
  invariant: 'solution-set-preserving',

  generate({ difficulty, rng }): Draft {
    const a = rng.nonZero(-9, 9);
    let c = difficulty >= 2 ? rng.nonZero(-9, 9) : 0;
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
  supports: { steps: [2, 5], difficulty: [2, 5] },
  invariant: 'solution-set-preserving',

  generate({ difficulty, rng }): Draft {
    // Built from its roots, so the answers stay exact and the discriminant is a square.
    const r1 = rng.nonZero(-9, 9);
    let r2 = rng.nonZero(-9, 9);
    while (r2 === r1) r2 = rng.nonZero(-9, 9);
    const a = difficulty >= 4 ? rng.int(2, 4) : 1;

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
