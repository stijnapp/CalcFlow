import { answer, frac, fracTex, paren, poly, power, step } from '../authoring.js';
import type { Draft, Generator } from '../types.js';

export const logLaws: Generator = {
  id: 'logs.laws',
  chapter: 6,
  title: 'Log laws',
  tags: ['log-laws', 'logarithms'],
  version: 1,
  supports: { steps: [1, 4], difficulty: [1, 4] },
  invariant: 'value-preserving',

  generate({ difficulty, rng }): Draft {
    if (difficulty >= 3) {
      // e^{k ln x} unwinds to x^k.
      const k = rng.int(2, 5);
      const prompt = `e^{${k}\\ln x}`;
      const result = power('x', k);
      return {
        instruction: 'Simplify',
        prompt,
        note: 'x is positive.',
        answers: [answer(result, { keyboard: 'logs' })],
        solution: [
          step('log-laws', 'Take the coefficient inside', `e^{\\ln${paren(power('x', k))}}`, 'n log x = log(xⁿ).'),
          step('exp-log-inverse', 'exp and ln cancel', result),
        ],
        ruleIds: ['log-laws', 'exp-log-inverse'],
        verify: { kind: 'identity', of: prompt },
      };
    }

    const a = rng.int(2, 9);
    const b = rng.int(2, 9);
    const prompt = `\\ln ${a} + \\ln ${b}`;
    const result = `\\ln ${a * b}`;
    return {
      instruction: 'Write as a single logarithm',
      prompt,
      answers: [answer(result, { keyboard: 'logs' })],
      solution: [step('log-laws', 'A sum of logs is the log of a product', result)],
      ruleIds: ['log-laws'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};

export const exponentialEquation: Generator = {
  id: 'logs.exponential-equation',
  chapter: 6,
  title: 'Exponential equations',
  tags: ['exponential', 'logarithms', 'solve'],
  version: 1,
  supports: { steps: [2, 5], difficulty: [2, 5] },
  invariant: 'solution-set-preserving',

  generate({ difficulty, rng }): Draft {
    if (difficulty >= 4) {
      // 5^{x+1} = 7^{x-1} — logs on both sides, then collect x.
      const a = rng.pick([2, 3, 5, 7]);
      let b = rng.pick([2, 3, 5, 7, 11]);
      while (b === a) b = rng.pick([2, 3, 5, 7, 11]);
      const p = rng.nonZero(-3, 3);
      const q = rng.nonZero(-3, 3);
      const equation = `${power(String(a), poly([[1, 1], [p, 0]]))} = ${power(String(b), poly([[1, 1], [q, 0]]))}`;
      // x ln a + p ln a = x ln b + q ln b  →  x = (q ln b − p ln a)/(ln a − ln b)
      const result = frac(`${q}\\ln ${b} - ${p}\\ln ${a}`, `\\ln ${a} - \\ln ${b}`);
      return {
        instruction: 'Solve for x',
        prompt: equation,
        note: 'Give the exact value.',
        answers: [answer(result, { keyboard: 'logs' })],
        solution: [
          step('log-laws', 'Take ln of both sides', `${paren(poly([[1, 1], [p, 0]]))}\\ln ${a} = ${paren(poly([[1, 1], [q, 0]]))}\\ln ${b}`),
          step('linear-solve', 'Collect the x terms', `x${paren(`\\ln ${a} - \\ln ${b}`)} = ${q}\\ln ${b} - ${p}\\ln ${a}`),
          step('linear-solve', 'Divide', result),
        ],
        ruleIds: ['log-laws', 'exponential-equation', 'linear-solve'],
        verify: { kind: 'root', equation, wrt: 'x' },
      };
    }

    // a·e^{kx} = m
    const a = rng.int(2, 9);
    const k = rng.nonZero(-3, 4);
    const m = rng.int(2, 40);
    const equation = `${a}e^{${k === 1 ? 'x' : `${k}x`}} = ${m}`;
    const result = frac(`\\ln${paren(fracTex(m, a))}`, String(k));
    return {
      instruction: 'Solve for x',
      prompt: equation,
      note: 'Give the exact value.',
      answers: [answer(result, { keyboard: 'logs' })],
      solution: [
        step('linear-solve', 'Isolate the exponential', `e^{${k}x} = ${fracTex(m, a)}`),
        step('exp-log-inverse', 'Take ln of both sides', `${k}x = \\ln${paren(fracTex(m, a))}`),
        step('linear-solve', 'Divide', result),
      ],
      ruleIds: ['exponential-equation', 'exp-log-inverse'],
      verify: { kind: 'root', equation, wrt: 'x' },
    };
  },
};
