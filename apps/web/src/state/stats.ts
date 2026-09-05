import { CHAPTERS, chapterTitle, type Attempt } from '@calcflow/shared';
import { median } from '@/lib/format';

export type Speed = 'fast' | 'par' | 'slow';

export interface ChapterStat {
  chapter: number;
  title: string;
  attempts: number;
  /** Attempts inside the recent window — what every count below is out of. */
  recent: number;
  correct: number;
  wrong: number;
  /** 0–100. Confident-and-wrong counts against twice, because it is a
   *  misconception rather than a gap. */
  mastery: number;
  medianMs: number;
  /** Against his own median across every chapter, not an outside benchmark. */
  speed: Speed;
  confidentWrong: number;
}

export interface Matrix {
  sureRight: number;
  sureWrong: number;
  unsureRight: number;
  unsureWrong: number;
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
}

/** Only the recent past says anything about where he stands now. */
const WINDOW = 30;

export function computeStats(attempts: Attempt[]): Stats {
  const overallMedianMs = median(attempts.map((a) => a.durationMs));

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
      mastery: recent.length ? Math.max(0, Math.round((rate - penalty) * 100)) : 0,
      medianMs,
      speed: speedOf(medianMs, overallMedianMs),
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

  return {
    total: attempts.length,
    overallMedianMs,
    byChapter,
    matrix,
    studyNext,
    buildSpeed,
  };
}

function speedOf(chapterMedian: number, overallMedian: number): Speed {
  if (!chapterMedian || !overallMedian) return 'par';
  const ratio = chapterMedian / overallMedian;
  if (ratio < 0.8) return 'fast';
  if (ratio > 1.25) return 'slow';
  return 'par';
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
