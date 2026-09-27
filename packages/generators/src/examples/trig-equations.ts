import { type Build, frac, tfrac, plus, coeff, terms, piFrac } from './format.js';

/** Trigonometry and equations: chapters 7 and 8. */
export const TRIG_AND_EQUATIONS: Record<string, Build> = {
  radians: (rng) => {
    const deg = rng.pick([30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330]);
    return {
      steps: [
        `${deg}^\\circ = ${deg}\\cdot\\frac{\\pi}{180} = ${piFrac(deg)}\\ \\text{rad}`,
        `${piFrac(deg)}\\ \\text{rad} = ${piFrac(deg)}\\cdot\\frac{180}{\\pi} = ${deg}^\\circ`,
      ],
    };
  },

  'pythagorean-identity': (rng) => {
    const [o, adj, h] = rng.pick([
      [3, 4, 5],
      [4, 3, 5],
      [5, 12, 13],
      [12, 5, 13],
      [8, 15, 17],
      [7, 24, 25],
    ] as const);
    return {
      given: `\\sin x = ${tfrac(o, h)}`,
      steps: [
        `\\cos^{2}x = 1 - \\sin^{2}x = 1 - ${tfrac(o * o, h * h)}`,
        `= ${tfrac(h * h - o * o, h * h)} \\Rightarrow \\cos x = \\pm ${tfrac(adj, h)}`,
      ],
    };
  },

  'double-angle': (rng) =>
    rng.pick([
      {
        given: 'x = \\tfrac{\\pi}{6}',
        steps: [
          '\\sin\\tfrac{\\pi}{3} = 2\\sin\\tfrac{\\pi}{6}\\cos\\tfrac{\\pi}{6} = 2\\cdot\\tfrac{1}{2}\\cdot\\tfrac{\\sqrt{3}}{2} = \\tfrac{\\sqrt{3}}{2}',
          '\\cos\\tfrac{\\pi}{3} = 1 - 2\\sin^{2}\\tfrac{\\pi}{6} = 1 - 2\\cdot\\tfrac{1}{4} = \\tfrac{1}{2}',
        ],
      },
      {
        given: 'x = \\tfrac{\\pi}{4}',
        steps: [
          '\\sin\\tfrac{\\pi}{2} = 2\\sin\\tfrac{\\pi}{4}\\cos\\tfrac{\\pi}{4} = 2\\cdot\\tfrac{\\sqrt{2}}{2}\\cdot\\tfrac{\\sqrt{2}}{2} = 1',
          '\\cos\\tfrac{\\pi}{2} = 1 - 2\\sin^{2}\\tfrac{\\pi}{4} = 1 - 2\\cdot\\tfrac{1}{2} = 0',
        ],
      },
      {
        given: 'x = \\tfrac{\\pi}{3}',
        steps: [
          '\\sin\\tfrac{2\\pi}{3} = 2\\sin\\tfrac{\\pi}{3}\\cos\\tfrac{\\pi}{3} = 2\\cdot\\tfrac{\\sqrt{3}}{2}\\cdot\\tfrac{1}{2} = \\tfrac{\\sqrt{3}}{2}',
          '\\cos\\tfrac{2\\pi}{3} = 1 - 2\\sin^{2}\\tfrac{\\pi}{3} = 1 - 2\\cdot\\tfrac{3}{4} = -\\tfrac{1}{2}',
        ],
      },
    ]),

  'exact-values': (rng) =>
    rng.pick([
      {
        given: 'x = \\tfrac{\\pi}{6} = 30^\\circ',
        steps: [
          '\\sin\\tfrac{\\pi}{6} = \\tfrac{1}{2},\\quad \\cos\\tfrac{\\pi}{6} = \\tfrac{1}{2}\\sqrt{3}',
          '\\tan\\tfrac{\\pi}{6} = \\frac{1/2}{\\sqrt{3}/2} = \\tfrac{1}{3}\\sqrt{3}',
        ],
      },
      {
        given: 'x = \\tfrac{\\pi}{4} = 45^\\circ',
        steps: [
          '\\sin\\tfrac{\\pi}{4} = \\tfrac{1}{2}\\sqrt{2},\\quad \\cos\\tfrac{\\pi}{4} = \\tfrac{1}{2}\\sqrt{2}',
          '\\tan\\tfrac{\\pi}{4} = 1',
        ],
      },
      {
        given: 'x = \\tfrac{\\pi}{3} = 60^\\circ',
        steps: [
          '\\sin\\tfrac{\\pi}{3} = \\tfrac{1}{2}\\sqrt{3},\\quad \\cos\\tfrac{\\pi}{3} = \\tfrac{1}{2}',
          '\\tan\\tfrac{\\pi}{3} = \\sqrt{3}',
        ],
      },
    ]),

  'quadratic-formula': (rng) => {
    const r1 = rng.nonZero(-6, 6);
    // r2 = -r1 would put a bare `+ 0x` in the middle of the equation.
    const r2 = rng.pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6].filter((n) => n !== -r1));
    const b = -(r1 + r2);
    const c = r1 * r2;
    const disc = b * b - 4 * c;
    return {
      given: `a = 1,\\quad b = ${b},\\quad c = ${c}`,
      steps: [
        `${terms([[1, 'x^{2}'], [b, 'x'], [c, '']])} = 0`,
        `x = \\frac{${-b} \\pm \\sqrt{${b * b} - ${4 * c < 0 ? `(${4 * c})` : 4 * c}}}{2} = \\frac{${-b} \\pm \\sqrt{${disc}}}{2}`,
        r1 === r2
          ? `x = ${r1} \\text{ (twice)}`
          : `x = ${Math.max(r1, r2)} \\ \\text{or}\\ x = ${Math.min(r1, r2)}`,
      ],
    };
  },

  'linear-solve': (rng) => {
    const a = rng.nonZero(-6, 6);
    // The gap between the two x-coefficients is what gets divided by, so it is
    // drawn first and c follows from it — a = c has no solution to show.
    // A gap of ±1 makes the collecting step read `x = -8` and the line after
    // it say the same thing again.
    const gap = rng.pick([-8, -7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8]);
    const c = a - gap;
    const x = rng.nonZero(-8, 8);
    const b = rng.nonZero(-12, 12);
    const d = gap * x + b;
    return {
      given: `a = ${a},\\quad b = ${b},\\quad c = ${c},\\quad d = ${d}`,
      steps: [
        `${terms([[a, 'x'], [b, '']])} = ${terms([[c, 'x'], [d, '']])}`,
        `${coeff(gap, 'x')} = ${d - b}`,
        `x = \\frac{${d - b}}{${gap}} = ${x}`,
      ],
    };
  },

  'addition-formulas': (rng) =>
    rng.pick([
      {
        given: 'u = x,\\quad v = \\tfrac{\\pi}{6}',
        steps: [
          '\\sin\\left(x + \\tfrac{\\pi}{6}\\right) = \\sin x\\cos\\tfrac{\\pi}{6} + \\cos x\\sin\\tfrac{\\pi}{6}',
          '= \\tfrac{1}{2}\\sqrt{3}\\sin x + \\tfrac{1}{2}\\cos x',
        ],
      },
      {
        given: 'u = x,\\quad v = \\tfrac{\\pi}{4}',
        steps: [
          '\\cos\\left(x + \\tfrac{\\pi}{4}\\right) = \\cos x\\cos\\tfrac{\\pi}{4} - \\sin x\\sin\\tfrac{\\pi}{4}',
          '= \\tfrac{1}{2}\\sqrt{2}\\left(\\cos x - \\sin x\\right)',
        ],
      },
      {
        given: 'u = \\tfrac{\\pi}{4},\\quad v = \\tfrac{\\pi}{6}',
        steps: [
          '\\sin\\tfrac{5\\pi}{12} = \\sin\\tfrac{\\pi}{4}\\cos\\tfrac{\\pi}{6} + \\cos\\tfrac{\\pi}{4}\\sin\\tfrac{\\pi}{6}',
          '= \\tfrac{1}{4}\\left(\\sqrt{6} + \\sqrt{2}\\right)',
        ],
      },
    ]),

  'shift-identities': (rng) =>
    rng.pick([
      {
        given: 'x = \\tfrac{\\pi}{6}',
        steps: [
          '\\sin\\left(-\\tfrac{\\pi}{6}\\right) = -\\sin\\tfrac{\\pi}{6} = -\\tfrac{1}{2}',
          '\\cos\\left(-\\tfrac{\\pi}{6}\\right) = \\cos\\tfrac{\\pi}{6} = \\tfrac{1}{2}\\sqrt{3}',
        ],
      },
      {
        given: 'x = \\tfrac{\\pi}{3}',
        steps: [
          '\\sin\\left(\\tfrac{\\pi}{3} + \\pi\\right) = -\\sin\\tfrac{\\pi}{3} = -\\tfrac{1}{2}\\sqrt{3}',
          '\\cos\\left(\\tfrac{\\pi}{2} - \\tfrac{\\pi}{3}\\right) = \\sin\\tfrac{\\pi}{3} = \\tfrac{1}{2}\\sqrt{3}',
        ],
      },
    ]),

  'trig-equation': (rng) => {
    const deg = rng.pick([30, 45, 60]);
    const value = deg === 30 ? '\\tfrac{1}{2}' : deg === 45 ? '\\tfrac{1}{2}\\sqrt{2}' : '\\tfrac{1}{2}\\sqrt{3}';
    return {
      given: `\\sin x = ${value} \\text{ on } [0, 2\\pi)`,
      steps: [
        `x = ${piFrac(deg)} \\quad\\text{or}\\quad x = ${piFrac(180 - deg)}`,
        `\\text{both have the same height on the unit circle}`,
      ],
    };
  },

  'inequality': (rng) => {
    const a = -rng.int(2, 6);
    const x = rng.nonZero(-6, 6);
    const b = rng.nonZero(-9, 9);
    const c = a * x + b;
    return {
      given: `${terms([[a, 'x'], [b, '']])} > ${c}`,
      steps: [
        `${coeff(a, 'x')} > ${c - b}`,
        `x < ${frac(c - b, a)}`,
        `\\text{dividing by } ${a} \\text{ turned the sign round}`,
      ],
    };
  },

  'completing-square': (rng) => {
    const half = rng.nonZero(-5, 5);
    const b = 2 * half;
    const c = rng.nonZero(-12, 12);
    return {
      given: `b = ${b},\\quad c = ${c}`,
      steps: [
        `${terms([[1, 'x^{2}'], [b, 'x'], [c, '']])} = \\left(x${plus(half)}\\right)^{2} - ${half * half}${plus(c)}`,
        `= \\left(x${plus(half)}\\right)^{2}${plus(c - half * half)}`,
        `\\text{lowest point at } x = ${-half}`,
      ],
    };
  },

  'linear-system': (rng) => {
    const x = rng.nonZero(-5, 5);
    const y = rng.nonZero(-5, 5);
    const a = rng.int(1, 4);
    const b = rng.int(1, 4);
    const d = rng.int(1, 4);
    const e = -rng.int(1, 4);
    return {
      given: `x = ${x},\\quad y = ${y} \\text{ (what the system hides)}`,
      steps: [
        `${terms([[a, 'x'], [b, 'y']])} = ${a * x + b * y}`,
        `${terms([[d, 'x'], [e, 'y']])} = ${d * x + e * y}`,
        `${coeff(a * e - b * d, 'x')} = ${e * (a * x + b * y) - b * (d * x + e * y)} \\Rightarrow x = ${x},\\ y = ${y}`,
      ],
    };
  },
};
