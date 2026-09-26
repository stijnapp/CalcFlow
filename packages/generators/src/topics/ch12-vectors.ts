import { TIERS } from '@calcflow/shared';
import { answer, aside, fracTex, rootOf, setup, term } from '../authoring.js';
import type { PlotSpec } from '../plot.js';
import type { Draft, Generator } from '../types.js';

/*
 * Chapter 12, drawn on the lattice.
 *
 * Same split as chapter 5: the arrow is self-graded against the answer drawn
 * over it, and the components and lengths are typed and checked. The window is
 * always a whole number of units either side of the origin and `lattice` is on,
 * so a drawn arrow snaps to the grid — an arrow that lands between points
 * cannot be compared with anything.
 */

type Vec = readonly [number, number];

/** A number safe to put after an operator: negatives get their own brackets. */
const num = (n: number): string => (n < 0 ? `\\left(${n}\\right)` : String(n));

/** `\begin{pmatrix}` is what the book uses, and what he will see on the exam. */
function column([x, y]: Vec): string {
  return `\\begin{pmatrix}${x}\\\\${y}\\end{pmatrix}`;
}

/** `\sqrt{29}`, or the whole number when the length happens to be one. */
function lengthTex([x, y]: Vec): string {
  const squared = x * x + y * y;
  const root = Math.round(Math.sqrt(squared));
  return root * root === squared ? String(root) : rootOf(String(squared));
}

/** A square window big enough to hold every arrow, rounded out to whole units. */
function windowFor(points: Vec[]): PlotSpec['window'] {
  const span = Math.max(4, ...points.flatMap(([x, y]) => [Math.abs(x), Math.abs(y)])) + 2;
  return { xMin: -span, xMax: span, yMin: -Math.round(span * 0.62), yMax: Math.round(span * 0.62), step: 1 };
}

/** Draw pa + qb, then say what it is and how long. */
export const linearCombination: Generator = {
  id: 'vec.combination',
  chapter: 12,
  title: 'Draw a linear combination',
  tags: ['vectors', 'sketching'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const a: Vec = [rng.nonZero(-3, 3), rng.nonZero(-3, 3)];
    const b: Vec = [rng.nonZero(-3, 3), rng.nonZero(-3, 3)];
    const p = tier === 'easy' ? 1 : rng.pick([1, 2, -1]);
    const q = tier === 'hard' ? rng.pick([2, 3, -2]) : rng.pick([1, 2]);
    const result: Vec = [p * a[0] + q * b[0], p * a[1] + q * b[1]];

    const combo = `${term(p, '\\vec{a}')} ${q < 0 ? '-' : '+'} ${term(Math.abs(q), '\\vec{b}')}`;

    const plot: PlotSpec = {
      window: windowFor([a, b, result]),
      lattice: true,
      given: [
        { kind: 'vector', to: a, label: 'a' },
        { kind: 'vector', to: b, label: 'b' },
      ],
      answer: [{ kind: 'vector', to: result, label: combo.replace(/\\vec\{(.)\}/g, '$1') }],
    };

    return {
      instruction: 'Draw the resultant',
      prompt: `\\vec{a} = ${column(a)},\\quad \\vec{b} = ${column(b)}`,
      promptText: `Both vectors are already on the grid. Draw $${combo}$ from the origin.`,
      note: 'The components and the length are checked; the arrow you check yourself.',
      answers: [
        answer(String(result[0]), { label: 'x component', keyboard: 'numeric', kind: 'number' }),
        answer(String(result[1]), { label: 'y component', keyboard: 'numeric', kind: 'number' }),
        answer(lengthTex(result), { label: 'length', keyboard: 'algebra', kind: 'number' }),
      ],
      solution: [
        setup(
          'vector-arithmetic',
          'Scale each one, then add',
          `${combo} = ${column([p * a[0], p * a[1]])} + ${column([q * b[0], q * b[1]])}`,
          'Componentwise, both times — there is nothing else a vector sum can mean.',
        ),
        setup('vector-arithmetic', 'Which is', column(result)),
        setup(
          'vector-length',
          'And its length',
          `\\left|${combo}\\right| = ${rootOf(`${num(result[0])}^{2} + ${num(result[1])}^{2}`)} = ${lengthTex(result)}`,
          'Pythagoras on the components. Leave the root — a decimal is not the answer.',
        ),
        aside(
          'Drawing it',
          `\\text{tip to tail}`,
          `Put the tail of ${q < 0 ? 'the reversed, doubled b' : 'the scaled b'} at the tip of the scaled a; the resultant runs from the origin to where you end up.`,
        ),
      ],
      ruleIds: ['vector-arithmetic', 'vector-length'],
      plot,
    };
  },
};

