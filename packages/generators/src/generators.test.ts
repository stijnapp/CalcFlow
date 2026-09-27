import { describe, expect, it } from 'vitest';
import { fuzz } from './harness.js';
import { GENERATORS, alwaysTopics, build, candidates, draw, rebuild, similar } from './registry.js';
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

describe('similar', () => {
  it('keeps the generator and the tier, and changes the question', () => {
    for (const g of GENERATORS) {
      for (const tier of g.supports) {
        const missed = build(g, 'missed', tier);
        const next = similar(missed)!;
        expect(next.generatorId, g.id).toBe(g.id);
        expect(next.tier, g.id).toBe(tier);
        expect(next.seed, g.id).not.toBe(missed.seed);
        expect(next.prompt, `${g.id} at ${tier}`).not.toBe(missed.prompt);
      }
    }
  });
});

describe('the topic filter', () => {
  const limits = { chapters: [13], tier: 'medium' as const };
  const all = candidates(limits).map((g) => g.id);

  it('never draws a topic that is switched off', () => {
    const off = all.slice(1);
    for (let i = 0; i < 40; i++) {
      expect(draw({ ...limits, topics: { off } })!.generatorId).toBe(all[0]);
    }
    expect(draw({ ...limits, topics: { off: all } })).toBeNull();
  });

  it('draws a topic wanted every time about half the time, and the rest besides', () => {
    const always = ['limits.standard'];
    let hits = 0;
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const id = draw({ ...limits, topics: { always } })!.generatorId;
      if (id === 'limits.standard') hits++;
      seen.add(id);
    }
    expect(hits).toBeGreaterThan(160);
    expect(hits).toBeLessThan(300);
    expect(seen.size).toBe(all.length);
  });

  it('does not ask a topic wanted every time twice running', () => {
    const always = ['limits.standard'];
    for (let i = 0; i < 40; i++) {
      expect(draw({ ...limits, topics: { always }, avoid: 'limits.standard' })!.generatorId).not.toBe(
        'limits.standard',
      );
    }
  });

  it('draws what a set still owes before anything else', () => {
    for (let i = 0; i < 20; i++) {
      expect(draw({ ...limits, owed: ['limits.squeeze'] })!.generatorId).toBe('limits.squeeze');
    }
  });

  it('leaves drilling one topic alone', () => {
    const only = ['limits.factor'];
    expect(candidates({ ...limits, only, topics: { off: only } }).map((g) => g.id)).toEqual(only);
    expect(alwaysTopics({ ...limits, only, topics: { always: ['limits.standard'] } })).toEqual([]);
  });

  it('only counts a wanted topic the selection can ask', () => {
    const topics = { always: ['limits.standard', 'diff.chain-rule'], off: ['limits.squeeze'] };
    expect(alwaysTopics({ ...limits, topics })).toEqual(['limits.standard']);
    expect(alwaysTopics({ chapters: [13], tier: 'easy', topics })).toEqual([]);
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
