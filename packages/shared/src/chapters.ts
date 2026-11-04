/** The chapters of the RU Mathematics Practice Book that ship in v1. */
export interface Chapter {
  readonly n: number;
  readonly title: string;
  /** Short label used where the full title will not fit. */
  readonly short: string;
}

export const CHAPTERS: readonly Chapter[] = [
  { n: 1, title: 'Numbers & arithmetic', short: 'Numbers' },
  { n: 2, title: 'Powers', short: 'Powers' },
  { n: 3, title: 'Fractions', short: 'Fractions' },
  { n: 4, title: 'Roots', short: 'Roots' },
  { n: 5, title: 'Curves, functions, graphs', short: 'Functions' },
  { n: 6, title: 'exp, ln, log', short: 'Logs' },
  { n: 7, title: 'sin, cos, tan', short: 'Trig' },
  { n: 8, title: 'Equations', short: 'Equations' },
  { n: 9, title: 'Differentiation', short: 'Derivatives' },
  { n: 10, title: 'Antidifferentiation', short: 'Antiderivatives' },
  { n: 11, title: 'Integration', short: 'Integration' },
  { n: 12, title: 'Vectors', short: 'Vectors' },
  // Not in the practice book — the course starts here, and the exam opens with
  // it. Numbered after the book's last chapter so the ordering still reads.
  { n: 13, title: 'Limits & continuity', short: 'Limits' },
];

export const CHAPTER_NUMBERS: readonly number[] = CHAPTERS.map((c) => c.n);

/**
 * Chapters answered by drawing on the canvas rather than by typing: the graphs
 * of chapter 5 and the vectors of chapter 12. Off until those questions are
 * worth practising from — the home screen shows them greyed out, and nothing
 * draws from them.
 */
export const PAUSED_CHAPTERS: readonly number[] = [5, 12];

export function isPaused(n: number): boolean {
  return PAUSED_CHAPTERS.includes(n);
}

export function chapterTitle(n: number): string {
  return CHAPTERS.find((c) => c.n === n)?.title ?? `Chapter ${n}`;
}