/** The dot product, and what it says about the angle. */
export const dotProduct: Generator = {
  id: 'vec.dot-product',
  chapter: 12,
  title: 'Dot product and angle',
  tags: ['vectors', 'dot-product'],
  version: 1,
  supports: ['medium', 'hard'] as const,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const a: Vec = [rng.nonZero(-4, 4), rng.nonZero(-4, 4)];
    // At the hard tier b is built perpendicular to a, so the dot product is 0
    // and the angle is exactly 90° — the one case worth being able to see.
    const b: Vec = tier === 'hard' ? [-a[1], a[0]] : [rng.nonZero(-4, 4), rng.nonZero(-4, 4)];
    const dot = a[0] * b[0] + a[1] * b[1];

    const plot: PlotSpec = {
      window: windowFor([a, b]),
      lattice: true,
      given: [
        { kind: 'vector', to: a, label: 'a' },
        { kind: 'vector', to: b, label: 'b' },
      ],
      answer: [
        { kind: 'vector', to: a, label: 'a' },
        { kind: 'vector', to: b, label: 'b' },
        ...(dot === 0 ? [{ kind: 'point' as const, at: [0, 0] as const, label: '90°' }] : []),
      ],
    };

    return {
      instruction: 'Find the dot product',
      prompt: `\\vec{a} = ${column(a)},\\quad \\vec{b} = ${column(b)}`,
      promptText:
        'Both vectors are drawn. Give the dot product and the length of a, then mark on the grid whether the angle between them is sharp, right or blunt.',
      note: 'The two typed fields are checked; the marking you check yourself.',
      answers: [
        answer(String(dot), { label: 'a · b', keyboard: 'numeric', kind: 'number' }),
        answer(lengthTex(a), { label: '|a|', keyboard: 'algebra', kind: 'number' }),
      ],
      solution: [
        setup(
          'dot-product',
          'Multiply componentwise and add',
          `\\vec{a}\\cdot\\vec{b} = ${num(a[0])}\\cdot${num(b[0])} + ${num(a[1])}\\cdot${num(b[1])} = ${dot}`,
          'The result is a number, not a vector — that is the whole point of it.',
        ),
        setup('vector-length', 'And the length of a', `\\left|\\vec{a}\\right| = ${lengthTex(a)}`),
        aside(
          'What the sign says',
          dot === 0 ? '\\theta = 90°' : dot > 0 ? '\\theta < 90°' : '\\theta > 90°',
          dot === 0
            ? 'Zero means perpendicular. Nothing else in the chapter is this easy to check.'
            : `$\\vec{a}\\cdot\\vec{b} = |\\vec{a}||\\vec{b}|\\cos\\theta$, and the lengths are positive — so the sign of the dot product is the sign of the cosine, and ${dot > 0 ? 'a positive cosine means an angle under 90°' : 'a negative cosine means an angle over 90°'}.`,
        ),
      ],
      ruleIds: ['dot-product', 'vector-length'],
      plot,
    };
  },
};

