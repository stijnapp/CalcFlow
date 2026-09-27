import { TIERS, type Tier } from '@calcflow/shared';
import { answer, aside, frac, paren, setup, step, term } from '../authoring.js';
import type { Draft, Generator } from '../types.js';

interface Angle {
  deg: number;
  rad: string;
  sin: string;
  cos: string;
  /** Empty where the tangent is undefined. */
  tan: string;
}

/** An angle in degrees as an exact multiple of π. */
function radTex(deg: number): string {
  const g = (function g2(a: number, b: number): number {
    return b ? g2(b, a % b) : a;
  })(deg, 180);
  const n = deg / g;
  const d = 180 / g;
  if (deg === 0) return '0';
  return d === 1 ? term(n, '\\pi') : frac(`${n === 1 ? '' : n}\\pi`, String(d));
}

const HALF_ROOT2 = '\\frac{1}{2}\\sqrt{2}';
const HALF_ROOT3 = '\\frac{1}{2}\\sqrt{3}';
const THIRD_ROOT3 = '\\frac{1}{3}\\sqrt{3}';
const negate = (v: string): string => (v === '0' ? '0' : v.startsWith('-') ? v.slice(1) : `-${v}`);

/**
 * The whole unit circle, not just the first quadrant. Every exam question that
 * asks for an exact value asks for one outside it, because the first quadrant
 * can be got from a calculator and the rest has to be reasoned about.
 */
const EXACT: Angle[] = [
  { deg: 0, rad: '0', sin: '0', cos: '1', tan: '0' },
  { deg: 30, rad: radTex(30), sin: '\\frac{1}{2}', cos: HALF_ROOT3, tan: THIRD_ROOT3 },
  { deg: 45, rad: radTex(45), sin: HALF_ROOT2, cos: HALF_ROOT2, tan: '1' },
  { deg: 60, rad: radTex(60), sin: HALF_ROOT3, cos: '\\frac{1}{2}', tan: '\\sqrt{3}' },
  { deg: 90, rad: radTex(90), sin: '1', cos: '0', tan: '' },
  { deg: 120, rad: radTex(120), sin: HALF_ROOT3, cos: '-\\frac{1}{2}', tan: '-\\sqrt{3}' },
  { deg: 135, rad: radTex(135), sin: HALF_ROOT2, cos: negate(HALF_ROOT2), tan: '-1' },
  { deg: 150, rad: radTex(150), sin: '\\frac{1}{2}', cos: negate(HALF_ROOT3), tan: negate(THIRD_ROOT3) },
  { deg: 180, rad: radTex(180), sin: '0', cos: '-1', tan: '0' },
  { deg: 210, rad: radTex(210), sin: '-\\frac{1}{2}', cos: negate(HALF_ROOT3), tan: THIRD_ROOT3 },
  { deg: 225, rad: radTex(225), sin: negate(HALF_ROOT2), cos: negate(HALF_ROOT2), tan: '1' },
  { deg: 240, rad: radTex(240), sin: negate(HALF_ROOT3), cos: '-\\frac{1}{2}', tan: '\\sqrt{3}' },
  { deg: 270, rad: radTex(270), sin: '-1', cos: '0', tan: '' },
  { deg: 300, rad: radTex(300), sin: negate(HALF_ROOT3), cos: '\\frac{1}{2}', tan: '-\\sqrt{3}' },
  { deg: 315, rad: radTex(315), sin: negate(HALF_ROOT2), cos: HALF_ROOT2, tan: '-1' },
  { deg: 330, rad: radTex(330), sin: '-\\frac{1}{2}', cos: HALF_ROOT3, tan: negate(THIRD_ROOT3) },
];

/** The first-quadrant angle a given one is a reflection of. */
function reference(deg: number): number {
  const d = ((deg % 360) + 360) % 360;
  if (d <= 90) return d;
  if (d <= 180) return 180 - d;
  if (d <= 270) return d - 180;
  return 360 - d;
}

