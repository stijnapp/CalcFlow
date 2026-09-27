import { GENERATORS, rebuild, ruleById } from '@calcflow/generators';
import {
  CHAPTERS,
  TIER_LABEL,
  TIERS,
  chapterTitle,
  type Attempt,
  type Confidence,
  type ErrorClass,
  type Tier,
} from '@calcflow/shared';
import { median, percent } from '@/lib/format';
import { readOf } from './insights';
import type { Trend } from './pace';

export { paceOf, type Pace, type Trend } from './pace';

export type Speed = 'fast' | 'par' | 'slow';

export interface ChapterStat {
  chapter: number;
  title: string;
  attempts: number;
  /** Attempts inside the recent window — what every count below is out of. */
  recent: number;
  correct: number;
  wrong: number;
  /** 0–100, plainly what share of the window they got right. What the bar shows. */
  rightRate: number;
  /** 0–100. Confident-and-wrong counts against twice, because it is a
   *  misconception rather than a gap. What the recommendations rank on. */
  mastery: number;
  medianMs: number;
  /** Against their own median across every chapter, not an outside benchmark. */
  speed: Speed;
  /**
   * The recent attempts in the chapter against the earlier ones. Null until
   * there is enough history on both sides to mean anything. A median says where
   * the chapter is; this says which way it is going, and only the second one
   * can tell practice from plateau.
   */
  trend: Trend | null;
  /** 0–100 of the window solved without opening the hint panel at all. */
  hintFree: number;
  confidentWrong: number;
}

export interface Matrix {
  sureRight: number;
  sureWrong: number;
  unsureRight: number;
  unsureWrong: number;
}

export interface CalibrationRow {
  confidence: Confidence;
  label: string;
  n: number;
  right: number;
  /** 0–100. Compared against itself over time, not against a target. */
  rate: number;
}

export interface ErrorRow {
  errorClass: ErrorClass;
  label: string;
  n: number;
  /** 0–100 of the wrong answers in the window, not of all attempts. */
  share: number;
  /** Form rather than maths — the ones worth separating out. */
  nearMiss: boolean;
}

export interface RuleRow {
  ruleId: string;
  title: string;
  /** How often they were sure and wrong on a problem that uses this rule. */
  n: number;
}

export interface RetentionRow {
  label: string;
  n: number;
  rate: number;
}

export interface TierRow {
  tier: Tier;
  label: string;
  n: number;
  rate: number;
}

export interface TopicRow {
  generatorId: string;
  title: string;
  chapter: number;
  attempts: number;
  /** Days since it last came up, or null if it never has. */
  days: number | null;
  rate: number;
}

/**
 * One sentence about the log, written so it says what to do about itself. Only
 * ever one is shown; the rank decides which, and the rest stay folded away.
 */
export interface Insight {
  id: string;
  text: string;
}

export interface Stats {
  total: number;
  overallMedianMs: number;
  byChapter: ChapterStat[];
  matrix: Matrix;
  /** The misconception worth fixing first. */
  studyNext: ChapterStat | null;
  /** Right but slow — fluency practice rather than error correction. */
  buildSpeed: ChapterStat | null;
  calibration: CalibrationRow[];
  errorMix: ErrorRow[];
  /** Confident-and-wrong rolled up by rule rather than by chapter. */
  shakyRules: RuleRow[];
  retention: RetentionRow[];
  tiers: TierRow[];
  topics: TopicRow[];
  /** 0–100 of the recent window solved with the hint panel unopened. */
  hintFree: number;
  hintFreeOf: number;
  /** Consecutive days ending today (or yesterday, mid-day) with an attempt. */
  streak: number;
  /** The single line worth putting at the top of the screen, if there is one. */
  read: Insight | null;
}

/** Only the recent past says anything about where they stand now. */
const WINDOW = 30;

/**
 * The log-wide window. Wider than a chapter's, because the readouts drawn from
 * it — calibration, the error mix, retention — slice it further and go quiet
 * below their own minimum counts.
 */
const LOG_WINDOW = 150;

const DAY = 86_400_000;

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  sure: 'Sure',
  think: 'Think so',
  guess: 'Guessed',
};

const ERROR_LABEL: Record<ErrorClass, string> = {
  'plus-c': 'Forgot + C',
  'not-exact': 'Rounded instead of exact',
  'not-simplified': 'Left unsimplified',
  notation: 'Typed it wrong',
  sketch: 'Sketch off',
  wrong: 'Wrong',
};

const NEAR_MISS: ErrorClass[] = ['plus-c', 'not-exact', 'not-simplified', 'notation', 'sketch'];

