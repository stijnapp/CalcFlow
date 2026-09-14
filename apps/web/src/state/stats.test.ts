import { describe, expect, it } from 'vitest';
import type { Attempt } from '@calcflow/shared';
import { computeStats } from './stats';

const DAY = 86_400_000;

let counter = 0;

function attempt(partial: Partial<Attempt> = {}): Attempt {
  counter += 1;
  return {
    id: `a${counter}`,
    device: 'test',
    ts: Date.now(),
    generatorId: 'diff.power-sum',
    seed: `s${counter}`,
    genVersion: 1,
    chapter: 9,
    tier: 'medium',
    correct: true,
    confidence: 'think',
    hintsUsed: 0,
    hintMaxRung: 0,
    durationMs: 40_000,
    answerRaw: 'x',
    errorClass: null,
    selfGrade: null,
    ...partial,
  };
}

function many(n: number, partial: Partial<Attempt> | ((i: number) => Partial<Attempt>)): Attempt[] {
  return Array.from({ length: n }, (_, i) =>
    attempt(typeof partial === 'function' ? partial(i) : partial),
  );
}

describe('calibration', () => {
  it('reports the share right behind each answer to how sure are you', () => {
    const stats = computeStats([
      ...many(6, { confidence: 'sure', correct: true }),
      ...many(2, { confidence: 'sure', correct: false, errorClass: 'wrong' }),
      ...many(5, { confidence: 'guess', correct: false, errorClass: 'wrong' }),
    ]);
    expect(stats.calibration.find((c) => c.confidence === 'sure')).toMatchObject({ n: 8, rate: 75 });
    expect(stats.calibration.find((c) => c.confidence === 'guess')).toMatchObject({ n: 5, rate: 0 });
  });
});

describe('error mix', () => {
  it('shares are of the wrong answers, not of every attempt', () => {
    const stats = computeStats([
      ...many(10, { correct: true }),
      ...many(3, { correct: false, errorClass: 'plus-c' }),
      ...many(1, { correct: false, errorClass: 'wrong' }),
    ]);
    expect(stats.errorMix[0]).toMatchObject({ errorClass: 'plus-c', n: 3, share: 75, nearMiss: true });
  });
});

describe('retention', () => {
  it('buckets an attempt by the gap since that topic last came up', () => {
    const now = Date.now();
    const stats = computeStats([
      attempt({ ts: now - 30 * DAY, generatorId: 'g1' }),
      // 30 days later: over a week, and wrong.
      attempt({ ts: now, generatorId: 'g1', correct: false, errorClass: 'wrong' }),
      attempt({ ts: now - 2 * DAY, generatorId: 'g2' }),
      attempt({ ts: now, generatorId: 'g2' }),
    ]);
    const rows = Object.fromEntries(stats.retention.map((r) => [r.label, r]));
    expect(rows['Over a week']).toMatchObject({ n: 1, rate: 0 });
    expect(rows['1–3 days']).toMatchObject({ n: 1, rate: 100 });
    // The first sighting of each topic is not a retention measurement.
    expect(rows['Same day']!.n).toBe(0);
  });
});

describe('streak', () => {
  it('counts back from today and stops at the first missing day', () => {
    const now = Date.now();
    const stats = computeStats([
      attempt({ ts: now }),
      attempt({ ts: now - DAY }),
      attempt({ ts: now - 2 * DAY }),
      attempt({ ts: now - 5 * DAY }),
    ]);
    expect(stats.streak).toBe(3);
  });

  it('is zero once a whole day has been missed', () => {
    expect(computeStats([attempt({ ts: Date.now() - 3 * DAY })]).streak).toBe(0);
  });
});

describe('trend', () => {
  it('stays null until there is history on both sides of the split', () => {
    expect(computeStats(many(12, { durationMs: 40_000 })).byChapter.find((c) => c.chapter === 9)!.trend)
      .toBeNull();
  });

  it('is negative when the recent ten are faster than the twenty before', () => {
    const stats = computeStats(many(30, (i) => ({ durationMs: i < 20 ? 100_000 : 50_000 })));
    expect(stats.byChapter.find((c) => c.chapter === 9)!.trend).toBe(-50);
  });
});

describe('the read', () => {
  it('is silent on a log with nothing to say', () => {
    expect(computeStats([]).read).toBeNull();
  });

  it('leads with calibration once no single rule stands out', () => {
    const stats = computeStats([
      ...many(12, { confidence: 'sure', correct: true }),
      // A generator that no longer exists resolves to no rule at all, which is
      // also the check that a retired id cannot take the stats screen down.
      ...many(8, { generatorId: 'retired.topic', confidence: 'sure', correct: false, errorClass: 'wrong' }),
    ]);
    expect(stats.shakyRules).toEqual([]);
    expect(stats.read?.id).toBe('calibration');
  });

  it('prefers a misremembered rule to everything else', () => {
    // Three confident wrongs on one generator: the rebuild resolves them to the
    // same headline rule, which is the whole point of rolling up by rule.
    const stats = computeStats([
      ...many(12, { confidence: 'sure', correct: true }),
      ...many(4, { generatorId: 'diff.chain-rule', confidence: 'sure', correct: false, errorClass: 'wrong' }),
    ]);
    expect(stats.read?.id).toBe('rule');
    expect(stats.shakyRules[0]?.n).toBe(4);
  });
});
