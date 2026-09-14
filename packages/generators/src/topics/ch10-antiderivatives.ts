import { TIERS } from '@calcflow/shared';
import {
  answer,
  frac,
  fracTex,
  paren,
  poly,
  power,
  setup,
  step,
  sum,
  times,
} from '../authoring.js';
import type { Draft, Generator, Latex } from '../types.js';

export const antiderivativePower: Generator = {
  id: 'anti.power-sum',
  chapter: 10,
  title: 'Antiderivative of a polynomial',
  tags: ['antiderivative', 'power-rule'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const count = tier === 'easy' ? 2 : tier === 'medium' ? 3 : 3;
    const exponents = new Set<number>();
    while (exponents.size < count) exponents.add(rng.int(tier !== 'easy' ? 1 : 0, 4));
    const pairs = [...exponents]
      .sort((a, b) => b - a)
      .map((p) => [rng.nonZero(-6, 8), p] as [number, number]);

    const integrand = poly(pairs);
    // Coefficients stay as fractions so nothing is rounded away.
    const antiTerms = pairs.map(([c, p]) => times(fracTex(c, p + 1), power('x', p + 1)));
    const anti = antiTerms.reduce((acc, t) => (t.startsWith('-') ? `${acc} - ${t.slice(1)}` : `${acc} + ${t}`));
    const result = `${anti} + C`;

    return {
      instruction: 'Find the antiderivative',
      prompt: `\\int ${integrand}\\,dx`,
      note: 'Do not forget the constant of integration.',
      answers: [
        answer(result, {
          keyboard: 'calculus',
          requires: { plusC: true },
          upToConstant: true,
        }),
      ],
      solution: [
        step('antiderivative-power', 'Raise the power, divide by the new one', anti),
        step('plus-c', 'Add the constant', result),
      ],
      ruleIds: ['antiderivative-power', 'plus-c'],
      verify: { kind: 'antiderivative', of: integrand, wrt: 'x' },
    };
  },
};

export const linearInner: Generator = {
  id: 'anti.linear-inner',
  chapter: 10,
  title: 'Linear inner function',
  tags: ['antiderivative', 'substitution'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const a = rng.nonZero(-5, 5);
    const b = rng.nonZero(-8, 8);
    const inner = poly([[a, 1], [b, 0]]);
    const shape = rng.pick(
      tier === 'hard' ? ['power', 'exp', 'sin', 'cos'] : tier === 'medium' ? ['power', 'exp', 'cos'] : ['power', 'exp'],
    );

    let integrand: string;
    let anti: string;
    if (shape === 'power') {
      const n = rng.int(2, 5);
      integrand = power(paren(inner), n);
      anti = `${fracTex(1, a * (n + 1))}${power(paren(inner), n + 1)}`;
    } else if (shape === 'exp') {
      integrand = `e^{${inner}}`;
      anti = `${fracTex(1, a)}e^{${inner}}`;
    } else if (shape === 'sin') {
      integrand = `\\sin${paren(inner)}`;
      anti = `${fracTex(-1, a)}\\cos${paren(inner)}`;
    } else {
      integrand = `\\cos${paren(inner)}`;
      anti = `${fracTex(1, a)}\\sin${paren(inner)}`;
    }
    const result = `${anti} + C`;

    return {
      instruction: 'Find the antiderivative',
      prompt: `\\int ${integrand}\\,dx`,
      note: 'Do not forget the constant of integration.',
      answers: [
        answer(result, { keyboard: 'calculus', requires: { plusC: true }, upToConstant: true }),
      ],
      solution: [
        step(
          'linear-substitution',
          'Antidifferentiate the outside',
          anti,
          `The inside is linear with derivative ${a}, so divide by ${a}.`,
        ),
        step('plus-c', 'Add the constant', result),
      ],
      ruleIds: ['linear-substitution', 'plus-c'],
      verify: { kind: 'antiderivative', of: integrand, wrt: 'x' },
    };
  },
};

