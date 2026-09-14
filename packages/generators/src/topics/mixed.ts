import { answer, aside, frac, fracTex, poly, power, setup, step, term } from '../authoring.js';
import type { Draft, Generator } from '../types.js';

/*
 * Problems that need two chapters at once.
 *
 * Every generator here declares `spans`, so it is only ever drawn when both of
 * its chapters are switched on — and `draw` reaches for this file about two
 * times in five at the hard tier. That is the difference between the book's
 * exercises and the exam's: the exam never tells you which rule it is testing,
 * and half the work is noticing that the derivative cannot start until the
 * logarithm has been split.
 */

/** A log that has to be pulled apart before any derivative rule applies. */
export const logThenDifferentiate: Generator = {
  id: 'mix.log-derivative',
  chapter: 9,
  spans: [6, 9],
  title: 'Split the log, then differentiate',
  tags: ['log-laws', 'differentiation'],
  version: 1,
  supports: ['hard'] as const,
  invariant: 'value-preserving',

  generate({ rng }): Draft {
    const p = rng.int(2, 4);
    const a = rng.int(1, 6);
    const fx = `\\ln\\left(${frac(power('x', p), `x + ${a}`)}\\right)`;
    const split = `${p}\\ln x - \\ln\\left(x + ${a}\\right)`;
    const derivative = `${frac(String(p), 'x')} - ${frac('1', `x + ${a}`)}`;

    return {
      instruction: 'Differentiate',
      prompt: `f(x) = ${fx}`,
      note: "x is positive. Give f'(x) in exact, fully simplified form.",
      answers: [answer(derivative, { keyboard: 'calculus' })],
      solution: [
        setup(
          'log-laws',
          'Split the logarithm first',
          `f(x) = ${split}`,
          'The quotient rule would work, but there is nothing to differentiate a quotient inside a log with until the log is split. A difference of logs differentiates term by term.',
        ),
        step(
          'standard-derivatives',
          'Differentiate each term',
          derivative,
          'The derivative of ln(u) is u′/u, and both insides here differentiate to 1.',
        ),
      ],
      ruleIds: ['log-laws', 'chain-rule', 'standard-derivatives'],
      verify: { kind: 'derivative', of: fx, wrt: 'x' },
    };
  },
};

/** A derivative whose answer only looks finished after a trig identity. */
export const differentiateThenIdentity: Generator = {
  id: 'mix.derivative-identity',
  chapter: 9,
  spans: [7, 9],
  title: 'Differentiate, then use an identity',
  tags: ['differentiation', 'double-angle'],
  version: 1,
  supports: ['hard'] as const,
  invariant: 'value-preserving',

  generate({ rng }): Draft {
    const a = rng.int(1, 3);
    const arg = a === 1 ? 'x' : `${a}x`;
    const doubled = a === 1 ? '2x' : `${2 * a}x`;
    const useSin = rng.bool();
    const fx = `\\${useSin ? 'sin' : 'cos'}^{2}\\left(${arg}\\right)`;
    const raw = `${2 * a}\\sin\\left(${arg}\\right)\\cos\\left(${arg}\\right)`;
    const derivative = useSin
      ? term(a, `\\sin\\left(${doubled}\\right)`)
      : term(-a, `\\sin\\left(${doubled}\\right)`);

    return {
      instruction: 'Differentiate, and write the answer as a single trig function',
      prompt: `f(x) = ${fx}`,
      note: 'No squares and no products left in the answer.',
      answers: [answer(derivative, { keyboard: 'trig' })],
      solution: [
        setup(
          'chain-rule',
          'Chain rule',
          `f'(x) = 2\\${useSin ? 'sin' : 'cos'}\\left(${arg}\\right) \\cdot \\frac{d}{dx}\\${useSin ? 'sin' : 'cos'}\\left(${arg}\\right)`,
          'The square is the outside; the trig function is the inside.',
        ),
        step(
          'standard-derivatives',
          'The inner derivative',
          useSin ? raw : `-${raw}`,
          useSin ? '' : 'The minus comes from the derivative of cos.',
        ),
        step(
          'double-angle',
          'And that is a double angle',
          derivative,
          '2 sin u cos u = sin 2u, which is the only form the answer counts as finished in.',
        ),
      ],
      ruleIds: ['chain-rule', 'double-angle', 'standard-derivatives'],
      verify: { kind: 'derivative', of: fx, wrt: 'x' },
    };
  },
};

