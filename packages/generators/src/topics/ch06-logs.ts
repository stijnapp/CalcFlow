import { TIERS } from '@calcflow/shared';
import { answer, frac, fracTex, paren, poly, power, setup, step } from '../authoring.js';
import type { Draft, Generator } from '../types.js';

export const logLaws: Generator = {
  id: 'logs.laws',
  chapter: 6,
  title: 'Log laws',
  tags: ['log-laws', 'logarithms'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    if (tier !== 'easy') {
      // e^{k ln x} unwinds to x^k.
      const k = rng.int(2, 5);
      const prompt = `e^{${k}\\ln x}`;
      const result = power('x', k);
      return {
        instruction: 'Simplify',
        prompt,
        note: 'x is positive.',
        answers: [answer(result, { keyboard: 'logs' })],
        solution: [
          step('log-laws', 'Take the coefficient inside', `e^{\\ln${paren(power('x', k))}}`, 'n log x = log(xⁿ).'),
          step('exp-log-inverse', 'exp and ln cancel', result),
        ],
        ruleIds: ['log-laws', 'exp-log-inverse'],
        verify: { kind: 'identity', of: prompt },
      };
    }

    const a = rng.int(2, 9);
    const b = rng.int(2, 9);
    const prompt = `\\ln ${a} + \\ln ${b}`;
    const result = `\\ln ${a * b}`;
    return {
      instruction: 'Write as a single logarithm',
      prompt,
      answers: [answer(result, { keyboard: 'logs' })],
      solution: [step('log-laws', 'A sum of logs is the log of a product', result)],
      ruleIds: ['log-laws'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};

export const exponentialEquation: Generator = {
  id: 'logs.exponential-equation',
  chapter: 6,
  title: 'Exponential equations',
  tags: ['exponential', 'logarithms', 'solve'],
  version: 1,
  supports: TIERS,
  invariant: 'solution-set-preserving',

  generate({ tier, rng }): Draft {
    if (tier === 'hard') {
      // 5^{x+1} = 7^{x-1} — logs on both sides, then collect x.
      const a = rng.pick([2, 3, 5, 7]);
      let b = rng.pick([2, 3, 5, 7, 11]);
      while (b === a) b = rng.pick([2, 3, 5, 7, 11]);
      const p = rng.nonZero(-3, 3);
      const q = rng.nonZero(-3, 3);
      const equation = `${power(String(a), poly([[1, 1], [p, 0]]))} = ${power(String(b), poly([[1, 1], [q, 0]]))}`;
      // x ln a + p ln a = x ln b + q ln b  →  x = (q ln b − p ln a)/(ln a − ln b)
      const result = frac(`${q}\\ln ${b} - ${p}\\ln ${a}`, `\\ln ${a} - \\ln ${b}`);
      return {
        instruction: 'Solve for x',
        prompt: equation,
        note: 'Give the exact value.',
        answers: [answer(result, { keyboard: 'logs' })],
        solution: [
          step('log-laws', 'Take ln of both sides', `${paren(poly([[1, 1], [p, 0]]))}\\ln ${a} = ${paren(poly([[1, 1], [q, 0]]))}\\ln ${b}`),
          step('linear-solve', 'Collect the x terms', `x${paren(`\\ln ${a} - \\ln ${b}`)} = ${q}\\ln ${b} - ${p}\\ln ${a}`),
          step('linear-solve', 'Divide', result),
        ],
        ruleIds: ['log-laws', 'exponential-equation', 'linear-solve'],
        verify: { kind: 'root', equation, wrt: 'x' },
      };
    }

    // a·e^{kx} = m
    const a = rng.int(2, 9);
    const k = rng.nonZero(-3, 4);
    const m = rng.int(2, 40);
    const equation = `${a}e^{${k === 1 ? 'x' : `${k}x`}} = ${m}`;
    const result = frac(`\\ln${paren(fracTex(m, a))}`, String(k));
    return {
      instruction: 'Solve for x',
      prompt: equation,
      note: 'Give the exact value.',
      answers: [answer(result, { keyboard: 'logs' })],
      solution: [
        step('linear-solve', 'Isolate the exponential', `e^{${k}x} = ${fracTex(m, a)}`),
        step('exp-log-inverse', 'Take ln of both sides', `${k}x = \\ln${paren(fracTex(m, a))}`),
        step('linear-solve', 'Divide', result),
      ],
      ruleIds: ['exponential-equation', 'exp-log-inverse', 'linear-solve'],
      verify: { kind: 'root', equation, wrt: 'x' },
    };
  },
};

/**
 * Logarithms with a base other than e. The book introduces log₂ and log₁₀ long
 * before ln, and every exam question that mentions a doubling time is really
 * asking for one.
 */
export const otherBases: Generator = {
  id: 'logs.other-bases',
  chapter: 6,
  title: 'Logarithms to any base',
  tags: ['logarithms', 'log-laws'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const base = rng.pick([2, 3, 5, 10]);
    const n = rng.int(2, tier === 'easy' ? 4 : 6);

    if (tier === 'hard' && rng.bool()) {
      // A reciprocal, so the answer is negative — the case that gets guessed wrong.
      const prompt = `\\log_{${base}}\\left(${frac('1', String(base ** n))}\\right)`;
      return {
        instruction: 'Give the exact value',
        prompt,
        answers: [answer(String(-n), { keyboard: 'logs', kind: 'number' })],
        solution: [
          step(
            'negative-exponent',
            'The inside as a power',
            `\\log_{${base}}\\left(${base}^{-${n}}\\right)`,
            `${frac('1', String(base ** n))} is ${base}^{-${n}}.`,
          ),
          step('log-definition', 'The log gives the exponent back', String(-n)),
        ],
        ruleIds: ['log-definition', 'negative-exponent'],
        verify: { kind: 'identity', of: prompt },
      };
    }

    const value = base ** n;
    const prompt = `\\log_{${base}}\\left(${value}\\right)`;
    return {
      instruction: 'Give the exact value',
      prompt,
      note: 'No calculator — ask which power of the base gives this number.',
      answers: [answer(String(n), { keyboard: 'logs', kind: 'number' })],
      solution: [
        step(
          'log-definition',
          'Write the inside as a power of the base',
          `\\log_{${base}}\\left(${base}^{${n}}\\right)`,
          `${value} = ${base}^{${n}}.`,
        ),
        step('log-definition', 'The log gives the exponent back', String(n)),
      ],
      ruleIds: ['log-definition'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};

/** log to one base, rewritten in another — the only way a calculator can help. */
export const changeOfBase: Generator = {
  id: 'logs.change-of-base',
  chapter: 6,
  title: 'Change of base',
  tags: ['logarithms', 'change-of-base'],
  version: 1,
  supports: ['medium', 'hard'] as const,
  invariant: 'value-preserving',

  generate({ rng }): Draft {
    const base = rng.pick([2, 3, 5, 7]);
    let value = rng.int(2, 30);
    // A whole-number answer would make the rewrite pointless.
    while (Number.isInteger(Math.log(value) / Math.log(base))) value = rng.int(2, 30);
    const prompt = `\\log_{${base}}\\left(${value}\\right)`;
    const result = frac(`\\ln ${value}`, `\\ln ${base}`);

    return {
      instruction: 'Rewrite using natural logarithms',
      prompt,
      note: 'Give the exact value — do not evaluate it.',
      answers: [answer(result, { keyboard: 'logs' })],
      solution: [
        step(
          'change-of-base',
          'Change of base',
          result,
          'Any base on top and bottom works; ln is the one a calculator has.',
        ),
      ],
      ruleIds: ['change-of-base'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};

/**
 * The log laws in both directions — a sum or difference of logs squeezed into
 * one, and one log pulled apart into several. The exam asks for both.
 */
export const logCombine: Generator = {
  id: 'logs.combine',
  chapter: 6,
  title: 'Combining and splitting logarithms',
  tags: ['logarithms', 'log-laws'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    if (tier === 'easy') {
      const a = rng.int(2, 9);
      const b = rng.int(2, 9);
      const prompt = `\\ln ${a * b} - \\ln ${b}`;
      const result = `\\ln ${a}`;
      return {
        instruction: 'Write as a single logarithm',
        prompt,
        answers: [answer(result, { keyboard: 'logs' })],
        solution: [
          step('log-laws', 'A difference of logs is the log of a quotient', `\\ln${paren(frac(String(a * b), String(b)))}`),
          step('log-laws', 'Work out the inside', result),
        ],
        ruleIds: ['log-laws'],
        verify: { kind: 'identity', of: prompt },
      };
    }

    if (tier === 'medium') {
      const p = rng.int(2, 4);
      const prompt = `${p}\\ln x + \\ln y`;
      const result = `\\ln\\left(${power('x', p)}y\\right)`;
      return {
        instruction: 'Write as a single logarithm',
        prompt,
        note: 'x and y are positive.',
        answers: [answer(result, { keyboard: 'logs' })],
        solution: [
          step('log-laws', 'The coefficient becomes an exponent', `\\ln${paren(power('x', p))} + \\ln y`, 'n ln x = ln(xⁿ).'),
          step('log-laws', 'A sum of logs is the log of a product', result),
        ],
        ruleIds: ['log-laws'],
        verify: { kind: 'identity', of: prompt },
      };
    }

    const p = rng.int(2, 4);
    const prompt = `\\ln\\left(${frac(`${power('x', p)}y`, 'z')}\\right)`;
    const result = `${p}\\ln x + \\ln y - \\ln z`;
    return {
      instruction: 'Write as a sum and difference of logarithms',
      prompt,
      note: 'x, y and z are positive. No products or quotients left inside a log.',
      answers: [answer(result, { keyboard: 'logs' })],
      solution: [
        step('log-laws', 'Split the quotient', `\\ln\\left(${power('x', p)}y\\right) - \\ln z`),
        step('log-laws', 'Split the product', `\\ln${paren(power('x', p))} + \\ln y - \\ln z`),
        step('log-laws', 'Bring the exponent down', result),
      ],
      ruleIds: ['log-laws'],
      verify: { kind: 'identity', of: prompt },
    };
  },
};

/**
 * An exponential equation that is secretly a quadratic. Nothing in the log
 * rules touches it until `e^{x}` is treated as one unknown.
 */
export const quadraticInExp: Generator = {
  id: 'logs.quadratic-in-exp',
  chapter: 6,
  title: 'Quadratic in e^x',
  tags: ['exponential', 'quadratic', 'solve'],
  version: 1,
  supports: ['hard'] as const,
  invariant: 'solution-set-preserving',

  generate({ rng }): Draft {
    // Roots in u = e^x, both positive so both give a real x.
    const p = rng.int(2, 6);
    let q = rng.int(2, 6);
    while (q === p) q = rng.int(2, 6);
    const [lo, hi] = p < q ? [p, q] : [q, p];
    const equation = `e^{2x} - ${p + q}e^{x} + ${p * q} = 0`;

    return {
      instruction: 'Solve for x',
      prompt: equation,
      note: 'Two solutions. Give the smaller one first, exactly.',
      answers: [
        answer(`\\ln ${lo}`, { label: 'smaller x', keyboard: 'logs', kind: 'number' }),
        answer(`\\ln ${hi}`, { label: 'larger x', keyboard: 'logs', kind: 'number' }),
      ],
      solution: [
        setup(
          'exponential-equation',
          'Substitute u = e^{x}',
          `u^{2} - ${p + q}u + ${p * q} = 0`,
          'e^{2x} is (e^{x})², so the equation is an ordinary quadratic in u.',
        ),
        setup('quadratic-formula', 'Solve for u', `u = ${lo} \\quad\\text{or}\\quad u = ${hi}`),
        setup(
          'exp-log-inverse',
          'Back to x',
          `e^{x} = ${lo} \\quad\\text{or}\\quad e^{x} = ${hi}`,
          'Both values are positive, so both give a solution. A negative one would give none.',
        ),
      ],
      ruleIds: ['exponential-equation', 'quadratic-formula', 'exp-log-inverse'],
      verify: { kind: 'root', equation, wrt: 'x' },
    };
  },
};

/**
 * Growth and decay, which is the only reason most people ever need a logarithm.
 * The unknown is in the exponent, so the log is what gets it down.
 */
export const growthDecay: Generator = {
  id: 'logs.growth',
  chapter: 6,
  title: 'Growth and decay',
  tags: ['exponential', 'logarithms', 'word-problem'],
  version: 1,
  supports: TIERS,
  invariant: 'solution-set-preserving',

  generate({ tier, rng }): Draft {
    if (tier === 'easy') {
      // A whole number of doublings: the log is log₂ of a power of 2.
      const t = rng.int(2, 9);
      const n = rng.int(2, 5);
      const equation = `2^{${frac('x', String(t))}} = ${2 ** n}`;
      return {
        instruction: 'Solve for x',
        prompt: equation,
        promptText: `A colony of bacteria doubles every ${t} hours. After how many hours is it ${2 ** n} times its starting size?`,
        note: 'x is the number of hours.',
        answers: [answer(String(n * t), { keyboard: 'logs', kind: 'number' })],
        solution: [
          setup(
            'exponential-equation',
            'Both sides to base 2',
            `2^{${frac('x', String(t))}} = 2^{${n}}`,
            `${2 ** n} is 2^{${n}}, which is ${n} doublings.`,
          ),
          step('exponential-equation', 'Equate the exponents', `${frac('x', String(t))} = ${n}`),
          step('linear-solve', 'Multiply up', `x = ${n * t}`),
        ],
        ruleIds: ['exponential-equation', 'linear-solve'],
        verify: { kind: 'root', equation, wrt: 'x' },
      };
    }

    if (tier === 'medium') {
      const t = rng.int(2, 8);
      const m = rng.int(3, 12);
      const equation = `e^{${frac('x', String(t))}} = ${m}`;
      const result = `${t}\\ln ${m}`;
      return {
        instruction: 'Solve for x',
        prompt: equation,
        promptText: `A population grows as P(t) = P_0e^{t/${t}}, with t in years. After how many years is it ${m} times its starting size?`,
        note: 'Give the exact value.',
        answers: [answer(result, { keyboard: 'logs', kind: 'number' })],
        solution: [
          step('exp-log-inverse', 'Take ln of both sides', `${frac('x', String(t))} = \\ln ${m}`, 'ln undoes e — that is all it is for.'),
          step('linear-solve', 'Multiply up', `x = ${result}`),
        ],
        ruleIds: ['exp-log-inverse', 'linear-solve'],
        verify: { kind: 'root', equation, wrt: 'x' },
      };
    }

    // Half-life: the base is 1/2 and the answer needs a change of base.
    const h = rng.int(2, 12);
    const m = rng.pick([3, 5, 6, 7, 10]);
    const equation = `\\left(${frac('1', '2')}\\right)^{${frac('x', String(h))}} = ${frac('1', String(m))}`;
    const result = frac(`${h}\\ln ${m}`, '\\ln 2');

    return {
      instruction: 'Solve for x',
      prompt: equation,
      promptText: `A substance has a half-life of ${h} days. After how many days is only 1/${m} of it left?`,
      note: 'Give the exact value.',
      answers: [answer(result, { keyboard: 'logs', kind: 'number' })],
      solution: [
        step(
          'log-laws',
          'Take ln of both sides',
          `${frac('x', String(h))}\\ln${paren(frac('1', '2'))} = \\ln${paren(frac('1', String(m)))}`,
          'The exponent comes down in front — that is the whole move.',
        ),
        step(
          'log-laws',
          'Both logs are negative',
          `${frac('x', String(h))}\\left(-\\ln 2\\right) = -\\ln ${m}`,
          'ln(1/a) = −ln a, and the two minus signs cancel.',
        ),
        step('linear-solve', 'Solve for x', `x = ${result}`),
      ],
      ruleIds: ['log-laws', 'exp-log-inverse', 'linear-solve'],
      verify: { kind: 'root', equation, wrt: 'x' },
    };
  },
};