/**
 * The one case the power rule cannot do, and the one he will need most often
 * after it. `n = -1` is written on the power-rule card as an exception and was
 * never generated, so the exception had no exercises attached to it.
 */
export const reciprocal: Generator = {
  id: 'anti.reciprocal',
  chapter: 10,
  title: 'Antiderivative of 1/x',
  tags: ['antiderivative', 'logarithm'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const k = rng.nonZero(-9, 9);
    // A positive linear inside keeps the integrand away from its own pole, so
    // every sample point the fuzz harness picks is one he could be asked about.
    const a = tier === 'easy' ? 1 : rng.int(2, 6);
    const b = tier === 'hard' ? rng.int(1, 9) : 0;
    const inside = b === 0 ? (a === 1 ? 'x' : `${a}x`) : `${a}x + ${b}`;
    const integrand = `\\frac{${k}}{${inside}}`;
    const anti = `${fracTex(k, a)}\\ln\\left|${inside}\\right|`;
    const result = `${anti} + C`;

    return {
      instruction: 'Find the antiderivative',
      prompt: `\\int ${integrand}\\,dx`,
      note: 'Do not forget the constant of integration.',
      answers: [
        answer(result, { keyboard: 'calculus', requires: { plusC: true }, upToConstant: true }),
      ],
      solution: [
        step(
          'log-antiderivative',
          'The power rule cannot raise this power',
          anti,
          a === 1
            ? 'Raising $-1$ by one gives $0$, and dividing by $0$ is why this case has its own rule.'
            : `The inside is linear with derivative ${a}, so divide by ${a}.`,
        ),
        step('plus-c', 'Add the constant', result),
      ],
      ruleIds: ['log-antiderivative', 'plus-c'],
      verify: { kind: 'antiderivative', of: integrand, wrt: 'x' },
    };
  },
};

/**
 * The power rule again, with the exponent written as a root or buried under a
 * fraction. Every one of these is $\int x^{n}$ once it is rewritten, and the
 * rewriting is the part worth practising — `anti.power-sum` only ever handed
 * him exponents that were already whole numbers.
 */
export const antiderivativeRoot: Generator = {
  id: 'anti.roots',
  chapter: 10,
  title: 'Roots and reciprocal powers',
  tags: ['antiderivative', 'power-rule', 'roots'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const k = rng.nonZero(-6, 8);
    // [numerator, denominator] of the exponent the integrand really carries.
    const [p, q] = rng.pick(
      tier === 'easy'
        ? ([[1, 2], [-1, 2]] as Array<[number, number]>)
        : tier === 'medium'
          ? ([[1, 2], [-1, 2], [3, 2], [1, 3], [-2, 1], [-3, 1]] as Array<[number, number]>)
          : ([[-1, 2], [3, 2], [1, 3], [2, 3], [-3, 1], [-4, 1], [-5, 2]] as Array<[number, number]>),
    );

    const integrand = times(String(k), texPower(p, q));
    // Raise by one: p/q + 1 = (p + q)/q. It is never -1 here, by construction.
    const [np, nq] = [p + q, q];
    const anti = times(fracTex(k * nq, np), texPower(np, nq));
    const result = `${anti} + C`;

    return {
      instruction: 'Find the antiderivative',
      prompt: `\\int ${integrand}\\,dx`,
      note: 'Write it as a power of $x$ first. Do not forget the constant of integration.',
      answers: [
        answer(result, { keyboard: 'calculus', requires: { plusC: true }, upToConstant: true }),
      ],
      solution: [
        setup(
          'antiderivative-power',
          'As a power of x',
          `\\int ${times(String(k), `x^{${fracTex(p, q)}}`)}\\,dx`,
          'A root is a fractional power and a denominator is a negative one; the rule does not care which way it was written.',
        ),
        step(
          'antiderivative-power',
          'Raise the power, divide by the new one',
          anti,
          `${fracTex(p, q)} + 1 = ${fracTex(np, nq)}.`,
        ),
        step('plus-c', 'Add the constant', result),
      ],
      ruleIds: ['antiderivative-power', 'plus-c'],
      verify: { kind: 'antiderivative', of: integrand, wrt: 'x' },
    };
  },
};

