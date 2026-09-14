import type { Tier } from './tiers.js';

/** How sure he was, captured at submit, before the result is shown. */
export type Confidence = 'sure' | 'think' | 'guess';

/**
 * Why an answer was not accepted. `plus-c`, `not-exact`, `not-simplified`,
 * `notation` and `sketch` are near misses — the maths is right but the form is
 * not — and are tracked apart from a flat wrong so they can be worded
 * differently and counted separately.
 */
export type ErrorClass =
  | 'plus-c'
  | 'not-exact'
  | 'not-simplified'
  | 'notation'
  /** A graph question whose typed features were right and whose drawing was not. */
  | 'sketch'
  | 'wrong';

/**
 * How he marked his own drawing on a graph question. Nothing can grade a
 * sketch, but three buckets is enough to keep chapters 5 and 12 in the same
 * correct / near / wrong shape as everything else — and a chapter whose numbers
 * mean something different from the rest is a chapter the stats screen lies about.
 */
export type SelfGrade = 'got' | 'close' | 'missed';

/**
 * One answered problem. Append-only: an attempt is never edited after it lands,
 * which is what makes syncing a matter of merging two logs.
 */
export interface Attempt {
  /** ULID, generated on-device — also the idempotency key for sync. */
  id: string;
  device: string;
  ts: number;
  generatorId: string;
  seed: string;
  genVersion: number;
  chapter: number;
  tier: Tier;
  correct: boolean;
  confidence: Confidence;
  hintsUsed: number;
  hintMaxRung: number;
  durationMs: number;
  answerRaw: string;
  errorClass: ErrorClass | null;
  /** Only on the drawn questions; null everywhere else. */
  selfGrade: SelfGrade | null;
}

export interface SyncEvent {
  cursor: number;
  attempt: Attempt;
}
