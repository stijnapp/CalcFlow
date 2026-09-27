import { type Build, plus, coeff, pow, terms } from './format.js';

/** Differentiation: chapter 9. */
export const DERIVATIVES: Record<string, Build> = {
  'power-rule': (rng) => {
    const n = rng.pick([2, 3, 4, 5, 6, 7, -1, -2, -3]);
    return {
      given: `n = ${n}`,
      steps: [`\\frac{d}{dx}x^{${n}} = ${n}x^{${n - 1}}`],
    };
  },

  'chain-rule': (rng) => {
    const a = rng.int(2, 6);
    const b = rng.nonZero(-7, 7);
    const n = rng.int(3, 6);
    return rng.pick([
      {
        given: `f(u) = u^{${n}},\\quad g(x) = ${a}x${plus(b)}`,
        steps: [
          `\\frac{d}{dx}\\left(${a}x${plus(b)}\\right)^{${n}} = ${n}\\left(${a}x${plus(b)}\\right)^{${n - 1}}\\cdot ${a}`,
          `= ${n * a}\\left(${a}x${plus(b)}\\right)^{${n - 1}}`,
        ],
      },
      {
        given: `f(u) = \\sin u,\\quad g(x) = ${a}x${plus(b)}`,
        steps: [
          `\\frac{d}{dx}\\sin\\left(${a}x${plus(b)}\\right) = \\cos\\left(${a}x${plus(b)}\\right)\\cdot ${a}`,
          `= ${a}\\cos\\left(${a}x${plus(b)}\\right)`,
        ],
      },
      {
        given: `f(u) = e^{u},\\quad g(x) = ${a}x${plus(b)}`,
        steps: [`\\frac{d}{dx}e^{${a}x${plus(b)}} = ${a}e^{${a}x${plus(b)}}`],
      },
      {
        given: `f(u) = \\ln u,\\quad g(x) = ${a}x${plus(b)}`,
        steps: [
          `\\frac{d}{dx}\\ln\\left(${a}x${plus(b)}\\right) = \\frac{1}{${a}x${plus(b)}}\\cdot ${a} = \\frac{${a}}{${a}x${plus(b)}}`,
        ],
      },
    ]);
  },

  'product-rule': (rng) => {
    const n = rng.int(2, 5);
    const [v, dv] = rng.pick([
      ['\\sin x', '\\cos x'],
      ['\\cos x', '-\\sin x'],
      ['e^{x}', 'e^{x}'],
      ['\\ln x', '\\frac{1}{x}'],
    ] as const);
    return {
      given: `u = x^{${n}},\\quad v = ${v}`,
      steps: [
        `u' = ${coeff(n, pow('x', n - 1))},\\quad v' = ${dv}`,
        `(uv)' = ${coeff(n, pow('x', n - 1))}\\cdot ${v} + x^{${n}}\\cdot ${dv}`,
      ],
    };
  },

  'quotient-rule': (rng) => {
    const a = rng.nonZero(-4, 4);
    const b = rng.nonZero(-6, 6);
    const c = rng.nonZero(-4, 4);
    // ad = bc is the case where the fraction is a constant and its derivative
    // is 0 — true, and a useless thing to show the rule with.
    const d = rng.pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6].filter((n) => a * n !== b * c));
    const top = terms([[a, 'x'], [b, '']]);
    const bot = terms([[c, 'x'], [d, '']]);
    return {
      given: `u = ${top},\\quad v = ${bot}`,
      steps: [
        `\\left(\\frac{${top}}{${bot}}\\right)' = \\frac{${a}\\left(${bot}\\right) - \\left(${top}\\right)${c < 0 ? `\\cdot(${c})` : `\\cdot ${c}`}}{\\left(${bot}\\right)^{2}}`,
        `= \\frac{${a * d - b * c}}{\\left(${bot}\\right)^{2}}`,
      ],
    };
  },

  'standard-derivatives': (rng) => {
    const k = rng.int(2, 9);
    const [f, df] = rng.pick([
      ['\\sin x', `${k}\\cos x`],
      ['\\cos x', `-${k}\\sin x`],
      ['e^{x}', `${k}e^{x}`],
      ['\\ln x', `\\frac{${k}}{x}`],
    ] as const);
    return {
      given: `f(x) = ${k}${f}`,
      steps: [`\\frac{d}{dx}\\left(${k}${f}\\right) = ${df}`],
    };
  },

  'tangent-line': (rng) => {
    const a = rng.nonZero(-4, 4);
    return {
      given: `f(x) = x^{2},\\quad a = ${a}`,
      steps: [
        `f'(x) = 2x,\\quad f'(${a}) = ${2 * a},\\quad f(${a}) = ${a * a}`,
        `y = ${2 * a}\\left(x${plus(-a)}\\right)${plus(a * a)}`,
        `y = ${terms([[2 * a, 'x'], [-(a * a), '']])}`,
      ],
    };
  },

  optimisation: (rng) => {
    const k = 5 * rng.int(1, 6);
    return {
      given: `\\text{${4 * k} m of fence, a wall on the fourth side}`,
      steps: [
        `\\text{area } A = xy, \\quad 2x + y = ${4 * k} \\;\\Rightarrow\\; A(x) = x\\left(${4 * k} - 2x\\right)`,
        `A'(x) = ${4 * k} - 4x = 0 \\;\\Rightarrow\\; x = ${k}`,
        `A''(x) = -4 < 0, \\text{ so the largest area is } ${k}\\cdot ${2 * k} = ${2 * k * k}\\text{ m}^{2}`,
      ],
    };
  },

  'stationary-point': (rng) => {
    const half = rng.nonZero(-5, 5);
    const b = 2 * half;
    const c = rng.nonZero(-9, 9);
    return {
      given: `f(x) = ${terms([[1, 'x^{2}'], [b, 'x'], [c, '']])}`,
      steps: [
        `f'(x) = ${terms([[2, 'x'], [b, '']])}`,
        `${terms([[2, 'x'], [b, '']])} = 0 \\Rightarrow x = ${-half}`,
        `f' \\text{ goes from negative to positive, so it is a minimum}`,
      ],
    };
  },

  'derivative-definition': (rng) => {
    const a = rng.nonZero(-3, 3);
    const p = rng.int(2, 4);
    return {
      given: `f(x) = ${coeff(p, 'x^{2}')}, \\ a = ${a}`,
      steps: [
        `\\frac{${p}(${a}+h)^{2} - ${p * a * a}}{h} = \\frac{${2 * p * a}h + ${p}h^{2}}{h}`,
        `= ${2 * p * a} + ${p}h`,
        `\\xrightarrow{h\\to 0} ${2 * p * a}`,
      ],
    };
  },

  'higher-derivatives': (rng) => {
    const a = rng.int(2, 3);
    const n = rng.int(4, 6);
    const cycle = ['\\sin', '\\cos', '-\\sin', '-\\cos'];
    return {
      given: `f(x) = \\sin(${coeff(a, 'x')}), \\ n = ${n}`,
      steps: [
        `f' = ${a}\\cos(${coeff(a, 'x')}), \\quad f'' = -${a * a}\\sin(${coeff(a, 'x')})`,
        `f^{(k)} = ${a}^{k}\\cdot${cycle[0]}\\text{-cycle}[k \\bmod 4]`,
        `f^{(${n})} = ${a ** n}${cycle[n % 4]}(${coeff(a, 'x')})`,
      ],
    };
  },

  'logarithmic-differentiation': () => ({
    given: 'f(x) = x^{x}',
    steps: ['\\ln f = x\\ln x', "\\frac{f'}{f} = \\ln x + 1", "f' = x^{x}(\\ln x + 1)"],
  }),

  'inflection-point': (rng) => {
    const a = rng.nonZero(-4, 4);
    return {
      given: `f(x) = x^{3}${plus(-3 * a)}x^{2}`,
      steps: [
        `f''(x) = 6x${plus(-6 * a)} = 6\\left(x${plus(-a)}\\right)`,
        `f'' < 0 \\text{ for } x < ${a}, \\quad f'' > 0 \\text{ for } x > ${a}`,
        `\\text{concave, then convex: an inflection point at } x = ${a}`,
      ],
    };
  },

  'partial-derivative': (rng) => {
    const a = rng.int(2, 5);
    const m = rng.int(2, 3);
    const n = rng.int(2, 3);
    const b = rng.int(2, 6);
    return {
      given: `f(x, y) = ${a}x^{${m}}y^{${n}} + ${b}x`,
      steps: [
        `\\frac{\\partial f}{\\partial x} = ${a * m}${pow('x', m - 1)}y^{${n}} + ${b}`,
        `\\frac{\\partial^{2} f}{\\partial y\\,\\partial x} = ${a * m * n}${pow('x', m - 1)}${pow('y', n - 1)}`,
        `${b}x \\to ${b} \\to 0 \\quad \\text{(no } y \\text{ in it)}`,
      ],
    };
  },
};
