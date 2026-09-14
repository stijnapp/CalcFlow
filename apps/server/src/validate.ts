import {
  TIERS,
  type Attempt,
  type Confidence,
  type ErrorClass,
  type SelfGrade,
  type Tier,
} from '@calcflow/shared';

const CONFIDENCE = ['sure', 'think', 'guess'] as const;
const ERROR_CLASS = ['plus-c', 'not-exact', 'not-simplified', 'notation', 'sketch', 'wrong'] as const;
const SELF_GRADE = ['got', 'close', 'missed'] as const;

/*
 * These two lists are the string unions written out at runtime, and the two
 * halves are pinned to each other: widening `Confidence` or `ErrorClass` in
 * `@calcflow/shared` without adding the value here fails the build rather than
 * quietly rejecting attempts the client is entitled to send.
 */
type Unlisted<T extends never> = T;
export type _ConfidenceCovered = Unlisted<Exclude<Confidence, (typeof CONFIDENCE)[number]>>;
export type _ErrorClassCovered = Unlisted<Exclude<ErrorClass, (typeof ERROR_CLASS)[number]>>;
export type _TierCovered = Unlisted<Exclude<Tier, (typeof TIERS)[number]>>;
export type _SelfGradeCovered = Unlisted<Exclude<SelfGrade, (typeof SELF_GRADE)[number]>>;

/** 26 characters of Crockford base32 — no I, L, O or U. */
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;

type Check = (value: unknown) => boolean;

const str = (max: number): Check => (v) => typeof v === 'string' && v.length <= max;
const int = (min: number, max: number): Check => (v) =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
const oneOf = (values: readonly string[]): Check => (v) =>
  typeof v === 'string' && values.includes(v);

/*
 * A checker per field, keyed by the type itself: a field added to `Attempt`
 * stops compiling until it is given one, so the wire format cannot drift away
 * from the shape both sides share.
 */
const FIELD: { [K in keyof Attempt]-?: Check } = {
  id: (v) => typeof v === 'string' && ULID.test(v),
  device: str(64),
  ts: int(0, 4102444800000),
  generatorId: str(64),
  seed: str(64),
  genVersion: int(0, 1e6),
  chapter: int(0, 99),
  tier: oneOf(TIERS),
  correct: (v) => typeof v === 'boolean',
  confidence: oneOf(CONFIDENCE),
  hintsUsed: int(0, 1000),
  hintMaxRung: int(0, 100),
  durationMs: int(0, 86_400_000),
  answerRaw: str(2000),
  errorClass: (v) => v === null || oneOf(ERROR_CLASS)(v),
  selfGrade: (v) => v === null || oneOf(SELF_GRADE)(v),
};

const FIELDS = Object.keys(FIELD) as Array<keyof Attempt>;

/** The first thing wrong with `value`, or null if it is a whole attempt. */
export function attemptProblem(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return 'not an object';
  const record = value as Record<string, unknown>;
  for (const field of FIELDS) {
    if (!(field in record)) return `${field} is missing`;
    if (!FIELD[field](record[field])) return `${field} is not valid`;
  }
  return null;
}

/** Only the fields the log stores, so an unknown extra cannot ride along. */
export function toAttempt(value: Record<string, unknown>): Attempt {
  const out: Record<string, unknown> = {};
  for (const field of FIELDS) out[field] = value[field];
  return out as unknown as Attempt;
}
