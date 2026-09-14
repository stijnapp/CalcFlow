import { TIERS } from '@calcflow/shared';
import { answer, aside, frac, fracTex, poly, rootOf, setup, term } from '../authoring.js';
import type { PlotSpec } from '../plot.js';
import type { Draft, Generator } from '../types.js';

/*
 * The drawn half of chapter 5.
 *
 * These questions have two answers of different kinds. The sketch is the real
 * one and only he can mark it — so it is revealed over his own drawing and
 * self-graded on three levels. The two or three typed key features are the
 * gradable half: an asymptote, an intercept, a vertex. Without them chapter 5
 * would be the one chapter whose mastery numbers mean nothing, and the whole
 * point of the stats screen is that they mean the same thing everywhere.
 *
 * Every solution line here is a display line and there is no `verify`: the
 * shapes are built forwards from the features the question asks for, so there
 * is nothing for a numeric check to re-derive. What the harness does still
 * enforce is that the plotted curve parses — the picture and the prompt are the
 * same string, so they cannot drift.
 */

/** ` + 3` / ` - 3`. */
const shift = (n: number): string => (n < 0 ? ` - ${-n}` : ` + ${n}`);

/** A window that keeps the units square and puts `cx, cy` in the middle. */
function windowAround(cx: number, cy: number, halfWidth: number, step = 1): PlotSpec['window'] {
  const halfHeight = Math.round(halfWidth * 0.62);
  return {
    xMin: cx - halfWidth,
    xMax: cx + halfWidth,
    yMin: cy - halfHeight,
    yMax: cy + halfHeight,
    step,
  };
}

/** Two branches, two asymptotes and one crossing — the standard hyperbola. */
export const hyperbola: Generator = {
  id: 'graph.hyperbola',
  chapter: 5,
  title: 'Sketch a hyperbola',
  tags: ['graphs', 'asymptotes', 'sketching'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const c = tier === 'easy' ? 0 : rng.nonZero(-3, 3);
    const a = tier === 'easy' ? 0 : rng.nonZero(-4, 4);
    // b is chosen so the x-intercept lands on a whole number where it can be read
    // off the grid; the whole question is about reading things off the grid.
    const root = rng.nonZero(-4, 4);
    const numeratorTop = a === 0 ? rng.nonZero(-6, 6) : a; // f(x) = k/(x-c) when a is 0
    const b = a === 0 ? 0 : -a * root;
    const fx =
      a === 0
        ? frac(String(numeratorTop), poly([[1, 1], [-c, 0]]))
        : frac(poly([[a, 1], [b, 0]]), poly([[1, 1], [-c, 0]]));
    const horizontal = a;

    const features =
      a === 0
        ? [
            answer(String(c), { label: 'vertical asymptote at x =', keyboard: 'numeric', kind: 'number' }),
            answer('0', { label: 'horizontal asymptote at y =', keyboard: 'numeric', kind: 'number' }),
          ]
        : [
            answer(String(c), { label: 'vertical asymptote at x =', keyboard: 'numeric', kind: 'number' }),
            answer(String(horizontal), { label: 'horizontal asymptote at y =', keyboard: 'numeric', kind: 'number' }),
            answer(String(root), { label: 'crosses the x-axis at x =', keyboard: 'numeric', kind: 'number' }),
          ];

    const plot: PlotSpec = {
      window: windowAround(c, horizontal, 8),
      answer: [
        { kind: 'curve', of: fx },
        { kind: 'asymptote', axis: 'vertical', at: c, label: `x = ${c}` },
        { kind: 'asymptote', axis: 'horizontal', at: horizontal, label: `y = ${horizontal}` },
        ...(a === 0 ? [] : [{ kind: 'point' as const, at: [root, 0] as const, label: `(${root}, 0)` }]),
      ],
    };

    return {
      instruction: 'Sketch the graph',
      prompt: `f(x) = ${fx}`,
      promptText: 'Draw both branches, mark the asymptotes, and mark where it crosses the axes.',
      note: 'The typed fields below are checked; the sketch you mark yourself against the answer.',
      answers: features,
      solution: [
        setup(
          'asymptote',
          'The bottom is zero at',
          `x = ${c}`,
          'Nothing can happen there, and the curve runs off to infinity either side of it — that is the vertical asymptote.',
        ),
        setup(
          'asymptote',
          'What happens far out',
          `y = ${horizontal}`,
          a === 0
            ? 'A constant over something huge goes to zero, so the curve flattens onto the x-axis.'
            : `Divide top and bottom by x: everything with an x underneath dies away and ${a} is what is left.`,
        ),
        ...(a === 0
          ? []
          : [
              setup(
                'domain',
                'It crosses the axis where the top is zero',
                `${poly([[a, 1], [b, 0]])} = 0 \\Rightarrow x = ${root}`,
                'A fraction is zero exactly when its numerator is — the bottom only says where it is undefined.',
              ),
            ]),
        aside(
          'And the two branches',
          `x < ${c} \\text{ and } x > ${c}`,
          'One either side of the vertical asymptote. Each one hugs both asymptotes, so the shape is fixed once they are drawn.',
        ),
      ],
      ruleIds: ['asymptote', 'domain'],
      plot,
    };
  },
};

