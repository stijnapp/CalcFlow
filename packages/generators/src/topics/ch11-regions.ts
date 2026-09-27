import { answer, frac, fracTex, poly, rootOf, setup, step, sum, term, tidy } from '../authoring.js';
import type { Draft, Generator, Latex, Rng, Step, Verification } from '../types.js';

/*
 * Areas where the region is the hard part. The 2024 exam encloses x³ and x,
 * which cross three times and swap places in the middle; the 2025 one bounds a
 * region by √x, a line given as 2y − x + 3 = 0 and the x-axis, where squaring
 * to find the crossing adds a root that is not one.
 */

interface Region {
  prompt: Latex;
  text: string;
  area: Latex;
  steps: Step[];
  verify: Verification;
}

/** 12·∫(x − r₁)(x − r₂)(x − r₃) dx at x, which is a whole number for whole x. */
function twelveD([e1, e2, e3]: [number, number, number], x: number): number {
  return 3 * x ** 4 - 4 * e1 * x ** 3 + 6 * e2 * x ** 2 - 12 * e3 * x;
}

/** y = x³ against the parabola (or line) through its three crossings. */
function cubic(roots: [number, number, number]): Region {
  const [r1, r2, r3] = roots;
  const e: [number, number, number] = [r1 + r2 + r3, r1 * r2 + r1 * r3 + r2 * r3, r1 * r2 * r3];
  const g = poly([[e[0], 2], [-e[1], 1], [e[2], 0]]);
  const d = poly([[1, 3], [-e[0], 2], [e[1], 1], [-e[2], 0]]);
  const minusD = poly([[-1, 3], [e[0], 2], [-e[1], 1], [e[2], 0]]);
  // x³ − g is positive between the first two crossings and negative after.
  const left = twelveD(e, r2) - twelveD(e, r1);
  const right = twelveD(e, r2) - twelveD(e, r3);
  const area = fracTex(left + right, 12);
  return {
    prompt: `y = x^{3},\\quad y = ${g}`,
    text: `Find the area enclosed between $y = x^{3}$ and $y = ${g}$.`,
    area,
    steps: [
      setup(
        'area-between',
        'Where do they meet',
        `x^{3} = ${g} \\;\\Rightarrow\\; x = ${r1},\\ ${r2},\\ ${r3}`,
        'Three crossings make two regions, and the curves swap places at the middle one.',
      ),
      setup(
        'area-between',
        'Upper minus lower on each',
        sum([`\\int_{${r1}}^{${r2}} \\left(${d}\\right) dx`, `\\int_{${r2}}^{${r3}} \\left(${minusD}\\right) dx`]),
        `$x^{3}$ is on top from $${r1}$ to $${r2}$, and underneath from $${r2}$ to $${r3}$.`,
      ),
      step('definite-integral', 'Each piece', sum([fracTex(left, 12), fracTex(right, 12)])),
      tidy('Add them', area),
    ],
    verify: {
      kind: 'definite-integral',
      of: `\\left|${d}\\right|`,
      wrt: 'x',
      from: r1,
      to: r3,
      breaks: [r2],
    },
  };
}

/** The exam's x³ and x, stretched: they meet at −k, 0 and k. */
const symmetricCubic = (rng: Rng): Region => {
  const k = rng.int(1, 3);
  return cubic([-k, 0, k]);
};

const lopsidedCubic = (rng: Rng): Region => {
  const r1 = rng.int(-3, 0);
  const r2 = r1 + rng.int(1, 3);
  return cubic([r1, r2, r2 + rng.int(1, 3)]);
};

/**
 * √x, the line my − x + c = 0 and the x-axis. Built from the crossing (s², s):
 * the line meets the axis at c = s² − ms, and squaring √x = (x − c)/m also
 * finds x = (s − m)², where the line is below the axis.
 */
function rootAndLine(rng: Rng): Region {
  const m = rng.int(1, 3);
  const s = m + rng.int(1, 2);
  const c = s * s - m * s;
  const line = `${term(m, 'y')} - x + ${c} = 0`;
  const slopeForm = sum([m === 1 ? 'x' : frac('x', String(m)), fracTex(-c, m)]);
  const under = fracTex(2 * s ** 3, 3);
  const triangle = fracTex(m * s * s, 2);
  const area = fracTex(4 * s ** 3 - 3 * m * s * s, 6);
  return {
    prompt: `y = ${rootOf('x')},\\quad ${line}`,
    text: `Find the area of the region bounded by $y = ${rootOf('x')}$, the line $${line}$ and the x-axis, in the first quadrant.`,
    area,
    steps: [
      setup('area-between', 'The line as y = mx + b', `y = ${slopeForm}`),
      setup(
        'area-between',
        'Where do they meet',
        `${rootOf('x')} = ${slopeForm} \\;\\Rightarrow\\; x = ${s * s}`,
        `Squaring also gives $x = ${(s - m) ** 2}$, but there the line is below the axis while the root is not — check both.`,
      ),
      setup(
        'area-between',
        'Under the root, minus the triangle under the line',
        `\\int_{0}^{${s * s}} ${rootOf('x')}\\,dx - \\frac{1}{2} \\cdot ${m * s} \\cdot ${s}`,
        `The line meets the x-axis at $x = ${c}$, so it cuts a triangle of base $${m * s}$ and height $${s}$ off the area under the root.`,
      ),
      step('definite-integral', 'Evaluate', `${under} - ${triangle}`),
      tidy('Subtract', area),
    ],
    // In horizontal strips the region runs from the parabola x = y² to the line.
    verify: { kind: 'definite-integral', of: poly([[-1, 2], [m, 1], [c, 0]], 'y'), wrt: 'y', from: 0, to: s },
  };
}

const MEDIUM = [symmetricCubic];
const HARD = [lopsidedCubic, rootAndLine];

export const areaRegions: Generator = {
  id: 'integ.area-regions',
  chapter: 11,
  title: 'Areas of awkward regions',
  tags: ['area', 'definite-integral'],
  version: 1,
  supports: ['medium', 'hard'],
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const r = rng.pick(tier === 'hard' ? HARD : MEDIUM)(rng);
    return {
      instruction: 'Find the enclosed area',
      prompt: r.prompt,
      promptText: r.text,
      note: 'Give the exact value.',
      answers: [answer(r.area, { keyboard: 'numeric', kind: 'number' })],
      solution: r.steps,
      ruleIds: ['area-between', 'definite-integral', 'antiderivative-power'],
      verify: r.verify,
    };
  },
};
