import { RULES } from './rules.js';
import type { Rng } from './types.js';
import { DERIVATIVES } from './examples/derivatives.js';
import type { Build, RuleExample } from './examples/format.js';
import { FUNCTIONS } from './examples/functions.js';
import { INTEGRALS } from './examples/integrals.js';
import { NUMBERS } from './examples/numbers.js';
import { TRIG_AND_EQUATIONS } from './examples/trig-equations.js';
import { VECTORS_AND_LIMITS } from './examples/vectors-limits.js';

export type { RuleExample } from './examples/format.js';

/**
 * A rule card states the shape; this fills the letters in. `(a+b)(a-b)=a^2-b^2`
 * is a thing to nod at, and `53\cdot 47 = 2500 - 9` is the thing that makes it
 * worth remembering — so every card can show one, and roll a fresh one when the
 * numbers that came up were not the ones that made it land.
 *
 * These are written out by hand rather than pulled from the generators: a rule
 * is not a topic, several rules share one generator and several generators
 * share one rule, and an example that demonstrates *this* card is a different
 * thing from a problem that happens to use it.
 *
 * The builders live in `examples/`, a file per few chapters.
 */
const EXAMPLES: Record<string, Build> = {
  ...NUMBERS,
  ...FUNCTIONS,
  ...TRIG_AND_EQUATIONS,
  ...DERIVATIVES,
  ...INTEGRALS,
  ...VECTORS_AND_LIMITS,
};

/**
 * A worked instance of the rule, or nothing if the card has no example written
 * for it yet. The caller owns the rng, so "randomise" is one more draw from it.
 */
export function ruleExample(id: string, rng: Rng): RuleExample | undefined {
  return EXAMPLES[id]?.(rng);
}

/** Every card that can show one. Used by the test that keeps this list complete. */
export const RULES_WITH_EXAMPLES: readonly string[] = RULES.map((r) => r.id).filter(
  (id) => id in EXAMPLES,
);
