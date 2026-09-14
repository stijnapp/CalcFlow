import { describe, expect, it } from 'vitest';
import { fuzz } from './harness.js';
import { GENERATORS, build, candidates, rebuild } from './registry.js';
import { RULES } from './rules.js';
import { CHAPTER_NUMBERS, TIERS } from '@calcflow/shared';

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

  it('fills all three tiers for the default chapter set', () => {
    for (const tier of TIERS) {
      const pool = candidates({ chapters: [...CHAPTER_NUMBERS], tier });
      expect(pool.length, tier).toBeGreaterThan(0);
    }
  });

  it('gives every chapter something to ask at every tier', () => {
    for (const n of CHAPTER_NUMBERS) {
      for (const tier of TIERS) {
        const pool = candidates({ chapters: [n], tier });
        expect(pool.length, `chapter ${n} at ${tier}`).toBeGreaterThan(0);
      }
    }
  });

  it('rebuilds the identical problem from a seed', () => {
    for (const g of GENERATORS) {
      const tier = g.supports[0]!;
      const first = build(g, 'seed-1', tier);
      const again = rebuild(g.id, 'seed-1', tier);
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
  it('holds every invariant at every tier it supports', () => {
    const failures = fuzz(generator, { instances: 500 });
    expect(failures.map((f) => `${f.seed} @ ${f.tier}: ${f.reason}`)).toEqual([]);
  });
});
