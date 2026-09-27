import {
  answer,
  aside,
  frac,
  ordinal,
  step,
  term,
} from '../authoring.js';
import type { Draft, Generator } from '../types.js';

/*
 * From the course's own assignments rather than the practice book: what
 * happens when one rule is applied over and over.
 */

/** Differentiate n times, by spotting the pattern rather than grinding. */
export const higherDerivatives: Generator = {
  id: 'diff.higher-order',
  chapter: 9,
  title: 'The nth derivative',
  tags: ['higher-derivatives', 'differentiation'],
  version: 1,
  supports: ['medium', 'hard'] as const,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    /*
     * `verify` can only check one differentiation, so it is pointed at the last
     * one: `of` is the (n-1)th derivative that the same closed form produces and
     * the answer is the nth. The pattern is what is being taught, and this
     * checks that the pattern's own successive terms really are derivatives of
     * one another — the induction step, which is the only part that can be wrong.
     */
    const a = rng.int(2, 3);
    const useSin = rng.bool();

    if (tier === 'medium') {
      const n = rng.int(3, 6);
      // sin and cos come back to themselves every four derivatives, picking up
      // a factor of a each time.
      const cycle = (k: number): string => {
        const base = ['\\sin', '\\cos', '-\\sin', '-\\cos'][(k + (useSin ? 0 : 1)) % 4]!;
        const coefficient = a ** k;
        const arg = `\\left(${term(a, 'x')}\\right)`;
        return base.startsWith('-')
          ? `${term(-coefficient, `${base.slice(1)}${arg}`)}`
          : `${term(coefficient, `${base}${arg}`)}`;
      };
      return {
        instruction: `Find the ${ordinal(n)} derivative`,
        prompt: `f(x) = \\${useSin ? 'sin' : 'cos'}\\left(${term(a, 'x')}\\right)`,
        note: `Give $f^{(${n})}(x)$. Differentiating four times gets you back where you started.`,
        answers: [answer(cycle(n), { keyboard: 'trig' })],
        solution: [
          aside(
            'The first few',
            `f' = ${cycle(1)},\\quad f'' = ${cycle(2)},\\quad f''' = ${cycle(3)}`,
            `Each one picks up another factor of ${a} from the chain rule and moves one place round the cycle sin → cos → -sin → -cos.`,
          ),
          aside(
            'So the pattern is',
            `f^{(k)}(x) = ${a}^{k}\\cdot\\left(\\text{the } k \\text{th entry of the cycle}\\right)`,
            `$${n} \\bmod 4 = ${n % 4}$, which is the entry to use.`,
          ),
          step('higher-derivatives', `The ${ordinal(n)}`, cycle(n)),
        ],
        ruleIds: ['higher-derivatives', 'chain-rule', 'standard-derivatives'],
        verify: { kind: 'derivative', of: cycle(n - 1), wrt: 'x' },
      };
    }

    // 1/(x + c): every derivative flips a sign and adds a factorial.
    const c = rng.int(1, 5);
    const n = rng.int(2, 4);
    const factorial = (k: number): number => (k <= 1 ? 1 : k * factorial(k - 1));
    const nth = (k: number): string =>
      k === 0
        ? frac('1', `x + ${c}`)
        : frac(String((k % 2 === 0 ? 1 : -1) * factorial(k)), `\\left(x + ${c}\\right)^{${k + 1}}`);

    return {
      instruction: `Find the ${ordinal(n)} derivative`,
      prompt: `f(x) = ${frac('1', `x + ${c}`)}`,
      note: `Give $f^{(${n})}(x)$.`,
      answers: [answer(nth(n), { keyboard: 'calculus' })],
      solution: [
        aside(
          'Write it as a power first',
          `f(x) = \\left(x + ${c}\\right)^{-1}`,
          'The power rule handles negative exponents perfectly well; the fraction bar is what hides that.',
        ),
        aside('The first two', `f' = ${nth(1)},\\quad f'' = ${nth(2)}`),
        aside(
          'The pattern',
          `f^{(k)}(x) = \\frac{\\left(-1\\right)^{k}k!}{\\left(x + ${c}\\right)^{k+1}}`,
          'Each step drops the exponent by one, which supplies the next factor of the factorial and one more minus sign.',
        ),
        step('higher-derivatives', `The ${ordinal(n)}`, nth(n)),
      ],
      ruleIds: ['higher-derivatives', 'power-rule', 'chain-rule'],
      verify: { kind: 'derivative', of: nth(n - 1), wrt: 'x' },
    };
  },
};
