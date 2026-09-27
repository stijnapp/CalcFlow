import { ALGEBRA_RULES } from './rules/algebra.js';
import { CALCULUS_RULES } from './rules/calculus.js';
import type { RuleCard } from './rules/card.js';

export type { RuleCard } from './rules/card.js';

/**
 * Every card, in chapter order and otherwise in the order written; the cards
 * themselves live in `rules/`.
 */
export const RULES: readonly RuleCard[] = [...ALGEBRA_RULES, ...CALCULUS_RULES].sort(
  (a, b) => a.chapter - b.chapter,
);

export function ruleById(id: string): RuleCard | undefined {
  return RULES.find((r) => r.id === id);
}
