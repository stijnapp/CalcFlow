import type { Expr } from './expr.js';
import { equivalent, type Domain } from './equivalent.js';
import { hasPlusC, isExact, isSimplified, stripPlusC } from './form.js';
import { tryParse } from './parse.js';

export type ErrorClass = 'plus-c' | 'not-exact' | 'not-simplified' | 'notation' | 'wrong';

export interface Requirements {
  /** Indefinite integrals need the constant of integration. */
  plusC?: boolean;
  /** Reject decimals where an exact value is wanted. Default true. */
  exact?: boolean;
  /** Reject an answer left obviously uncollapsed. Default true. */
  simplified?: boolean;
}

export interface GradeInput {
  raw: string;
  reference: Expr;
  domain?: Domain;
  requires?: Requirements;
  /** Antiderivatives are only correct up to an additive constant. */
  upToConstant?: boolean;
}

export interface GradeResult {
  correct: boolean;
  /** Null when correct. */
  errorClass: ErrorClass | null;
  /** The input could not be read as maths at all. */
  parsed: boolean;
  user: Expr | null;
}

/**
 * Grades one answer field. Order matters: establish that the maths is right
 * first, so a near miss can be told apart from a wrong answer and worded
 * differently — "you forgot the +C" is a very different message from "not right".
 */
export function grade(input: GradeInput): GradeResult {
  const { raw, reference, domain, requires = {}, upToConstant = false } = input;
  const user = tryParse(raw);
  if (!user) return { correct: false, errorClass: 'wrong', parsed: false, user: null };

  const bare = stripPlusC(user);
  const mathRight = equivalent(bare, reference, {
    domain,
    mode: upToConstant ? 'constant-difference' : 'value',
  });

  if (!mathRight) return { correct: false, errorClass: 'wrong', parsed: true, user };

  if (requires.plusC && !hasPlusC(user)) {
    return { correct: false, errorClass: 'plus-c', parsed: true, user };
  }
  if (requires.exact !== false && !isExact(user, reference)) {
    return { correct: false, errorClass: 'not-exact', parsed: true, user };
  }
  if (requires.simplified !== false && !isSimplified(bare, reference)) {
    return { correct: false, errorClass: 'not-simplified', parsed: true, user };
  }
  return { correct: true, errorClass: null, parsed: true, user };
}