/** Nothing integrates sin² — it has to become a cosine of twice the angle first. */
export const identityThenIntegrate: Generator = {
  id: 'mix.identity-integral',
  chapter: 10,
  spans: [7, 10],
  title: 'An identity before the integral',
  tags: ['double-angle', 'antiderivative'],
  version: 1,
  supports: ['hard'] as const,
  invariant: 'value-preserving',

  generate({ rng }): Draft {
    const a = rng.int(1, 3);
    const arg = a === 1 ? 'x' : `${a}x`;
    const doubled = a === 1 ? '2x' : `${2 * a}x`;
    const useSin = rng.bool();
    const integrand = `\\${useSin ? 'sin' : 'cos'}^{2}\\left(${arg}\\right)`;
    const rewritten = frac(`1 ${useSin ? '-' : '+'} \\cos\\left(${doubled}\\right)`, '2');
    const anti = `${frac('x', '2')} ${useSin ? '-' : '+'} ${frac(`\\sin\\left(${doubled}\\right)`, String(4 * a))}`;
    const result = `${anti} + C`;

    return {
      instruction: 'Find the antiderivative',
      prompt: `\\int ${integrand}\\,dx`,
      note: 'Do not forget the constant of integration.',
      answers: [
        answer(result, { keyboard: 'calculus', requires: { plusC: true }, upToConstant: true }),
      ],
      solution: [
        setup(
          'double-angle',
          'There is no rule for a square of a sine',
          `\\int ${rewritten}\\,dx`,
          `cos 2u = 1 ${useSin ? '−' : '+'} 2${useSin ? 'sin' : 'cos'}²u rearranges into exactly this, and a sum of a constant and a cosine is something you do have rules for.`,
        ),
        step(
          'linear-substitution',
          'Now integrate term by term',
          anti,
          `The inside is ${doubled}, so the cosine's antiderivative is divided by ${2 * a}.`,
        ),
        step('plus-c', 'Add the constant', result),
      ],
      ruleIds: ['double-angle', 'linear-substitution', 'plus-c'],
      verify: { kind: 'antiderivative', of: integrand, wrt: 'x' },
    };
  },
};

/** A definite integral whose whole trick is spotting a derivative of ln. */
export const logIntegral: Generator = {
  id: 'mix.log-integral',
  chapter: 11,
  spans: [6, 11],
  title: 'A logarithm under the integral',
  tags: ['definite-integral', 'logarithms', 'substitution'],
  version: 1,
  supports: ['hard'] as const,
  invariant: 'value-preserving',

  generate({ rng }): Draft {
    const k = rng.int(1, 3);
    const upper = rng.pick([1, 2]);
    const hiTex = upper === 1 ? 'e' : `e^{${upper}}`;
    // Parenthesised, always: \ln x^{2} is the log of a square, not the square of a log.
    const lnPow = (n: number): string => (n === 1 ? '\\ln x' : `\\left(\\ln x\\right)^{${n}}`);
    const integrand = frac(lnPow(k), 'x');
    const value = fracTex(upper ** (k + 1), k + 1);

    return {
      instruction: 'Evaluate',
      prompt: `\\int_{1}^{${hiTex}} ${integrand}\\,dx`,
      note: 'Give the exact value.',
      answers: [answer(value, { keyboard: 'calculus', kind: 'number' })],
      solution: [
        setup(
          'reverse-chain',
          'The 1/x is the derivative of the ln',
          `u = \\ln x,\\quad du = ${frac('1', 'x')}dx`,
          'Which makes the whole integrand u^{' + k + '} du — the power rule, in disguise.',
        ),
        setup(
          'antiderivative-power',
          'Antidifferentiate',
          `\\left[${frac(lnPow(k + 1), String(k + 1))}\\right]_{1}^{${hiTex}}`,
        ),
        step(
          'definite-integral',
          'Substitute the bounds',
          value,
          `ln ${hiTex} = ${upper} and ln 1 = 0, which is why those bounds were chosen.`,
        ),
      ],
      ruleIds: ['reverse-chain', 'antiderivative-power', 'definite-integral'],
      verify: {
        kind: 'definite-integral',
        of: integrand,
        wrt: 'x',
        from: 1,
        to: Math.exp(upper),
      },
    };
  },
};

