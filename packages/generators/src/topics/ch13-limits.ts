import { TIERS } from '@calcflow/shared';
import { answer, aside, frac, fracTex, paren, poly, power, rootOf, setup, step, term } from '../authoring.js';
import type { Draft, Generator } from '../types.js';

/*
 * Chapter 13 is not in the practice book. The course opens with it and the exam
 * opens with it, so it is the one gap in the book that is guaranteed to cost
 * marks.
 *
 * Nothing here can be graded as a limit: the engine's parser has no `\lim`. The
 * prompt carries the limit notation, the answer is the plain value it
 * approaches, and the harness checks it by walking in — `verify: { kind:
 * 'limit' }` samples the expression either side of the point and insists it
 * goes where the answer says.
 */

/** The 0/0 that is not really 0/0: something cancels. */
export const factorLimit: Generator = {
  id: 'limits.factor',
  chapter: 13,
  title: 'Limits that look like 0/0',
  tags: ['limits'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    if (tier === 'hard') {
      // A root on top: multiply by the conjugate rather than factor.
      const q = rng.int(2, 6);
      const a = q * q;
      const expr = frac(`${rootOf('x')} - ${q}`, poly([[1, 1], [-a, 0]]));
      const result = fracTex(1, 2 * q);
      return {
        instruction: 'Find the limit',
        prompt: `\\lim_{x\\to ${a}} ${expr}`,
        note: 'Give the exact value.',
        answers: [answer(result, { keyboard: 'calculus', kind: 'number' })],
        solution: [
          aside(
            'Substituting gives 0/0',
            `\\frac{${rootOf(String(a))} - ${q}}{${a} - ${a}} = \\frac{0}{0}`,
            'Which says nothing at all — it is a signal to rewrite, not an answer.',
          ),
          setup(
            'limit-factor',
            'Multiply by the conjugate',
            `\\lim_{x\\to ${a}} \\frac{x - ${a}}{\\left(x - ${a}\\right)\\left(${rootOf('x')} + ${q}\\right)}`,
            `$\\left(\\sqrt{x} - ${q}\\right)\\left(\\sqrt{x} + ${q}\\right) = x - ${a}$.`,
          ),
          setup(
            'limit-factor',
            'Cancel, then substitute',
            `\\lim_{x\\to ${a}} \\frac{1}{${rootOf('x')} + ${q}} = \\frac{1}{${q} + ${q}}`,
            `x never equals ${a}, so dividing by x - ${a} is allowed.`,
          ),
          step('limit-factor', 'The value', result),
        ],
        ruleIds: ['limit-factor', 'rationalise'],
        verify: { kind: 'limit', of: expr, wrt: 'x', at: a },
      };
    }

    // (x − r)(x − s) over (x − r), so the limit is r − s.
    const r = rng.nonZero(-6, 6);
    let s = rng.nonZero(-6, 6);
    while (s === r) s = rng.nonZero(-6, 6);
    const numerator = tier === 'easy'
      ? poly([[1, 2], [-(r * r), 0]])
      : poly([[1, 2], [-(r + s), 1], [r * s, 0]]);
    const other = tier === 'easy' ? -r : s;
    const denominator = poly([[1, 1], [-r, 0]]);
    const expr = frac(numerator, denominator);
    const value = r - other;

    return {
      instruction: 'Find the limit',
      prompt: `\\lim_{x\\to ${r}} ${expr}`,
      note: 'Give the exact value.',
      answers: [answer(String(value), { keyboard: 'calculus', kind: 'number' })],
      solution: [
        aside(
          'Substituting gives 0/0',
          `\\frac{0}{0}`,
          'Top and bottom are both zero at that point, which means they share a factor.',
        ),
        setup(
          'limit-factor',
          'Factor and cancel',
          `\\lim_{x\\to ${r}} \\frac{${paren(denominator)}${paren(poly([[1, 1], [-other, 0]]))}}{${denominator}} = \\lim_{x\\to ${r}} ${poly([[1, 1], [-other, 0]])}`,
          `x approaches ${r} without ever being ${r}, so x - ${r} is never actually zero.`,
        ),
        step('limit-factor', 'Now substitute', String(value)),
      ],
      ruleIds: ['limit-factor', tier === 'easy' ? 'difference-of-squares' : 'fraction-simplify'],
      verify: { kind: 'limit', of: expr, wrt: 'x', at: r },
    };
  },
};

