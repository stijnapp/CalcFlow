import type { Tier } from '@calcflow/shared';
import { makeRng, newSeed } from './rng.js';
import type { Generator, Problem } from './types.js';

import {
  distributiveShortcut,
  fractionEquation,
  rationalEquation,
  signedArithmetic,
} from './topics/ch01-numbers.js';
import { cubes, notableProducts, numericPowers, powerRules, productPower, spotTheError } from './topics/ch02-powers.js';
import {
  combineNumeric,
  compoundFraction,
  factorThenCancel,
  multiplyDivide,
  rationalExpressions,
  rearrangeFormula,
} from './topics/ch03-fractions.js';
import {
  absoluteValue,
  fractionalExponents,
  rationalise,
  rationaliseSymbolic,
  rootEquation,
  sameBaseEquation,
  simplifySurd,
} from './topics/ch04-roots.js';
import { compose, domain, inverse, parity, range } from './topics/ch05-functions.js';
import {
  circle,
  hyperbola,
  intersections,
  lineThroughPoints,
  parabola,
  sineWave,
} from './topics/ch05-graphs.js';
import {
  distance,
  dotProduct,
  linearCombination,
  perpendicular,
} from './topics/ch12-vectors.js';
import {
  changeOfBase,
  exponentialEquation,
  growthDecay,
  logCombine,
  logLaws,
  otherBases,
  quadraticInExp,
} from './topics/ch06-logs.js';
import {
  additionFormulas,
  degreesRadians,
  doubleAngle,
  exactValues,
  shiftIdentities,
  trigEquation,
} from './topics/ch07-trig.js';
import {
  completeTheSquare,
  inequality,
  irrationalRoots,
  linearEquation,
  linearSystem,
  longDivision,
  quadraticEquation,
  substitutionQuadratic,
  wordProblem,
} from './topics/ch08-equations.js';
import {
  chainRule,
  fromDefinition,
  higherDerivatives,
  logarithmicDifferentiation,
  nestedChain,
  perpendicularTangent,
  powerSum,
  productQuotient,
  rootsAndReciprocals,
  stationaryPoint,
  tangentLine,
} from './topics/ch09-differentiation.js';
import {
  antiderivativePower,
  antiderivativeRoot,
  byParts,
  divideFirst,
  linearInner,
  partialFractions,
  recogniseDerivative,
  reciprocal,
} from './topics/ch10-antiderivatives.js';
import {
  differentiateThenIdentity,
  identityThenIntegrate,
  lhopitalProduct,
  logEquationQuadratic,
  logIntegral,
  logThenDifferentiate,
  quadraticInTrig,
  tangentCrossing,
} from './topics/mixed.js';
import {
  asymptotes,
  continuity,
  exponentialLimit,
  factorLimit,
  limitAtInfinity,
  squeeze,
  standardLimits,
} from './topics/ch13-limits.js';
import {
  areaAboutY,
  areaBetween,
  areaFindBounds,
  definitePolynomial,
  definiteStandard,
  totalArea,
} from './topics/ch11-integration.js';

export const GENERATORS: readonly Generator[] = [
  signedArithmetic,
  distributiveShortcut,
  rationalEquation,
  fractionEquation,
  notableProducts,
  powerRules,
  productPower,
  cubes,
  numericPowers,
  spotTheError,
  combineNumeric,
  rationalExpressions,
  multiplyDivide,
  compoundFraction,
  factorThenCancel,
  rearrangeFormula,
  simplifySurd,
  rationalise,
  fractionalExponents,
  rationaliseSymbolic,
  rootEquation,
  absoluteValue,
  sameBaseEquation,
  domain,
  range,
  parity,
  inverse,
  compose,
  hyperbola,
  parabola,
  lineThroughPoints,
  circle,
  intersections,
  sineWave,
  logLaws,
  exponentialEquation,
  otherBases,
  changeOfBase,
  logCombine,
  quadraticInExp,
  growthDecay,
  exactValues,
  degreesRadians,
  doubleAngle,
  additionFormulas,
  shiftIdentities,
  trigEquation,
  linearEquation,
  quadraticEquation,
  inequality,
  completeTheSquare,
  linearSystem,
  irrationalRoots,
  substitutionQuadratic,
  wordProblem,
  longDivision,
  powerSum,
  chainRule,
  productQuotient,
  rootsAndReciprocals,
  nestedChain,
  tangentLine,
  stationaryPoint,
  fromDefinition,
  higherDerivatives,
  logarithmicDifferentiation,
  perpendicularTangent,
  antiderivativePower,
  linearInner,
  reciprocal,
  antiderivativeRoot,
  recogniseDerivative,
  byParts,
  partialFractions,
  divideFirst,
  definitePolynomial,
  definiteStandard,
  areaBetween,
  totalArea,
  areaFindBounds,
  areaAboutY,
  linearCombination,
  dotProduct,
  perpendicular,
  distance,
  factorLimit,
  limitAtInfinity,
  standardLimits,
  squeeze,
  exponentialLimit,
  continuity,
  asymptotes,
  logThenDifferentiate,
  differentiateThenIdentity,
  identityThenIntegrate,
  logIntegral,
  logEquationQuadratic,
  quadraticInTrig,
  lhopitalProduct,
  tangentCrossing,
];