/** Two logs, one quadratic, and a root that has to be thrown away. */
export const logEquationQuadratic: Generator = {
  id: 'mix.log-quadratic',
  chapter: 8,
  spans: [6, 8],
  title: 'A logarithmic equation that turns quadratic',
  tags: ['logarithms', 'quadratic', 'solve'],
  version: 1,
  supports: ['hard'] as const,
  invariant: 'solution-set-preserving',

  generate({ rng }): Draft {
    const a = rng.int(1, 6);
    const r = a + rng.int(1, 6);
    const b = r * (r - a);
    const equation = `\\ln x + \\ln\\left(x - ${a}\\right) = \\ln ${b}`;
    const rejected = a - r;

    return {
      instruction: 'Solve for x',
      prompt: equation,
      note: `Give the exact value. Both logs need a positive inside, so x must be more than ${a}.`,
      answers: [answer(String(r), { keyboard: 'logs', kind: 'number' })],
      solution: [
        setup(
          'log-laws',
          'One logarithm on each side',
          `\\ln\\left(x\\left(x - ${a}\\right)\\right) = \\ln ${b}`,
          'A sum of logs is the log of a product.',
        ),
        setup(
          'exp-log-inverse',
          'ln is one-to-one',
          `x\\left(x - ${a}\\right) = ${b}`,
          'Equal logs mean equal insides — no need to exponentiate anything by hand.',
        ),
        setup('quadratic-formula', 'Solve the quadratic', `x = ${r} \\quad\\text{or}\\quad x = ${rejected}`),
        step(
          'log-definition',
          'Throw the impossible one away',
          `x = ${r}`,
          `x = ${rejected} would put a negative number inside a logarithm, so it solves the quadratic but not the question.`,
        ),
      ],
      ruleIds: ['log-laws', 'quadratic-formula', 'exp-log-inverse', 'log-definition'],
      verify: { kind: 'root', equation, wrt: 'x' },
    };
  },
};

/** A quadratic whose unknown happens to be a sine. */
export const quadraticInTrig: Generator = {
  id: 'mix.quadratic-trig',
  chapter: 8,
  spans: [7, 8],
  title: 'A quadratic in sin x',
  tags: ['trigonometry', 'quadratic', 'solve'],
  version: 1,
  supports: ['hard'] as const,
  invariant: 'solution-set-preserving',

  generate({ rng }): Draft {
    // 4sin²x − k = 0 with a standard sine as the root, so the answers are exact.
    const [deg, squared, valueTex] = rng.pick([
      [30, 1, '\\frac{1}{2}'],
      [45, 2, '\\frac{1}{2}\\sqrt{2}'],
      [60, 3, '\\frac{1}{2}\\sqrt{3}'],
    ] as Array<[number, number, string]>);
    const equation = `4\\sin^{2}x - ${squared} = 0`;
    const first = deg;
    const second = 180 - deg;
    const radTex = (d: number): string => {
      const g = (function g2(x: number, y: number): number {
        return y ? g2(y, x % y) : x;
      })(d, 180);
      const n = d / g;
      const q = 180 / g;
      return q === 1 ? term(n, '\\pi') : frac(`${n === 1 ? '' : n}\\pi`, String(q));
    };

    return {
      instruction: 'Solve for x on [0, π)',
      prompt: equation,
      note: 'Two solutions. Give the smaller one first, in radians.',
      answers: [
        answer(radTex(first), { label: 'smaller x', keyboard: 'trig', kind: 'number' }),
        answer(radTex(second), { label: 'larger x', keyboard: 'trig', kind: 'number' }),
      ],
      solution: [
        setup(
          'quadratic-formula',
          'It is a quadratic in sin x',
          `\\sin^{2}x = ${fracTex(squared, 4)}`,
          'Nothing trigonometric happens until sin x has been solved for as if it were an ordinary unknown.',
        ),
        setup(
          'trig-equation',
          'Take the root — both signs',
          `\\sin x = ${valueTex} \\quad\\text{or}\\quad \\sin x = -${valueTex}`,
          'On [0, π) the sine is never negative, so only the positive one has solutions.',
        ),
        setup(
          'trig-equation',
          'Both angles with that sine',
          `x = ${radTex(first)} \\quad\\text{or}\\quad x = ${radTex(second)}`,
          `${deg}° and ${second}° are mirror images in the y-axis, so they have the same height.`,
        ),
      ],
      ruleIds: ['trig-equation', 'quadratic-formula', 'exact-values'],
      verify: { kind: 'root', equation, wrt: 'x' },
    };
  },
};

