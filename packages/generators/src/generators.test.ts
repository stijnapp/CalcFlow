import { describe, expect, it } from 'vitest';
import { fuzz } from './harness.js';
import { GENERATORS, build, candidates, rebuild } from './registry.js';
import { RULES } from './rules.js';
import { CHAPTER_NUMBERS } from '@calcflow/shared';

describe('registry', () => {
  it('gives every v1 chapter at least one generator', () => {
    for (const n of CHAPTER_NUMBERS) {
      expect(GENERATORS.filter((g) => g.chapter === n).length, `chapter ${n}`).toBeGreaterThan(0);
    }
  });

  it('has no duplicate generator ids', () => {
    const ids = GENERATORS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every cell of the 5x5 grid for the default chapter set', () => {
    for (let steps = 1; steps <= 5; steps += 1) {
      for (let difficulty = 1; difficulty <= 5; difficulty += 1) {
        const pool = candidates({ chapters: [...CHAPTER_NUMBERS], steps, difficulty });
        expect(pool.length, `steps ${steps} × difficulty ${difficulty}`).toBeGreaterThan(0);
      }
    }
  });

  it('rebuilds the identical problem from a seed', () => {
    for (const g of GENERATORS) {
      const steps = g.supports.steps[0];
      const difficulty = g.supports.difficulty[0];
      const first = build(g, 'seed-1', steps, difficulty);
      const again = rebuild(g.id, 'seed-1', steps, difficulty);
      expect(again).toEqual(first);
    }
  });
});

describe('rule cards', () => {
  it('has no duplicate ids', () => {
    const ids = RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe.each(GENERATORS.map((g) => [g.id, g] as const))('fuzz %s', (_id, generator) => {
  it('holds every invariant across its supported grid', () => {
    const failures = fuzz(generator, { instances: 500 });
    expect(failures.map((f) => `${f.seed} @ steps ${f.steps} diff ${f.difficulty}: ${f.reason}`)).toEqual([]);
  });
});