/** `x^{p/q}` as the book would print it: a root if q > 1, a fraction if p < 0. */
function texPower(p: number, q: number): Latex {
  if (q === 1) {
    if (p === 1) return 'x';
    return p < 0 ? frac('1', power('x', -p)) : power('x', p);
  }
  const root = q === 2 ? `\\sqrt{${power('x', Math.abs(p))}}` : `\\sqrt[${q}]{${power('x', Math.abs(p))}}`;
  return p < 0 ? frac('1', root) : root;
}

/**
 * The integrand already contains the derivative of its own inside. There is
 * nothing to compute once that is spotted, which is exactly why it is worth
 * practising separately: the work is all in the looking.
 */
export const recogniseDerivative: Generator = {
  id: 'anti.recognise',
  chapter: 10,
  title: 'Recognising a derivative',
  tags: ['antiderivative', 'chain-rule', 'substitution'],
  version: 1,
  supports: ['medium', 'hard'],
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const shape = rng.pick(
      tier === 'hard'
        ? ['exp-square', 'log-quotient', 'sin-cos', 'exp-sin', 'power-chain']
        : ['exp-square', 'log-quotient', 'sin-cos'],
    );
    const a = rng.int(1, tier === 'hard' ? 4 : 3);
    const b = rng.int(1, 9);

    let integrand: Latex;
    let anti: Latex;
    let inside: Latex;
    let outside: string;

    if (shape === 'exp-square') {
      inside = `${a === 1 ? '' : a}x^{2}`;
      integrand = `${2 * a}xe^{${inside}}`;
      anti = `e^{${inside}}`;
      outside = 'e^{u}';
    } else if (shape === 'log-quotient') {
      inside = `${a === 1 ? '' : a}x^{2} + ${b}`;
      integrand = frac(`${2 * a}x`, inside);
      // The inside is a sum of positives, so it never reaches zero and the
      // absolute-value bars the rule carries would only be noise here.
      anti = `\\ln\\left(${inside}\\right)`;
      outside = '\\ln u';
    } else if (shape === 'sin-cos') {
      const arg = a === 1 ? 'x' : `${a}x`;
      inside = `\\sin${a === 1 ? ' x' : paren(arg)}`;
      integrand = `${2 * a}\\sin${paren(arg)}\\cos${paren(arg)}`;
      anti = `\\left(\\sin${paren(arg)}\\right)^{2}`;
      outside = 'u^{2}';
    } else if (shape === 'exp-sin') {
      inside = '\\sin x';
      integrand = `\\cos x\\,e^{\\sin x}`;
      anti = 'e^{\\sin x}';
      outside = 'e^{u}';
    } else {
      const n = rng.int(2, 4);
      inside = `x^{3} + ${b}`;
      integrand = `3x^{2}${power(paren(inside), n)}`;
      anti = `${fracTex(1, n + 1)}${power(paren(inside), n + 1)}`;
      outside = 'u^{n}';
    }

    const result = `${anti} + C`;

    return {
      instruction: 'Find the antiderivative',
      prompt: `\\int ${integrand}\\,dx`,
      note: 'Nothing here needs a substitution written out — look for an inside function and its derivative.',
      answers: [
        answer(result, { keyboard: 'calculus', requires: { plusC: true }, upToConstant: true }),
      ],
      solution: [
        setup(
          'reverse-chain',
          'Name the inside',
          `u = ${inside}`,
          `The rest of the integrand is $u'$ times ${outside}$.`,
        ),
        step('reverse-chain', 'Undo the chain rule', anti),
        step('plus-c', 'Add the constant', result),
      ],
      ruleIds: ['reverse-chain', 'plus-c'],
      verify: { kind: 'antiderivative', of: integrand, wrt: 'x' },
    };
  },
};

