import { answer, frac, paren, step, term } from '../authoring.js';
import type { Draft, Generator } from '../types.js';

/** The standard angles, in degrees, with exact sine and cosine as LaTeX. */
const EXACT: Array<{ deg: number; rad: string; sin: string; cos: string; tan: string }> = [
  { deg: 0, rad: '0', sin: '0', cos: '1', tan: '0' },
  { deg: 30, rad: '\\frac{\\pi}{6}', sin: '\\frac{1}{2}', cos: '\\frac{1}{2}\\sqrt{3}', tan: '\\frac{1}{3}\\sqrt{3}' },
  { deg: 45, rad: '\\frac{\\pi}{4}', sin: '\\frac{1}{2}\\sqrt{2}', cos: '\\frac{1}{2}\\sqrt{2}', tan: '1' },
  { deg: 60, rad: '\\frac{\\pi}{3}', sin: '\\frac{1}{2}\\sqrt{3}', cos: '\\frac{1}{2}', tan: '\\sqrt{3}' },
  { deg: 90, rad: '\\frac{\\pi}{2}', sin: '1', cos: '0', tan: '' },
  { deg: 180, rad: '\\pi', sin: '0', cos: '-1', tan: '0' },
];

export const exactValues: Generator = {
  id: 'trig.exact-values',
  chapter: 7,
  title: 'Exact trig values',
  tags: ['trig', 'exact-values'],
  version: 1,
  supports: { steps: [1, 2], difficulty: [1, 3] },
  invariant: 'value-preserving',

  generate({ rng }): Draft {
    const fn = rng.pick(['sin', 'cos'] as const);
    const angle = rng.pick(EXACT);
    const value = fn === 'sin' ? angle.sin : angle.cos;
    const prompt = `\\${fn}${paren(angle.rad)}`;

    return {
      instruction: 'Give the exact value',
      prompt,
      note: 'No decimals — the book wants the exact value.',
      answers: [answer(value, { keyboard: 'trig', kind: 'number' })],
      solution: [
        step('exact-values', 'Standard angle', value, `${angle.deg}° is one of the angles worth knowing by heart.`),
      ],
      ruleIds: ['exact-values', 'radians'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};

export const degreesRadians: Generator = {
  id: 'trig.degrees-radians',
  chapter: 7,
  title: 'Degrees and radians',
  tags: ['trig', 'radians'],
  version: 1,
  supports: { steps: [1, 2], difficulty: [1, 3] },
  invariant: 'value-preserving',

  generate({ rng }): Draft {
    const deg = rng.pick([15, 30, 45, 60, 75, 90, 120, 135, 150, 210, 225, 240, 270, 300, 330]);
    // deg × π/180
    const g = (function gcd(a: number, b: number): number {
      return b ? gcd(b, a % b) : a;
    })(deg, 180);
    const n = deg / g;
    const d = 180 / g;
    const result = d === 1 ? term(n, '\\pi') : frac(`${n === 1 ? '' : n}\\pi`, String(d));

    return {
      instruction: 'Convert to radians',
      prompt: `${deg}^\\circ`,
      note: 'Leave π in the answer.',
      answers: [answer(result, { keyboard: 'trig', kind: 'number' })],
      solution: [
        step('radians', 'Multiply by π/180', `${deg} \\cdot \\frac{\\pi}{180}`),
        step('radians', 'Cancel', result),
      ],
      ruleIds: ['radians'],
      verify: { kind: 'identity', of: `${deg}\\cdot\\frac{\\pi}{180}` },
    };
  },
};

export const doubleAngle: Generator = {
  id: 'trig.double-angle',
  chapter: 7,
  title: 'Double-angle identities',
  tags: ['trig', 'double-angle', 'identities'],
  version: 1,
  supports: { steps: [2, 4], difficulty: [2, 5] },
  invariant: 'value-preserving',

  generate({ difficulty, rng }): Draft {
    const k = difficulty >= 3 ? rng.int(2, 4) : 1;
    const arg = k === 1 ? 'x' : `${k}x`;
    const shape = rng.pick(difficulty >= 4 ? ['sin', 'cos', 'pythagoras'] : ['sin', 'cos']);

    if (shape === 'pythagoras') {
      const prompt = `1 - \\sin^{2} ${paren(arg)}`;
      const result = `\\cos^{2} ${paren(arg)}`;
      return {
        instruction: 'Simplify',
        prompt,
        answers: [answer(result, { keyboard: 'trig' })],
        solution: [step('pythagorean-identity', 'Pythagorean identity', result)],
        ruleIds: ['pythagorean-identity'],
        verify: { kind: 'identity', of: prompt },
      };
    }
    if (shape === 'sin') {
      const prompt = `2\\sin ${paren(arg)}\\cos ${paren(arg)}`;
      const result = `\\sin ${paren(k === 1 ? '2x' : `${2 * k}x`)}`;
      return {
        instruction: 'Write as a single trig function',
        prompt,
        answers: [answer(result, { keyboard: 'trig' })],
        solution: [step('double-angle', 'Double angle', result, 'sin 2u = 2 sin u cos u.')],
        ruleIds: ['double-angle'],
        verify: { kind: 'identity', of: prompt },
      };
    }
    const prompt = `1 - 2\\sin^{2} ${paren(arg)}`;
    const result = `\\cos ${paren(k === 1 ? '2x' : `${2 * k}x`)}`;
    return {
      instruction: 'Write as a single trig function',
      prompt,
      answers: [answer(result, { keyboard: 'trig' })],
      solution: [step('double-angle', 'Double angle', result, 'cos 2u = 1 − 2 sin²u.')],
      ruleIds: ['double-angle', 'pythagorean-identity'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};
