import { answer, aside, frac, fracTex, gcd, poly, power, setup, step, sum, term, times } from '../authoring.js';
import type { Draft, Generator, Latex, Rng, Step } from '../types.js';

/*
 * Integration by parts. The medium tier is one round of it; the hard tier is
 * what the practice exams ask: x²eˣ, which takes two rounds, ln x over a power,
 * and eᵃˣ against a sine, which comes back to where it started.
 */

/** One application of ∫u dv = uv − ∫v du, and what the integral reads as after it. */
interface Round {
  u: Latex;
  dv: Latex;
  after: Latex;
}

interface Parts {
  integrand: Latex;
  rounds: Round[];
  anti: Latex;
  /** Why this choice of u — shown against the first split. */
  why: string;
  /** For an integral that comes back: the line that gathers it on one side. */
  gathered?: Latex;
}

/** `2x`, `x`, `-x`: the variable scaled, as it sits in an exponent. */
const scaled = (a: number): Latex => (a === 1 ? 'x' : a === -1 ? '-x' : `${a}x`);

/**
 * A trig function of `ax`. The argument always gets brackets unless it is a bare
 * x: `paren` counts `-x` as one atom, which would print `\cos-x`.
 */
const trig = (fn: string, a: number): Latex =>
  a === 1 ? `\\${fn} x` : `\\${fn}\\left(${scaled(a)}\\right)`;

const X_IS_U = 'The power of $x$ is the part that gets simpler when differentiated, so it is $u$.';

/** x e^{ax}. */
function xExp(rng: Rng): Parts {
  const a = rng.nonZero(-4, 4);
  const e = `e^{${scaled(a)}}`;
  const uv = times(fracTex(1, a), `x${e}`);
  return {
    integrand: `x${e}`,
    rounds: [{ u: 'x', dv: `${e}\\,dx`, after: sum([uv, times(fracTex(-1, a), `\\int ${e}\\,dx`)]) }],
    anti: sum([uv, times(fracTex(-1, a * a), e)]),
    why: X_IS_U,
  };
}

/** x sin(ax) or x cos(ax). Either way the leftover integrates back to the same function over a². */
function xTrig(rng: Rng): Parts {
  const a = rng.int(1, 4);
  const fn = rng.pick(['sin', 'cos']);
  // v = ∫fn(ax) dx = (s/a)·other(ax)
  const [other, s] = fn === 'sin' ? ['cos', -1] : ['sin', 1];
  const uv = times(fracTex(s, a), `x${trig(other, a)}`);
  return {
    integrand: `x${trig(fn, a)}`,
    rounds: [
      {
        u: 'x',
        dv: `${trig(fn, a)}\\,dx`,
        after: sum([uv, times(fracTex(-s, a), `\\int ${trig(other, a)}\\,dx`)]),
      },
    ],
    anti: sum([uv, times(fracTex(1, a * a), trig(fn, a))]),
    why: X_IS_U,
  };
}

/** x² e^{ax}: the same split twice, each round taking one power of x away. */
function xSquaredExp(rng: Rng): Parts {
  const a = rng.nonZero(-3, 3);
  const e = `e^{${scaled(a)}}`;
  const first = times(fracTex(1, a), `x^{2}${e}`);
  // e^{ax}(a²x² − 2ax + 2)/a³, with the 2 that an even a shares taken out.
  const g = a % 2 === 0 ? 2 : 1;
  const den = (a * a * a) / g;
  const body = `${e}\\left(${poly([[(a * a) / g, 2], [(-2 * a) / g, 1], [2 / g, 0]])}\\right)`;
  const whole = Math.abs(den) === 1 ? body : frac(body, String(Math.abs(den)));
  return {
    integrand: `x^{2}${e}`,
    rounds: [
      { u: 'x^{2}', dv: `${e}\\,dx`, after: sum([first, times(fracTex(-2, a), `\\int x${e}\\,dx`)]) },
      {
        u: 'x',
        dv: `${e}\\,dx`,
        after: sum([first, times(fracTex(-2, a * a), `x${e}`), times(fracTex(2, a * a), `\\int ${e}\\,dx`)]),
      },
    ],
    anti: den < 0 ? `-${whole}` : whole,
    why: 'The power of $x$ gets simpler when differentiated, so it is $u$ — but $x^{2}$ takes two rounds to go.',
  };
}

/** `c / (j x^k)` as one fraction; j = 1 leaves the bare power. */
const overPower = (top: Latex, j: number, k: number): Latex => frac(top, term(j, power('x', k)));

/** The pieces of ∫ xⁿ ln x: u·v, the integral left over, and what that integrates to. */
interface LogShape {
  integrand: Latex;
  dv: Latex;
  uv: Latex;
  rest: Latex;
  tail: Latex;
}

