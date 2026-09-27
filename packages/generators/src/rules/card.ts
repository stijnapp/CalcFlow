/**
 * The book's boxed "know this by heart" rules, as browsable cards. Hint rung 1
 * deep-links here by `id`, so every ruleId a generator emits should have a card.
 */
export interface RuleCard {
  id: string;
  chapter: number;
  name: string;
  tex: string;
  note: string;
}

/**
 * Several of the boxed rules are really a handful of them under one heading.
 * Run together on one line they read as a wall and wrap wherever the column
 * happens to end; a line each, aligned on the equals sign, is how the book
 * prints them and how they are actually memorised.
 */
export function lines(parts: string[]): string {
  return `\\begin{aligned}${parts.join('\\\\')}\\end{aligned}`;
}