/** Find the missing component that makes two vectors perpendicular. */
export const perpendicular: Generator = {
  id: 'vec.perpendicular',
  chapter: 12,
  title: 'Make them perpendicular',
  tags: ['vectors', 'dot-product', 'solve'],
  version: 1,
  supports: ['medium', 'hard'] as const,
  invariant: 'solution-set-preserving',

  generate({ tier, rng }): Draft {
    const a: Vec = [rng.nonZero(-4, 4), rng.nonZero(-4, 4)];
    const known = tier === 'hard' ? rng.nonZero(-4, 4) : rng.pick([1, 2, -1, -2]);
    // a·b = 0 with b = (x, known) gives x = -known·a2/a1.
    const x = (-known * a[1]) / a[0];
    const equation = `${term(a[0], 'x')} ${a[1] * known < 0 ? '-' : '+'} ${Math.abs(a[1] * known)} = 0`;
    const answerTex = Number.isInteger(x) ? String(x) : fracTex(-known * a[1], a[0]);
    const b: Vec = [x, known];

    const plot: PlotSpec = {
      window: windowFor([a, [Math.round(x), known]]),
      lattice: Number.isInteger(x),
      given: [{ kind: 'vector', to: a, label: 'a' }],
      answer: [
        { kind: 'vector', to: a, label: 'a' },
        { kind: 'vector', to: b, label: 'b' },
      ],
    };

    return {
      instruction: 'Find x so the two are perpendicular',
      prompt: `\\vec{a} = ${column(a)},\\quad \\vec{b} = \\begin{pmatrix}x\\\\${known}\\end{pmatrix}`,
      promptText: 'a is drawn. Find x, then draw b.',
      note: 'The value is checked; the arrow you check yourself.',
      answers: [answer(answerTex, { label: 'x', keyboard: 'numeric', kind: 'number' })],
      solution: [
        setup(
          'dot-product',
          'Perpendicular means the dot product is zero',
          `\\vec{a}\\cdot\\vec{b} = 0`,
          'Not that the slopes multiply to -1 — that is the same statement, but the dot product does not care about vertical lines.',
        ),
        setup('dot-product', 'Write it out', equation),
        setup('linear-solve', 'And solve', `x = ${answerTex}`),
      ],
      ruleIds: ['dot-product', 'linear-solve'],
      verify: { kind: 'root', equation, wrt: 'x' },
      plot,
    };
  },
};

/** Distance between two points, which is the length of the difference. */
export const distance: Generator = {
  id: 'vec.distance',
  chapter: 12,
  title: 'Distance between two points',
  tags: ['vectors', 'distance'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const p: Vec = [rng.int(-5, 5), rng.int(-4, 4)];
    let q: Vec = [rng.int(-5, 5), rng.int(-4, 4)];
    while (q[0] === p[0] && q[1] === p[1]) q = [rng.int(-5, 5), rng.int(-4, 4)];
    const d: Vec = [q[0] - p[0], q[1] - p[1]];
    const midpoint: Vec = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];

    const plot: PlotSpec = {
      window: windowFor([p, q]),
      lattice: true,
      given: [
        { kind: 'point', at: p, label: `P(${p[0]}, ${p[1]})` },
        { kind: 'point', at: q, label: `Q(${q[0]}, ${q[1]})` },
      ],
      answer: [
        { kind: 'vector', from: p, to: q, label: 'PQ' },
        { kind: 'point', at: midpoint, label: 'midpoint', hollow: true },
      ],
    };

    return {
      instruction: 'Draw PQ and give its length',
      prompt: `P${column(p).replace('pmatrix', 'pmatrix')} \\quad Q${column(q)}`,
      promptText: `Draw the arrow from P(${p[0]}, ${p[1]}) to Q(${q[0]}, ${q[1]}), then give its components and its length.`,
      note: 'The typed fields are checked; the arrow you check yourself.',
      answers: [
        answer(String(d[0]), { label: 'x component', keyboard: 'numeric', kind: 'number' }),
        answer(String(d[1]), { label: 'y component', keyboard: 'numeric', kind: 'number' }),
        answer(lengthTex(d), { label: 'length', keyboard: 'algebra', kind: 'number' }),
      ],
      solution: [
        setup(
          'vector-arithmetic',
          'Head minus tail',
          `\\vec{PQ} = ${column(q)} - ${column(p)} = ${column(d)}`,
          'That order. The other way round is the arrow pointing back at P.',
        ),
        setup(
          'vector-length',
          'Pythagoras',
          `\\left|\\vec{PQ}\\right| = ${rootOf(`${num(d[0])}^{2} + ${num(d[1])}^{2}`)} = ${lengthTex(d)}`,
        ),
        ...(tier === 'easy'
          ? []
          : [
              aside(
                'And the midpoint, while you are here',
                `\\left(${midpoint[0]}, ${midpoint[1]}\\right)`,
                'The average of the two, componentwise — it is marked hollow on the answer.',
              ),
            ]),
      ],
      ruleIds: ['vector-arithmetic', 'vector-length'],
      plot,
    };
  },
};
