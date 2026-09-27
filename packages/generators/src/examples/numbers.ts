import { type Build, gcd, frac, plus, coeff, pow, terms } from './format.js';

/** Numbers, powers, fractions and roots: chapters 1 to 4. */
export const NUMBERS: Record<string, Build> = {
  'sign-rules': (rng) => {
    const a = rng.int(3, 24);
    const b = rng.int(3, 24);
    return {
      given: `a = ${a},\\quad b = ${b}`,
      steps: [
        `${a} - (-${b}) = ${a} + ${b} = ${a + b}`,
        `-(${a} + ${b}) = -${a} - ${b} = ${-(a + b)}`,
      ],
    };
  },

  distributive: (rng) => {
    const a = rng.int(3, 9);
    const b = rng.int(2, 9) * 10;
    const c = rng.int(1, 9);
    return {
      given: `a = ${a},\\quad b = ${b},\\quad c = ${c}`,
      steps: [
        `${a}(${b} + ${c}) = ${a}\\cdot ${b} + ${a}\\cdot ${c}`,
        `= ${a * b} + ${a * c} = ${a * (b + c)}`,
      ],
    };
  },

  'rational-equation': (rng) => {
    const c = rng.pick([2, 3, 4, 5, 7]);
    const d = rng.pick([3, 4, 5, 6, 7].filter((n) => gcd(n, c) === 1));
    const k = rng.int(2, 6);
    const a = c * k;
    const x = d * k;
    return {
      given: `\\frac{${a}}{x} = \\frac{${c}}{${d}}`,
      steps: [`${a}\\cdot ${d} = ${c}x`, `x = \\frac{${a * d}}{${c}} = ${x}`],
    };
  },

  'notable-products': (rng) => {
    const m = rng.int(1, 4);
    const b = rng.int(2, 9);
    const s = rng.sign();
    const sign = s > 0 ? '+' : '-';
    const inner = coeff(m, 'x');
    const sq = m === 1 ? 'x^{2}' : `(${inner})^{2}`;
    return {
      given: `a = ${inner},\\quad b = ${b}`,
      steps: [
        `(${inner} ${sign} ${b})^{2} = ${sq} ${sign} 2\\cdot ${inner}\\cdot ${b} + ${b}^{2}`,
        `= ${coeff(m * m, 'x^{2}')} ${sign} ${coeff(2 * m * b, 'x')} + ${b * b}`,
      ],
    };
  },

  'difference-of-squares': (rng) => {
    // The numeric one is the reason to know the rule at all, so it comes up
    // half the time: 53·47 in your head is the whole argument for it.
    if (rng.bool()) {
      const a = rng.pick([20, 30, 40, 50, 60, 70]);
      const b = rng.int(1, 6);
      return {
        given: `a = ${a},\\quad b = ${b}`,
        steps: [
          `${a + b}\\cdot ${a - b} = (${a} + ${b})(${a} - ${b})`,
          `= ${a}^{2} - ${b}^{2} = ${a * a} - ${b * b} = ${a * a - b * b}`,
        ],
      };
    }
    const b = rng.int(2, 12);
    return {
      given: `a = x,\\quad b = ${b}`,
      steps: [`(x + ${b})(x - ${b}) = x^{2} - ${b}^{2} = x^{2} - ${b * b}`],
    };
  },

  'power-rules': (rng) => {
    const m = rng.int(4, 9);
    const n = rng.int(2, 3);
    return {
      given: `a = x,\\quad m = ${m},\\quad n = ${n}`,
      steps: [
        `x^{${m}}x^{${n}} = x^{${m}+${n}} = x^{${m + n}}`,
        `\\frac{x^{${m}}}{x^{${n}}} = x^{${m}-${n}} = x^{${m - n}}`,
        `\\left(x^{${m}}\\right)^{${n}} = x^{${m}\\cdot ${n}} = x^{${m * n}}`,
      ],
    };
  },

  'negative-exponent': (rng) => {
    const a = rng.int(2, 5);
    const n = rng.int(2, 4);
    return {
      given: `a = ${a},\\quad n = ${n}`,
      steps: [`${a}^{-${n}} = \\frac{1}{${a}^{${n}}} = \\frac{1}{${a ** n}}`],
    };
  },

  'fraction-add': (rng) => {
    const b = rng.int(2, 9);
    // Same denominator twice makes a poor illustration of a rule about
    // different ones.
    const d = rng.pick([2, 3, 4, 5, 6, 7, 8, 9].filter((n) => n !== b));
    const a = rng.int(1, b - 1);
    const c = rng.int(1, d - 1);
    return {
      given: `a = ${a},\\quad b = ${b},\\quad c = ${c},\\quad d = ${d}`,
      steps: [
        `\\frac{${a}}{${b}} + \\frac{${c}}{${d}} = \\frac{${a}\\cdot ${d} + ${c}\\cdot ${b}}{${b}\\cdot ${d}}`,
        `= \\frac{${a * d + c * b}}{${b * d}} = ${frac(a * d + c * b, b * d)}`,
      ],
    };
  },

  'fraction-simplify': (rng) => {
    const a = rng.int(2, 9);
    // a = b would make the second line false: both sides would be 1.
    const b = rng.pick([2, 3, 4, 5, 6, 7, 8, 9].filter((n) => n !== a));
    const c = rng.int(2, 9);
    return {
      given: `a = ${a},\\quad b = ${b},\\quad c = ${c}`,
      steps: [
        `\\frac{${a * c}}{${b * c}} = \\frac{${a}\\cdot ${c}}{${b}\\cdot ${c}} = ${frac(a, b)}`,
        `\\text{but } \\frac{${a} + ${c}}{${b} + ${c}} \\ne ${frac(a, b)} \\text{ — added, not multiplied}`,
      ],
    };
  },

  'surd-simplify': (rng) => {
    const a = rng.int(2, 7);
    const b = rng.pick([2, 3, 5, 6, 7, 10, 11]);
    return {
      given: `a = ${a},\\quad b = ${b}`,
      steps: [`\\sqrt{${a * a * b}} = \\sqrt{${a * a}\\cdot ${b}} = ${a}\\sqrt{${b}}`],
    };
  },

  rationalise: (rng) => {
    const a = rng.pick([2, 3, 5, 6, 7, 10]);
    // b² = a would leave a zero denominator, and none of these squares are in
    // the list, but the filter says so rather than relying on that.
    const b = rng.pick([1, 2, 3, 4].filter((n) => n * n !== a));
    const den = a - b * b;
    return {
      given: `a = ${a},\\quad b = ${b}`,
      steps: [
        `\\frac{1}{\\sqrt{${a}}+${b}} = \\frac{1}{\\sqrt{${a}}+${b}}\\cdot\\frac{\\sqrt{${a}}-${b}}{\\sqrt{${a}}-${b}}`,
        `= \\frac{\\sqrt{${a}}-${b}}{${a} - ${b * b}} = ${
          den === 1 ? `\\sqrt{${a}}-${b}` : `\\frac{\\sqrt{${a}}-${b}}{${den}}`
        }`,
      ],
    };
  },

  'fractional-exponent': (rng) => {
    const [a, m, n, value] = rng.pick([
      [8, 2, 3, 4],
      [27, 2, 3, 9],
      [16, 3, 4, 8],
      [32, 2, 5, 4],
      [4, 3, 2, 8],
      [9, 3, 2, 27],
      [25, 3, 2, 125],
      [64, 2, 3, 16],
    ] as const);
    return {
      given: `a = ${a},\\quad m = ${m},\\quad n = ${n}`,
      steps: [
        `${a}^{${m}/${n}} = \\sqrt[${n}]{${a}^{${m}}} = \\left(\\sqrt[${n}]{${a}}\\right)^{${m}}`,
        `= ${Math.round(a ** (1 / n))}^{${m}} = ${value}`,
      ],
    };
  },

  'cube-of-a-sum': (rng) => {
    const b = rng.nonZero(-4, 4);
    return {
      given: `a = x,\\quad b = ${b}`,
      steps: [
        `\\left(x${plus(b)}\\right)^{3} = x^{3} + 3x^{2}\\left(${b}\\right) + 3x\\left(${b}\\right)^{2} + \\left(${b}\\right)^{3}`,
        `= ${terms([[1, 'x^{3}'], [3 * b, 'x^{2}'], [3 * b * b, 'x'], [b ** 3, '']])}`,
      ],
    };
  },

  'power-of-a-product': (rng) => {
    const a = rng.int(2, 4);
    const n = rng.int(2, 3);
    const p = rng.int(1, 3);
    return {
      given: `a = ${a},\\quad n = ${n}`,
      steps: [
        `\\left(${a}${pow('x', p)}y\\right)^{${n}} = ${a}^{${n}}${pow('x', p * n)}${pow('y', n)}`,
        `= ${a ** n}${pow('x', p * n)}${pow('y', n)}`,
        `\\text{the } ${a} \\text{ is a factor too}`,
      ],
    };
  },

  'fraction-multiply': (rng) => {
    const a = rng.int(1, 9);
    const b = rng.int(2, 9);
    const c = rng.int(1, 9);
    const d = rng.int(2, 9);
    return {
      given: `\\tfrac{${a}}{${b}} \\text{ and } \\tfrac{${c}}{${d}}`,
      steps: [
        `\\frac{${a}}{${b}}\\cdot\\frac{${c}}{${d}} = \\frac{${a * c}}{${b * d}} = ${frac(a * c, b * d)}`,
        `\\frac{${a}}{${b}}\\div\\frac{${c}}{${d}} = \\frac{${a}}{${b}}\\cdot\\frac{${d}}{${c}} = ${frac(a * d, b * c)}`,
      ],
    };
  },

  'compound-fraction': (rng) => {
    const a = rng.int(1, 9);
    const b = rng.int(2, 9);
    const c = rng.int(1, 9);
    const d = rng.int(2, 9);
    return {
      given: `a = ${a},\\quad b = ${b},\\quad c = ${c},\\quad d = ${d}`,
      steps: [
        `\\frac{\\ \\frac{${a}}{${b}}\\ }{\\frac{${c}}{${d}}} = \\frac{${a}}{${b}}\\cdot\\frac{${d}}{${c}}`,
        `= \\frac{${a * d}}{${b * c}} = ${frac(a * d, b * c)}`,
      ],
    };
  },

  'rearrange-formula': (rng) =>
    rng.pick([
      {
        given: 'A = \\tfrac{1}{2}bh \\quad \\text{(solve for } h)',
        steps: ['2A = bh', 'h = \\frac{2A}{b}'],
      },
      {
        given: 'C = \\tfrac{5}{9}(F - 32) \\quad \\text{(solve for } F)',
        steps: ['\\frac{9C}{5} = F - 32', 'F = \\frac{9C}{5} + 32'],
      },
      {
        given: '\\frac{1}{R} = \\frac{1}{a} + \\frac{1}{b} \\quad \\text{(solve for } R)',
        steps: ['\\frac{1}{R} = \\frac{a + b}{ab}', 'R = \\frac{ab}{a + b}'],
      },
    ]),

  'root-equation': (rng) => {
    const c = rng.int(2, 6);
    const a = rng.nonZero(-8, 8);
    return {
      given: `\\sqrt{x${plus(a)}} = ${c}`,
      steps: [
        `x${plus(a)} = ${c * c}`,
        `x = ${c * c - a}`,
        `\\text{check: } \\sqrt{${c * c - a}${plus(a)}} = \\sqrt{${c * c}} = ${c}`,
      ],
    };
  },

  'absolute-value': (rng) => {
    const a = rng.int(1, 4);
    const b = rng.nonZero(-7, 7);
    const c = rng.int(1, 9);
    return {
      given: `\\left|${coeff(a, 'x')}${plus(b)}\\right| = ${c}`,
      steps: [
        `${coeff(a, 'x')}${plus(b)} = ${c} \\quad\\text{or}\\quad ${coeff(a, 'x')}${plus(b)} = ${-c}`,
        `x = ${frac(c - b, a)} \\quad\\text{or}\\quad x = ${frac(-c - b, a)}`,
      ],
    };
  },
};