/** What happens far out, where only the leading terms still matter. */
export const limitAtInfinity: Generator = {
  id: 'limits.at-infinity',
  chapter: 13,
  title: 'Limits at infinity',
  tags: ['limits', 'asymptotes'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const a = rng.nonZero(-6, 6);
    const b = rng.nonZero(-8, 8);
    const c = rng.int(1, 6);
    const d = rng.nonZero(-8, 8);

    if (tier === 'hard') {
      // A root in the denominator: √(x²+k) behaves like x, not like x².
      const k = rng.int(1, 9);
      const expr = frac(poly([[a, 1], [b, 0]]), rootOf(`x^{2} + ${k}`));
      return {
        instruction: 'Find the limit',
        prompt: `\\lim_{x\\to\\infty} ${expr}`,
        note: 'Give the exact value.',
        answers: [answer(String(a), { keyboard: 'calculus', kind: 'number' })],
        solution: [
          setup(
            'limit-infinity',
            'Divide top and bottom by x',
            `\\lim_{x\\to\\infty} \\frac{${a} + ${frac(String(b), 'x')}}{${rootOf(`1 + ${frac(String(k), 'x^{2}')}`)}}`,
            `Inside the root, dividing by $x$ means dividing by $x^{2}$ — that is where the root's own square comes from.`,
          ),
          aside('Everything with an x underneath dies', `\\frac{${a} + 0}{${rootOf('1 + 0')}}`),
          step('limit-infinity', 'The value', String(a)),
        ],
        ruleIds: ['limit-infinity'],
        verify: { kind: 'limit', of: expr, wrt: 'x', at: 'inf' },
      };
    }

    if (tier === 'medium') {
      // Bottom wins, so the whole thing goes to zero.
      const expr = frac(poly([[a, 1], [b, 0]]), poly([[c, 2], [d, 0]]));
      return {
        instruction: 'Find the limit',
        prompt: `\\lim_{x\\to\\infty} ${expr}`,
        note: 'Give the exact value.',
        answers: [answer('0', { keyboard: 'calculus', kind: 'number' })],
        solution: [
          setup(
            'limit-infinity',
            'Divide by the highest power below',
            `\\lim_{x\\to\\infty} \\frac{${frac(String(a), 'x')} + ${frac(String(b), 'x^{2}')}}{${c} + ${frac(String(d), 'x^{2}')}}`,
          ),
          aside('Every term with an x underneath goes to 0', `\\frac{0}{${c}}`),
          step('limit-infinity', 'The value', '0', 'The bottom grows faster, so the fraction is squeezed to nothing.'),
        ],
        ruleIds: ['limit-infinity'],
        verify: { kind: 'limit', of: expr, wrt: 'x', at: 'inf' },
      };
    }

    const e = rng.int(1, 6);
    const expr = frac(poly([[a, 2], [b, 1]]), poly([[e, 2], [d, 0]]));
    const result = fracTex(a, e);
    return {
      instruction: 'Find the limit',
      prompt: `\\lim_{x\\to\\infty} ${expr}`,
      note: 'Give the exact value.',
      answers: [answer(result, { keyboard: 'calculus', kind: 'number' })],
      solution: [
        setup(
          'limit-infinity',
          'Divide top and bottom by x²',
          `\\lim_{x\\to\\infty} \\frac{${a} + ${frac(String(b), 'x')}}{${e} + ${frac(String(d), 'x^{2}')}}`,
        ),
        aside('Every term with an x underneath goes to 0', `\\frac{${a}}{${e}}`),
        step('limit-infinity', 'The value', result, 'Same degree top and bottom, so it is the ratio of the leading coefficients.'),
      ],
      ruleIds: ['limit-infinity'],
      verify: { kind: 'limit', of: expr, wrt: 'x', at: 'inf' },
    };
  },
};

