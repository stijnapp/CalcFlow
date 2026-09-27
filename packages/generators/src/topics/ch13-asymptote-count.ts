import { answer, aside, frac, poly, setup } from '../authoring.js';
import type { Draft, Generator, Latex, Rng, Step } from '../types.js';

/*
 * How many asymptotes a graph has — vertical, horizontal and slant together,
 * with one that is the same at both ends counted once. Both 2024 exams ask it
 * as a multiple choice. The traps are a factor that cancels (a hole, not an
 * asymptote) and a function whose two ends level off at different heights.
 */

/** One asymptote, and why it is there. */
type Line = [Latex, string];

interface Count {
  fx: Latex;
  lines: Line[];
  /** Something that looks like an asymptote and is not. */
  trap?: Line;
}

/** The coefficients of ∏(x − r), highest power first. */
function expand(roots: readonly number[]): number[] {
  return roots.reduce<number[]>(
    (c, r) => [...c, 0].map((v, i) => v - r * (i > 0 ? c[i - 1]! : 0)),
    [1],
  );
}

/** `x^{2} - x - 6` from [1, -1, -6]. */
const polyOf = (c: readonly number[]): Latex =>
  poly(c.map((v, i) => [v, c.length - 1 - i] as [number, number]));

/**
 * A rational function over (x − p)(x − q). The top has one to three roots, and
 * may share one with the bottom; its degree decides what happens far out.
 */
function rational(rng: Rng): Count {
  const p = rng.nonZero(-4, 4);
  let q = rng.nonZero(-4, 4);
  while (q === p) q = rng.nonZero(-4, 4);
  const degree = rng.int(1, 3);
  const cancel = rng.bool();

  const roots: number[] = cancel ? [p] : [];
  while (roots.length < degree) {
    const r = rng.int(-4, 4);
    if (r !== p && r !== q && !roots.includes(r)) roots.push(r);
  }

  const [top, bottom] = [expand(roots), expand([p, q])];
  const vertical = cancel ? [q] : [p, q];
  const far: Line =
    degree < 2
      ? ['y = 0', 'The bottom has the higher degree, so the fraction dies away at both ends.']
      : degree === 2
        ? ['y = 1', 'Top and bottom have the same degree, so both ends level off at the ratio of the leading coefficients.']
        : [
            `y = ${poly([[1, 1], [top[1]! - bottom[1]!, 0]])}`,
            'The top is one degree higher: dividing leaves a line, the same line at both ends.',
          ];

  return {
    fx: frac(polyOf(top), polyOf(bottom)),
    lines: [...vertical.map((v): Line => [`x = ${v}`, 'The bottom is 0 there and the top is not.']), far],
    trap: cancel ? [`x = ${p}`, 'The top is 0 there too: the factor cancels, and what is left is a hole, not an asymptote.'] : undefined,
  };
}

/** Graphs that are not fractions of polynomials, where the two ends can disagree. */
const TRANSCENDENTAL: Count[] = [
  {
    fx: frac('\\ln\\left|x\\right|', 'x'),
    lines: [
      ['x = 0', 'Near 0 the top runs to minus infinity while the bottom goes to 0.'],
      ['y = 0', 'The logarithm grows slower than x, at both ends.'],
    ],
  },
  {
    fx: frac('e^{x}', 'x'),
    lines: [
      ['x = 0', 'The bottom is 0 and the top is 1.'],
      ['y = 0', 'Only on the left: to the right the exponential outgrows every line.'],
    ],
  },
  {
    fx: frac('e^{x} + 1', 'e^{x} - 1'),
    lines: [
      ['x = 0', 'The bottom is 0 and the top is 2.'],
      ['y = 1', 'On the right, where the exponential dominates both.'],
      ['y = -1', 'On the left, where the exponential dies away — a different line, so it counts too.'],
    ],
  },
  {
    fx: frac('x', '\\sqrt{x^{2} + 1}'),
    lines: [
      ['y = 1', 'On the right the root behaves like $x$.'],
      ['y = -1', 'On the left it behaves like $-x$: $\\sqrt{x^{2}} = |x|$.'],
    ],
  },
  {
    fx: frac('\\left|x\\right|', 'x - 1'),
    lines: [
      ['x = 1', 'The bottom is 0 and the top is 1.'],
      ['y = 1', 'On the right, where $|x| = x$.'],
      ['y = -1', 'On the left, where $|x| = -x$.'],
    ],
  },
  {
    fx: `x + ${frac('1', 'x')}`,
    lines: [
      ['x = 0', 'The fraction blows up there.'],
      ['y = x', 'The fraction dies away at both ends, leaving the line.'],
    ],
  },
  {
    fx: '\\arctan x',
    lines: [
      ['y = \\frac{\\pi}{2}', 'On the right.'],
      ['y = -\\frac{\\pi}{2}', 'On the left.'],
    ],
  },
];

function working(c: Count): Step[] {
  const steps = c.lines.map(([line, why]) => setup('asymptote', 'An asymptote', line, why));
  return c.trap ? [aside('Not an asymptote', c.trap[0], c.trap[1]), ...steps] : steps;
}

export const asymptoteCount: Generator = {
  id: 'limits.asymptote-count',
  chapter: 13,
  title: 'Counting asymptotes',
  tags: ['limits', 'asymptotes', 'graphs'],
  version: 1,
  supports: ['medium', 'hard'],
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const c = tier === 'hard' && rng.bool() ? rng.pick(TRANSCENDENTAL) : rational(rng);
    return {
      instruction: 'Count the asymptotes',
      prompt: `f(x) = ${c.fx}`,
      promptText:
        'How many asymptotes does the graph have — vertical, horizontal and slant together? One that is the same at both ends counts once.',
      answers: [answer(String(c.lines.length), { keyboard: 'numeric', kind: 'number' })],
      solution: working(c),
      ruleIds: ['asymptote', 'limit-infinity'],
    };
  },
};
