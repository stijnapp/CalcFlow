import { evaluate } from '@calcflow/engine';
import type { Tier } from '@calcflow/shared';
import { describe, expect, it } from 'vitest';
import { checkProblem } from './harness.js';
import { build } from './registry.js';
import { concavity } from './topics/ch09-shape.js';
import { optimise } from './topics/ch09-optimise.js';
import { mixedPartial } from './topics/ch09-partial.js';
import { stationaryPoint } from './topics/ch09-stationary.js';
import { tangentAxes } from './topics/ch09-tangent-axes.js';
import { improperIntegral } from './topics/ch11-improper.js';
import { areaRegions } from './topics/ch11-regions.js';
import { findConstants } from './topics/ch13-constants.js';
import type { Generator, Latex, Verification } from './types.js';

/*
 * A check that passes everything proves nothing. Each of these draws problems
 * the harness accepts, then hands it the same problem with a verification that
 * is slightly wrong, and expects a complaint.
 */

function rejects(generator: Generator, tier: Tier, wrong: (v: Verification) => Verification): void {
  for (let i = 0; i < 12; i += 1) {
    const p = build(generator, `harness-${i}`, tier);
    if (!p.verify) throw new Error(`${generator.id} has no verification`);
    expect(checkProblem(p, generator)).toEqual([]);
    expect(checkProblem({ ...p, verify: wrong(p.verify) }, generator)).not.toEqual([]);
  }
}

/** The same verification of a function with something added to it. */
const plus =
  (extra: Latex) =>
  (v: Verification): Verification => {
    if (!('of' in v)) throw new Error(`a ${v.kind} check has no function to change`);
    return { ...v, of: `${v.of} + ${extra}` } as Verification;
  };

/** The same verification with one of its stated claims nudged. */
const nudge =
  <K extends Verification['kind']>(kind: K, field: 'equals' | 'at' | 'value', by: string) =>
  (v: Verification): Verification => {
    if (v.kind !== kind) throw new Error(`expected a ${kind} check, got ${v.kind}`);
    return { ...v, [field]: `${(v as Record<string, unknown>)[field] as string} + ${by}` };
  };

describe('the verification harness', () => {
  it('rejects the wrong mixed partial', () => rejects(mixedPartial, 'hard', plus('x^{2}y^{2}')));
  it('rejects a point that is no inflection', () => rejects(concavity, 'hard', plus('x^{4}')));
  it('rejects the wrong improper integral', () => rejects(improperIntegral, 'hard', plus('e^{-x}')));
  it('rejects the wrong limit for the constants', () => rejects(findConstants, 'hard', nudge('limit', 'equals', '1')));
  it('rejects the wrong optimum point', () => rejects(optimise, 'hard', nudge('extremum', 'at', '0.1')));
  it('rejects the wrong optimum value', () => rejects(optimise, 'medium', nudge('extremum', 'value', '1')));
  it('rejects the wrong stationary point', () => rejects(stationaryPoint, 'hard', nudge('extremum', 'at', '0.1')));
  it('rejects a tangent taken somewhere else', () => rejects(tangentAxes, 'hard', nudge('tangent', 'at', '1')));
  it('rejects the wrong area of a split region', () => rejects(areaRegions, 'hard', plus('1')));
});

// The harness only checks the first answer, so the two crossings are held to
// the line here: it is 0 at the first and passes through the second.
it('puts both crossings of a tangent on the line', () => {
  for (const tier of tangentAxes.supports) {
    for (let i = 0; i < 40; i += 1) {
      const [line, x, y] = build(tangentAxes, `crossing-${i}`, tier).answers.map((a) => a.value!);
      for (const a of [0.7, 1.9]) {
        expect(evaluate(line!, { a, x: evaluate(x!, { a }) })).toBeCloseTo(0, 9);
        expect(evaluate(line!, { a, x: 0 })).toBeCloseTo(evaluate(y!, { a }), 9);
      }
    }
  }
});
