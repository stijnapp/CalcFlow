/**
 * Three settings for "how hard", and no more. The dial this replaces ran 1–9
 * and derived a steps count and a difficulty number from it, which read as
 * precision it never had: every generator turned that pair straight back into
 * two or three hard-coded branches, so the nine stops were really three, with
 * six of them lying about it.
 *
 * The tiers are absolute rather than relative, so the same word means roughly
 * the same amount of work in every chapter:
 *
 *  - **easy** — one rule, applied to numbers chosen so the arithmetic never
 *    gets in the way of seeing it. Not trivial: he should still have to know
 *    which rule it is.
 *  - **medium** — the book's own exercises. Two or three moves, and the numbers
 *    stop being kind.
 *  - **hard** — the shape the IBC049 exam asks in. Rules nested inside each
 *    other, the useful move disguised, and answers that stay symbolic.
 */
export type Tier = 'easy' | 'medium' | 'hard';

export const TIERS = ['easy', 'medium', 'hard'] as const satisfies readonly Tier[];

export const TIER_LABEL: Record<Tier, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

/** One line under the name, so the choice is not three words with no content. */
export const TIER_BLURB: Record<Tier, string> = {
  easy: 'One rule, clean numbers',
  medium: "The book's own exercises",
  hard: 'Exam shape — nested and disguised',
};

export function isTier(value: unknown): value is Tier {
  return typeof value === 'string' && (TIERS as readonly string[]).includes(value);
}

export function tierIndex(tier: Tier): number {
  const i = TIERS.indexOf(tier);
  return i === -1 ? 1 : i;
}

export function tierAt(index: number): Tier {
  return TIERS[Math.min(TIERS.length - 1, Math.max(0, index))]!;
}

export const harder = (tier: Tier): Tier => tierAt(tierIndex(tier) + 1);
export const easier = (tier: Tier): Tier => tierAt(tierIndex(tier) - 1);

/**
 * What a 1–5 difficulty from a build before the tiers reads as now. Every
 * attempt he has already logged carries one, and the stats page would rather
 * bucket them roughly right than throw them away.
 */
export function tierFromDifficulty(difficulty: number): Tier {
  if (difficulty <= 2) return 'easy';
  if (difficulty >= 4) return 'hard';
  return 'medium';
}
