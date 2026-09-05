import { answer, fracTex, poly, power, step, times } from '../authoring.js';
import type { Draft, Generator } from '../types.js';

/** Exact value of ∫ from lo to hi of a polynomial given as [coefficient, power]. */
function definiteValue(pairs: Array<[number, number]>, lo: number, hi: number): { p: number; q: number } {
  let p = 0;
  let q = 1;
  for (const [c, n] of pairs) {
    const num = c * (hi ** (n + 1) - lo ** (n + 1));
    const den = n + 1;
    p = p * den + num * q;
    q *= den;
  }
  return { p, q };
}

export const definitePolynomial: Generator = {
  id: 'integ.definite-power',
  chapter: 11,
  title: 'Definite integrals',
  tags: ['definite-integral', 'area'],
  version: 1,
  supports: { steps: [2, 5], difficulty: [1, 4] },
  invariant: 'value-preserving',

  generate({ steps, difficulty, rng }): Draft {
    const count = Math.min(1 + Math.floor(steps / 2), 3);
    const exponents = new Set<number>();
    while (exponents.size < count) exponents.add(rng.int(0, difficulty >= 3 ? 3 : 2));
    const pairs = [...exponents]
      .sort((a, b) => b - a)
      .map((n) => [rng.nonZero(-5, 6), n] as [number, number]);

    const lo = rng.int(0, 2);
    const hi = lo + rng.int(1, 3);
    const integrand = poly(pairs);
    const { p, q } = definiteValue(pairs, lo, hi);

    const anti = pairs
      .map(([c, n]) => times(fracTex(c, n + 1), power('x', n + 1)))
      .reduce((acc, t) => (t.startsWith('-') ? `${acc} - ${t.slice(1)}` : `${acc} + ${t}`));

    // The bracket-with-bounds line cannot be evaluated on its own, so it is
    // shown but left out of the step-chain check.
    const bracket = step(
      'antiderivative-power',
      'Antidifferentiate',
      `\\left[${anti}\\right]_{${lo}}^{${hi}}`,
    );
    bracket.display = true;

    return {
      instruction: 'Evaluate',
      prompt: `\\int_{${lo}}^{${hi}} ${integrand}\\,dx`,
      note: 'Give the exact value.',
      answers: [answer(fracTex(p, q), { keyboard: 'numeric', kind: 'number' })],
      solution: [
        bracket,
        step('definite-integral', 'Substitute the bounds', fracTex(p, q), 'No +C — it cancels between the two bounds.'),
      ],
      ruleIds: ['definite-integral', 'antiderivative-power'],
      verify: { kind: 'definite-integral', of: integrand, wrt: 'x', from: lo, to: hi },
    };
  },
};

export const areaBetween: Generator = {
  id: 'integ.area-between',
  chapter: 11,
  title: 'Area between two curves',
  tags: ['area', 'definite-integral'],
  version: 1,
  supports: { steps: [3, 5], difficulty: [3, 5] },
  invariant: 'value-preserving',

  generate({ rng }): Draft {
    // A parabola and a line meeting at two integer points: area = |a|(r2−r1)³/6.
    const r1 = rng.int(-3, 1);
    const r2 = r1 + rng.int(1, 4);
    const a = rng.int(1, 3);
    // f(x) − g(x) = −a(x − r1)(x − r2), positive between the roots.
    const difference = poly([[-a, 2], [a * (r1 + r2), 1], [-a * r1 * r2, 0]]);
    const width = r2 - r1;
    const areaNum = a * width ** 3;

    // The integrand is a step towards the answer, not a value equal to it, so
    // it sits outside the chain check.
    const integrandLine = step(
      'area-between',
      'Upper curve minus lower',
      difference,
      'The difference is positive across the whole interval.',
    );
    integrandLine.display = true;

    return {
      instruction: 'Find the area',
      prompt: `\\int_{${r1}}^{${r2}} \\left(${difference}\\right) dx`,
      promptText: `The curves meet at x = ${r1} and x = ${r2}. Find the area enclosed between them.`,
      note: 'Give the exact value.',
      answers: [answer(fracTex(areaNum, 6), { keyboard: 'numeric', kind: 'number' })],
      solution: [integrandLine, step('definite-integral', 'Evaluate between the bounds', fracTex(areaNum, 6))],
      ruleIds: ['area-between', 'definite-integral'],
      verify: { kind: 'definite-integral', of: difference, wrt: 'x', from: r1, to: r2 },
    };
  },
};
