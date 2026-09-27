import { type Build, frac, signed, coeff, terms } from './format.js';

/** Vectors, and limits and continuity: chapters 12 and 13. */
export const VECTORS_AND_LIMITS: Record<string, Build> = {
  'limit-factor': (rng) => {
    const r = rng.nonZero(-5, 5);
    const s = rng.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5].filter((n) => n !== r));
    return {
      given: `a = ${r}`,
      steps: [
        `\\lim_{x\\to ${r}} \\frac{${terms([[1, 'x^{2}'], [-(r + s), 'x'], [r * s, '']])}}{${terms([[1, 'x'], [-r, '']])}} = \\frac{0}{0}`,
        `= \\lim_{x\\to ${r}} \\frac{\\left(${terms([[1, 'x'], [-r, '']])}\\right)\\left(${terms([[1, 'x'], [-s, '']])}\\right)}{${terms([[1, 'x'], [-r, '']])}}`,
        `= \\lim_{x\\to ${r}} \\left(${terms([[1, 'x'], [-s, '']])}\\right) = ${r - s}`,
      ],
    };
  },

  'limit-infinity': (rng) => {
    const a = rng.nonZero(-6, 6);
    const b = rng.int(1, 6);
    const c = rng.nonZero(-8, 8);
    return {
      given: `f(x) = \\frac{${terms([[a, 'x^{2}'], [c, 'x']])}}{${terms([[b, 'x^{2}'], [c, '']])}}`,
      steps: [
        `\\lim_{x\\to\\infty} \\frac{${terms([[a, 'x^{2}'], [c, 'x']])}}{${terms([[b, 'x^{2}'], [c, '']])}} = \\lim_{x\\to\\infty} \\frac{${a} + \\frac{${c}}{x}}{${b} + \\frac{${c}}{x^{2}}}`,
        `= ${frac(a, b)}`,
        `\\text{one degree lower on top would give } 0`,
      ],
    };
  },

  lhopital: (rng) => {
    const a = rng.int(2, 6);
    const b = rng.int(2, 6);
    return {
      given: `f(x) = \\sin(${a}x),\\quad g(x) = ${coeff(b, 'x')}`,
      steps: [
        `\\lim_{x\\to 0} \\frac{\\sin(${a}x)}{${coeff(b, 'x')}} = \\frac{0}{0}`,
        `= \\lim_{x\\to 0} \\frac{${a}\\cos(${a}x)}{${b}} = ${frac(a, b)}`,
        `\\text{derivatives separately, never the quotient rule}`,
      ],
    };
  },

  'limit-constants': (rng) => {
    const k = rng.int(2, 5);
    return {
      given: `\\lim_{x\\to 0}\\frac{e^{${k}x} - Ax - 1}{x^{2}} = L`,
      steps: [
        `\\text{top at } 0: 1 - 0 - 1 = 0 \\ \\text{(it has to be)}`,
        `\\lim_{x\\to 0}\\frac{${k}e^{${k}x} - A}{2x}: \\ ${k} - A = 0 \\Rightarrow A = ${k}`,
        `\\lim_{x\\to 0}\\frac{${k * k}e^{${k}x}}{2} = ${frac(k * k, 2)} = L`,
      ],
    };
  },

  squeeze: (rng) => {
    const p = rng.int(2, 3);
    return {
      given: `f(x) = x^{${p}}\\sin\\left(\\frac{1}{x}\\right), \\ x \\to 0`,
      steps: [
        `-1 \\le \\sin\\left(\\frac{1}{x}\\right) \\le 1`,
        `-\\left|x^{${p}}\\right| \\le x^{${p}}\\sin\\left(\\frac{1}{x}\\right) \\le \\left|x^{${p}}\\right|`,
        `\\left|x^{${p}}\\right| \\to 0 \\Rightarrow \\lim = 0`,
      ],
    };
  },

  'limit-exponential': (rng) => {
    const a = rng.int(2, 6);
    return {
      given: `\\lim_{x\\to\\infty}\\left(\\frac{x + ${a}}{x}\\right)^{x}`,
      steps: [
        `= \\lim_{x\\to\\infty}\\left(1 + \\frac{${a}}{x}\\right)^{x}`,
        `= e^{${a}}`,
      ],
    };
  },

  'vector-arithmetic': (rng) => {
    const a = [rng.nonZero(-4, 4), rng.nonZero(-4, 4)];
    const b = [rng.nonZero(-4, 4), rng.nonZero(-4, 4)];
    const k = rng.pick([2, 3, -2]);
    const col = (v: number[]) => `\\begin{pmatrix}${v[0]}\\\\${v[1]}\\end{pmatrix}`;
    return {
      given: `\\vec{a} = ${col(a)}, \\ \\vec{b} = ${col(b)}, \\ k = ${k}`,
      steps: [
        `\\vec{a} + \\vec{b} = ${col([a[0]! + b[0]!, a[1]! + b[1]!])}`,
        `${k}\\vec{a} = ${col([k * a[0]!, k * a[1]!])}`,
      ],
    };
  },

  'vector-length': (rng) => {
    const pairs: Array<[number, number]> = [[3, 4], [5, 12], [8, 6], [7, 24]];
    const [x, y] = rng.pick(pairs);
    const s = rng.pick([1, -1]);
    return {
      given: `\\vec{a} = \\begin{pmatrix}${s * x}\\\\${y}\\end{pmatrix}`,
      steps: [
        `\\left|\\vec{a}\\right| = \\sqrt{${x * x} + ${y * y}} = \\sqrt{${x * x + y * y}}`,
        `= ${Math.round(Math.sqrt(x * x + y * y))}`,
      ],
    };
  },

  'dot-product': (rng) => {
    const a = [rng.nonZero(-4, 4), rng.nonZero(-4, 4)];
    const perpendicular = rng.bool();
    const b = perpendicular ? [-a[1]!, a[0]!] : [rng.nonZero(-4, 4), rng.nonZero(-4, 4)];
    const dot = a[0]! * b[0]! + a[1]! * b[1]!;
    const col = (v: number[]) => `\\begin{pmatrix}${v[0]}\\\\${v[1]}\\end{pmatrix}`;
    return {
      given: `\\vec{a} = ${col(a)}, \\ \\vec{b} = ${col(b)}`,
      steps: [
        `\\vec{a}\\cdot\\vec{b} = ${signed(a[0]!)}\\cdot${signed(b[0]!)} + ${signed(a[1]!)}\\cdot${signed(b[1]!)} = ${dot}`,
        dot === 0 ? `\\Rightarrow \\theta = 90°` : dot > 0 ? `\\Rightarrow \\theta < 90°` : `\\Rightarrow \\theta > 90°`,
      ],
    };
  },

  continuity: (rng) => {
    const c = rng.int(1, 4);
    const m = rng.nonZero(-5, 5);
    const a = m * c - c * c;
    return {
      given: `f(x) = x^{2} + a \\text{ below } ${c}, \\ ${coeff(m, 'x')} \\text{ from } ${c}`,
      steps: [
        `\\lim_{x\\uparrow ${c}} \\left(x^{2} + a\\right) = ${c * c} + a`,
        `\\lim_{x\\downarrow ${c}} ${coeff(m, 'x')} = ${m * c}`,
        `${c * c} + a = ${m * c} \\Rightarrow a = ${a}`,
      ],
    };
  },

  asymptote: (rng) => {
    const c = rng.nonZero(-5, 5);
    const a = rng.nonZero(-4, 4);
    const b = rng.nonZero(-9, 9);
    return {
      given: `f(x) = \\frac{${terms([[a, 'x'], [b, '']])}}{${terms([[1, 'x'], [-c, '']])}}`,
      steps: [
        `\\text{vertical: } ${terms([[1, 'x'], [-c, '']])} = 0 \\Rightarrow x = ${c}`,
        `\\text{horizontal: } \\lim_{x\\to\\infty} \\frac{${terms([[a, 'x'], [b, '']])}}{${terms([[1, 'x'], [-c, '']])}} = ${a}`,
      ],
    };
  },
};