export function computeStats(attempts: Attempt[]): Stats {
  const overallMedianMs = median(attempts.map((a) => a.durationMs));
  const window = attempts.slice(-LOG_WINDOW);

  const byChapter = CHAPTERS.map(({ n }) => {
    const all = attempts.filter((a) => a.chapter === n);
    const recent = all.slice(-WINDOW);
    const correct = recent.filter((a) => a.correct).length;
    const confidentWrong = recent.filter((a) => !a.correct && a.confidence === 'sure').length;
    const medianMs = median(recent.map((a) => a.durationMs));

    const rate = recent.length ? correct / recent.length : 0;
    const penalty = recent.length ? (0.5 * confidentWrong) / recent.length : 0;

    return {
      chapter: n,
      title: chapterTitle(n),
      attempts: all.length,
      recent: recent.length,
      correct,
      wrong: recent.length - correct,
      rightRate: Math.round(rate * 100),
      mastery: recent.length ? Math.max(0, Math.round((rate - penalty) * 100)) : 0,
      medianMs,
      speed: speedOf(medianMs, overallMedianMs),
      trend: trendOf(all),
      hintFree: percent(recent.filter((a) => a.hintMaxRung === 0).length, recent.length),
      confidentWrong,
    } satisfies ChapterStat;
  });

  const matrix: Matrix = {
    sureRight: attempts.filter((a) => a.correct && a.confidence === 'sure').length,
    sureWrong: attempts.filter((a) => !a.correct && a.confidence === 'sure').length,
    unsureRight: attempts.filter((a) => a.correct && a.confidence !== 'sure').length,
    unsureWrong: attempts.filter((a) => !a.correct && a.confidence !== 'sure').length,
  };

  const rated = byChapter.filter((c) => c.attempts >= 3);
  const studyNext =
    [...rated].filter((c) => c.confidentWrong > 0).sort((a, b) => b.confidentWrong - a.confidentWrong)[0] ??
    [...rated].sort((a, b) => a.mastery - b.mastery)[0] ??
    null;

  const buildSpeed =
    [...rated]
      .filter((c) => c.mastery >= 65 && c.speed === 'slow' && c.chapter !== studyNext?.chapter)
      .sort((a, b) => b.medianMs - a.medianMs)[0] ?? null;

  const hintFreeOf = window.length;
  const stats: Stats = {
    total: attempts.length,
    overallMedianMs,
    byChapter,
    matrix,
    studyNext,
    buildSpeed,
    calibration: calibrationOf(window),
    errorMix: errorMixOf(window),
    shakyRules: shakyRulesOf(window),
    retention: retentionOf(attempts),
    tiers: tiersOf(window),
    topics: topicsOf(attempts),
    hintFree: percent(window.filter((a) => a.hintMaxRung === 0).length, hintFreeOf),
    hintFreeOf,
    streak: streakOf(attempts),
    read: null,
  };
  stats.read = readOf(stats);
  return stats;
}

function speedOf(chapterMedian: number, overallMedian: number): Speed {
  if (!chapterMedian || !overallMedian) return 'par';
  const ratio = chapterMedian / overallMedian;
  if (ratio < 0.8) return 'fast';
  if (ratio > 1.25) return 'slow';
  return 'par';
}

/**
 * Counted in attempts rather than in days on purpose: a fortnight off is not a
 * slowdown, and a week where they did forty problems in one chapter is not a
 * speed-up either. Ten against the twenty before them is the shortest pair of
 * windows whose medians are not just noise.
 */
function trendOf(all: Attempt[]): Trend | null {
  if (all.length < 15) return null;
  const recent = all.slice(-10);
  const prior = all.slice(-30, -10);
  if (prior.length < 5) return null;
  const before = median(prior.map((a) => a.durationMs));
  if (!before) return null;
  const right = (rows: Attempt[]) => percent(rows.filter((a) => a.correct).length, rows.length);
  return {
    time: Math.round(((median(recent.map((a) => a.durationMs)) - before) / before) * 100),
    rightBefore: right(prior),
    rightNow: right(recent),
  };
}

/**
 * What each answer to "how sure are you?" turned out to be worth. Without this
 * the confidence question costs a tap a problem and pays nothing back.
 */
function calibrationOf(window: Attempt[]): CalibrationRow[] {
  const order: Confidence[] = ['sure', 'think', 'guess'];
  return order.map((confidence) => {
    const rows = window.filter((a) => a.confidence === confidence);
    const right = rows.filter((a) => a.correct).length;
    return {
      confidence,
      label: CONFIDENCE_LABEL[confidence],
      n: rows.length,
      right,
      rate: percent(right, rows.length),
    };
  });
}