/** L'Hôpital, where getting the derivative takes a rule of its own. */
export const lhopitalProduct: Generator = {
  id: 'mix.lhopital-product',
  chapter: 13,
  spans: [9, 13],
  title: "L'Hôpital with a harder derivative",
  tags: ['limits', 'lhopital', 'differentiation'],
  version: 1,
  supports: ['hard'] as const,
  invariant: 'value-preserving',

  generate({ rng }): Draft {
    const shapes = [
      () => {
        const a = rng.int(2, 4);
        return {
          expr: frac(`e^{${a}x} - 1 - ${a}x`, 'x^{2}'),
          once: frac(`${a}e^{${a}x} - ${a}`, '2x'),
          twice: frac(`${a * a}e^{${a}x}`, '2'),
          value: fracTex(a * a, 2),
          rule: 'chain-rule',
        };
      },
      () => ({
        expr: frac('x\\cos x - \\sin x', 'x^{3}'),
        once: frac('-x\\sin x', '3x^{2}'),
        twice: frac('-\\sin x', '3x'),
        value: fracTex(-1, 3),
        rule: 'product-rule',
      }),
      () => ({
        expr: frac('\\ln\\left(1 + x\\right) - x', 'x^{2}'),
        once: frac(`${frac('1', '1 + x')} - 1`, '2x'),
        twice: frac('-1', `2\\left(1 + x\\right)^{2}`),
        value: fracTex(-1, 2),
        rule: 'chain-rule',
      }),
    ];

    const s = rng.pick(shapes)();

    return {
      instruction: 'Find the limit',
      prompt: `\\lim_{x\\to 0} ${s.expr}`,
      note: 'Give the exact value.',
      answers: [answer(s.value, { keyboard: 'calculus', kind: 'number' })],
      solution: [
        aside('The form', '\\frac{0}{0}', 'Both the top and the bottom vanish at 0, so the rule applies.'),
        setup(
          'lhopital',
          'Differentiate top and bottom',
          `\\lim_{x\\to 0} ${s.once}`,
          s.rule === 'product-rule'
            ? 'The top is a product, so its derivative needs the product rule — and then most of it cancels.'
            : 'The top needs the chain rule before anything can be substituted.',
        ),
        setup('lhopital', 'Still 0/0, so again', `\\lim_{x\\to 0} ${s.twice}`),
        step('lhopital', 'Now substitute', s.value),
      ],
      ruleIds: ['lhopital', s.rule, 'standard-derivatives'],
      verify: { kind: 'limit', of: s.expr, wrt: 'x', at: 0 },
    };
  },
};

/** The tangent found with chapter 9, then solved with chapter 8. */
export const tangentCrossing: Generator = {
  id: 'mix.tangent-crossing',
  chapter: 9,
  spans: [8, 9],
  title: 'Where the tangent crosses the axis',
  tags: ['tangent', 'differentiation', 'solve'],
  version: 1,
  supports: ['hard'] as const,
  invariant: 'solution-set-preserving',

  generate({ rng }): Draft {
    const a = rng.nonZero(-3, 3);
    const b = rng.nonZero(-6, 6);
    const c = rng.nonZero(-8, 8);
    let p = rng.nonZero(-3, 3);
    // A horizontal tangent never crosses, so the slope has to be non-zero.
    while (2 * a * p + b === 0) p = rng.nonZero(-3, 3);

    const fx = poly([[a, 2], [b, 1], [c, 0]]);
    const m = 2 * a * p + b;
    const y0 = a * p * p + b * p + c;
    const line = poly([[m, 1], [y0 - m * p, 0]]);
    const equation = `${line} = 0`;
    const result = fracTex(-(y0 - m * p), m);

    return {
      instruction: 'Find where the tangent crosses the x-axis',
      prompt: `f(x) = ${fx}`,
      promptText: `The tangent to f at x = ${p} crosses the x-axis once. Where?`,
      note: 'Give the exact x-value.',
      answers: [answer(result, { keyboard: 'calculus', kind: 'number' })],
      solution: [
        aside(
          'Slope and height at the point',
          `f'(${p}) = ${m},\\quad f(${p}) = ${y0}`,
          'Two chapters in one question: chapter 9 produces the line, chapter 8 solves it.',
        ),
        aside('The tangent', `y = ${m}\\left(x - ${p}\\right) + ${y0} = ${line}`),
        step(
          'linear-solve',
          'Set y to zero',
          equation,
          'Crossing the x-axis is exactly what y = 0 means.',
        ),
        step('linear-solve', 'Solve', `x = ${result}`),
      ],
      ruleIds: ['tangent-line', 'linear-solve', 'standard-derivatives'],
      verify: { kind: 'root', equation, wrt: 'x' },
    };
  },
};
