import { TIERS, type Tier } from '@calcflow/shared';
import { answer, frac, poly, rootOf, setup, step, sum, term } from '../authoring.js';
import type { Draft, Generator, Rng } from '../types.js';

/** ` + 3` or ` - 3`, so a sign never lands next to another sign. */
const shift = (n: number): string => (n < 0 ? ` - ${-n}` : ` + ${n}`);

type Parity = 'even' | 'odd' | 'neither';

const VERDICT: Record<Parity, string> = {
  even: 'That is f(x) again, so f is even — its graph is its own mirror image in the y-axis.',
  odd: 'That is -f(x), so f is odd — its graph is unchanged by a half-turn about the origin.',
  neither: 'That is neither f(x) nor -f(x), so f is neither even nor odd.',
};

/** A quarter turn changes which function it is, and with it the parity. */
const QUARTER_SHIFTS = [
  { fn: 'sin', simplified: '\\cos x', parity: 'even', note: '$\\sin\\left(x + \\frac{\\pi}{2}\\right) = \\cos x$, which is even.' },
  { fn: 'cos', simplified: '\\sin x', parity: 'odd', note: '$\\cos\\left(x + \\frac{\\pi}{2}\\right) = -\\sin x$, which is odd.' },
  { fn: 'tan', simplified: '\\frac{\\cos x}{\\sin x}', parity: 'odd', note: '$\\tan\\left(x + \\frac{\\pi}{2}\\right) = -\\frac{\\cos x}{\\sin x}$, which is odd.' },
] as const;

interface Shape {
  fx: string;
  /** f with every x replaced by (−x), untouched — the line before simplifying. */
  substituted: string;
  /** What that tidies to: f(x) for an even function, −f(x) for an odd one. */
  simplified: string;
  parity: Parity;
  note?: string;
}

