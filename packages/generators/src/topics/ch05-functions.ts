import { TIERS, type Tier } from '@calcflow/shared';
import { answer, aside, frac, fracTex, poly, rootOf, setup, step, term } from '../authoring.js';
import type { Draft, Generator, Rng } from '../types.js';

/** ` + 3` or ` - 3`, so a sign never lands next to another sign. */
const shift = (n: number): string => (n < 0 ? ` - ${-n}` : ` + ${n}`);

/*
 * Chapter 5: what a function is before anything is done to it — where it is
 * defined, what values it reaches, whether it is symmetric, and how to undo it.
 *
 * The homework leans on this chapter harder than the practice book does, and it
 * asks in prose: "determine D(f) and R(f)", "are the following even or odd, and
 * use the definition". Prose is not gradable, so every question here is turned
 * into the number or the expression that the prose answer hinges on — the value
 * that has to be excluded, the largest value the function reaches, the
 * simplified f(−x). Getting those right is the whole of the work; writing
 * "D(f) = ℝ \ {3}" around it is not.
 */

/** The values that have to be thrown out of the domain. */
export const domain: Generator = {
  id: 'func.domain',
  chapter: 5,
  title: 'Where a function is undefined',
  tags: ['domain', 'functions'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    if (tier === 'easy') {
      const a = rng.nonZero(-8, 8);
      const b = rng.nonZero(-9, 9);
      const fx = frac(String(b), poly([[1, 1], [-a, 0]]));
      return {
        instruction: 'Find the value x cannot take',
        prompt: `f(x) = ${fx}`,
        note: 'The one x that is not in the domain.',
        answers: [answer(String(a), { keyboard: 'numeric', kind: 'number' })],
        solution: [
          setup(
            'domain',
            'A fraction needs a non-zero bottom',
            `${poly([[1, 1], [-a, 0]])} \\ne 0`,
            'Nothing else here can fail: the top is a constant and there is no root.',
          ),
          setup('domain', 'So the excluded value is', `x = ${a}`),
        ],
        ruleIds: ['domain'],
      };
    }

    // A quadratic bottom, so there are two holes. The medium tier factors
    // straight off; the hard tier's numerator cancels one of them — and the
    // hole stays a hole, which is the part that gets missed.
    const p = rng.nonZero(-6, 6);
    let q = rng.nonZero(-6, 6);
    while (q === p) q = rng.nonZero(-6, 6);
    const bottom = poly([[1, 2], [-(p + q), 1], [p * q, 0]]);
    const top = tier === 'hard' ? poly([[1, 1], [-p, 0]]) : String(rng.int(2, 9));
    const fx = frac(top, bottom);
    const [lo, hi] = p < q ? [p, q] : [q, p];

    return {
      instruction: 'Find both values x cannot take',
      prompt: `f(x) = ${fx}`,
      note:
        tier === 'hard'
          ? 'Careful: cancelling a factor does not put the value back into the domain.'
          : 'Two values. Give the smaller one first.',
      answers: [
        answer(String(lo), { label: 'smaller x', keyboard: 'numeric', kind: 'number' }),
        answer(String(hi), { label: 'larger x', keyboard: 'numeric', kind: 'number' }),
      ],
      solution: [
        setup('domain', 'Set the bottom to zero', `${bottom} = 0`),
        setup(
          'quadratic-formula',
          'Factorise',
          `\\left(x - ${p}\\right)\\left(x - ${q}\\right) = 0`,
          `The roots multiply to ${p * q} and add to ${p + q}.`,
        ),
        tier === 'hard'
          ? setup(
              'domain',
              'Both are still excluded',
              `x = ${lo} \\text{ and } x = ${hi}`,
              `The top cancels the factor at x = ${p}, but f still has nothing to say there — a 0/0 is not a value.`,
            )
          : setup('domain', 'The excluded values', `x = ${lo} \\text{ and } x = ${hi}`),
      ],
      ruleIds: ['domain', 'quadratic-formula'],
    };
  },
};