/** Of the wrong answers, how many were maths and how many were only form. */
function errorMixOf(window: Attempt[]): ErrorRow[] {
  const wrong = window.filter((a) => !a.correct && a.errorClass !== null);
  const counts = new Map<ErrorClass, number>();
  for (const a of wrong) counts.set(a.errorClass!, (counts.get(a.errorClass!) ?? 0) + 1);
  return [...counts]
    .map(([errorClass, n]) => ({
      errorClass,
      label: ERROR_LABEL[errorClass],
      n,
      share: percent(n, wrong.length),
      nearMiss: NEAR_MISS.includes(errorClass),
    }))
    .sort((a, b) => b.n - a.n);
}

/**
 * "Chapter 9 needs work" is not a thing you can practise. The rules a problem
 * touches are on the problem, and a problem rebuilds exactly from its seed —
 * so the confident-wrong attempts can be asked what they were actually about.
 * Only those get rebuilt: it is a handful of generator calls, not the log.
 */
function shakyRulesOf(window: Attempt[]): RuleRow[] {
  const counts = new Map<string, number>();
  for (const a of window.filter((x) => !x.correct && x.confidence === 'sure').slice(-40)) {
    let problem;
    try {
      problem = rebuild(a.generatorId, a.seed, a.tier);
    } catch {
      continue;
    }
    // The headline rule only: a chain-rule problem also touches the power rule,
    // and counting both would bury the one they are actually getting wrong.
    const ruleId = problem?.ruleIds[0];
    if (ruleId) counts.set(ruleId, (counts.get(ruleId) ?? 0) + 1);
  }
  return [...counts]
    .map(([ruleId, n]) => ({ ruleId, title: ruleById(ruleId)?.name ?? ruleId, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);
}

/**
 * Accuracy against how long it had been since they last saw that exact topic.
 * This is the difference between practising what they are worst at and practising
 * what they are about to forget.
 */
function retentionOf(attempts: Attempt[]): RetentionRow[] {
  const buckets: Array<{ label: string; upTo: number; n: number; right: number }> = [
    { label: 'Same day', upTo: 1, n: 0, right: 0 },
    { label: '1–3 days', upTo: 4, n: 0, right: 0 },
    { label: '4–7 days', upTo: 8, n: 0, right: 0 },
    { label: 'Over a week', upTo: Infinity, n: 0, right: 0 },
  ];
  const lastSeen = new Map<string, number>();
  for (const a of [...attempts].sort((x, y) => x.ts - y.ts)) {
    const previous = lastSeen.get(a.generatorId);
    lastSeen.set(a.generatorId, a.ts);
    // A topic's first ever appearance is not a retention measurement.
    if (previous === undefined) continue;
    const days = (a.ts - previous) / DAY;
    const bucket = buckets.find((b) => days < b.upTo)!;
    bucket.n += 1;
    if (a.correct) bucket.right += 1;
  }
  return buckets.map(({ label, n, right }) => ({ label, n, rate: percent(right, n) }));
}

function tiersOf(window: Attempt[]): TierRow[] {
  return TIERS.map((tier) => {
    const rows = window.filter((a) => a.tier === tier);
    return {
      tier,
      label: TIER_LABEL[tier],
      n: rows.length,
      rate: percent(rows.filter((a) => a.correct).length, rows.length),
    };
  });
}

/**
 * One row per generator, not per chapter: a chapter average stays healthy while
 * one of its five topics quietly goes a month without coming up.
 */
function topicsOf(attempts: Attempt[]): TopicRow[] {
  const now = Date.now();
  return GENERATORS.map((g) => {
    const rows = attempts.filter((a) => a.generatorId === g.id);
    const last = rows.length ? Math.max(...rows.map((a) => a.ts)) : null;
    return {
      generatorId: g.id,
      title: g.title,
      chapter: g.chapter,
      attempts: rows.length,
      days: last === null ? null : Math.floor((now - last) / DAY),
      rate: percent(rows.filter((a) => a.correct).length, rows.length),
    };
  }).sort((a, b) => a.chapter - b.chapter || a.title.localeCompare(b.title));
}

function streakOf(attempts: Attempt[]): number {
  const days = new Set(attempts.map((a) => new Date(a.ts).toDateString()));
  if (days.size === 0) return 0;
  const cursor = new Date();
  // A day that is not over yet does not break a streak, so start from yesterday
  // when nothing has been answered today.
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Chapters ranked worst-first, for the "drill weak spots" session. */
export function weakChapters(stats: Stats): number[] {
  return stats.byChapter
    .filter((c) => c.attempts >= 3 && c.mastery < 70)
    .sort((a, b) => a.mastery - b.mastery)
    .map((c) => c.chapter);
}

/** Right but slow — the "build speed" session. */
export function slowChapters(stats: Stats): number[] {
  return stats.byChapter
    .filter((c) => c.attempts >= 3 && c.speed === 'slow' && c.mastery >= 50)
    .sort((a, b) => b.medianMs - a.medianMs)
    .map((c) => c.chapter);
}
