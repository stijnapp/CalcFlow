import { answer, fracTex, paren, poly, power, step, times } from '../authoring.js';
import type { Draft, Generator } from '../types.js';

export const antiderivativePower: Generator = {
  id: 'anti.power-sum',
  chapter: 10,
  title: 'Antiderivative of a polynomial',
  tags: ['antiderivative', 'power-rule'],
  version: 1,
  supports: { steps: [1, 4], difficulty: [1, 4] },
  invariant: 'value-preserving',

  generate({ steps, difficulty, rng }): Draft {
    const count = Math.min(1 + Math.floor(steps / 2), 3);
    const exponents = new Set<number>();
    while (exponents.size < count) exponents.add(rng.int(difficulty >= 3 ? 1 : 0, 4));
    const pairs = [...exponents]
      .sort((a, b) => b - a)
      .map((p) => [rng.nonZero(-6, 8), p] as [number, number]);

    const integrand = poly(pairs);
    // Coefficients stay as fractions so nothing is rounded away.
    const antiTerms = pairs.map(([c, p]) => times(fracTex(c, p + 1), power('x', p + 1)));
    const anti = antiTerms.reduce((acc, t) => (t.startsWith('-') ? `${acc} - ${t.slice(1)}` : `${acc} + ${t}`));
    const result = `${anti} + C`;

    return {
      instruction: 'Find the antiderivative',
      prompt: `\\int ${integrand}\\,dx`,
      note: 'Do not forget the constant of integration.',
      answers: [
        answer(result, {
          keyboard: 'calculus',
          requires: { plusC: true },
          upToConstant: true,
        }),
      ],
      solution: [
        step('antiderivative-power', 'Raise the power, divide by the new one', anti),
        step('plus-c', 'Add the constant', result),
      ],
      ruleIds: ['antiderivative-power', 'plus-c'],
      verify: { kind: 'antiderivative', of: integrand, wrt: 'x' },
    };
  },
};

export const linearInner: Generator = {
  id: 'anti.linear-inner',
  chapter: 10,
  title: 'Linear inner function',
  tags: ['antiderivative', 'substitution'],
  version: 1,
  supports: { steps: [2, 5], difficulty: [2, 5] },
  invariant: 'value-preserving',

  generate({ difficulty, rng }): Draft {
    const a = rng.nonZero(-5, 5);
    const b = rng.nonZero(-8, 8);
    const inner = poly([[a, 1], [b, 0]]);
    const shape = rng.pick(difficulty >= 4 ? ['power', 'exp', 'sin'] : ['power', 'exp']);

    let integrand: string;
    let anti: string;
    if (shape === 'power') {
      const n = rng.int(2, 5);
      integrand = power(paren(inner), n);
      anti = `${fracTex(1, a * (n + 1))}${power(paren(inner), n + 1)}`;
    } else if (shape === 'exp') {
      integrand = `e^{${inner}}`;
      anti = `${fracTex(1, a)}e^{${inner}}`;
    } else {
      integrand = `\\sin${paren(inner)}`;
      anti = `${fracTex(-1, a)}\\cos${paren(inner)}`;
    }
    const result = `${anti} + C`;

    return {
      instruction: 'Find the antiderivative',
      prompt: `\\int ${integrand}\\,dx`,
      note: 'Do not forget the constant of integration.',
      answers: [
        answer(result, { keyboard: 'calculus', requires: { plusC: true }, upToConstant: true }),
      ],
      solution: [
        step(
          'linear-substitution',
          'Antidifferentiate the outside',
          anti,
          `The inside is linear with derivative ${a}, so divide by ${a}.`,
        ),
        step('plus-c', 'Add the constant', result),
      ],
      ruleIds: ['linear-substitution', 'plus-c'],
      verify: { kind: 'antiderivative', of: integrand, wrt: 'x' },
    };
  },
};