/** Vertex, intercepts, and which way up. */
export const parabola: Generator = {
  id: 'graph.parabola',
  chapter: 5,
  title: 'Sketch a parabola',
  tags: ['graphs', 'quadratic', 'sketching'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const a = tier === 'easy' ? rng.pick([1, -1]) : rng.pick([1, -1, 2, -2]);
    const h = rng.nonZero(-3, 3);
    const k = rng.nonZero(-5, 5);
    // Given in expanded form from medium up: recognising the vertex is the work.
    const b = -2 * a * h;
    const c = a * h * h + k;
    const fx = tier === 'easy' ? `${term(a, `\\left(x${shift(-h)}\\right)^{2}`)}${shift(k)}` : poly([[a, 2], [b, 1], [c, 0]]);

    const plot: PlotSpec = {
      window: windowAround(h, k, 7),
      answer: [
        { kind: 'curve', of: fx },
        { kind: 'point', at: [h, k], label: `(${h}, ${k})` },
        { kind: 'point', at: [0, c], label: `(0, ${c})` },
      ],
    };

    return {
      instruction: 'Sketch the graph',
      prompt: `f(x) = ${fx}`,
      promptText: 'Mark the vertex and where it crosses the y-axis, and get the direction right.',
      note: 'The typed fields below are checked; the sketch you mark yourself against the answer.',
      answers: [
        answer(String(h), { label: 'vertex at x =', keyboard: 'numeric', kind: 'number' }),
        answer(String(k), { label: 'vertex at y =', keyboard: 'numeric', kind: 'number' }),
        answer(String(c), { label: 'crosses the y-axis at y =', keyboard: 'numeric', kind: 'number' }),
      ],
      solution: [
        setup(
          'completing-square',
          'In vertex form',
          `f(x) = ${term(a, `\\left(x${shift(-h)}\\right)^{2}`)}${shift(k)}`,
          tier === 'easy'
            ? 'Which is how it was given: the vertex can be read straight off.'
            : `Half of ${b} is ${b / 2}, and completing the square moves it inside the bracket.`,
        ),
        setup('range', 'So the vertex is', `\\left(${h}, ${k}\\right)`),
        setup('domain', 'And at x = 0', `f(0) = ${c}`),
        aside(
          'Which way up',
          a > 0 ? '\\text{opens upwards}' : '\\text{opens downwards}',
          a > 0
            ? `${a} is positive, so the vertex is the lowest point.`
            : `${a} is negative, so the vertex is the highest point.`,
        ),
      ],
      ruleIds: ['completing-square', 'range', 'domain'],
      plot,
    };
  },
};

/** The line through two given points. */
export const lineThroughPoints: Generator = {
  id: 'graph.line-two-points',
  chapter: 5,
  title: 'The line through two points',
  tags: ['graphs', 'slope', 'sketching'],
  version: 1,
  supports: ['easy', 'medium'] as const,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const m = tier === 'easy' ? rng.nonZero(-3, 3) : rng.pick([-3, -2, 2, 3]);
    const q = rng.nonZero(-5, 5);
    const x1 = rng.int(-4, 0);
    let x2 = rng.int(1, 5);
    if (x2 === x1) x2 += 1;
    const y1 = m * x1 + q;
    const y2 = m * x2 + q;
    const slopeTex = tier === 'easy' ? String(m) : fracTex(y2 - y1, x2 - x1);

    const plot: PlotSpec = {
      window: windowAround(0, q, 8),
      given: [
        { kind: 'point', at: [x1, y1], label: `(${x1}, ${y1})` },
        { kind: 'point', at: [x2, y2], label: `(${x2}, ${y2})` },
      ],
      answer: [
        { kind: 'line', slope: m, intercept: q },
        { kind: 'point', at: [0, q], label: `(0, ${q})` },
      ],
    };

    return {
      instruction: 'Draw the line through both points',
      prompt: `\\left(${x1}, ${y1}\\right) \\text{ and } \\left(${x2}, ${y2}\\right)`,
      promptText: 'Both points are already on the grid. Draw the line, and give its slope and where it crosses the y-axis.',
      note: 'The typed fields below are checked; the sketch you mark yourself against the answer.',
      answers: [
        answer(slopeTex, { label: 'slope', keyboard: 'numeric', kind: 'number' }),
        answer(String(q), { label: 'crosses the y-axis at y =', keyboard: 'numeric', kind: 'number' }),
      ],
      solution: [
        setup(
          'slope',
          'Rise over run',
          `m = ${frac(`${y2} - \\left(${y1}\\right)`, `${x2} - \\left(${x1}\\right)`)} = ${m}`,
          'In that order both times — swapping one and not the other flips the sign.',
        ),
        setup(
          'slope',
          'Then use one of the points',
          `${y1} = ${term(m, String(x1))} + q \\Rightarrow q = ${q}`,
          'Either point works, and using the other one is the cheapest possible check.',
        ),
        aside('The line', `y = ${term(m, 'x')}${shift(q)}`),
      ],
      ruleIds: ['slope', 'linear-solve'],
      plot,
    };
  },
};