/**
 * A product of two things that have nothing to do with each other — a power of
 * x against an exponential, a log on its own. The exam leans on this heavily
 * and nothing in the app asked for it.
 */
export const byParts: Generator = {
  id: 'anti.by-parts',
  chapter: 10,
  title: 'Integration by parts',
  tags: ['antiderivative', 'by-parts'],
  version: 1,
  supports: ['hard'],
  invariant: 'value-preserving',

  generate({ rng }): Draft {
    const shape = rng.pick(['x-exp', 'x-sin', 'x-cos', 'ln', 'x-ln']);
    const a = rng.nonZero(-4, 4);
    const arg = a === 1 ? 'x' : a === -1 ? '-x' : `${a}x`;
    // `paren` leaves a single atom bare, and `-x` counts as one — which would
    // print `\cos-x`. A trig argument always gets its brackets.
    const argp = `\\left(${arg}\\right)`;

    let integrand: Latex;
    let anti: Latex;
    let u: Latex;
    let dv: Latex;
    let leftover: Latex;

    if (shape === 'x-exp') {
      integrand = `xe^{${arg}}`;
      anti = sum([times(fracTex(1, a), `xe^{${arg}}`), times(fracTex(-1, a * a), `e^{${arg}}`)]);
      u = 'x';
      dv = `e^{${arg}}\\,dx`;
      leftover = `\\int ${times(fracTex(1, a), `e^{${arg}}`)}\\,dx`;
    } else if (shape === 'x-sin') {
      integrand = `x\\sin${argp}`;
      anti = sum([
        times(fracTex(-1, a), `x\\cos${argp}`),
        times(fracTex(1, a * a), `\\sin${argp}`),
      ]);
      u = 'x';
      dv = `\\sin${argp}\\,dx`;
      leftover = `\\int ${times(fracTex(-1, a), `\\cos${argp}`)}\\,dx`;
    } else if (shape === 'x-cos') {
      integrand = `x\\cos${argp}`;
      anti = sum([
        times(fracTex(1, a), `x\\sin${argp}`),
        times(fracTex(1, a * a), `\\cos${argp}`),
      ]);
      u = 'x';
      dv = `\\cos${argp}\\,dx`;
      leftover = `\\int ${times(fracTex(1, a), `\\sin${argp}`)}\\,dx`;
    } else if (shape === 'ln') {
      integrand = '\\ln x';
      anti = 'x\\ln x - x';
      u = '\\ln x';
      dv = 'dx';
      leftover = '\\int 1\\,dx';
    } else {
      integrand = 'x\\ln x';
      anti = `${frac('x^{2}', '2')}\\ln x - ${frac('x^{2}', '4')}`;
      u = '\\ln x';
      dv = 'x\\,dx';
      leftover = `\\int ${frac('x', '2')}\\,dx`;
    }

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
          'by-parts',
          'Split the product',
          `u = ${u},\\quad dv = ${dv}`,
          shape === 'ln' || shape === 'x-ln'
            ? 'There is no product to split until you treat the whole integrand as $u$ against $dv = $ the rest.'
            : 'The power of $x$ is the part that gets simpler when differentiated, so it is $u$.',
        ),
        setup('by-parts', 'What is left to integrate', `uv - ${leftover}`),
        step('by-parts', 'Integrate the leftover', anti),
        step('plus-c', 'Add the constant', result),
      ],
      ruleIds: ['by-parts', 'plus-c'],
      verify: { kind: 'antiderivative', of: integrand, wrt: 'x' },
    };
  },
};