/** The largest or smallest value a function actually reaches. */
export const range: Generator = {
  id: 'func.range',
  chapter: 5,
  title: 'The value a function tops out at',
  tags: ['range', 'functions'],
  version: 1,
  supports: ['medium', 'hard'] as const,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    /*
     * Every shape here is built forwards from its extreme value, and there is no
     * `verify` clause because the harness has no "largest value" check to run.
     * Each one is a standard shape whose extreme is forced by a square or a
     * root, not something that needs finding — checked by hand, once, here.
     */
    const c = rng.nonZero(-6, 6);

    if (tier === 'medium') {
      const k = rng.int(2, 9);
      const useRoot = rng.bool();
      if (useRoot) {
        // √(k − x²) runs from 0 (at x = ±√k) up to √k (at x = 0).
        const fx = `${rootOf(`${k} - x^{2}`)}${shift(c)}`;
        const top = `${rootOf(String(k))}${shift(c)}`;
        return {
          instruction: 'Find the largest value f takes',
          prompt: `f(x) = ${fx}`,
          note: 'Exact value.',
          answers: [answer(top, { keyboard: 'algebra', kind: 'number' })],
          solution: [
            aside(
              'The root is what limits it',
              `0 \\le ${rootOf(`${k} - x^{2}`)} \\le ${rootOf(String(k))}`,
              `A square root is never negative, and ${k} − x² is biggest when x² is smallest.`,
            ),
            step(
              'range',
              `Largest at x = 0`,
              top,
              `x = 0 is in the domain, so this value is actually reached — that is what makes it the maximum rather than a bound.`,
            ),
          ],
          ruleIds: ['range'],
        };
      }
      // A completed square: c is the minimum, at x = h.
      const h = rng.nonZero(-4, 4);
      const fx = `\\left(x${shift(-h)}\\right)^{2}${shift(c)}`;
      return {
        instruction: 'Find the smallest value f takes',
        prompt: `f(x) = ${fx}`,
        note: 'Exact value.',
        answers: [answer(String(c), { keyboard: 'numeric', kind: 'number' })],
        solution: [
          aside(
            'A square is never negative',
            `\\left(x${shift(-h)}\\right)^{2} \\ge 0`,
          ),
          step('range', `Smallest at x = ${h}`, String(c), `Where the square is exactly 0.`),
        ],
        ruleIds: ['range'],
      };
    }

    // 1/(1 + (x − h)²) sits in (0, 1]: the bottom is never smaller than 1.
    const h = rng.nonZero(-4, 4);
    const a = rng.int(1, 5);
    const inner = `1 + \\left(x${shift(-h)}\\right)^{2}`;
    const fx = `${c} - ${frac(String(a), inner)}`; // c minus a shrinking positive: it climbs to c
    const top = String(c);
    const bottomValue = c - a;

    return {
      instruction: 'Find the value f approaches but never reaches',
      prompt: `f(x) = ${fx}`,
      promptText: 'f climbs towards a ceiling it never touches. What is the ceiling?',
      note: 'Exact value.',
      answers: [answer(top, { keyboard: 'numeric', kind: 'number' })],
      solution: [
        aside(
          'The bottom is at least 1',
          `${inner} \\ge 1`,
          `So the fraction is at most ${a}, and f is at least ${bottomValue} — reached at x = ${h}.`,
        ),
        aside(
          'And it shrinks to nothing',
          `${frac(String(a), inner)} \\to 0`,
          'As x runs away the bottom blows up, so the subtracted piece vanishes.',
        ),
        step(
          'range',
          'The value approached but never taken',
          top,
          `The range is [${bottomValue}, ${c}) — closed at the bottom because x = ${h} reaches it, open at the top because nothing does.`,
        ),
      ],
      ruleIds: ['range', 'limit-infinity'],
      verify: { kind: 'limit', of: fx, wrt: 'x', at: 'inf' },
    };
  },
};

