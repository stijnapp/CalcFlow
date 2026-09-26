import { TIERS, tierAt, tierIndex, type Confidence, type ErrorClass, type Tier } from '@calcflow/shared';

/*
 * Adaptive difficulty moves a *level*, not the tier. The level runs from 0
 * (every question easy) to 2 (every question hard) in quarter steps, and in
 * between it is a mix of the two tiers either side: at 1.25, one question in
 * four is hard and the rest are medium.
 *
 * With nine stops on the old slider a step was a small thing. With three tiers
 * a step is the whole difference between the book's exercises and the exam,
 * and moving it after a streak threw him from one to the other — and because
 * the streak was never reset, every further right answer threw him again. A
 * quarter step per answer is back to the old grain: the next question is
 * *sometimes* harder, and it takes a real run before it always is.
 */

/** How far one answer can move the level: a quarter of a tier. */
const STEP = 0.25;
const TOP = TIERS.length - 1;

/** What an answer says about whether the level is right. */
export interface Evidence {
  correct: boolean;
  errorClass: ErrorClass | null;
  confidence: Confidence;
  hintMaxRung: number;
}

export function levelOf(tier: Tier): number {
  return tierIndex(tier);
}

/** The tier to draw the next question at, for a level between two of them. */
export function tierFor(level: number, random: () => number = Math.random): Tier {
  const below = Math.floor(level);
  const towardsNext = level - below;
  return tierAt(towardsNext > 0 && random() < towardsNext ? below + 1 : below);
}

/**
 * Up a quarter for an answer he owned, down a half for one he did not get:
 * those balance where about two in three are right, which is hard enough to
 * be worth doing and not so hard that the session is mostly misses.
 *
 * A right answer after hints, or one he says he guessed, is not evidence that
 * the level is too low, so it moves nothing. Neither does a near miss — a
 * missing +C, an unsimplified answer, a sketch that was close: the maths was
 * there, and that is a fluency problem, not a sign the questions are too hard.
 */
export function nextLevel(level: number, evidence: Evidence): number {
  const clamp = (n: number) => Math.min(TOP, Math.max(0, n));
  if (evidence.correct) {
    const owned = evidence.hintMaxRung === 0 && evidence.confidence !== 'guess';
    return owned ? clamp(level + STEP) : level;
  }
  return evidence.errorClass === 'wrong' || evidence.errorClass === null ? clamp(level - 2 * STEP) : level;
}
