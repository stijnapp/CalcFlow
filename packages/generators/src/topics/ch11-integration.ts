import { TIERS, type Tier } from '@calcflow/shared';
import { answer, frac, fracTex, poly, power, rootOf, setup, step, times } from '../authoring.js';
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
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const count = tier === 'easy' ? 2 : tier === 'medium' ? 3 : 3;
    const exponents = new Set<number>();
    while (exponents.size < count) exponents.add(rng.int(0, tier !== 'easy' ? 3 : 2));
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
  supports: ['medium', 'hard'] as const,
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

interface DefiniteShape {
  integrand: string;
  loTex: string;
  hiTex: string;
  lo: number;
  hi: number;
  anti: string;
  value: string;
  ruleIds: string[];
}

/**
 * A definite integral of something that is not a polynomial. The book's own
 * exercises stop at powers of x; every exam question has an exponential, a sine
 * or a reciprocal under the integral sign, and the bounds are chosen to leave an
 * exact value rather than a decimal.
 */
export const definiteStandard: Generator = {
  id: 'integ.definite-standard',
  chapter: 11,
  title: 'Definite integrals of standard functions',
  tags: ['definite-integral', 'exponential', 'trigonometry'],
  version: 1,
  supports: TIERS,
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const k = rng.nonZero(-5, 6);

    const shapes: Array<[Tier[], () => DefiniteShape]> = [
      [
        ['easy', 'medium', 'hard'],
        () => {
          const b = rng.int(1, 3);
          return {
            integrand: times(String(k), 'e^{x}'),
            loTex: '0',
            hiTex: String(b),
            lo: 0,
            hi: b,
            anti: times(String(k), 'e^{x}'),
            value: times(String(k), `\\left(e^{${b}} - 1\\right)`),
            ruleIds: ['standard-antiderivatives'],
          };
        },
      ],
      [
        ['easy', 'medium', 'hard'],
        () => ({
          integrand: times(String(k), '\\sin x'),
          loTex: '0',
          hiTex: '\\pi',
          lo: 0,
          hi: Math.PI,
          anti: times(String(-k), '\\cos x'),
          value: String(2 * k),
          ruleIds: ['standard-antiderivatives'],
        }),
      ],
      [
        ['easy', 'medium', 'hard'],
        () => {
          const b = rng.int(2, 6);
          return {
            integrand: frac(String(k), 'x'),
            loTex: '1',
            hiTex: String(b),
            lo: 1,
            hi: b,
            anti: times(String(k), '\\ln x'),
            value: times(String(k), `\\ln ${b}`),
            ruleIds: ['log-antiderivative'],
          };
        },
      ],
      [
        ['medium', 'hard'],
        () => ({
          integrand: times(String(k), '\\cos x'),
          loTex: '0',
          hiTex: '\\frac{\\pi}{2}',
          lo: 0,
          hi: Math.PI / 2,
          anti: times(String(k), '\\sin x'),
          value: String(k),
          ruleIds: ['standard-antiderivatives'],
        }),
      ],
      [
        ['medium', 'hard'],
        () => {
          // From 1, not from 0: √x has a vertical tangent at the origin, and the
          // harness integrates numerically — the check would fail on its own
          // quadrature error rather than on anything wrong here.
          const q = rng.int(2, 4);
          return {
            integrand: times(String(k), rootOf('x')),
            loTex: '1',
            hiTex: String(q * q),
            lo: 1,
            hi: q * q,
            anti: times(fracTex(2 * k, 3), 'x^{\\frac{3}{2}}'),
            value: fracTex(2 * k * (q ** 3 - 1), 3),
            ruleIds: ['antiderivative-power', 'fractional-exponent'],
          };
        },
      ],
      [
        ['hard'],
        () => {
          const a = rng.int(2, 3);
          return {
            integrand: times(String(k), `e^{${a}x}`),
            loTex: '0',
            hiTex: '1',
            lo: 0,
            hi: 1,
            anti: times(fracTex(k, a), `e^{${a}x}`),
            value: times(fracTex(k, a), `\\left(e^{${a}} - 1\\right)`),
            ruleIds: ['linear-substitution', 'standard-antiderivatives'],
          };
        },
      ],
      [
        ['hard'],
        () => {
          const a = rng.int(2, 4);
          return {
            integrand: times(String(k), `\\sin\\left(${a}x\\right)`),
            loTex: '0',
            hiTex: '\\frac{\\pi}{' + a + '}',
            lo: 0,
            hi: Math.PI / a,
            anti: times(fracTex(-k, a), `\\cos\\left(${a}x\\right)`),
            value: fracTex(2 * k, a),
            ruleIds: ['linear-substitution', 'standard-antiderivatives'],
          };
        },
      ],
      [
        ['hard'],
        () => {
          const b = rng.int(2, 4);
          return {
            integrand: `${times(String(k), 'e^{x}')} + ${frac(String(b), 'x')}`,
            loTex: '1',
            hiTex: '2',
            lo: 1,
            hi: 2,
            anti: `${times(String(k), 'e^{x}')} + ${times(String(b), '\\ln x')}`,
            value: `${times(String(k), `\\left(e^{2} - e\\right)`)} + ${times(String(b), '\\ln 2')}`,
            ruleIds: ['standard-antiderivatives', 'log-antiderivative'],
          };
        },
      ],
    ];

    const pool = shapes.filter(([tiers]) => tiers.includes(tier));
    const s = rng.pick(pool)[1]();

    return {
      instruction: 'Evaluate',
      prompt: `\\int_{${s.loTex}}^{${s.hiTex}} \\left(${s.integrand}\\right) dx`,
      note: 'Give the exact value — no decimals.',
      answers: [answer(s.value, { keyboard: 'numeric', kind: 'number' })],
      solution: [
        setup(
          s.ruleIds[0]!,
          'Antidifferentiate',
          `\\left[${s.anti}\\right]_{${s.loTex}}^{${s.hiTex}}`,
          'Read the derivative table backwards.',
        ),
        step(
          'definite-integral',
          'Substitute the bounds',
          s.value,
          'Top bound minus bottom bound. No +C — it cancels.',
        ),
      ],
      ruleIds: ['definite-integral', ...s.ruleIds],
      verify: { kind: 'definite-integral', of: s.integrand, wrt: 'x', from: s.lo, to: s.hi },
    };
  },
};

