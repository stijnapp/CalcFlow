import { type Expr, add, complexity, walk } from './expr.js';
import { evaluate } from './evaluate.js';

/** A bare `+ C` sitting at the top level of a sum. */
export function hasPlusC(e: Expr): boolean {
  if (e.kind === 'sym') return isC(e.name);
  if (e.kind !== 'add') return false;
  return e.terms.some((t) => t.kind === 'sym' && isC(t.name));
}

/** The same expression with its constant of integration removed. */
export function stripPlusC(e: Expr): Expr {
  if (e.kind === 'sym' && isC(e.name)) return { kind: 'num', value: 0 };
  if (e.kind !== 'add') return e;
  const kept = e.terms.filter((t) => !(t.kind === 'sym' && isC(t.name)));
  if (kept.length === e.terms.length) return e;
  if (kept.length === 0) return { kind: 'num', value: 0 };
  return add(...kept);
}

const isC = (name: string) => name === 'C' || name === 'c';

function hasNonIntegerDecimal(e: Expr): boolean {
  let found = false;
  walk(e, (n) => {
    if (n.kind === 'num' && n.decimal && !Number.isInteger(n.value)) found = true;
  });
  return found;
}

/** True when the expression is built only from literal numbers and arithmetic. */
function isRationalLiteral(e: Expr): boolean {
  let ok = true;
  walk(e, (n) => {
    if (n.kind === 'sym' || n.kind === 'fn') ok = false;
    if (n.kind === 'pow' && !(n.exp.kind === 'num' && Number.isInteger(n.exp.value))) ok = false;
  });
  return ok;
}

/** Does this reference value have a finite decimal expansion worth writing? */
function terminates(reference: Expr): boolean {
  if (!isRationalLiteral(reference)) return false;
  const v = evaluate(reference);
  if (!Number.isFinite(v)) return false;
  for (let k = 0; k <= 9; k += 1) {
    const scaled = v * 10 ** k;
    if (Math.abs(scaled - Math.round(scaled)) < 1e-9) return true;
  }
  return false;
}

/**
 * The book is emphatic that answers be exact, so `0.866` is rejected where
 * `½√3` is wanted — but a decimal is fine when the reference itself is one.
 */
export function isExact(user: Expr, reference: Expr): boolean {
  if (!hasNonIntegerDecimal(user)) return true;
  return terminates(reference);
}

/**
 * A structural check, not a proof: an answer far bulkier than the reference has
 * almost certainly been left half-collapsed. The slack is generous on purpose —
 * a wrongly flagged correct answer is far more annoying than a missed one.
 */
export function isSimplified(user: Expr, reference: Expr): boolean {
  return complexity(user) <= complexity(reference) * 1.5 + 3;
}
