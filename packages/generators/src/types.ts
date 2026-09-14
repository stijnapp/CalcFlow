import type { Domain, Expr } from '@calcflow/engine';
import type { Tier } from '@calcflow/shared';
import type { PlotSpec } from './plot.js';

export type Latex = string;

/** Picks which on-screen keyboard the answer field gets. */
export type KeyboardLayoutId = 'numeric' | 'algebra' | 'calculus' | 'trig' | 'logs';

export type AnswerKind = 'expression' | 'number' | 'set' | 'interval' | 'choice' | 'boolean';

/** One line of the worked solution, with the name of the rule that produced it. */
export interface Step {
  /**
   * The boxed rule this line applies, if it applies one. Collecting like terms
   * or tidying a numerator is not a rule anybody looks up — see `tidy`.
   */
  ruleId?: string;
  ruleLabel: string;
  expr: Latex;
  note?: string;
  /**
   * Setup lines still carrying an unapplied operator — `\frac{d}{dx}(...)` —
   * cannot be evaluated, so they sit outside the step-chain invariant. Rare by
   * design: every line that *can* be checked must be.
   */
  display?: boolean;
}

export interface AnswerSpec {
  /** Shown beside the field when a problem has more than one, e.g. "|a|". */
  label?: string;
  kind: AnswerKind;
  /** The reference answer as LaTeX — what gets shown when he gets it wrong. */
  tex: Latex;
  /** The same answer as an AST, for the equivalence check. */
  value: Expr;
  vars: string[];
  domain?: Domain;
  requires?: { plusC?: boolean; exact?: boolean; simplified?: boolean };
  /** Antiderivatives are correct up to an additive constant. */
  upToConstant?: boolean;
  keyboard: KeyboardLayoutId;
  choices?: string[];
}

/**
 * An independent check on a generated problem, evaluated numerically by the fuzz
 * harness. This is the part that catches an algebra slip in a generator: the
 * declared answer is checked against the prompt itself, not against the
 * generator's own working.
 */
export type Verification =
  | { kind: 'derivative'; of: Latex; wrt: string }
  | { kind: 'antiderivative'; of: Latex; wrt: string }
  | { kind: 'definite-integral'; of: Latex; wrt: string; from: number; to: number }
  | { kind: 'root'; equation: Latex; wrt: string }
  /**
   * The declared answer is what `of` approaches. The engine has no limit
   * notation, so the prompt carries it and this checks it the only way there
   * is: by walking in.
   */
  | { kind: 'limit'; of: Latex; wrt: string; at: number | 'inf' | '-inf'; side?: 'left' | 'right' }
  /**
   * The declared answer is the inverse of `of`: feeding it back in gives the
   * input untouched. Checked as f(g(x)) = x, which is what an inverse means and
   * is the only claim about g that does not just restate how it was built.
   */
  | { kind: 'inverse'; of: Latex; wrt: string }
  | { kind: 'identity'; of: Latex };

export interface Problem {
  generatorId: string;
  seed: string;
  genVersion: number;
  chapter: number;
  /** Imperative label above the maths: "Differentiate", "Solve for x". */
  instruction: string;
  prompt: Latex;
  /** Word problems carry prose instead of a bare expression. */
  promptText?: string;
  /** Conditions and the form wanted, e.g. "a is a positive constant." */
  note?: string;
  answers: AnswerSpec[];
  solution: Step[];
  /**
   * Every rule card this problem touches, **headline rule first**. Hint rung 1
   * is "which rule", and it names this one — so it has to be the thing he has
   * to spot, not the first mechanical move. `(x²−25)/(x+5)` listed cancelling
   * first and rung 1 duly said "Cancelling" for a problem whose whole point is
   * the difference of squares.
   *
   * The harness checks that the list is complete; nothing can check that the
   * first one is the interesting one, so that part is on the author.
   */
  ruleIds: string[];
  verify?: Verification;
  /**
   * Set on the questions whose real answer is a drawing. The typed fields stay
   * — they are what keeps chapters 5 and 12 gradable — but the canvas becomes a
   * coordinate plane and the answer is revealed on top of the sketch.
   */
  plot?: PlotSpec;
  tier: Tier;
}

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  /** Integer in [min, max] excluding 0. */
  nonZero(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** +1 or -1. */
  sign(): number;
  bool(p?: number): boolean;
}

export interface GenContext {
  tier: Tier;
  rng: Rng;
}

/** What a generator returns; the registry stamps on the identifying fields. */
export type Draft = Omit<Problem, 'generatorId' | 'seed' | 'genVersion' | 'chapter' | 'tier'>;

export interface Generator {
  /** Stable id, e.g. "diff.chain-rule". Written into every attempt. */
  id: string;
  chapter: number;
  title: string;
  tags: string[];
  /** Bump on any behaviour change, so old attempts stay reproducible. */
  version: number;
  /**
   * The tiers this generator has something to say at. Most cover all three;
   * a few only make sense once he is past `easy`, and saying so here is what
   * keeps the easy pool from quietly filling with problems that are not.
   */
  supports: readonly Tier[];
  /**
   * The chapters this generator draws on, when it is more than its own. A
   * problem that needs a log law before the derivative rule is a different
   * animal from either chapter alone, and it is only offered when every
   * chapter it spans is switched on — otherwise it would be asking for a rule
   * he has not chosen to practise.
   */
  spans?: readonly number[];
  invariant: 'value-preserving' | 'solution-set-preserving';
  generate(ctx: GenContext): Draft;
}
