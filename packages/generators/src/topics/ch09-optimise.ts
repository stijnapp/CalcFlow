import { answer, aside, frac, poly, setup } from '../authoring.js';
import type { AnswerSpec, Draft, Generator, Latex, Rng, Step, Verification } from '../types.js';

/*
 * Word problems that end in "as large as possible". The derivative is the easy
 * part; the exams give the marks for writing the quantity in one variable,
 * which is where these spend their working. The 2024 exam's prism and the
 * 2025 exam's trapezoid under a parabola are here as they were set.
 */

interface Optimum {
  instruction: string;
  text: string;
  given: Latex;
  answers: AnswerSpec[];
  steps: Step[];
  verify: Verification;
}

const num = (label: string, value: number): AnswerSpec =>
  answer(String(value), { label, keyboard: 'numeric', kind: 'number' });

/**
 * A prism on a right-angled triangle with sides px, qx, rx and length y, its
 * surface fixed. With area A = pq/2 and perimeter P = p + q + r per x, the
 * surface is 2Ax² + Pxy; choosing it as 6Am² puts the best x at m.
 */
function prism(rng: Rng): Optimum {
  const [p, q, r] = rng.pick([
    [3, 4, 5],
    [5, 12, 13],
  ] as const);
  const m = rng.int(1, 2);
  const A = (p * q) / 2;
  const P = p + q + r;
  const S = 6 * A * m * m;
  const y = (4 * A * m) / P;
  const V = A * m * m * y;
  // V(x) = Ax²·(S − 2Ax²)/(Px)
  const [c1, c3] = [(A * S) / P, (2 * A * A) / P];
  const V_x = poly([[-c3, 3], [c1, 1]]);
  return {
    instruction: 'Maximise the volume',
    text: `A prism has a right-angled triangle for its cross-section, with sides $${p}x$, $${q}x$ and $${r}x$ cm, and it is $y$ cm long. Its total surface area is $${S}$ cm². Find the $x$ and $y$ that make its volume as large as possible, and that volume.`,
    given: `\\text{sides } ${p}x,\\ ${q}x,\\ ${r}x,\\quad \\text{length } y,\\quad S = ${S}`,
    answers: [num('x', m), num('y', y), num('V', V)],
    steps: [
      aside('Name what to maximise', `V = ${A}x^{2}\\cdot y`, `The triangle's area is half the product of its two short sides.`),
      aside(
        'Use the surface to lose y',
        `${2 * A}x^{2} + ${P}xy = ${S} \\;\\Rightarrow\\; y = ${frac(`${S} - ${2 * A}x^{2}`, `${P}x`)}`,
        'Two triangles, and three rectangles as long as the prism.',
      ),
      setup('optimisation', 'One variable left', `V(x) = ${V_x}`),
      setup('stationary-point', "Set V' to zero", `V'(x) = ${poly([[-3 * c3, 2], [c1, 0]])} = 0 \\;\\Rightarrow\\; x = ${m}`, 'Only the positive root makes a prism.'),
      aside('Check it is a maximum', `V''(${m}) = ${-6 * c3 * m} < 0`),
      aside('The rest', `y = ${y},\\quad V = ${A}\\cdot ${m * m}\\cdot ${y} = ${V}`),
    ],
    verify: { kind: 'extremum', of: V_x, wrt: 'x', from: 0, to: Math.sqrt(S / (2 * A)), find: 'max', at: String(m), value: String(V) },
  };
}

/** A square sheet of side 6m with the corners cut out and folded: best cut m, volume 16m³. */
function openBox(rng: Rng): Optimum {
  const m = rng.int(1, 5);
  const L = 6 * m;
  const V_x = `x\\left(${L} - 2x\\right)^{2}`;
  return {
    instruction: 'Maximise the volume',
    text: `A square sheet of cardboard is $${L}$ cm on each side. A square of side $x$ cm is cut from every corner and the sides are folded up into an open box. Which $x$ gives the largest volume, and what is it?`,
    given: `\\text{sheet } ${L} \\times ${L},\\quad \\text{cut } x \\times x`,
    answers: [num('x', m), num('V', 16 * m ** 3)],
    steps: [
      aside('Name what to maximise', `V(x) = ${V_x}`, 'Each side of the base loses two cuts; the height is the cut.'),
      setup(
        'stationary-point',
        "Set V' to zero",
        `V'(x) = \\left(${L} - 2x\\right)^{2} - 4x\\left(${L} - 2x\\right) = \\left(${L} - 2x\\right)\\left(${L} - 6x\\right) = 0`,
        'Product rule, then take the common factor out.',
      ),
      aside('Pick the one that makes a box', `x = ${m}`, `$x = ${L / 2}$ leaves no base at all.`),
      aside('The volume', `V = ${m}\\cdot ${4 * m}^{2} = ${16 * m ** 3}`),
    ],
    verify: { kind: 'extremum', of: V_x, wrt: 'x', from: 0, to: L / 2, find: 'max', at: String(m), value: String(16 * m ** 3) },
  };
}

/**
 * A rectangle against a wall that needs no fence, with x the two sides that
 * meet it: the most area for a length of fence, or the least fence for an area.
 */
