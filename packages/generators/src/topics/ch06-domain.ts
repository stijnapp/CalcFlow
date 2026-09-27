import { answer, fracTex, poly, setup } from '../authoring.js';
import type { Draft, Generator, Latex } from '../types.js';

/*
 * Where a logarithm is defined: its argument has to be positive. The exams ask
 * it with a log inside a log — ln(1 − 2 ln(ex)) — where there are two
 * conditions, and the second one is an inequality to solve with exponentials.
 */

/** `ex`, `e^{2}x`, `x`. */
const scaled = (r: number): Latex => (r === 0 ? 'x' : r === 1 ? 'ex' : `e^{${r}}x`);

/** `\left(x - 3\right)`, or a bare `x` for a root at 0. */
const factor = (root: number): Latex =>
  root === 0 ? 'x' : `\\left(${poly([[1, 1], [-root, 0]])}\\right)`;

/** `a ⇒ b`, or just `a` when there is nothing to rewrite. */
const implies = (a: Latex, b: Latex): Latex => (a === b ? a : `${a} \\;\\Rightarrow\\; ${b}`);

/** `e^{-\frac{1}{2}}`, `e`, `1`. */
function ePower(p: number, q: number): Latex {
  const f = fracTex(p, q);
  if (f === '0') return '1';
  return f === '1' ? 'e' : `e^{${f}}`;
}

export const logDomain: Generator = {
  id: 'logs.domain',
  chapter: 6,
  title: 'Where a logarithm is defined',
  tags: ['logarithms', 'domain'],
  version: 1,
  supports: ['medium', 'hard'],
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    if (tier === 'medium') {
      // ln(−(x − a)(x − b)): positive strictly between the roots.
      const a = rng.int(-6, 2);
      const b = a + rng.int(2, 7);
      const inside = poly([[-1, 2], [a + b, 1], [-a * b, 0]]);
      return {
        instruction: 'Find the domain',
        prompt: `f(x) = \\ln\\left(${inside}\\right)`,
        note: 'The domain is an open interval. Give its two ends.',
        answers: [
          answer(String(a), { label: 'from', keyboard: 'numeric', kind: 'number' }),
          answer(String(b), { label: 'to', keyboard: 'numeric', kind: 'number' }),
        ],
        solution: [
          setup('domain', 'The argument must be positive', `${inside} > 0`),
          setup(
            'domain',
            'Factorise',
            `-${(b === 0 ? [b, a] : [a, b]).map(factor).join('')} > 0`,
            'A parabola opening downwards is positive between its roots.',
          ),
          setup('domain', 'So', `${a} < x < ${b}`),
        ],
        ruleIds: ['domain', 'quadratic-formula'],
        verify: { kind: 'root', equation: `${inside} = 0`, wrt: 'x' },
      };
    }

    // ln(p − q·ln(eʳx)): x > 0 for the inner log, then ln(eʳx) < p/q.
    const p = rng.int(1, 3);
    const q = rng.int(1, 3);
    const r = rng.int(0, 2);
    const inner = `\\ln\\left(${scaled(r)}\\right)`;
    const outer = `${p} - ${q === 1 ? '' : q}${inner}`;
    const edge = ePower(p - q * r, q);
    return {
      instruction: 'Find the end of the domain',
      prompt: `f(x) = \\ln\\left(${outer}\\right)`,
      note: 'The domain is $(0, b)$. Find $b$.',
      answers: [answer(edge, { label: 'b', keyboard: 'logs', kind: 'number' })],
      solution: [
        setup('domain', 'The inner logarithm', implies(`${scaled(r)} > 0`, 'x > 0')),
        setup('domain', 'The outer logarithm', `${outer} > 0 \\;\\Rightarrow\\; ${inner} < ${fracTex(p, q)}`),
        setup(
          'domain',
          'Undo the logarithm',
          implies(`${scaled(r)} < ${ePower(p, q)}`, `x < ${edge}`),
          '$e^{x}$ is increasing, so taking it on both sides keeps the inequality the right way round.',
        ),
      ],
      ruleIds: ['domain', 'exp-log-inverse'],
      verify: { kind: 'root', equation: `${outer} = 0`, wrt: 'x' },
    };
  },
};
