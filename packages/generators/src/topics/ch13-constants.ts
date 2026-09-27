import { answer, aside, fracTex, setup, term } from '../authoring.js';
import type { Draft, Generator, Latex, Rng, Step } from '../types.js';

/*
 * Five of the six practice exams have this one: a limit with its value given
 * and two or three natural numbers missing from the top, found by insisting it
 * come out. The bottom goes to 0, so the top has to as well — that is one
 * equation. l'Hôpital, and the new top has to vanish too — another. One more
 * round gives the value. The course's own solutions go exactly that way, so the
 * worked steps here do too.
 */

interface Template {
  /** The limit, with the letters in. */
  top: Latex;
  bottom: Latex;
  /** Where x goes, as LaTeX and as a number for the check. */
  at: Latex;
  point: number;
  /** The top with the numbers put in, for the numeric check. */
  filled: Latex;
  value: number;
  /** Letter → natural number. */
  unknowns: Record<string, number>;
  steps: Step[];
}

const lim = (at: Latex) => `\\lim_{x\\to ${at}}`;

const vanish = (expr: Latex, note?: string): Step =>
  setup('limit-constants', 'The top has to vanish', expr, note ?? 'The bottom goes to $0$. If the top did not, the fraction would blow up instead of settling.');

/** e^{kx} − Ax + B − C cos x over x². The 2025 exam, with other numbers. */
function expCos(rng: Rng): Template {
  const k = rng.int(2, 4);
  const C = rng.pick([2, 3, 4, 5, 6, 7].filter((c) => (c - k * k) % 2 === 0));
  const [A, B] = [k, C - 1];
  const value = (k * k + C) / 2;
  const e = `e^{${k}x}`;
  return {
    top: `${e} - Ax + B - C\\cos x`,
    bottom: 'x^{2}',
    at: '0',
    point: 0,
    filled: `${e} - ${term(A, 'x')} + ${B} - ${term(C, '\\cos x')}`,
    value,
    unknowns: { A, B, C },
    steps: [
      vanish('e^{0} - 0 + B - C\\cos 0 = 1 + B - C = 0'),
      setup('lhopital', "l'Hôpital", `${lim('0')}\\frac{${k}${e} - A + C\\sin x}{2x}`, 'Now it is $\\frac{0}{0}$: differentiate the top and the bottom, each on its own.'),
      aside('That top vanishes too', `${k} - A = 0`),
      setup('lhopital', "l'Hôpital again", `${lim('0')}\\frac{${k * k}${e} + C\\cos x}{2} = \\frac{${k * k} + C}{2} = ${fracTex(value * 2, 2)}`),
      aside('Solve', `A = ${A},\\quad C = ${C},\\quad B = C - 1 = ${B}`),
    ],
  };
}

/** ln(A sin x + 1) + e^{Bx} + ½x² − mx − C over x². The October 2023 one. */
function logSine(rng: Rng): Template {
  const A = rng.int(1, 4);
  // B − A odd makes B² − A² odd, and the value whole.
  const B = rng.pick([A + 1, A + 3, A + 5].filter((b) => b <= 7));
  const m = A + B;
  const value = (B * B - A * A + 1) / 2;
  return {
    top: `\\ln\\left(A\\sin x + 1\\right) + e^{Bx} + \\frac{1}{2}x^{2} - ${m}x - C`,
    bottom: 'x^{2}',
    at: '0',
    point: 0,
    filled: `\\ln\\left(${term(A, '\\sin x')} + 1\\right) + e^{${term(B, 'x')}} + \\frac{1}{2}x^{2} - ${m}x - 1`,
    value,
    unknowns: { A, B, C: 1 },
    steps: [
      vanish('\\ln 1 + e^{0} + 0 - 0 - C = 1 - C = 0'),
      setup('lhopital', "l'Hôpital", `${lim('0')}\\frac{\\frac{A\\cos x}{A\\sin x + 1} + Be^{Bx} + x - ${m}}{2x}`, 'The chain rule on the log gives $\\frac{A\\cos x}{A\\sin x + 1}$.'),
      aside('That top vanishes too', `A + B - ${m} = 0`),
      setup('lhopital', "l'Hôpital again", `${lim('0')}\\frac{-\\frac{A^{2} + A\\sin x}{\\left(A\\sin x + 1\\right)^{2}} + B^{2}e^{Bx} + 1}{2} = \\frac{B^{2} - A^{2} + 1}{2} = ${value}`, 'The quotient rule on the first term, tidied with $\\sin^{2}x + \\cos^{2}x = 1$.'),
      aside('Solve', `B^{2} - A^{2} = (B - A)(B + A) = ${2 * value - 1},\\quad B + A = ${m} \\Rightarrow B - A = ${(2 * value - 1) / m}`),
      aside('So', `A = ${A},\\quad B = ${B},\\quad C = 1`),
    ],
  };
}

