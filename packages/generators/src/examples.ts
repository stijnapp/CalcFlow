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
