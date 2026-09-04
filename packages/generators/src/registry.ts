import { makeRng, newSeed } from './rng.js';
import type { Generator, Problem } from './types.js';

import { notableProducts, powerRules } from './topics/ch02-powers.js';
import { combineNumeric, rationalExpressions } from './topics/ch03-fractions.js';
import { fractionalExponents, rationalise, simplifySurd } from './topics/ch04-roots.js';
import { exponentialEquation, logLaws } from './topics/ch06-logs.js';
import { degreesRadians, doubleAngle, exactValues } from './topics/ch07-trig.js';
import { linearEquation, quadraticEquation } from './topics/ch08-equations.js';
import { chainRule, powerSum, productQuotient } from './topics/ch09-differentiation.js';
import { antiderivativePower, linearInner } from './topics/ch10-antiderivatives.js';
import { areaBetween, definitePolynomial } from './topics/ch11-integration.js';

export const GENERATORS: readonly Generator[] = [
  notableProducts,
  powerRules,
  combineNumeric,
  rationalExpressions,
  simplifySurd,
  rationalise,
  fractionalExponents,
  logLaws,
  exponentialEquation,
  exactValues,
  degreesRadians,
  doubleAngle,
  linearEquation,
  quadraticEquation,
  powerSum,
  chainRule,
  productQuotient,
  antiderivativePower,
  linearInner,
  definitePolynomial,
  areaBetween,
];

export function generatorById(id: string): Generator | undefined {
  return GENERATORS.find((g) => g.id === id);
}

const covers = (range: [number, number], v: number) => v >= range[0] && v <= range[1];

export interface Selection {
  chapters: number[];
  steps: number;
  difficulty: number;
  /** Restrict to these generator ids — how "drill this topic" is expressed. */
  only?: string[];
}

/** Every generator that can fill the requested (steps × difficulty) cell. */
export function candidates({ chapters, steps, difficulty, only }: Selection): Generator[] {
  return GENERATORS.filter(
    (g) =>
      chapters.includes(g.chapter) &&
      covers(g.supports.steps, steps) &&
      covers(g.supports.difficulty, difficulty) &&
      (!only || only.includes(g.id)),
  );
}

/** Builds a problem from a generator plus a seed — the only source of problems. */
export function build(generator: Generator, seed: string, steps: number, difficulty: number): Problem {
  const draft = generator.generate({ steps, difficulty, rng: makeRng(`${generator.id}:${seed}`) });
  return {
    ...draft,
    generatorId: generator.id,
    seed,
    genVersion: generator.version,
    chapter: generator.chapter,
    steps,
    difficulty,
  };
}

/** Regenerates a past attempt's exact problem. Sync only ever carries the seed. */
export function rebuild(
  generatorId: string,
  seed: string,
  steps: number,
  difficulty: number,
): Problem | null {
  const g = generatorById(generatorId);
  return g ? build(g, seed, steps, difficulty) : null;
}

export interface DrawOptions extends Selection {
  random?: () => number;
  /** Avoid repeating the generator that produced the previous problem. */
  avoid?: string;
}

export function draw(opts: DrawOptions): Problem | null {
  const random = opts.random ?? Math.random;
  let pool = candidates(opts);
  if (pool.length === 0) return null;
  if (opts.avoid && pool.length > 1) {
    const trimmed = pool.filter((g) => g.id !== opts.avoid);
    if (trimmed.length) pool = trimmed;
  }
  const g = pool[Math.floor(random() * pool.length)]!;
  return build(g, newSeed(random), opts.steps, opts.difficulty);
}