/**
 * The standard limits, and the rule that gets them all. Every one of these is
 * 0/0, and every one comes out as a ratio of derivatives.
 */
export const standardLimits: Generator = {
  id: 'limits.standard',
  chapter: 13,
  title: "L'Hôpital and the standard limits",
  tags: ['limits', 'lhopital'],
  version: 1,
  supports: ['medium', 'hard'] as const,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const a = rng.int(2, 6);
    let b = rng.int(2, 6);
    while (b === a) b = rng.int(2, 6);

    const shapes: Array<{ expr: string; top: string; bottom: string; value: string }> =
      tier === 'medium'
        ? [
            {
              expr: frac(`\\sin\\left(${a}x\\right)`, term(b, 'x')),
              top: `${a}\\cos\\left(${a}x\\right)`,
              bottom: String(b),
              value: fracTex(a, b),
            },
            {
              expr: frac(`e^{${a}x} - 1`, term(b, 'x')),
              top: `${a}e^{${a}x}`,
              bottom: String(b),
              value: fracTex(a, b),
            },
            {
              expr: frac(`\\ln\\left(1 + ${a}x\\right)`, term(b, 'x')),
              top: frac(String(a), `1 + ${a}x`),
              bottom: String(b),
              value: fracTex(a, b),
            },
          ]
        : [
            {
              expr: frac(`1 - \\cos\\left(${a}x\\right)`, 'x^{2}'),
              top: `${a}\\sin\\left(${a}x\\right)`,
              bottom: '2x',
              value: fracTex(a * a, 2),
            },
            {
              expr: frac(`\\sin\\left(${a}x\\right)`, `\\sin\\left(${b}x\\right)`),
              top: `${a}\\cos\\left(${a}x\\right)`,
              bottom: `${b}\\cos\\left(${b}x\\right)`,
              value: fracTex(a, b),
            },
            {
              expr: frac(`e^{${a}x} - e^{${b}x}`, 'x'),
              top: `${a}e^{${a}x} - ${b}e^{${b}x}`,
              bottom: '1',
              value: String(a - b),
            },
          ];

    const s = rng.pick(shapes);
    const twice = s.bottom === '2x';

    return {
      instruction: 'Find the limit',
      prompt: `\\lim_{x\\to 0} ${s.expr}`,
      note: 'Give the exact value.',
      answers: [answer(s.value, { keyboard: 'calculus', kind: 'number' })],
      solution: [
        aside('Check the form first', '\\frac{0}{0}', "L'Hôpital applies to 0/0 and ∞/∞ and to nothing else."),
        setup(
          'lhopital',
          'Differentiate top and bottom separately',
          `\\lim_{x\\to 0} ${frac(s.top, s.bottom)}`,
          'Separately — this is not the quotient rule.',
        ),
        ...(twice
          ? [
              setup(
                'lhopital',
                'Still 0/0, so again',
                `\\lim_{x\\to 0} ${frac(`${a * a}\\cos\\left(${a}x\\right)`, '2')}`,
              ),
            ]
          : []),
        step('lhopital', 'Now substitute', s.value),
      ],
      ruleIds: ['lhopital', 'standard-derivatives'],
      verify: { kind: 'limit', of: s.expr, wrt: 'x', at: 0 },
    };
  },
};

/**
 * A function defined in two pieces, and the constant that makes them meet. The
 * whole definition of continuity, asked as one number.
 */