/** Centre and radius out of the completed square. */
export const circle: Generator = {
  id: 'graph.circle',
  chapter: 5,
  title: 'Sketch a circle',
  tags: ['graphs', 'circle', 'completing-square'],
  version: 1,
  supports: ['medium', 'hard'] as const,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const h = rng.int(-3, 3);
    const k = rng.int(-3, 3);
    const r = rng.int(2, 4);
    const upper = `${k} + ${rootOf(`${r * r} - \\left(x${shift(-h)}\\right)^{2}`)}`;
    const lower = `${k} - ${rootOf(`${r * r} - \\left(x${shift(-h)}\\right)^{2}`)}`;
    // Expanded from hard up, so the squares have to be completed to see it at all.
    const expanded = `x^{2} + y^{2}${shift(-2 * h)}x${shift(-2 * k)}y${shift(h * h + k * k - r * r)} = 0`;
    const centred = `\\left(x${shift(-h)}\\right)^{2} + \\left(y${shift(-k)}\\right)^{2} = ${r * r}`;

    const plot: PlotSpec = {
      window: windowAround(h, k, Math.max(6, r + 3)),
      answer: [
        { kind: 'curve', of: upper },
        { kind: 'curve', of: lower },
        { kind: 'point', at: [h, k], label: `(${h}, ${k})` },
      ],
    };

    return {
      instruction: 'Sketch the circle',
      prompt: tier === 'hard' ? expanded : centred,
      promptText: 'Draw it on the grid, and give its centre and radius.',
      note: 'The typed fields below are checked; the sketch you mark yourself against the answer.',
      answers: [
        answer(String(h), { label: 'centre x', keyboard: 'numeric', kind: 'number' }),
        answer(String(k), { label: 'centre y', keyboard: 'numeric', kind: 'number' }),
        answer(String(r), { label: 'radius', keyboard: 'numeric', kind: 'number' }),
      ],
      solution: [
        ...(tier === 'hard'
          ? [
              setup(
                'completing-square',
                'Complete both squares',
                centred,
                `Half of ${-2 * h} is ${-h}, half of ${-2 * k} is ${-k}, and the two constants they add come off the other side.`,
              ),
            ]
          : []),
        setup('circle', 'Read off the centre', `\\left(${h}, ${k}\\right)`, 'The signs flip: the bracket says x − h.'),
        setup('circle', 'And the radius', `r = ${rootOf(String(r * r))} = ${r}`, 'The right-hand side is r², not r.'),
      ],
      ruleIds: ['circle', 'completing-square'],
      plot,
    };
  },
};