/** Ax² + B ln x + C − mx over (x − 1)². The second 2025 exam. */
function atOne(rng: Rng): Template {
  const m = rng.int(4, 9);
  const A = rng.int(1, Math.floor((m - 1) / 2));
  const [B, C] = [m - 2 * A, m - A];
  const value = (2 * A - B) / 2;
  return {
    top: `Ax^{2} + B\\ln x + C - ${m}x`,
    bottom: '\\left(x - 1\\right)^{2}',
    at: '1',
    point: 1,
    filled: `${term(A, 'x^{2}')} + ${term(B, '\\ln x')} + ${C} - ${m}x`,
    value,
    unknowns: { A, B, C },
    steps: [
      vanish(`A + B\\ln 1 + C - ${m} = A + C - ${m} = 0`),
      setup('lhopital', "l'Hôpital", `${lim('1')}\\frac{2Ax + \\frac{B}{x} - ${m}}{2\\left(x - 1\\right)}`),
      aside('That top vanishes too', `2A + B - ${m} = 0`),
      setup('lhopital', "l'Hôpital again", `${lim('1')}\\frac{2A - \\frac{B}{x^{2}}}{2} = \\frac{2A - B}{2} = ${fracTex(2 * A - B, 2)}`),
      aside('Solve', `2A - B = ${2 * A - B},\\quad 2A + B = ${m} \\Rightarrow A = ${A},\\quad B = ${B},\\quad C = ${m} - A = ${C}`),
    ],
  };
}

/** Ae^{sin x} + B cos x + C(x − π) over (x − π)². The second 2023 exam. */
function atPi(rng: Rng): Template {
  const k = rng.pick([0, 0, 1, 2]);
  const A = rng.int(k + 1, k + 4);
  const [B, C] = [A - k, A];
  const value = (A + B) / 2;
  const shift = k ? ` - ${k}` : '';
  return {
    top: `Ae^{\\sin x} + B\\cos x + C\\left(x - \\pi\\right)${shift}`,
    bottom: '\\left(x - \\pi\\right)^{2}',
    at: '\\pi',
    point: Math.PI,
    filled: `${term(A, 'e^{\\sin x}')} + ${term(B, '\\cos x')} + ${term(C, '\\left(x - \\pi\\right)')}${shift}`,
    value,
    unknowns: { A, B, C },
    steps: [
      vanish(`Ae^{\\sin \\pi} + B\\cos \\pi + 0${shift} = A - B${shift} = 0`),
      setup('lhopital', "l'Hôpital", `${lim('\\pi')}\\frac{A\\cos x\\,e^{\\sin x} - B\\sin x + C}{2\\left(x - \\pi\\right)}`),
      aside('That top vanishes too', '-A + C = 0'),
      setup('lhopital', "l'Hôpital again", `${lim('\\pi')}\\frac{A\\left(\\cos^{2}x - \\sin x\\right)e^{\\sin x} - B\\cos x}{2} = \\frac{A + B}{2} = ${fracTex(A + B, 2)}`, 'At $\\pi$: $\\cos^{2}\\pi = 1$, $\\sin\\pi = 0$, $\\cos\\pi = -1$.'),
      aside('Solve', `A + B = ${A + B},\\quad A - B = ${k} \\Rightarrow A = ${A},\\quad B = ${B},\\quad C = A = ${C}`),
    ],
  };
}