/**
 * Area where the curve crosses the axis. The integral counts what is below the
 * axis as negative, so the integral and the area are two different numbers —
 * which is the whole point of the question.
 */
export const totalArea: Generator = {
  id: 'integ.total-area',
  chapter: 11,
  title: 'Total area, crossing the axis',
  tags: ['area', 'definite-integral'],
  version: 1,
  supports: ['medium', 'hard'] as const,

  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const kind = tier === 'hard' ? rng.pick(['parabola', 'sine', 'symmetric']) : rng.pick(['parabola', 'sine']);

    if (kind === 'sine') {
      const k = rng.int(1, 4);
      const integrand = times(String(k), '\\sin x');
      return {
        instruction: 'Find the total area',
        prompt: `y = ${integrand}`,
        promptText: `Find the total area enclosed between the curve y = ${integrand} and the x-axis, for x between 0 and 2\\pi.`,
        note: 'Area, not the value of the integral. Give the exact value.',
        answers: [answer(String(4 * k), { keyboard: 'numeric', kind: 'number' })],
        solution: [
          setup(
            'total-area',
            'Split at the crossing',
            `\\int_{0}^{\\pi} ${integrand}\\,dx - \\int_{\\pi}^{2\\pi} ${integrand}\\,dx`,
            'The curve is below the axis on the second half, so that integral comes out negative — subtract it to add its size.',
          ),
          step('definite-integral', 'Each piece', String(4 * k), `Each half has area ${2 * k}.`),
        ],
        ruleIds: ['total-area', 'definite-integral', 'standard-antiderivatives'],
        verify: {
          kind: 'definite-integral',
          of: `\\left|${integrand}\\right|`,
          wrt: 'x',
          from: 0,
          to: 2 * Math.PI,
        },
      };
    }

    const c = rng.int(1, 3);
    const integrand = `x^{2} - ${c * c}`;
    // The bounds are symmetric about the crossing, which keeps both pieces whole.
    const [lo, hi] = kind === 'symmetric' ? [-2 * c, 2 * c] : [0, 2 * c];
    const area = kind === 'symmetric' ? 4 * c ** 3 : 2 * c ** 3;

    return {
      instruction: 'Find the total area',
      prompt: `y = ${integrand}`,
      promptText: `Find the total area enclosed between the curve y = ${integrand} and the x-axis, for x between ${lo} and ${hi}.`,
      note: 'Area, not the value of the integral. Give the exact value.',
      answers: [answer(String(area), { keyboard: 'numeric', kind: 'number' })],
      solution: [
        setup(
          'total-area',
          'Find where it crosses',
          `x^{2} - ${c * c} = 0 \\Rightarrow x = \\pm ${c}`,
          'Between the crossings the curve is below the axis.',
        ),
        setup(
          'total-area',
          'Split the interval',
          `\\int_{${lo}}^{${hi}} \\left|x^{2} - ${c * c}\\right| dx`,
          'Every piece counts positively.',
        ),
        step('definite-integral', 'Add the pieces', String(area)),
      ],
      ruleIds: ['total-area', 'definite-integral', 'antiderivative-power'],
      verify: {
        kind: 'definite-integral',
        of: `\\left|${integrand}\\right|`,
        wrt: 'x',
        from: lo,
        to: hi,
      },
    };
  },
};