/** ax + b: two arithmetic operations, undone in the opposite order. */
function linearInverse(rng: Rng): Draft {
  const a = rng.nonZero(-6, 6);
  const b = rng.nonZero(-9, 9);
  const fx = poly([[a, 1], [b, 0]]);
  const inv = frac(`x${shift(-b)}`, String(a));
  return {
    instruction: 'Find the inverse',
    prompt: `f(x) = ${fx}`,
    note: 'Give $f^{-1}(x)$.',
    answers: [answer(inv, { keyboard: 'algebra' })],
    solution: [
      setup('inverse', 'Write y for f(x) and swap', `x = ${term(a, 'y')}${shift(b)}`),
      setup('inverse', 'Solve for y', `${term(a, 'y')} = x${shift(-b)}`),
      step('inverse', 'And that is the inverse', inv),
    ],
    ruleIds: ['inverse'],
    verify: { kind: 'inverse', of: fx, wrt: 'x' },
  };
}

/** A root or an exponential: one operation to undo, but not an arithmetic one. */
function rootOrExpInverse(rng: Rng): Draft {
  const a = Math.abs(rng.nonZero(-6, 6));
  const k = Math.abs(rng.nonZero(-9, 9));
  const useRoot = rng.bool();
  const fx = useRoot ? rootOf(`x - ${k}`) : `e^{${term(a, 'x')}} - ${k}`;
  const inv = useRoot ? `x^{2} + ${k}` : frac(`\\ln\\left(x + ${k}\\right)`, String(a));
  const undo = useRoot
    ? setup(
        'inverse',
        'Square both sides',
        `x^{2} = y - ${k}`,
        'Squaring is safe here because both sides are non-negative.',
      )
    : setup(
        'inverse',
        'Take the logarithm',
        `${term(a, 'y')} = \\ln\\left(x + ${k}\\right)`,
        'ln undoes e, which is the only way to get at an exponent.',
      );
  return {
    instruction: 'Find the inverse',
    prompt: `f(x) = ${fx}`,
    note: useRoot
      ? `Give $f^{-1}(x)$. f only takes x from ${k} upwards, so its inverse only produces those.`
      : 'Give $f^{-1}(x)$.',
    answers: [answer(inv, { keyboard: useRoot ? 'algebra' : 'logs' })],
    solution: [
      setup(
        'inverse',
        'Swap x and y',
        useRoot ? `x = ${rootOf(`y - ${k}`)}` : `x = e^{${term(a, 'y')}} - ${k}`,
      ),
      undo,
      step('inverse', 'Solve for y', inv),
    ],
    ruleIds: ['inverse', useRoot ? 'root-equation' : 'exp-log-inverse'],
    verify: { kind: 'inverse', of: fx, wrt: 'x' },
  };
}

/** (ax + b)/(x + d): y appears twice, so it has to be collected before dividing. */
function fractionInverse(rng: Rng): Draft {
  const a = rng.nonZero(-6, 6);
  const b = rng.nonZero(-9, 9);
  let d = rng.nonZero(-6, 6);
  // a·d = b makes f a constant, which has no inverse at all.
  while (a * d === b) d = rng.nonZero(-6, 6);
  const fx = frac(poly([[a, 1], [b, 0]]), poly([[1, 1], [d, 0]]));
  const inv = frac(`${term(-d, 'x')}${shift(b)}`, `x${shift(-a)}`);

  return {
    instruction: 'Find the inverse',
    prompt: `f(x) = ${fx}`,
    note: `Give $f^{-1}(x)$, fully simplified.`,
    answers: [answer(inv, { keyboard: 'algebra' })],
    solution: [
      setup('inverse', 'Swap x and y', `x = ${frac(poly([[a, 1], [b, 0]], 'y'), `y${shift(d)}`)}`),
      setup(
        'inverse',
        'Clear the fraction',
        `x\\left(y${shift(d)}\\right) = ${term(a, 'y')}${shift(b)}`,
      ),
      setup(
        'inverse',
        'Collect the y terms on one side',
        `y\\left(x${shift(-a)}\\right) = ${term(-d, 'x')}${shift(b)}`,
        'y is on both sides, so there is nothing to divide by until it is gathered.',
      ),
      step('inverse', 'Divide', inv),
    ],
    ruleIds: ['inverse', 'rearrange-formula'],
    verify: { kind: 'inverse', of: fx, wrt: 'x' },
  };
}