const SHAPES: Record<Tier, Array<(rng: Rng) => Shape>> = {
  easy: [
    (rng) => {
      const [a, b] = [rng.nonZero(-5, 5), rng.nonZero(-9, 9)];
      return {
        fx: poly([[a, 2], [b, 0]]),
        substituted: `${term(a, '\\left(-x\\right)^{2}')}${shift(b)}`,
        simplified: poly([[a, 2], [b, 0]]),
        parity: 'even',
      };
    },
    (rng) => {
      const [a, b] = [rng.nonZero(-4, 4), rng.nonZero(-6, 6)];
      return {
        fx: poly([[a, 3], [b, 1]]),
        substituted: `${term(a, '\\left(-x\\right)^{3}')} + ${term(b, '\\left(-x\\right)')}`,
        simplified: poly([[-a, 3], [-b, 1]]),
        parity: 'odd',
      };
    },
  ],
  medium: [
    (rng) => {
      const a = rng.int(2, 6);
      return {
        fx: rootOf(`x^{2} + ${a}`),
        substituted: rootOf(`\\left(-x\\right)^{2} + ${a}`),
        simplified: rootOf(`x^{2} + ${a}`),
        parity: 'even',
        note: 'A square swallows the sign before the root ever sees it.',
      };
    },
    (rng) => {
      const a = rng.int(2, 5);
      return {
        fx: frac(String(a), poly([[1, 3], [0, 0]])),
        substituted: frac(String(a), '\\left(-x\\right)^{3}'),
        simplified: frac(String(-a), 'x^{3}'),
        parity: 'odd',
      };
    },
    () => ({
      fx: `x\\cos x`,
      substituted: `\\left(-x\\right)\\cos\\left(-x\\right)`,
      simplified: `-x\\cos x`,
      parity: 'odd',
      note: 'cos is even and x is odd, so the product is odd.',
    }),
    (rng) => {
      const [a, b] = [rng.nonZero(-4, 4), rng.nonZero(-5, 5)];
      return {
        fx: poly([[a, 3], [b, 2]]),
        substituted: sum([term(a, '\\left(-x\\right)^{3}'), term(b, '\\left(-x\\right)^{2}')]),
        simplified: poly([[-a, 3], [b, 2]]),
        parity: 'neither',
        note: 'An odd power and an even power: one term flips and the other does not.',
      };
    },
    (rng) => {
      const odd = rng.bool();
      const sign = odd ? '-' : '+';
      return {
        fx: frac(`e^{x} ${sign} e^{-x}`, '2'),
        substituted: frac(`e^{-x} ${sign} e^{x}`, '2'),
        simplified: odd ? `-${frac('e^{x} - e^{-x}', '2')}` : frac('e^{x} + e^{-x}', '2'),
        parity: odd ? 'odd' : 'even',
        note: 'These are the $f$ and $g$ with $f + g = e^{x}$ and $f - g = e^{-x}$: $e^{x}$ split into an even part and an odd part.',
      };
    },
  ],
  hard: [
    () => ({
      fx: '\\sin\\left(x^{3}\\right)',
      substituted: '\\sin\\left(\\left(-x\\right)^{3}\\right)',
      simplified: '-\\sin\\left(x^{3}\\right)',
      parity: 'odd',
      note: 'An odd function of an odd one: the sign goes in, and comes straight back out.',
    }),
    () => ({
      fx: '\\sin\\left|x\\right|',
      substituted: '\\sin\\left|-x\\right|',
      simplified: '\\sin\\left|x\\right|',
      parity: 'even',
      note: 'The inside is even, so sine never sees the sign — even though sine itself is odd.',
    }),
    (rng) => {
      const q = rng.pick(QUARTER_SHIFTS);
      return {
        fx: `\\${q.fn}\\left(x + \\frac{\\pi}{2}\\right)`,
        substituted: `\\${q.fn}\\left(-x + \\frac{\\pi}{2}\\right)`,
        simplified: q.simplified,
        parity: q.parity,
        note: `${q.note} A shift on its own says nothing about parity; rewrite it first.`,
      };
    },
    (rng) => {
      const a = rng.int(2, 5);
      return {
        fx: frac('\\tan x', poly([[1, 3], [a, 1]])),
        substituted: frac('\\tan\\left(-x\\right)', `\\left(-x\\right)^{3} + ${term(a, '\\left(-x\\right)')}`),
        simplified: frac('\\tan x', poly([[1, 3], [a, 1]])),
        parity: 'even',
        note: 'Odd over odd: the two minus signs cancel and the quotient comes out even.',
      };
    },
    () => ({
      fx: `\\sin\\left(\\cos x\\right)`,
      substituted: `\\sin\\left(\\cos\\left(-x\\right)\\right)`,
      simplified: `\\sin\\left(\\cos x\\right)`,
      parity: 'even',
      note: 'The inside is even, so the outside never finds out the sign changed — whatever the outside is.',
    }),
    () => ({
      fx: `\\cos\\left(\\sin x\\right)`,
      substituted: `\\cos\\left(\\sin\\left(-x\\right)\\right)`,
      simplified: `\\cos\\left(\\sin x\\right)`,
      parity: 'even',
      note: 'An odd inside flips the sign, and then an even outside throws the flip away.',
    }),
  ],
};

/** Even or odd, straight from the definition: work out f(−x). */
export const parity: Generator = {
  id: 'func.parity',
  chapter: 5,
  title: 'Even or odd',
  tags: ['parity', 'functions'],
  version: 2,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const s = rng.pick(SHAPES[tier])(rng);

    return {
      instruction: 'Work out f(-x), simplified',
      prompt: `f(x) = ${s.fx}`,
      promptText: `Use the definition: work out f(-x) and simplify it. If you get f(x) back, f is even; if you get -f(x), it is odd.`,
      note: s.note,
      answers: [answer(s.simplified, { keyboard: 'algebra' })],
      solution: [
        setup('parity', 'Replace every x with -x', s.substituted),
        step(
          'parity',
          'Simplify',
          s.simplified,
          VERDICT[s.parity],
        ),
      ],
      ruleIds: ['parity'],
      verify: { kind: 'identity', of: s.substituted },
    };
  },
};