export const continuity: Generator = {
  id: 'limits.continuity',
  chapter: 13,
  title: 'Making a function continuous',
  tags: ['limits', 'continuity'],
  version: 1,
  supports: ['medium', 'hard'] as const,
  invariant: 'solution-set-preserving',

  generate({ tier, rng }): Draft {
    const c = rng.int(1, 4);
    const m = rng.nonZero(-5, 5);

    if (tier === 'hard') {
      // e^{x−c} on the left, a line on the right: the meeting value is 1.
      const value = 1 - m * c;
      const equation = `1 = ${m * c} + x`;
      return {
        instruction: 'Find a',
        prompt: `f(x) = \\begin{cases} e^{x - ${c}} & x < ${c} \\\\ ${poly([[m, 1]])} + a & x \\ge ${c} \\end{cases}`,
        promptText: `For which value of a is f continuous at x = ${c}?`,
        note: 'Give the exact value.',
        answers: [answer(String(value), { label: 'a', keyboard: 'calculus', kind: 'number' })],
        solution: [
          aside(
            'From the left',
            `\\lim_{x\\uparrow ${c}} e^{x - ${c}} = e^{0} = 1`,
            'The left-hand piece decides what it approaches from below.',
          ),
          aside('From the right', `\\lim_{x\\downarrow ${c}} \\left(${poly([[m, 1]])} + a\\right) = ${m * c} + a`),
          step('continuity', 'Set them equal', equation, 'Continuous means the two pieces agree at the join.'),
          step('linear-solve', 'Solve for a', `x = ${value}`),
        ],
        ruleIds: ['continuity', 'linear-solve'],
        verify: { kind: 'root', equation, wrt: 'x' },
      };
    }

    const value = m * c - c * c;
    const equation = `${c * c} + x = ${m * c}`;
    return {
      instruction: 'Find a',
      prompt: `f(x) = \\begin{cases} x^{2} + a & x < ${c} \\\\ ${poly([[m, 1]])} & x \\ge ${c} \\end{cases}`,
      promptText: `For which value of a is f continuous at x = ${c}?`,
      note: 'Give the exact value.',
      answers: [answer(String(value), { label: 'a', keyboard: 'calculus', kind: 'number' })],
      solution: [
        aside('From the left', `\\lim_{x\\uparrow ${c}} \\left(x^{2} + a\\right) = ${c * c} + a`),
        aside('From the right', `\\lim_{x\\downarrow ${c}} ${poly([[m, 1]])} = ${m * c}`),
        step('continuity', 'Set them equal', equation, 'Both one-sided limits have to agree, and to agree with f itself.'),
        step('linear-solve', 'Solve for a', `x = ${value}`),
      ],
      ruleIds: ['continuity', 'linear-solve'],
      verify: { kind: 'root', equation, wrt: 'x' },
    };
  },
};