function fence(rng: Rng): Optimum {
  const k = 5 * rng.int(1, 6);
  if (rng.bool()) {
    const F = 4 * k;
    const A_x = `x\\left(${F} - 2x\\right)`;
    return {
      instruction: 'Maximise the area',
      text: `There is $${F}$ m of fence to close off a rectangular field against a long straight wall, which needs no fence. Call the two sides that meet the wall $x$. Which $x$ gives the largest field, and what is its area?`,
      given: `\\text{fence} = ${F}\\text{ m}`,
      answers: [num('x', k), num('area', 2 * k * k)],
      steps: [
        aside('Name what to maximise', `A(x) = ${A_x}`, `Two sides of $x$ use $2x$ of the fence; the side along the wall gets the rest.`),
        setup('stationary-point', "Set A' to zero", `A'(x) = ${F} - 4x = 0 \\;\\Rightarrow\\; x = ${k}`),
        aside('The area', `A = ${k}\\cdot ${2 * k} = ${2 * k * k}`, `$A'' = -4 < 0$, so it is a maximum.`),
      ],
      verify: { kind: 'extremum', of: A_x, wrt: 'x', from: 0, to: F / 2, find: 'max', at: String(k), value: String(2 * k * k) },
    };
  }
  const area = 2 * k * k;
  const L_x = `2x + ${frac(String(area), 'x')}`;
  return {
    instruction: 'Minimise the fence',
    text: `A rectangular field of $${area}$ m² is closed off against a long straight wall, which needs no fence. Call the two sides that meet the wall $x$. Which $x$ needs the least fence, and how much is that?`,
    given: `\\text{area} = ${area}\\text{ m}^{2}`,
    answers: [num('x', k), num('fence', 4 * k)],
    steps: [
      aside('Name what to minimise', `L(x) = ${L_x}`, `The side along the wall is the area over $x$.`),
      setup('stationary-point', "Set L' to zero", `L'(x) = 2 - ${frac(String(area), 'x^{2}')} = 0 \\;\\Rightarrow\\; x^{2} = ${k * k} \\;\\Rightarrow\\; x = ${k}`),
      aside('The fence', `L = ${2 * k} + ${2 * k} = ${4 * k}`, `$L'' = ${frac(String(2 * area), 'x^{3}')} > 0$, so it is a minimum.`),
    ],
    verify: { kind: 'extremum', of: L_x, wrt: 'x', from: 1, to: area, find: 'min', at: String(k), value: String(4 * k) },
  };
}

/**
 * The isosceles trapezoid under a² − x², base on the x-axis between the roots,
 * top corners on the graph. Its largest area is 32a³/27, at x = a/3; the exam
 * gives that area and asks for a, so a = 3k and the area is 32k³.
 */
function trapezoid(rng: Rng): Optimum {
  const k = rng.int(1, 2);
  const a = 3 * k;
  const b = 32 * k ** 3;
  return {
    instruction: 'Find a',
    text: `For some $a > 0$, an isosceles trapezoid sits under $f(x) = a^{2} - x^{2}$: its base runs along the $x$-axis between the roots, and its top two corners are on the graph. The largest such trapezoid has area $${b}$. What is $a$?`,
    given: `f(x) = a^{2} - x^{2},\\quad A_{\\max} = ${b}`,
    answers: [num('a', a)],
    steps: [
      aside(
        'Name what to maximise',
        `A(x) = ${frac('2x + 2a', '2')}\\left(a^{2} - x^{2}\\right) = \\left(x + a\\right)\\left(a^{2} - x^{2}\\right)`,
        'Top corners at $(\\pm x, f(x))$, bottom ones at $(\\pm a, 0)$: parallel sides $2x$ and $2a$, height $f(x)$.',
      ),
      setup(
        'stationary-point',
        "Set A' to zero",
        `A'(x) = a^{2} - 2ax - 3x^{2} = \\left(a - 3x\\right)\\left(a + x\\right) = 0 \\;\\Rightarrow\\; x = \\frac{a}{3}`,
      ),
      aside('The largest area', `A\\left(\\frac{a}{3}\\right) = \\frac{4a}{3}\\cdot\\frac{8a^{2}}{9} = \\frac{32a^{3}}{27}`),
      aside('Solve for a', `\\frac{32a^{3}}{27} = ${b} \\;\\Rightarrow\\; a^{3} = ${a ** 3} \\;\\Rightarrow\\; a = ${a}`),
    ],
    // With a filled in, the search has to land on x = a/3 and the given area.
    verify: {
      kind: 'extremum',
      of: `\\left(x + ${a}\\right)\\left(${a * a} - x^{2}\\right)`,
      wrt: 'x',
      from: 0,
      to: a,
      find: 'max',
      at: String(k),
      value: String(b),
    },
  };
}

const MEDIUM = [openBox, fence];
const HARD = [prism, trapezoid, openBox];

export const optimise: Generator = {
  id: 'diff.optimise',
  chapter: 9,
  title: 'Optimisation word problems',
  tags: ['derivative', 'stationary-point', 'word-problem'],
  version: 1,
  supports: ['medium', 'hard'],
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const o = rng.pick(tier === 'hard' ? HARD : MEDIUM)(rng);
    return {
      instruction: o.instruction,
      prompt: o.given,
      promptText: o.text,
      answers: o.answers,
      solution: o.steps,
      ruleIds: ['optimisation', 'stationary-point'],
      verify: o.verify,
    };
  },
};
