import { type Build, frac, tfrac, plus, coeff, pow, terms } from './format.js';

/** Antidifferentiation and integration: chapters 10 and 11. */
export const INTEGRALS: Record<string, Build> = {
  'antiderivative-power': (rng) => {
    const n = rng.pick([2, 3, 4, 5, 6, -3, -4]);
    return {
      given: `n = ${n}`,
      steps: [
        `\\int x^{${n}}\\,dx = \\frac{x^{${n + 1}}}{${n + 1}} + C`,
        `\\frac{d}{dx}\\left(\\frac{x^{${n + 1}}}{${n + 1}}\\right) = \\frac{${n + 1}x^{${n}}}{${n + 1}} = x^{${n}}`,
      ],
    };
  },

  'linear-substitution': (rng) => {
    const a = rng.int(2, 6);
    const b = rng.nonZero(-7, 7);
    const n = rng.int(2, 5);
    const inner = `${a}x${plus(b)}`;
    return {
      given: `f(u) = u^{${n}},\\quad a = ${a},\\quad b = ${b}`,
      steps: [
        `\\int\\left(${inner}\\right)^{${n}}dx = \\frac{1}{${a}}\\cdot\\frac{\\left(${inner}\\right)^{${n + 1}}}{${n + 1}} + C`,
        `= \\frac{\\left(${inner}\\right)^{${n + 1}}}{${a * (n + 1)}} + C`,
      ],
    };
  },

  'plus-c': (rng) => {
    const n = rng.int(2, 5);
    const k = rng.int(2, 40);
    return {
      given: `f(x) = ${coeff(n, pow('x', n - 1))}`,
      steps: [
        `\\int ${coeff(n, pow('x', n - 1))}\\,dx = x^{${n}} + C`,
        `\\frac{d}{dx}\\left(x^{${n}}\\right) = \\frac{d}{dx}\\left(x^{${n}} + ${k}\\right) = ${coeff(n, pow('x', n - 1))}`,
        `\\text{same derivative, so } C \\text{ can be anything}`,
      ],
    };
  },

  'definite-integral': (rng) => {
    const n = rng.int(2, 4);
    const a = rng.int(1, 2);
    const b = a + rng.int(1, 3);
    const at = (x: number) => x ** (n + 1);
    return {
      given: `f(x) = x^{${n}},\\quad a = ${a},\\quad b = ${b}`,
      steps: [
        `\\int_{${a}}^{${b}} x^{${n}}\\,dx = \\left[\\frac{x^{${n + 1}}}{${n + 1}}\\right]_{${a}}^{${b}}`,
        `= \\frac{${at(b)}}{${n + 1}} - \\frac{${at(a)}}{${n + 1}} = ${frac(at(b) - at(a), n + 1)}`,
      ],
    };
  },

  'improper-integral': (rng) => {
    const p = rng.int(2, 4);
    const k = (p - 1) * rng.int(1, 3);
    return {
      given: `f(x) = ${k}x^{-${p}},\\quad a = 1`,
      steps: [
        `\\int_{1}^{\\infty} \\frac{${k}}{x^{${p}}}\\,dx = \\lim_{b \\to \\infty}\\left[-\\frac{${frac(k, p - 1)}}{${pow('x', p - 1)}}\\right]_{1}^{b}`,
        `= \\lim_{b \\to \\infty}\\left(${frac(k, p - 1)} - \\frac{${frac(k, p - 1)}}{${pow('b', p - 1)}}\\right) = ${frac(k, p - 1)}`,
      ],
    };
  },

  'symmetric-integral': (rng) => {
    const a = rng.int(1, 3);
    const k = rng.int(1, 5);
    return {
      given: `f(x) = x^{3}\\cos x + ${k},\\quad a = ${a}`,
      steps: [
        `\\int_{-${a}}^{${a}} x^{3}\\cos x\\,dx = 0`,
        `\\int_{-${a}}^{${a}} ${k}\\,dx = 2\\int_{0}^{${a}} ${k}\\,dx = ${2 * k * a}`,
      ],
    };
  },

  'area-between': (rng) => {
    // Built backwards from where they cross, so the bounds are whole numbers and
    // the area comes out exactly: f − g = −(x − r₁)(x − r₂).
    const r1 = rng.int(-3, 0);
    const r2 = r1 + rng.int(1, 4);
    const q = rng.int(0, 4);
    const b = -(r1 + r2);
    const p = q - r1 * r2;
    const f = terms([[p, ''], [-1, 'x^{2}']]);
    const g = terms([[b, 'x'], [q, '']]);
    const diff = terms([[p - q, ''], [-b, 'x'], [-1, 'x^{2}']]);
    const width = r2 - r1;
    return {
      given: `f(x) = ${f},\\quad g(x) = ${g}`,
      steps: [
        `${f} = ${g} \\Rightarrow x = ${r1}\\ \\text{or}\\ x = ${r2}`,
        `A = \\int_{${r1}}^{${r2}}\\left(\\left(${f}\\right) - \\left(${g}\\right)\\right)dx`,
        `= \\int_{${r1}}^{${r2}}\\left(${diff}\\right)dx = ${frac(width ** 3, 6)}`,
      ],
    };
  },

  'standard-antiderivatives': (rng) => {
    const k = rng.int(2, 6);
    return {
      given: `k = ${k}`,
      steps: [
        `\\int ${k}e^{x}\\,dx = ${k}e^{x} + C`,
        `\\int ${k}\\sin x\\,dx = -${k}\\cos x + C`,
        `\\int ${k}\\cos x\\,dx = ${k}\\sin x + C`,
      ],
    };
  },

  'log-antiderivative': (rng) => {
    const k = rng.int(2, 8);
    const a = rng.int(2, 5);
    const b = rng.int(1, 9);
    return {
      given: `k = ${k},\\quad a = ${a},\\quad b = ${b}`,
      steps: [
        `\\int \\frac{${k}}{x}\\,dx = ${k}\\ln|x| + C`,
        `\\int \\frac{${k}}{${a}x + ${b}}\\,dx = ${frac(k, a)}\\ln|${a}x + ${b}| + C`,
        `\\text{the } ${frac(1, a)} \\text{ pays for the inner derivative}`,
      ],
    };
  },

  'reverse-chain': (rng) => {
    const n = rng.int(2, 4);
    return rng.pick([
      {
        given: `g(x) = x^{${n}},\\quad g'(x) = ${coeff(n, pow('x', n - 1))}`,
        steps: [
          `\\int ${coeff(n, pow('x', n - 1))}e^{x^{${n}}}\\,dx = e^{x^{${n}}} + C`,
          `\\text{the derivative of the inside is already sitting there}`,
        ],
      },
      {
        given: 'g(x) = \\sin x,\\quad g\'(x) = \\cos x',
        steps: [
          '\\int \\cos x\\sin^{2}x\\,dx = \\tfrac{1}{3}\\sin^{3}x + C',
          '\\text{power rule on } \\sin x, \\text{ because } \\cos x \\text{ is its derivative}',
        ],
      },
    ]);
  },

  substitution: (rng) => {
    const c = rng.int(1, 4);
    return {
      given: `u = x + ${c},\\quad du = dx,\\quad x = u - ${c}`,
      steps: [
        `\\int x\\sqrt{x + ${c}}\\,dx = \\int \\left(u - ${c}\\right)\\sqrt{u}\\,du`,
        `= \\int \\left(u^{\\frac{3}{2}} - ${c}u^{\\frac{1}{2}}\\right)du`,
        `= \\tfrac{2}{5}u^{\\frac{5}{2}} - ${tfrac(2 * c, 3)}u^{\\frac{3}{2}} + C`,
        `\\text{then put } u = x + ${c} \\text{ back}`,
      ],
    };
  },

  'by-parts': (rng) => {
    const k = rng.int(1, 5);
    return rng.pick([
      {
        given: `u = ${coeff(k, 'x')},\\quad v' = e^{x}`,
        steps: [
          `\\int ${coeff(k, 'x')}e^{x}\\,dx = ${coeff(k, 'x')}e^{x} - \\int ${k}e^{x}\\,dx`,
          `= ${coeff(k, 'x')}e^{x} - ${k}e^{x} + C`,
        ],
      },
      {
        given: 'u = \\ln x,\\quad v\' = 1',
        steps: [
          '\\int \\ln x\\,dx = x\\ln x - \\int x\\cdot\\frac{1}{x}\\,dx',
          '= x\\ln x - x + C',
        ],
      },
    ]);
  },

  'partial-fractions': (rng) => {
    const p = rng.int(1, 4);
    const q = p + rng.int(1, 4);
    return {
      given: `p = ${p},\\quad q = ${q}`,
      steps: [
        `\\frac{1}{\\left(x - ${p}\\right)\\left(x - ${q}\\right)} = ${frac(1, p - q)}\\left(\\frac{1}{x - ${p}} - \\frac{1}{x - ${q}}\\right)`,
        `\\int \\frac{dx}{\\left(x - ${p}\\right)\\left(x - ${q}\\right)} = ${frac(1, p - q)}\\ln\\left|\\frac{x - ${p}}{x - ${q}}\\right| + C`,
      ],
    };
  },

  'polynomial-division': (rng) => {
    const d = rng.int(1, 5);
    const e = rng.int(1, 5);
    const r = rng.int(1, 6);
    // (x + d)(x + e) + r, so the division comes out with remainder r.
    const b = d + e;
    const c = d * e + r;
    return {
      given: `N(x) = ${terms([[1, 'x^{2}'], [b, 'x'], [c, '']])},\\quad D(x) = x + ${d}`,
      steps: [
        `\\frac{${terms([[1, 'x^{2}'], [b, 'x'], [c, '']])}}{x + ${d}} = x + ${e} + \\frac{${r}}{x + ${d}}`,
        `\\text{now every piece has a rule}`,
      ],
    };
  },

  'total-area': (rng) => {
    const c = rng.int(1, 3);
    return {
      given: `y = ${terms([[1, 'x^{2}'], [-(c * c), '']])} \\text{ on } [0, ${2 * c}]`,
      steps: [
        `\\text{it crosses at } x = ${c}`,
        `A = \\int_{0}^{${c}}\\left(${terms([[c * c, ''], [-1, 'x^{2}']])}\\right)dx + \\int_{${c}}^{${2 * c}}\\left(${terms([[1, 'x^{2}'], [-(c * c), '']])}\\right)dx`,
        `= ${frac(2 * c ** 3, 3)} + ${frac(4 * c ** 3, 3)} = ${2 * c ** 3}`,
      ],
    };
  },

  'area-about-y': (rng) => {
    const k = rng.int(1, 4);
    const d = rng.int(2, 3);
    return {
      given: `x = ${terms([[1, 'y^{2}'], [k, '']])},\\quad y \\text{ from } 0 \\text{ to } ${d}`,
      steps: [
        `A = \\int_{0}^{${d}}\\left(${terms([[1, 'y^{2}'], [k, '']])}\\right)dy`,
        `= \\left[\\frac{y^{3}}{3} + ${k}y\\right]_{0}^{${d}} = ${frac(d ** 3 + 3 * k * d, 3)}`,
      ],
    };
  },

  'arctan-antiderivative': (rng) => {
    const b = rng.nonZero(-4, 4);
    const d = rng.int(2, 3);
    return {
      given: `\\int \\frac{1}{${terms([[1, 'x^{2}'], [2 * b, 'x'], [b * b + d * d, '']])}}\\,dx`,
      steps: [
        `= \\int \\frac{1}{\\left(x${plus(b)}\\right)^{2} + ${d * d}}\\,dx`,
        `= \\frac{1}{${d}}\\arctan\\left(\\frac{x${plus(b)}}{${d}}\\right) + C`,
      ],
    };
  },
};