/** A sin x − ln(1 + kx) + B cos x − C over x². */
function sineLog(rng: Rng): Template {
  const k = rng.int(2, 4);
  const B = rng.pick(Array.from({ length: k * k - 1 }, (_, i) => i + 1).filter((b) => (k * k - b) % 2 === 0));
  const [A, C] = [k, B];
  const value = (k * k - B) / 2;
  return {
    top: `A\\sin x - \\ln\\left(1 + ${k}x\\right) + B\\cos x - C`,
    bottom: 'x^{2}',
    at: '0',
    point: 0,
    filled: `${term(A, '\\sin x')} - \\ln\\left(1 + ${k}x\\right) + ${term(B, '\\cos x')} - ${C}`,
    value,
    unknowns: { A, B, C },
    steps: [
      vanish('0 - \\ln 1 + B\\cos 0 - C = B - C = 0'),
      setup('lhopital', "l'Hôpital", `${lim('0')}\\frac{A\\cos x - \\frac{${k}}{1 + ${k}x} - B\\sin x}{2x}`),
      aside('That top vanishes too', `A - ${k} = 0`),
      setup('lhopital', "l'Hôpital again", `${lim('0')}\\frac{-A\\sin x + \\frac{${k * k}}{\\left(1 + ${k}x\\right)^{2}} - B\\cos x}{2} = \\frac{${k * k} - B}{2} = ${value}`),
      aside('Solve', `A = ${A},\\quad B = ${k * k} - ${2 * value} = ${B},\\quad C = B = ${C}`),
    ],
  };
}

/** Ax cos x − mx − B ln(1 + x) over x², with only two letters. The first 2024 exam. */
function twoLetters(rng: Rng): Template {
  const value = rng.int(1, 4);
  const m = rng.int(1, 4);
  const B = 2 * value;
  const A = m + B;
  return {
    top: `Ax\\cos x - ${term(m, 'x')} - B\\ln\\left(1 + x\\right)`,
    bottom: 'x^{2}',
    at: '0',
    point: 0,
    filled: `${term(A, 'x\\cos x')} - ${term(m, 'x')} - ${term(B, '\\ln\\left(1 + x\\right)')}`,
    value,
    unknowns: { A, B },
    steps: [
      vanish('A\\cdot 0 - 0 - B\\ln 1 = 0', 'The top goes to $0$ whatever $A$ and $B$ are, so this round gives no equation.'),
      setup('lhopital', "l'Hôpital", `${lim('0')}\\frac{A\\cos x - Ax\\sin x - ${m} - \\frac{B}{1 + x}}{2x}`),
      aside('That top has to vanish', `A - ${m} - B = 0`),
      setup('lhopital', "l'Hôpital again", `${lim('0')}\\frac{-2A\\sin x - Ax\\cos x + \\frac{B}{\\left(1 + x\\right)^{2}}}{2} = \\frac{B}{2} = ${value}`),
      aside('Solve', `B = ${B},\\quad A = ${m} + B = ${A}`),
    ],
  };
}

const TEMPLATES = [expCos, logSine, atOne, atPi, sineLog, twoLetters];

/** Natural numbers that make a limit come out: one equation per round of l'Hôpital. */
export const findConstants: Generator = {
  id: 'limits.find-constants',
  chapter: 13,
  title: 'Constants that make a limit come out',
  tags: ['limits', 'lhopital'],
  version: 1,
  supports: ['hard'],
  invariant: 'value-preserving',

  generate({ rng }): Draft {
    const t = rng.pick(TEMPLATES)(rng);
    const letters = Object.keys(t.unknowns);
    const listed = letters.length === 2 ? 'A and B' : 'A, B and C';
    return {
      instruction: `Find ${listed}`,
      prompt: `${lim(t.at)}\\frac{${t.top}}{${t.bottom}} = ${fracTex(t.value * 2, 2)}`,
      note: `${listed} are natural numbers.`,
      answers: letters.map((l) =>
        answer(String(t.unknowns[l]), { label: l, kind: 'number', keyboard: 'numeric' }),
      ),
      solution: t.steps,
      ruleIds: ['limit-constants', 'lhopital'],
      verify: {
        kind: 'limit',
        of: `\\frac{${t.filled}}{${t.bottom}}`,
        wrt: 'x',
        at: t.point,
        equals: fracTex(t.value * 2, 2),
      },
    };
  },
};