/**
 * The same area question with the bounds left out, because finding them is the
 * first half of the work. Nothing can be integrated until f = g has been solved.
 */
export const areaFindBounds: Generator = {
  id: 'integ.area-find-bounds',
  chapter: 11,
  title: 'Area between curves, bounds not given',
  tags: ['area', 'definite-integral', 'equations'],
  version: 1,
  supports: ['hard'] as const,
  invariant: 'value-preserving',

  generate({ rng }): Draft {
    const r1 = rng.int(-3, 1);
    const r2 = r1 + rng.int(2, 4);
    const a = rng.int(1, 2);
    const m = rng.nonZero(-4, 4);
    const q = rng.nonZero(-6, 6);

    // ax² + bx + c meets mx + q exactly at r1 and r2.
    const b = m - a * (r1 + r2);
    const c = q + a * r1 * r2;
    const curve = poly([[a, 2], [b, 1], [c, 0]]);
    const line = poly([[m, 1], [q, 0]]);
    // line − curve = −a(x − r1)(x − r2), positive between the roots.
    const difference = poly([[-a, 2], [a * (r1 + r2), 1], [-a * r1 * r2, 0]]);
    const area = fracTex(a * (r2 - r1) ** 3, 6);

    return {
      instruction: 'Find the enclosed area',
      prompt: `y = ${curve},\\quad y = ${line}`,
      promptText: `Find the area of the region enclosed between the curve y = ${curve} and the line y = ${line}.`,
      note: 'The bounds are not given. Give the exact value.',
      answers: [answer(area, { keyboard: 'numeric', kind: 'number' })],
      solution: [
        setup(
          'area-between',
          'Where do they meet',
          `${curve} = ${line} \\Rightarrow x = ${r1},\\ x = ${r2}`,
          'The intersections are the bounds — there is nothing to integrate until they are known.',
        ),
        setup(
          'area-between',
          'Upper curve minus lower',
          `\\int_{${r1}}^{${r2}} \\left(${difference}\\right) dx`,
          'The line is above the curve between the two intersections.',
        ),
        step('definite-integral', 'Evaluate between the bounds', area),
      ],
      ruleIds: ['area-between', 'definite-integral', 'antiderivative-power'],
      verify: { kind: 'definite-integral', of: difference, wrt: 'x', from: r1, to: r2 },
    };
  },
};

/**
 * A region held against the y-axis, measured in horizontal strips. Everything —
 * the function and the bounds — has to be rewritten in y first.
 */
export const areaAboutY: Generator = {
  id: 'integ.area-about-y',
  chapter: 11,
  title: 'Area against the y-axis',
  tags: ['area', 'definite-integral'],
  version: 1,
  supports: ['hard'] as const,
  invariant: 'value-preserving',

  generate({ rng }): Draft {
    const kind = rng.pick(['parabola', 'exp', 'root']);
    const d = rng.int(2, 3);

    let g: string;
    let value: string;
    let anti: string;
    let ruleId: string;
    if (kind === 'parabola') {
      const k = rng.int(1, 4);
      g = `y^{2} + ${k}`;
      anti = `${frac('y^{3}', '3')} + ${k}y`;
      value = fracTex(d ** 3 + 3 * k * d, 3);
      ruleId = 'antiderivative-power';
    } else if (kind === 'exp') {
      g = 'e^{y}';
      anti = 'e^{y}';
      value = `e^{${d}} - 1`;
      ruleId = 'standard-antiderivatives';
    } else {
      g = rootOf('y');
      anti = `${frac('2', '3')}y^{\\frac{3}{2}}`;
      value = fracTex(2 * (d ** 3 - 1), 3);
      ruleId = 'antiderivative-power';
    }
    // √y starts at y = 1: from 0 it has a vertical tangent, which the harness's
    // numeric integration cannot resolve well enough to confirm the answer.
    const hi = kind === 'root' ? d * d : d;
    const lo = kind === 'root' ? 1 : 0;

    return {
      instruction: 'Find the area',
      prompt: `x = ${g}`,
      promptText: `Find the area of the region bounded by the curve x = ${g}, the y-axis, y = ${lo} and y = ${hi}.`,
      note: 'Give the exact value.',
      answers: [answer(value, { keyboard: 'numeric', kind: 'number' })],
      solution: [
        setup(
          'area-about-y',
          'Strips across, not up',
          `\\int_{${lo}}^{${hi}} \\left(${g}\\right) dy`,
          'The region is bounded by the y-axis, so each strip is horizontal and its length is x = g(y).',
        ),
        setup(ruleId, 'Antidifferentiate in y', `\\left[${anti}\\right]_{${lo}}^{${hi}}`),
        step('definite-integral', 'Substitute the bounds', value),
      ],
      ruleIds: ['area-about-y', 'definite-integral', ruleId],
      verify: { kind: 'definite-integral', of: g, wrt: 'y', from: lo, to: hi },
    };
  },
};