/** The lines a graph runs into but never reaches. */
export const asymptotes: Generator = {
  id: 'limits.asymptotes',
  chapter: 13,
  title: 'Asymptotes',
  tags: ['limits', 'asymptotes', 'graphs'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const c = rng.nonZero(-6, 6);

    if (tier === 'easy') {
      const a = rng.nonZero(-5, 5);
      const b = rng.nonZero(-9, 9);
      const denominator = poly([[1, 1], [-c, 0]]);
      const fx = frac(poly([[a, 1], [b, 0]]), denominator);
      return {
        instruction: 'Find the vertical asymptote',
        prompt: `f(x) = ${fx}`,
        note: 'Give the x-value where it is.',
        answers: [answer(String(c), { label: 'x', keyboard: 'calculus', kind: 'number' })],
        solution: [
          setup(
            'asymptote',
            'Where the bottom is zero',
            `${denominator} = 0`,
            'The top is not zero there, so the fraction blows up rather than cancelling.',
          ),
          step('linear-solve', 'Solve', String(c), `The line x = ${c} is the one the graph runs along without ever touching.`),
        ],
        ruleIds: ['asymptote', 'linear-solve'],
        verify: { kind: 'root', equation: `${denominator} = 0`, wrt: 'x' },
      };
    }

    if (tier === 'medium') {
      const a = rng.nonZero(-6, 6);
      const e = rng.int(1, 6);
      const b = rng.nonZero(-8, 8);
      const d = rng.int(1, 9);
      const fx = frac(poly([[a, 2], [b, 0]]), poly([[e, 2], [d, 0]]));
      const result = fracTex(a, e);
      return {
        instruction: 'Find the horizontal asymptote',
        prompt: `f(x) = ${fx}`,
        note: 'Give the y-value of the line.',
        answers: [answer(result, { label: 'y', keyboard: 'calculus', kind: 'number' })],
        solution: [
          setup(
            'asymptote',
            'What it approaches far out',
            `y = \\lim_{x\\to\\infty} ${fx}`,
            'A horizontal asymptote is a limit at infinity, nothing else.',
          ),
          setup('limit-infinity', 'Divide by x²', `\\lim_{x\\to\\infty} \\frac{${a} + ${frac(String(b), 'x^{2}')}}{${e} + ${frac(String(d), 'x^{2}')}}`),
          step('limit-infinity', 'The line', result),
        ],
        ruleIds: ['asymptote', 'limit-infinity'],
        verify: { kind: 'limit', of: fx, wrt: 'x', at: 'inf' },
      };
    }

    // Top one degree higher: divide, and the quotient is the slant asymptote.
    const d = rng.nonZero(-5, 5);
    const k = rng.nonZero(-6, 6);
    const r = rng.nonZero(-9, 9);
    // (x − d)(x + k) + r, so the division leaves x + k with remainder r.
    const numerator = poly([[1, 2], [k - d, 1], [-d * k + r, 0]]);
    const denominator = poly([[1, 1], [-d, 0]]);
    const fx = frac(numerator, denominator);
    const line = poly([[1, 1], [k, 0]]);

    return {
      instruction: 'Find the slant asymptote',
      prompt: `f(x) = ${fx}`,
      note: 'Give the right-hand side of y = …',
      answers: [answer(line, { keyboard: 'calculus' })],
      solution: [
        aside(
          'The top is one degree higher',
          `\\deg(${numerator}) = 2,\\quad \\deg(${denominator}) = 1`,
          'That is exactly when a slant asymptote exists.',
        ),
        setup(
          'polynomial-division',
          'Divide',
          `f(x) = ${line} + ${frac(String(r), denominator)}`,
        ),
        setup(
          'asymptote',
          'The remainder dies away',
          `\\lim_{x\\to\\infty} ${frac(String(r), denominator)} = 0`,
          'So far out, f is the quotient and nothing else.',
        ),
        step('asymptote', 'The line', line),
      ],
      ruleIds: ['asymptote', 'polynomial-division'],
    };
  },
};

/**
 * The limit L'Hôpital cannot touch. `x²sin(1/x)` has no derivative worth
 * taking at 0 and the sine has no limit there at all — the only handle is that
 * the whole thing is trapped between two things that do go to 0.
 */