/** A linear factor times a linear factor underneath, which nothing integrates whole. */
export const partialFractions: Generator = {
  id: 'anti.partial-fractions',
  chapter: 10,
  title: 'Partial fractions',
  tags: ['antiderivative', 'fractions', 'logarithm'],
  version: 1,
  supports: ['hard'],
  invariant: 'value-preserving',

  generate({ rng }): Draft {
    // Both poles to the left of the origin, so the integrand is smooth
    // everywhere he would be asked to evaluate it.
    const p = -rng.int(1, 6);
    let q = -rng.int(1, 6);
    while (q === p) q = -rng.int(1, 6);
    const k = rng.nonZero(-6, 8);

    const left = `x ${p < 0 ? '+' : '-'} ${Math.abs(p)}`;
    const right = `x ${q < 0 ? '+' : '-'} ${Math.abs(q)}`;
    const integrand = frac(String(k), `${paren(left)}${paren(right)}`);
    const split = `${frac(fracTex(k, p - q), left)} - ${frac(fracTex(k, p - q), right)}`;
    const anti = sum([
      times(fracTex(k, p - q), `\\ln\\left|${left}\\right|`),
      times(fracTex(-k, p - q), `\\ln\\left|${right}\\right|`),
    ]);
    const result = `${anti} + C`;

    return {
      instruction: 'Find the antiderivative',
      prompt: `\\int ${integrand}\\,dx`,
      note: 'Split it into two fractions first. Do not forget the constant of integration.',
      answers: [
        answer(result, { keyboard: 'calculus', requires: { plusC: true }, upToConstant: true }),
      ],
      solution: [
        setup(
          'partial-fractions',
          'Split into two fractions',
          `\\int ${split}\\,dx`,
          `Both numerators are constants; comparing coefficients gives $\\pm${fracTex(k, p - q)}$.`,
        ),
        step('log-antiderivative', 'Each piece is a log', anti),
        step('plus-c', 'Add the constant', result),
      ],
      ruleIds: ['partial-fractions', 'log-antiderivative', 'plus-c'],
      verify: { kind: 'antiderivative', of: integrand, wrt: 'x' },
    };
  },
};

/** Top-heavy, so there is nothing to do until it has been divided out. */
export const divideFirst: Generator = {
  id: 'anti.divide-first',
  chapter: 10,
  title: 'Dividing before integrating',
  tags: ['antiderivative', 'division'],
  version: 1,
  supports: ['hard'],
  invariant: 'value-preserving',

  generate({ rng }): Draft {
    const d = -rng.int(1, 6);
    const a = rng.nonZero(-4, 5);
    const e = rng.nonZero(-8, 8);
    const m = rng.nonZero(-9, 9);

    // numerator = (ax + e)(x - d) + m, built forwards so the division is exact.
    const n2 = a;
    const n1 = e - a * d;
    const n0 = -e * d + m;
    const numerator = poly([[n2, 2], [n1, 1], [n0, 0]]);
    const divisor = `x ${d < 0 ? '+' : '-'} ${Math.abs(d)}`;
    const integrand = frac(numerator, paren(divisor));
    const quotient = poly([[a, 1], [e, 0]]);
    const divided = `${quotient} + ${frac(String(m), paren(divisor))}`;

    const anti = sum([
      times(fracTex(a, 2), 'x^{2}'),
      times(String(e), 'x'),
      times(String(m), `\\ln\\left|${divisor}\\right|`),
    ]);
    const result = `${anti} + C`;

    return {
      instruction: 'Find the antiderivative',
      prompt: `\\int ${integrand}\\,dx`,
      note: 'The top has the higher degree. Do not forget the constant of integration.',
      answers: [
        answer(result, { keyboard: 'calculus', requires: { plusC: true }, upToConstant: true }),
      ],
      solution: [
        setup(
          'polynomial-division',
          'Divide out',
          `\\int ${divided}\\,dx`,
          `${paren(divisor)} goes into the top ${quotient} times, with ${m} left over.`,
        ),
        step('antiderivative-power', 'The polynomial part', anti),
        step('plus-c', 'Add the constant', result),
      ],
      ruleIds: ['polynomial-division', 'antiderivative-power', 'log-antiderivative', 'plus-c'],
      verify: { kind: 'antiderivative', of: integrand, wrt: 'x' },
    };
  },
};
