import { RULES } from './rules.js';
import type { Rng } from './types.js';

/**
 * A rule card states the shape; this fills the letters in. `(a+b)(a-b)=a^2-b^2`
 * is a thing to nod at, and `53\cdot 47 = 2500 - 9` is the thing that makes it
 * worth remembering — so every card can show one, and roll a fresh one when the
 * numbers he happened to get were not the ones that made it land.
 *
 * These are written out by hand rather than pulled from the generators: a rule
 * is not a topic, several rules share one generator and several generators
 * share one rule, and an example that demonstrates *this* card is a different
 * thing from a problem that happens to use it.
 */
export interface RuleExample {
  /** What the card's letters stand for here. Omitted where it has none. */
  given?: string;
  /** The working, one LaTeX line per row. */
  steps: string[];
}

// ------------------------------------------------------------------ helpers

function gcd(a: number, b: number): number {
  let [x, y] = [Math.abs(a), Math.abs(b)];
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

/** A fraction in lowest terms, written as an integer when it is one. */
function frac(n: number, d: number): string {
  const s = d < 0 ? -1 : 1;
  const [num, den] = [s * n, s * d];
  const g = gcd(num, den);
  return den / g === 1 ? String(num / g) : `\\frac{${num / g}}{${den / g}}`;
}

/** The same, small — for a fraction sitting inline in a longer line. */
function tfrac(n: number, d: number): string {
  return frac(n, d).replace('\\frac', '\\tfrac');
}

/** ` + 3` or ` - 3`, for a term joining an expression. */
function plus(n: number): string {
  return n < 0 ? ` - ${-n}` : ` + ${n}`;
}

/** A number safe to put after an operator: negatives get their own brackets. */
function signed(n: number): string {
  return n < 0 ? `\\left(${n}\\right)` : String(n);
}

/** `3x`, `-x`, `x` — a coefficient in front of a symbol. */
function coeff(n: number, sym: string): string {
  if (n === 1) return sym;
  if (n === -1) return `-${sym}`;
  return `${n}${sym}`;
}

/** `x^{4}`, dropping the exponent when it is 1. */
function pow(base: string, n: number | string): string {
  return n === 1 ? base : `${base}^{${n}}`;
}

/** Joins signed terms, skipping the zero ones: `2 - x - x^{2}`. */
function terms(parts: Array<[number, string]>): string {
  let out = '';
  for (const [c, sym] of parts) {
    if (c === 0) continue;
    const body = sym ? coeff(Math.abs(c), sym) : String(Math.abs(c));
    if (out === '') out = c < 0 ? `-${body}` : body;
    else out += c < 0 ? ` - ${body}` : ` + ${body}`;
  }
  return out || '0';
}

/** A multiple of π as a fraction of it: `\frac{3\pi}{4}`, `2\pi`, `\pi`. */
function piFrac(deg: number): string {
  const g = gcd(deg, 180);
  const [n, d] = [deg / g, 180 / g];
  const top = n === 1 ? '\\pi' : `${n}\\pi`;
  return d === 1 ? top : `\\frac{${top}}{${d}}`;
}

// ------------------------------------------------------------------ examples

type Build = (rng: Rng) => RuleExample;

const EXAMPLES: Record<string, Build> = {
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

/**
 * A worked instance of the rule, or nothing if the card has no example written
 * for it yet. The caller owns the rng, so "randomise" is one more draw from it.
 */
export function ruleExample(id: string, rng: Rng): RuleExample | undefined {
  return EXAMPLES[id]?.(rng);
}

/** Every card that can show one. Used by the test that keeps this list complete. */
export const RULES_WITH_EXAMPLES: readonly string[] = RULES.map((r) => r.id).filter(
  (id) => id in EXAMPLES,
);