/** One shape per sign of n, with m = n + 1: ln x alone, a power on top, or underneath. */
function logShape(n: number): LogShape {
  const m = n + 1;
  if (n === 0) {
    return { integrand: '\\ln x', dv: 'dx', uv: 'x\\ln x', rest: '-\\int 1\\,dx', tail: '-x' };
  }
  if (n > 0) {
    return {
      integrand: `${power('x', n)}\\ln x`,
      dv: `${power('x', n)}\\,dx`,
      uv: `${frac(power('x', m), String(m))}\\ln x`,
      rest: `-\\int ${frac(power('x', n), String(m))}\\,dx`,
      tail: `-${frac(power('x', m), String(m * m))}`,
    };
  }
  const j = -m;
  return {
    integrand: overPower('\\ln x', 1, -n),
    dv: frac('dx', power('x', -n)),
    uv: `-${overPower('\\ln x', j, j)}`,
    rest: `\\int ${overPower('1', j, -n)}\\,dx`,
    tail: `-${overPower('1', j * j, j)}`,
  };
}

/**
 * xⁿ ln x, with n = 0 being ln x on its own and a negative n putting the power
 * underneath. Always u = ln x: ∫ = xᵐ/m · ln x − xᵐ/m², m = n + 1.
 */
function logPower(rng: Rng, powers: readonly number[]): Parts {
  const n = rng.pick(powers);
  const s = logShape(n);
  return {
    integrand: s.integrand,
    rounds: [{ u: '\\ln x', dv: s.dv, after: sum([s.uv, s.rest]) }],
    anti: sum([s.uv, s.tail]),
    why:
      n === 0
        ? 'There is no product to split until you treat the whole integrand as $u$ against $dv = dx$.'
        : 'The logarithm has the simple derivative and the power integrates easily, so $u = \\ln x$.',
  };
}

/**
 * e^{ax} against sin(bx) or cos(bx). Neither factor ever gets simpler: two
 * rounds bring the integral back, and it is solved for like an unknown.
 */
function expTrig(rng: Rng): Parts {
  const a = rng.pick([1, 2, 3, 4, -1, -2]);
  const b = rng.int(1, 3);
  const fn = rng.pick(['sin', 'cos']);
  // d/dx fn(bx) = σ·b·other(bx)
  const [other, sigma] = fn === 'sin' ? ['cos', 1] : ['sin', -1];
  const e = `e^{${scaled(a)}}`;
  const first = times(fracTex(1, a), `${e}${trig(fn, b)}`);
  const second = times(fracTex(-sigma * b, a * a), `${e}${trig(other, b)}`);

  const g = gcd(a, b);
  const inner = sum([term(a / g, trig(fn, b)), term((-sigma * b) / g, trig(other, b))]);
  return {
    integrand: `${e}${trig(fn, b)}`,
    rounds: [
      {
        u: trig(fn, b),
        dv: `${e}\\,dx`,
        after: `I = ${sum([first, times(fracTex(-sigma * b, a), `\\int ${e}${trig(other, b)}\\,dx`)])}`,
      },
      {
        u: trig(other, b),
        dv: `${e}\\,dx`,
        after: `I = ${sum([first, second, times(fracTex(-b * b, a * a), 'I')])}`,
      },
    ],
    anti: frac(`${e}\\left(${inner}\\right)`, String((a * a + b * b) / g)),
    why: 'Neither factor gets simpler. Call the integral $I$ and keep the exponential as $dv$ both times.',
    gathered: `${fracTex(a * a + b * b, a * a)}I = ${sum([first, second])}`,
  };
}

const MEDIUM = [xExp, xTrig, (rng: Rng) => logPower(rng, [0, 1])];
const HARD = [xSquaredExp, expTrig, (rng: Rng) => logPower(rng, [2, -2, -3])];

function working(p: Parts): Step[] {
  const rounds = p.rounds.flatMap((r, i) => [
    setup('by-parts', i === 0 ? 'Split the product' : 'Split it again', `u = ${r.u},\\quad dv = ${r.dv}`, i === 0 ? p.why : undefined),
    setup('by-parts', 'Integrate by parts', r.after),
  ]);
  if (!p.gathered) return [...rounds, step('by-parts', 'Integrate what is left', p.anti)];
  return [
    ...rounds,
    aside('The integral came back', p.gathered, 'Move the $I$ on the right across.'),
    step('by-parts', 'Solve for the integral', p.anti),
  ];
}

export const byParts: Generator = {
  id: 'anti.by-parts',
  chapter: 10,
  title: 'Integration by parts',
  tags: ['antiderivative', 'by-parts'],
  version: 2,
  supports: ['medium', 'hard'],
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const p = rng.pick(tier === 'hard' ? HARD : MEDIUM)(rng);
    const result = `${p.anti} + C`;
    return {
      instruction: 'Find the antiderivative',
      prompt: `\\int ${p.integrand}\\,dx`,
      note: 'Do not forget the constant of integration.',
      answers: [answer(result, { keyboard: 'calculus', requires: { plusC: true }, upToConstant: true })],
      solution: [...working(p), step('plus-c', 'Add the constant', result)],
      ruleIds: ['by-parts', 'plus-c'],
      verify: { kind: 'antiderivative', of: p.integrand, wrt: 'x' },
    };
  },
};