/** Where two graphs cross, drawn and solved. */
export const intersections: Generator = {
  id: 'graph.intersections',
  chapter: 5,
  title: 'Where two graphs cross',
  tags: ['graphs', 'intersections', 'sketching'],
  version: 1,
  supports: ['medium', 'hard'] as const,
  invariant: 'solution-set-preserving',

  generate({ tier, rng }): Draft {
    // Built from the two crossings, so they land on the grid where they can be read.
    const p = rng.int(-4, 1);
    let q = rng.int(0, 4);
    if (q <= p) q = p + rng.int(1, 3);
    const m = tier === 'hard' ? rng.nonZero(-3, 3) : 0;
    const shiftUp = rng.nonZero(-4, 4);
    // (x − p)(x − q) = mx + shiftUp − (mx + shiftUp) ... build the parabola from the line up.
    const b = -(p + q) + m;
    const c = p * q + shiftUp;
    const parabolaTex = poly([[1, 2], [b, 1], [c, 0]]);
    const lineTex = m === 0 ? String(shiftUp) : `${term(m, 'x')}${shift(shiftUp)}`;
    const equation = `${parabolaTex} = ${lineTex}`;

    const plot: PlotSpec = {
      window: windowAround((p + q) / 2, 0, 8),
      given: [{ kind: 'curve', of: parabolaTex }, { kind: 'line', slope: m, intercept: shiftUp }],
      answer: [
        { kind: 'point', at: [p, m * p + shiftUp], label: `(${p}, ${m * p + shiftUp})` },
        { kind: 'point', at: [q, m * q + shiftUp], label: `(${q}, ${m * q + shiftUp})` },
      ],
    };

    return {
      instruction: 'Mark both crossings',
      prompt: `f(x) = ${parabolaTex},\\quad g(x) = ${lineTex}`,
      promptText: 'Both graphs are drawn. Mark where they cross, and give the two x-values.',
      note: 'Smaller x first. The typed fields are checked; the marks you check yourself.',
      answers: [
        answer(String(p), { label: 'smaller x', keyboard: 'numeric', kind: 'number' }),
        answer(String(q), { label: 'larger x', keyboard: 'numeric', kind: 'number' }),
      ],
      solution: [
        setup(
          'quadratic-formula',
          'Crossing means equal',
          equation,
          'Two graphs cross exactly where their two values agree — which is one equation, not two.',
        ),
        setup(
          'quadratic-formula',
          'Everything on one side',
          `${poly([[1, 2], [b - m, 1], [c - shiftUp, 0]])} = 0`,
        ),
        setup(
          'quadratic-formula',
          'Factorise',
          `\\left(x${shift(-p)}\\right)\\left(x${shift(-q)}\\right) = 0 \\Rightarrow x = ${p} \\text{ or } x = ${q}`,
        ),
      ],
      ruleIds: ['quadratic-formula', 'linear-solve'],
      verify: { kind: 'root', equation, wrt: 'x' },
      plot,
    };
  },
};

/** Amplitude and period, read off a drawn wave. */
export const sineWave: Generator = {
  id: 'graph.sine-wave',
  chapter: 5,
  title: 'Sketch a sine wave',
  tags: ['graphs', 'trigonometry', 'sketching'],
  version: 1,
  supports: ['medium', 'hard'] as const,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const amplitude = rng.int(1, 3);
    const b = rng.int(1, 3);
    const vertical = tier === 'hard' ? rng.nonZero(-2, 2) : 0;
    const useCos = rng.bool();
    const fx = `${term(amplitude, `\\${useCos ? 'cos' : 'sin'}\\left(${term(b, 'x')}\\right)`)}${vertical === 0 ? '' : shift(vertical)}`;
    const periodTex = b === 1 ? '2\\pi' : b === 2 ? '\\pi' : `\\frac{2\\pi}{${b}}`;

    const plot: PlotSpec = {
      window: { xMin: -7, xMax: 7, yMin: -amplitude - 2, yMax: amplitude + 2, step: 1 },
      answer: [
        { kind: 'curve', of: fx },
        ...(vertical === 0
          ? []
          : [{ kind: 'line' as const, slope: 0, intercept: vertical, dashed: true, label: `y = ${vertical}` }]),
      ],
    };

    return {
      instruction: 'Sketch one full period',
      prompt: `f(x) = ${fx}`,
      promptText: 'Draw at least one full period on the grid, and give the amplitude and the period.',
      note: 'The typed fields below are checked; the sketch you mark yourself against the answer.',
      answers: [
        answer(String(amplitude), { label: 'amplitude', keyboard: 'numeric', kind: 'number' }),
        answer(periodTex, { label: 'period', keyboard: 'trig', kind: 'number' }),
      ],
      solution: [
        setup(
          'radians',
          'The amplitude is the coefficient in front',
          String(amplitude),
          `It runs from ${vertical - amplitude} to ${vertical + amplitude}, so the total height is ${2 * amplitude}.`,
        ),
        setup(
          'radians',
          'The period is 2π over the coefficient inside',
          periodTex,
          `The inside has to travel 2π for a full cycle, and it moves ${b} times as fast as x does.`,
        ),
        ...(vertical === 0
          ? []
          : [aside('And the whole wave is lifted', `y = ${vertical}`, 'Which is the line it oscillates about.')]),
      ],
      ruleIds: ['radians', 'exact-values'],
      plot,
    };
  },
};
