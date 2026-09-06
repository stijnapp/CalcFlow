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
  { n: 6, title: 'exp, ln, log', short: 'Logs' },
  { n: 7, title: 'sin, cos, tan', short: 'Trig' },
  { n: 8, title: 'Equations', short: 'Equations' },
  { n: 9, title: 'Differentiation', short: 'Derivatives' },
  { n: 10, title: 'Antidifferentiation', short: 'Antiderivatives' },
  { n: 11, title: 'Integration', short: 'Integration' },
];

export const CHAPTER_NUMBERS: readonly number[] = CHAPTERS.map((c) => c.n);

export function chapterTitle(n: number): string {
  return CHAPTERS.find((c) => c.n === n)?.title ?? `Chapter ${n}`;
}
