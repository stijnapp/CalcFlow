/** How sure he was, captured at submit, before the result is shown. */
export type Confidence = 'sure' | 'think' | 'guess';

/**
 * Why an answer was not accepted. `plus-c`, `not-exact` and `not-simplified` are
 * near misses — the maths is right but the form is not — and are tracked apart
 * from a flat wrong so they can be worded differently and counted separately.
 */
export type ErrorClass = 'plus-c' | 'not-exact' | 'not-simplified' | 'wrong';

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
  steps: number;
  difficulty: number;
  correct: boolean;
  confidence: Confidence;
  hintsUsed: number;
  hintMaxRung: number;
  durationMs: number;
  answerRaw: string;
  errorClass: ErrorClass | null;
}

export interface SyncEvent {
  cursor: number;
  attempt: Attempt;
}
