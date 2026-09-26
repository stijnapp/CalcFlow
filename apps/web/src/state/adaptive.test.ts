import { describe, expect, it } from 'vitest';
import { levelOf, nextLevel, tierFor, type Evidence } from './adaptive';

const clean: Evidence = { correct: true, errorClass: null, confidence: 'sure', hintMaxRung: 0 };
const wrong: Evidence = { correct: false, errorClass: 'wrong', confidence: 'sure', hintMaxRung: 0 };

describe('adaptive difficulty', () => {
  it('starts on the tier he picked', () => {
    expect(levelOf('easy')).toBe(0);
    expect(levelOf('medium')).toBe(1);
    expect(levelOf('hard')).toBe(2);
  });

  it('draws only the picked tier until something has moved it', () => {
    for (const r of [0, 0.3, 0.99]) expect(tierFor(1, () => r)).toBe('medium');
  });

  it('blends the two neighbouring tiers in between', () => {
    // A quarter of the way from medium to hard is one hard question in four.
    expect(tierFor(1.25, () => 0.1)).toBe('hard');
    expect(tierFor(1.25, () => 0.3)).toBe('medium');
  });

  it('takes four clean answers to move a whole tier, not one streak', () => {
    let level = levelOf('medium');
    for (let i = 0; i < 3; i += 1) level = nextLevel(level, clean);
    expect(level).toBeCloseTo(1.75);
    level = nextLevel(level, clean);
    expect(level).toBeCloseTo(2);
  });

  it('costs two clean answers for every miss', () => {
    expect(nextLevel(1, wrong)).toBeCloseTo(0.5);
  });

  it('holds still for a right answer he did not own', () => {
    expect(nextLevel(1, { ...clean, hintMaxRung: 2 })).toBe(1);
    expect(nextLevel(1, { ...clean, confidence: 'guess' })).toBe(1);
  });

  it('holds still for a near miss — the maths was there', () => {
    expect(nextLevel(1, { ...wrong, errorClass: 'plus-c' })).toBe(1);
    expect(nextLevel(1, { ...wrong, errorClass: 'sketch' })).toBe(1);
  });

  it('stays inside the three tiers', () => {
    expect(nextLevel(2, clean)).toBe(2);
    expect(nextLevel(0, wrong)).toBe(0);
  });

  it('settles where about two in three are right', () => {
    // Up a quarter per clean answer and down a half per miss balance at p = 2/3.
    const p = 2 / 3;
    expect(p * nextLevel(0.5, clean) + (1 - p) * nextLevel(0.5, wrong)).toBeCloseTo(0.5);
  });
});