function anglesFor(tier: Tier): Angle[] {
  if (tier === 'easy') return EXACT.filter((a) => a.deg <= 90 || a.deg === 180);
  if (tier === 'medium') return EXACT.filter((a) => a.deg <= 180);
  return EXACT;
}

export const exactValues: Generator = {
  id: 'trig.exact-values',
  chapter: 7,
  title: 'Exact trig values',
  tags: ['trig', 'exact-values'],
  version: 2,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const fn = rng.pick(tier === 'easy' ? (['sin', 'cos'] as const) : (['sin', 'cos', 'tan'] as const));
    const pool = anglesFor(tier).filter((a) => (fn === 'tan' ? a.tan !== '' : true));
    const angle = rng.pick(pool);
    const value = fn === 'sin' ? angle.sin : fn === 'cos' ? angle.cos : angle.tan;
    const prompt = `\\${fn}${paren(angle.rad)}`;
    const ref = reference(angle.deg);
    const quadrant = Math.floor((((angle.deg % 360) + 360) % 360) / 90) + 1;

    return {
      instruction: 'Give the exact value',
      prompt,
      note: 'No decimals — the book wants the exact value.',
      answers: [answer(value, { keyboard: 'trig', kind: 'number' })],
      solution: [
        ...(ref === angle.deg
          ? []
          : [
              aside(
                'Reference angle',
                `\\${fn}${paren(angle.rad)} = ${value.startsWith('-') ? '-' : ''}\\${fn}${paren(radTex(ref))}`,
                `${angle.deg}° sits in quadrant ${quadrant}, where ${fn} is ${value.startsWith('-') ? 'negative' : 'positive'}. Its reference angle is ${ref}°.`,
              ),
            ]),
        step('exact-values', 'Standard angle', value, `${ref}° is one of the angles worth knowing by heart.`),
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
  version: 2,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const deg = rng.pick([15, 30, 45, 60, 75, 90, 120, 135, 150, 210, 225, 240, 270, 300, 330]);
    const result = radTex(deg);

    // Both directions: reading radians back as degrees is the half he will need
    // when an exam states a domain as [0, 2π].
    if (tier !== 'easy' && rng.bool()) {
      return {
        instruction: 'Convert to degrees',
        prompt: result,
        note: 'Give the number of degrees.',
        answers: [answer(String(deg), { keyboard: 'numeric', kind: 'number' })],
        solution: [
          step('radians', 'Multiply by 180/π', `${result} \\cdot \\frac{180}{\\pi}`, 'π radians is half a turn, which is 180°.'),
          step('radians', 'Cancel', String(deg)),
        ],
        ruleIds: ['radians'],
        verify: { kind: 'identity', of: `${result}\\cdot\\frac{180}{\\pi}` },
      };
    }

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
  version: 2,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const k = tier !== 'easy' ? rng.int(2, 4) : 1;
    const arg = k === 1 ? 'x' : `${k}x`;
    const doubled = k === 1 ? '2x' : `${2 * k}x`;
    const shapes =
      tier === 'easy'
        ? ['sin', 'cos-sin']
        : tier === 'medium'
          ? ['sin', 'cos-sin', 'cos-both', 'pythagoras']
          : ['sin', 'cos-sin', 'cos-both', 'cos-cos', 'pythagoras', 'halve'];
    const shape = rng.pick(shapes);

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

    if (shape === 'halve') {
      // The double angle read backwards, which is how an integral of sin² gets done.
      const prompt = frac(`1 - \\cos ${paren(doubled)}`, '2');
      const result = `\\sin^{2} ${paren(arg)}`;
      return {
        instruction: 'Write without a double angle',
        prompt,
        note: 'Give the answer as a square of a single trig function.',
        answers: [answer(result, { keyboard: 'trig' })],
        solution: [
          setup('double-angle', 'Which form of cos 2u', `\\cos ${paren(doubled)} = 1 - 2\\sin^{2}${paren(arg)}`),
          step('double-angle', 'Substitute and cancel', result, 'The 1s cancel and the 2s divide out.'),
        ],
        ruleIds: ['double-angle'],
        verify: { kind: 'identity', of: prompt },
      };
    }

    if (shape === 'sin') {
      const prompt = `2\\sin ${paren(arg)}\\cos ${paren(arg)}`;
      const result = `\\sin ${paren(doubled)}`;
      return {
        instruction: 'Write as a single trig function',
        prompt,
        answers: [answer(result, { keyboard: 'trig' })],
        solution: [step('double-angle', 'Double angle', result, 'sin 2u = 2 sin u cos u.')],
        ruleIds: ['double-angle'],
        verify: { kind: 'identity', of: prompt },
      };
    }

    // The three faces of cos 2u. Which one is wanted depends on what is left
    // over afterwards, which is why the book lists all three.
    const source =
      shape === 'cos-sin'
        ? `1 - 2\\sin^{2} ${paren(arg)}`
        : shape === 'cos-cos'
          ? `2\\cos^{2} ${paren(arg)} - 1`
          : `\\cos^{2} ${paren(arg)} - \\sin^{2} ${paren(arg)}`;
    const note =
      shape === 'cos-sin'
        ? 'cos 2u = 1 − 2 sin²u.'
        : shape === 'cos-cos'
          ? 'cos 2u = 2 cos²u − 1.'
          : 'cos 2u = cos²u − sin²u.';
    const result = `\\cos ${paren(doubled)}`;

    return {
      instruction: 'Write as a single trig function',
      prompt: source,
      answers: [answer(result, { keyboard: 'trig' })],
      solution: [step('double-angle', 'Double angle', result, note)],
      ruleIds: ['double-angle', 'pythagorean-identity'],
      verify: { kind: 'identity', of: source },
    };
  },
};

/**
 * The addition formulas, which everything else in the chapter is a special case
 * of. Used forwards they open a bracket; used on 75° they give an exact value
 * for an angle that is not on the list.
 */
export const additionFormulas: Generator = {
  id: 'trig.addition',
  chapter: 7,
  title: 'Addition formulas',
  tags: ['trig', 'identities'],
  version: 1,
  supports: ['medium', 'hard'] as const,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    if (tier === 'hard' && rng.bool()) {
      // 75° = 45° + 30°, and 15° = 45° − 30°.
      const plus = rng.bool();
      const deg = plus ? 75 : 15;
      const fn = rng.pick(['sin', 'cos'] as const);
      const prompt = `\\${fn}${paren(radTex(deg))}`;
      const result =
        fn === 'sin'
          ? plus
            ? '\\frac{1}{4}\\left(\\sqrt{6} + \\sqrt{2}\\right)'
            : '\\frac{1}{4}\\left(\\sqrt{6} - \\sqrt{2}\\right)'
          : plus
            ? '\\frac{1}{4}\\left(\\sqrt{6} - \\sqrt{2}\\right)'
            : '\\frac{1}{4}\\left(\\sqrt{6} + \\sqrt{2}\\right)';
      const expansion =
        fn === 'sin'
          ? `\\sin${paren(radTex(45))}\\cos${paren(radTex(30))} ${plus ? '+' : '-'} \\cos${paren(radTex(45))}\\sin${paren(radTex(30))}`
          : `\\cos${paren(radTex(45))}\\cos${paren(radTex(30))} ${plus ? '-' : '+'} \\sin${paren(radTex(45))}\\sin${paren(radTex(30))}`;

      return {
        instruction: 'Give the exact value',
        prompt,
        note: `${deg}° is not on the list, but it is ${plus ? '45° + 30°' : '45° − 30°'}.`,
        answers: [answer(result, { keyboard: 'trig', kind: 'number' })],
        solution: [
          setup('addition-formulas', 'Split the angle', `\\${fn}${paren(`${radTex(45)} ${plus ? '+' : '-'} ${radTex(30)}`)}`),
          setup('addition-formulas', 'Addition formula', expansion),
          step('exact-values', 'Put in the standard values', result),
        ],
        ruleIds: ['addition-formulas', 'exact-values'],
        verify: { kind: 'identity', of: prompt },
      };
    }

    const fn = rng.pick(['sin', 'cos'] as const);
    const plus = rng.bool();
    const angle = rng.pick(EXACT.filter((a) => [30, 45, 60].includes(a.deg)));
    const prompt = `\\${fn}${paren(`x ${plus ? '+' : '-'} ${angle.rad}`)}`;
    const expansion =
      fn === 'sin'
        ? `\\sin x\\cos${paren(angle.rad)} ${plus ? '+' : '-'} \\cos x\\sin${paren(angle.rad)}`
        : `\\cos x\\cos${paren(angle.rad)} ${plus ? '-' : '+'} \\sin x\\sin${paren(angle.rad)}`;
    const first = angle.cos;
    const second = angle.sin;
    const result =
      fn === 'sin'
        ? `${first}\\sin x ${plus ? '+' : '-'} ${second}\\cos x`
        : `${first}\\cos x ${plus ? '-' : '+'} ${second}\\sin x`;

    return {
      instruction: 'Expand, and put in the exact values',
      prompt,
      note: 'No brackets left in the answer.',
      answers: [answer(result, { keyboard: 'trig' })],
      solution: [
        setup('addition-formulas', 'Addition formula', expansion, 'The cosine formula flips the sign; the sine formula keeps it.'),
        step('exact-values', 'Put in the standard values', result, `${angle.deg}° is one of the angles worth knowing by heart.`),
      ],
      ruleIds: ['addition-formulas', 'exact-values'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};

/**
 * A shift of a whole period, half a period or a quarter. Read off the unit
 * circle rather than memorised — but they have to be quick, because they are
 * what turns an unfamiliar argument into a familiar one.
 */
export const shiftIdentities: Generator = {
  id: 'trig.shifts',
  chapter: 7,
  title: 'Shifts and reflections',
  tags: ['trig', 'identities'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const shapes: Array<[Tier[], string, string, string]> = [
      [['easy', 'medium', 'hard'], '\\sin\\left(-x\\right)', '-\\sin x', 'Sine is odd: a reflection in the y-axis flips its sign.'],
      [['easy', 'medium', 'hard'], '\\cos\\left(-x\\right)', '\\cos x', 'Cosine is even: reflecting changes nothing.'],
      [['easy', 'medium', 'hard'], '\\sin\\left(x + 2\\pi\\right)', '\\sin x', 'A whole turn lands back where it started.'],
      [['medium', 'hard'], '\\sin\\left(x + \\pi\\right)', '-\\sin x', 'Half a turn puts the point opposite, so both coordinates flip.'],
      [['medium', 'hard'], '\\cos\\left(x + \\pi\\right)', '-\\cos x', 'Half a turn puts the point opposite, so both coordinates flip.'],
      [['medium', 'hard'], '\\cos\\left(\\frac{\\pi}{2} - x\\right)', '\\sin x', 'A quarter turn swaps the two coordinates — which is where "co-sine" comes from.'],
      [['hard'], '\\sin\\left(\\frac{\\pi}{2} - x\\right)', '\\cos x', 'A quarter turn swaps the two coordinates.'],
      [['hard'], '\\sin\\left(\\pi - x\\right)', '\\sin x', 'The mirror image in the y-axis has the same height.'],
      [['hard'], '\\cos\\left(\\pi - x\\right)', '-\\cos x', 'The mirror image in the y-axis has the opposite x-coordinate.'],
      [['hard'], '\\tan\\left(x + \\pi\\right)', '\\tan x', 'Tangent repeats twice as often as sine and cosine: its period is π, not 2π.'],
    ];

    const pool = shapes.filter(([tiers]) => tiers.includes(tier));
    const [, prompt, result, note] = rng.pick(pool);

    return {
      instruction: 'Simplify',
      prompt,
      note: 'Give the answer as a single trig function of x.',
      answers: [answer(result, { keyboard: 'trig' })],
      solution: [step('shift-identities', 'Read it off the unit circle', result, note)],
      ruleIds: ['shift-identities'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};

/** Two answers per turn, and the second one is the one that gets forgotten. */
export const trigEquation: Generator = {
  id: 'trig.equation',
  chapter: 7,
  title: 'Trig equations',
  tags: ['trig', 'solve'],
  version: 1,
  supports: TIERS,
  invariant: 'solution-set-preserving',

  generate({ tier, rng }): Draft {
    const base = rng.pick(EXACT.filter((a) => [30, 45, 60].includes(a.deg)));
    const fn = rng.pick(['sin', 'cos'] as const);
    const negative = tier !== 'easy' && rng.bool();
    const target = negative ? negate(fn === 'sin' ? base.sin : base.cos) : fn === 'sin' ? base.sin : base.cos;

    // Both solutions in one turn, found from the reference angle.
    const alpha = base.deg;
    const degrees =
      fn === 'sin'
        ? negative
          ? [180 + alpha, 360 - alpha]
          : [alpha, 180 - alpha]
        : negative
          ? [180 - alpha, 180 + alpha]
          : [alpha, 360 - alpha];

    if (tier === 'hard') {
      // sin 2x = s on [0, π): the doubled argument halves the spacing.
      const halves = [alpha / 2, 90 - alpha / 2].sort((a, b) => a - b);
      const equation = `\\sin\\left(2x\\right) = ${base.sin}`;
      return {
        instruction: 'Solve for x on [0, π)',
        prompt: equation,
        note: 'Two solutions. Give the smaller one first, in radians.',
        answers: [
          answer(radTex(halves[0]!), { label: 'smaller x', keyboard: 'trig', kind: 'number' }),
          answer(radTex(halves[1]!), { label: 'larger x', keyboard: 'trig', kind: 'number' }),
        ],
        solution: [
          setup(
            'trig-equation',
            'Solve for the whole argument first',
            `2x = ${radTex(alpha)} \\quad\\text{or}\\quad 2x = ${radTex(180 - alpha)}`,
            'x runs over half a turn, so 2x runs over a whole one — exactly two solutions.',
          ),
          setup('linear-solve', 'Halve both', `x = ${radTex(halves[0]!)} \\quad\\text{or}\\quad x = ${radTex(halves[1]!)}`),
        ],
        ruleIds: ['trig-equation', 'exact-values', 'linear-solve'],
        verify: { kind: 'root', equation, wrt: 'x' },
      };
    }

    const sorted = [...degrees].sort((a, b) => a - b);
    const equation = `\\${fn} x = ${target}`;

    return {
      instruction: 'Solve for x on [0, 2π)',
      prompt: equation,
      note: 'Two solutions. Give the smaller one first, in radians.',
      answers: [
        answer(radTex(sorted[0]!), { label: 'smaller x', keyboard: 'trig', kind: 'number' }),
        answer(radTex(sorted[1]!), { label: 'larger x', keyboard: 'trig', kind: 'number' }),
      ],
      solution: [
        aside(
          'The reference angle',
          `\\${fn}${paren(radTex(alpha))} = ${fn === 'sin' ? base.sin : base.cos}`,
          `${alpha}° is the first-quadrant angle with that value.`,
        ),
        setup(
          'trig-equation',
          'Both solutions in one turn',
          `x = ${radTex(sorted[0]!)} \\quad\\text{or}\\quad x = ${radTex(sorted[1]!)}`,
          fn === 'sin'
            ? 'A sine takes each value twice per turn, at α and π − α.'
            : 'A cosine takes each value twice per turn, at α and 2π − α.',
        ),
      ],
      ruleIds: ['trig-equation', 'exact-values'],
      verify: { kind: 'root', equation, wrt: 'x' },
    };
  },
};