const INVERSES: Record<Tier, (rng: Rng) => Draft> = {
  easy: linearInverse,
  medium: rootOrExpInverse,
  hard: fractionInverse,
};

/** Undo the function: swap x and y, then solve. */
export const inverse: Generator = {
  id: 'func.inverse',
  chapter: 5,
  title: 'Find the inverse',
  tags: ['inverse', 'functions'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate: ({ tier, rng }) => INVERSES[tier](rng),
};

/** f(g(x)): substitute the whole of g wherever the x was. */
export const compose: Generator = {
  id: 'func.compose',
  chapter: 5,
  title: 'Compose two functions',
  tags: ['composition', 'functions'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const a = rng.nonZero(-4, 4);
    const b = rng.nonZero(-6, 6);
    const gx = poly([[a, 1], [b, 0]]);
    const gTex = `\\left(${gx}\\right)`;

    if (tier === 'easy') {
      const c = rng.nonZero(-5, 5);
      const fx = `${term(c, 'x^{2}')}`;
      const composed = `${term(c, `${gTex}^{2}`)}`;
      const expanded = poly([[c * a * a, 2], [2 * c * a * b, 1], [c * b * b, 0]]);
      return {
        instruction: 'Find f(g(x)), expanded',
        prompt: `f(x) = ${fx},\\quad g(x) = ${gx}`,
        note: 'Multiply it out.',
        answers: [answer(expanded, { keyboard: 'algebra' })],
        solution: [
          setup('composition', "Put g where f's x was", composed, 'Not the square of x with a g bolted on the end — the whole of g becomes the thing being squared.'),
          step('composition', 'Expand', expanded, `$\\left(${gx}\\right)^{2} = ${poly([[a * a, 2], [2 * a * b, 1], [b * b, 0]])}$.`),
        ],
        ruleIds: ['composition', 'notable-products'],
        verify: { kind: 'identity', of: composed },
      };
    }

    if (tier === 'medium') {
      // Upward-sloping with a boundary just above 0: the domain question is real,
      // and the composition still has values where the harness samples it.
      const slope = rng.int(2, 4);
      const offset = -rng.int(1, 2);
      const inner = poly([[slope, 1], [offset, 0]]);
      const composed = rootOf(inner);
      return {
        instruction: 'Find f(g(x)), and say where it is defined',
        prompt: `f(x) = ${rootOf('x')},\\quad g(x) = ${inner}`,
        note: `Give f(g(x)). It only exists where ${inner} is not negative.`,
        answers: [answer(composed, { keyboard: 'algebra' })],
        solution: [
          setup('composition', "Put g under f's root", composed),
          step(
            'domain',
            'The domain shrinks',
            composed,
            `The composition is only defined where $${inner} \\ge 0$, that is $x \\ge ${fracTex(-offset, slope)}$ — g's own domain was all of $\\mathbb{R}$.`,
          ),
        ],
        ruleIds: ['composition', 'domain'],
        verify: { kind: 'identity', of: composed },
      };
    }

    // Both orders, so the point that composition does not commute lands.
    const composedFG = `\\sin${gTex}`;
    const composedGF = `${term(a, '\\sin x')}${shift(b)}`;

    return {
      instruction: 'Find f(g(x)) and g(f(x))',
      prompt: `f(x) = \\sin x,\\quad g(x) = ${gx}`,
      note: 'Two answers. They are not the same function.',
      answers: [
        answer(composedFG, { label: 'f(g(x))', keyboard: 'trig' }),
        answer(composedGF, { label: 'g(f(x))', keyboard: 'trig' }),
      ],
      solution: [
        step('composition', "g goes inside f's bracket", composedFG, 'The whole of g becomes the angle.'),
        aside(
          'The other way round',
          composedGF,
          'Here sin x is what g acts on, so it is stretched and shifted instead — a different function entirely.',
        ),
      ],
      ruleIds: ['composition'],
      verify: { kind: 'identity', of: composedFG },
    };
  },
};