export function generatorById(id: string): Generator | undefined {
  return GENERATORS.find((g) => g.id === id);
}

export interface Selection {
  chapters: number[];
  tier: Tier;
  /** Restrict to these generator ids — how "drill this topic" is expressed. */
  only?: string[];
}

/** Every chapter a generator needs switched on before it can be drawn. */
function needs(g: Generator): readonly number[] {
  return g.spans ?? [g.chapter];
}

/** Every generator that has something to ask at this tier. */
export function candidates({ chapters, tier, only }: Selection): Generator[] {
  return GENERATORS.filter(
    (g) =>
      needs(g).every((c) => chapters.includes(c)) &&
      g.supports.includes(tier) &&
      (!only || only.includes(g.id)),
  );
}

/** Builds a problem from a generator plus a seed — the only source of problems. */
export function build(generator: Generator, seed: string, tier: Tier): Problem {
  const draft = generator.generate({ tier, rng: makeRng(`${generator.id}:${seed}`) });
  return {
    ...draft,
    generatorId: generator.id,
    seed,
    genVersion: generator.version,
    chapter: generator.chapter,
    tier,
  };
}

/** Regenerates a past attempt's exact problem. Sync only ever carries the seed. */
export function rebuild(generatorId: string, seed: string, tier: Tier): Problem | null {
  const g = generatorById(generatorId);
  return g ? build(g, seed, tier) : null;
}

export interface DrawOptions extends Selection {
  random?: () => number;
  /** Avoid repeating the generator that produced the previous problem. */
  avoid?: string;
}

/**
 * How often a hard session reaches for a problem that spans two chapters, when
 * one is available. Not every time: the single-chapter problems are where the
 * individual rules get their reps, and a session made only of compound
 * problems stops being practice and becomes an exam.
 */
const CROSS_CHAPTER_SHARE = 0.4;

export function draw(opts: DrawOptions): Problem | null {
  const random = opts.random ?? Math.random;
  let pool = candidates(opts);
  if (pool.length === 0) return null;

  // Several chapters switched on and the hard tier asked for: some of the time,
  // draw from the problems that need more than one of them at once.
  if (opts.tier === 'hard') {
    const spanning = pool.filter((g) => needs(g).length > 1);
    if (spanning.length > 0 && random() < CROSS_CHAPTER_SHARE) pool = spanning;
  }
  if (opts.avoid && pool.length > 1) {
    const trimmed = pool.filter((g) => g.id !== opts.avoid);
    if (trimmed.length) pool = trimmed;
  }
  const g = pool[Math.floor(random() * pool.length)]!;
  return build(g, newSeed(random), opts.tier);
}

/**
 * Another problem of the same kind and at the same tier — the one to try
 * straight after missing this one, to find out whether the steps have landed.
 * A generator with little room can come back with the very same numbers, so
 * it gets a few more goes at something he has not just seen.
 */
export function similar(problem: Problem, random: () => number = Math.random): Problem | null {
  const g = generatorById(problem.generatorId);
  if (!g) return null;
  let next = build(g, newSeed(random), problem.tier);
  for (let i = 0; i < 8 && next.prompt === problem.prompt; i++) {
    next = build(g, newSeed(random), problem.tier);
  }
  return next;
}
