import { type Build, plus, coeff, terms } from './format.js';

/** Curves, functions and graphs, and exp and ln: chapters 5 and 6. */
export const FUNCTIONS: Record<string, Build> = {
  'log-laws': (rng) => {
    const a = rng.pick([2, 3, 5]);
    const m = rng.int(2, 4);
    const n = rng.int(1, 3);
    const k = rng.int(2, 3);
    return {
      given: `a = ${a}`,
      steps: [
        `\\log_{${a}}(${a ** m}\\cdot ${a ** n}) = \\log_{${a}}${a ** m} + \\log_{${a}}${a ** n} = ${m} + ${n} = ${m + n}`,
        `\\log_{${a}}\\left(${a ** m}^{${k}}\\right) = ${k}\\log_{${a}}${a ** m} = ${k}\\cdot ${m} = ${k * m}`,
      ],
    };
  },

  'change-of-base': (rng) => {
    const a = rng.pick([2, 3, 5, 7]);
    const x = rng.int(11, 60);
    return {
      given: `a = ${a},\\quad x = ${x}`,
      steps: [
        `\\log_{${a}}${x} = \\frac{\\ln ${x}}{\\ln ${a}}`,
        `= \\frac{${Math.log(x).toFixed(3)}}{${Math.log(a).toFixed(3)}} \\approx ${(Math.log(x) / Math.log(a)).toFixed(3)}`,
      ],
    };
  },

  'exp-log-inverse': (rng) => {
    const x = rng.int(2, 9);
    const n = rng.int(2, 5);
    return {
      given: `x = ${x},\\quad n = ${n}`,
      steps: [
        `e^{\\ln ${x}} = ${x}`,
        `\\ln\\left(e^{${n}}\\right) = ${n}`,
        `e^{${n}\\ln t} = e^{\\ln t^{${n}}} = t^{${n}}`,
      ],
    };
  },

  'exponential-equation': (rng) => {
    const a = rng.pick([2, 3, 5]);
    const x = rng.int(2, 5);
    return {
      given: `a = ${a},\\quad b = ${a ** x}`,
      steps: [
        `${a}^{x} = ${a ** x}`,
        `x = \\frac{\\ln ${a ** x}}{\\ln ${a}} = ${x}`,
      ],
    };
  },

  'log-definition': (rng) => {
    const b = rng.pick([2, 3, 5, 10]);
    const n = rng.int(2, 5);
    return {
      given: `b = ${b},\\quad a = ${b ** n}`,
      steps: [
        `\\log_{${b}}\\left(${b ** n}\\right) = ${n} \\iff ${b}^{${n}} = ${b ** n}`,
        `\\log_{${b}}\\left(\\frac{1}{${b ** n}}\\right) = ${-n} \\iff ${b}^{${-n}} = \\frac{1}{${b ** n}}`,
      ],
    };
  },

  domain: (rng) => {
    const p = rng.nonZero(-5, 5);
    const q = rng.nonZero(-5, 5);
    return {
      given: `f(x) = \\frac{1}{${terms([[1, 'x^{2}'], [-(p + q), 'x'], [p * q, '']])}}`,
      steps: [
        `${terms([[1, 'x^{2}'], [-(p + q), 'x'], [p * q, '']])} = 0`,
        `(x${plus(-p)})(x${plus(-q)}) = 0`,
        `\\text{D}(f) = \\mathbb{R} \\setminus \\{${p}, ${q}\\}`,
      ],
    };
  },

  range: (rng) => {
    const k = rng.int(2, 9);
    const c = rng.nonZero(-5, 5);
    return {
      given: `f(x) = x^{2}${plus(c)}`,
      steps: [`x^{2} \\ge 0`, `f(x) \\ge ${c}`, `\\text{R}(f) = [${c}, \\infty)`, `k = ${k} \\text{ is reached iff } ${k} \\ge ${c}`],
    };
  },

  parity: (rng) => {
    const a = rng.nonZero(-4, 4);
    const b = rng.nonZero(-6, 6);
    return {
      given: `f(x) = ${terms([[a, 'x^{3}'], [b, 'x']])}`,
      steps: [
        `f(-x) = ${coeff(a, '(-x)^{3}')} ${b < 0 ? '-' : '+'} ${coeff(Math.abs(b), '(-x)')}`,
        `= ${terms([[-a, 'x^{3}'], [-b, 'x']])}`,
        `= -f(x) \\Rightarrow f \\text{ is odd}`,
      ],
    };
  },

  inverse: (rng) => {
    const a = rng.nonZero(-5, 5);
    const b = rng.nonZero(-8, 8);
    return {
      given: `f(x) = ${terms([[a, 'x'], [b, '']])}`,
      steps: [`x = ${coeff(a, 'y')}${plus(b)}`, `${coeff(a, 'y')} = x${plus(-b)}`, `f^{-1}(x) = \\frac{x${plus(-b)}}{${a}}`],
    };
  },

  composition: (rng) => {
    const a = rng.nonZero(-4, 4);
    const b = rng.nonZero(-6, 6);
    return {
      given: `f(x) = x^{2}, \\ g(x) = ${terms([[a, 'x'], [b, '']])}`,
      steps: [
        `f(g(x)) = (${terms([[a, 'x'], [b, '']])})^{2} = ${terms([[a * a, 'x^{2}'], [2 * a * b, 'x'], [b * b, '']])}`,
        `g(f(x)) = ${terms([[a, 'x^{2}'], [b, '']])}`,
      ],
    };
  },

  slope: (rng) => {
    const m = rng.nonZero(-3, 3);
    const q = rng.nonZero(-5, 5);
    const x1 = rng.int(-3, 0);
    const x2 = rng.int(1, 4);
    return {
      given: `(${x1}, ${m * x1 + q}) \\text{ and } (${x2}, ${m * x2 + q})`,
      steps: [
        `m = \\frac{${m * x2 + q} - (${m * x1 + q})}{${x2} - (${x1})} = ${m}`,
        `${m * x1 + q} = ${coeff(m, String(x1))} + q \\Rightarrow q = ${q}`,
        `y = ${terms([[m, 'x'], [q, '']])}`,
      ],
    };
  },

  circle: (rng) => {
    const h = rng.int(-3, 3);
    const k = rng.int(-3, 3);
    const r = rng.int(2, 5);
    return {
      given: `x^{2}${plus(-2 * h)}x + y^{2}${plus(-2 * k)}y${plus(h * h + k * k - r * r)} = 0`,
      steps: [
        `(x${plus(-h)})^{2} + (y${plus(-k)})^{2} = ${r * r}`,
        `\\text{centre } (${h}, ${k}), \\ r = ${r}`,
      ],
    };
  },
};