export const squeeze: Generator = {
  id: 'limits.squeeze',
  chapter: 13,
  title: 'Squeeze the limit',
  tags: ['limits', 'squeeze'],
  version: 1,
  supports: ['medium', 'hard'] as const,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const inner = rng.pick(['\\sin', '\\cos']);
    const shortName = inner === '\\sin' ? 'sin' : 'cos';
    // The hard tier's oscillating factor is bounded, but not by ±1 — finding
    // *a* bound rather than reciting the obvious one is the step up.
    const oscillating =
      tier === 'hard'
        ? `e^{${inner}\\left(${frac('1', 'x')}\\right)}`
        : `${inner}\\left(${frac('1', 'x')}\\right)`;
    const bounds = tier === 'hard' ? ['e^{-1}', 'e'] : ['-1', '1'];
    const expr = `x^{2}${oscillating}`;

    return {
      instruction: 'Find the limit',
      prompt: `\\lim_{x\\to 0} ${expr}`,
      note: `L'Hôpital does not apply here. ${shortName}(1/x) oscillates forever as x approaches 0 — it has no limit of its own.`,
      answers: [answer('0', { keyboard: 'calculus', kind: 'number' })],
      solution: [
        aside(
          'The oscillating factor is bounded',
          `${bounds[0]} \\le ${oscillating} \\le ${bounds[1]}`,
          tier === 'hard'
            ? `The exponent never leaves $[-1, 1]$, and $e^{t}$ is increasing — so the whole factor is stuck between $e^{-1}$ and $e$. It never gets close to 0, but it never runs away either, and that is enough.`
            : 'Which is all that is ever known about it, and all that is needed.',
        ),
        aside(
          'So the whole thing is trapped',
          `${bounds[0]}x^{2} \\le ${expr} \\le ${bounds[1]}x^{2}`,
          'x² is never negative, so multiplying the inequality through by it leaves the direction alone.',
        ),
        step(
          'squeeze',
          'Both edges go to 0, so it does too',
          '0',
          'x² → 0 as x → 0, and there is nowhere else for the middle to go.',
        ),
      ],
      ruleIds: ['squeeze'],
      verify: { kind: 'limit', of: expr, wrt: 'x', at: 0 },
    };
  },
};

/** The 1^∞ form, which is not 1 — it is an exponential in disguise. */
export const exponentialLimit: Generator = {
  id: 'limits.exponential-form',
  chapter: 13,
  title: 'Limits of the form 1 to the infinity',
  tags: ['limits', 'exponentials'],
  version: 1,
  supports: ['hard'] as const,
  invariant: 'value-preserving',

  generate({ rng }): Draft {
    const a = rng.int(2, 8);
    const b = rng.int(1, 4);
    // ((x + a)/(x + b))^{x + c} → e^{a − b}: the exponent's own constant washes out.
    const c = rng.int(0, 5);
    const base = frac(`x + ${a}`, `x + ${b}`);
    const expr = `\\left(${base}\\right)^{x + ${c}}`;
    const result = a - b === 1 ? 'e' : `e^{${a - b}}`;

    return {
      instruction: 'Find the limit',
      prompt: `\\lim_{x\\to\\infty} ${expr}`,
      note: 'Exact value. The base goes to 1 and the exponent to infinity, which settles nothing on its own.',
      answers: [answer(result, { keyboard: 'logs', kind: 'number' })],
      solution: [
        aside(
          'Why 1^∞ is not 1',
          `\\left(1 + ${frac('1', 'x')}\\right)^{x} \\to e`,
          'The base creeps to 1 and the exponent runs to infinity; which one wins depends on how fast, so the form has to be resolved rather than read off.',
        ),
        setup(
          'limit-exponential',
          'Split off the 1',
          `\\left(1 + ${frac(String(a - b), `x + ${b}`)}\\right)^{x + ${c}}`,
          `${a} - ${b} = ${a - b} is what is left after dividing ${`x + ${a}`} by ${`x + ${b}`}.`,
        ),
        setup(
          'limit-exponential',
          'Which is the standard shape',
          `\\left(\\left(1 + ${frac(String(a - b), `x + ${b}`)}\\right)^{\\frac{x + ${b}}{${a - b}}}\\right)^{\\frac{${a - b}\\left(x + ${c}\\right)}{x + ${b}}}`,
          `The inner bracket goes to e; the outer exponent goes to ${a - b}, since the ${b} and the ${c} stop mattering once x is large.`,
        ),
        step('limit-exponential', 'So the limit is', result),
      ],
      ruleIds: ['limit-exponential', 'limit-infinity'],
      verify: { kind: 'limit', of: expr, wrt: 'x', at: 'inf' },
    };
  },
};
