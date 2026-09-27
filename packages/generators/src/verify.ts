import { equivalent, evaluate, stripPlusC, tryParse, type Expr } from '@calcflow/engine';
import {
  along,
  approaches,
  improper,
  matchesNumerically,
  numericDerivative,
  numericMixedPartial,
  search,
  simpson,
  valueOf,
  varsOf,
  type Point,
} from './numerics.js';
import type { Latex, Problem, Verification } from './types.js';

/*
 * The independent numeric checks — the ones that catch a wrong answer, not just
 * an inconsistent one. Each kind of `verify` re-derives what the answer should
 * be from the prompt, by brute force, and compares.
 */

type Kind = Exclude<Verification['kind'], 'root'>;
type Claim<K extends Kind> = Extract<Verification, { kind: K }>;

/** The claim's function, and the problem's first answer, both parsed. */
interface Given {
  f: Expr;
  answer: Expr;
  tex: Latex;
  problem: Problem;
}

/** Why the answer does not do what the claim says, or null when it does. */
type Checker<K extends Kind> = (v: Claim<K>, given: Given) => string | null;

export function runVerification(v: Verification, problem: Problem): string | null {
  const tex = problem.answers[0]!.tex;
  const answer = tryParse(tex);
  if (!answer) return `answer does not parse: ${tex}`;
  if (v.kind === 'root') return rootSatisfies(v.equation, problem);
  const f = tryParse(v.of);
  if (!f) return `verify.of does not parse: ${v.of}`;
  return checkerFor(v.kind)(v, { f, answer, tex, problem });
}

function checkerFor<K extends Kind>(kind: K): Checker<K> {
  return CHECKERS[kind];
}

/** Every declared answer must satisfy the equation. */
export function rootSatisfies(equation: string, problem: Problem): string | null {
  const parts = equation.split('=');
  if (parts.length !== 2) return `equation "${equation}" does not have exactly one =`;
  const lhs = tryParse(parts[0]!);
  const rhs = tryParse(parts[1]!);
  if (!lhs || !rhs) return `equation "${equation}" does not parse`;

  for (const spec of problem.answers) {
    const root = tryParse(spec.tex);
    if (!root) return `answer ${spec.tex} does not parse`;
    const value = evaluate(root);
    if (!Number.isFinite(value)) return `answer ${spec.tex} is not a finite value`;
    const l = evaluate(lhs, { x: value });
    const r = evaluate(rhs, { x: value });
    if (!Number.isFinite(l) || !Number.isFinite(r)) return `equation is undefined at x = ${value}`;
    if (Math.abs(l - r) > 1e-6 * Math.max(1, Math.abs(l), Math.abs(r))) {
      return `x = ${spec.tex} (${value}) does not satisfy ${equation}`;
    }
  }
  return null;
}

/** A number worked out by quadrature against the one the answer declares. */
function integralMatches(numeric: number, { answer, tex }: Given, of: Latex): string | null {
  const declared = evaluate(answer);
  return Math.abs(numeric - declared) <= 1e-6 * Math.max(1, Math.abs(declared))
    ? null
    : `answer ${tex} (${declared}) does not match the integral of ${of} (${numeric})`;
}

const tangent: Checker<'tangent'> = (v, { f, answer, tex }) => {
  const at = tryParse(v.at);
  if (!at) return `verify.at does not parse: ${v.at}`;
  const line = (b: Point) => {
    const point = { ...b, [v.wrt]: evaluate(at, b) };
    return evaluate(f, point) + numericDerivative(f, v.wrt, point) * (b[v.wrt]! - point[v.wrt]!);
  };
  return matchesNumerically(line, valueOf(answer), varsOf(f, at, answer))
    ? null
    : `answer ${tex} is not the tangent to ${v.of} at ${v.wrt} = ${v.at}`;
};

const limit: Checker<'limit'> = (v, { f, tex }) => {
  const targetTex = v.equals ?? tex;
  const target = tryParse(targetTex);
  if (!target) return `verify.equals does not parse: ${targetTex}`;
  const declared = evaluate(target);
  if (!Number.isFinite(declared)) return `${targetTex} is not a finite value`;
  return approaches(f, v, declared)
    ? null
    : `${v.of} does not approach ${targetTex} (${declared}) as ${v.wrt} → ${v.at}`;
};

/** Every answer is a place where the second difference changes sign, passing through zero. */
const inflection: Checker<'inflection'> = (v, { f, problem }) => {
  const g = along(f, v.wrt);
  const bend = (x: number) => (g(x + 1e-3) - 2 * g(x) + g(x - 1e-3)) / 1e-6;
  for (const spec of problem.answers) {
    const e = tryParse(spec.tex);
    if (!e) return `answer ${spec.tex} does not parse`;
    const at = evaluate(e);
    const [left, mid, right] = [bend(at - 1e-2), bend(at), bend(at + 1e-2)];
    const flat = 1e-2 * Math.max(Math.abs(left), Math.abs(right));
    if (!(left * right < 0 && Math.abs(mid) <= flat)) {
      return `${v.of} does not change how it bends at ${spec.tex}`;
    }
  }
  return null;
};

/** Both where the search lands and how high it gets there. */
const extremum: Checker<'extremum'> = (v, { f }) => {
  const g = along(f, v.wrt);
  const best = search(v.find === 'max' ? g : (x) => -g(x), v.from, v.to);
  const claims = [
    ['at', v.at, best.at],
    ['value', v.value, g(best.at)],
  ] as const;
  for (const [field, tex, found] of claims) {
    const e = tryParse(tex);
    if (!e) return `verify.${field} does not parse: ${tex}`;
    const declared = evaluate(e);
    if (!(Math.abs(found - declared) <= 1e-5 * Math.max(1, Math.abs(declared)))) {
      return `verify.${field} ${tex} (${declared}) is not what a search for the ${v.find} of ${v.of} finds (${found})`;
    }
  }
  return null;
};

const CHECKERS: { [K in Kind]: Checker<K> } = {
  identity: (v, { f, answer, tex }) =>
    equivalent(f, answer) ? null : `answer ${tex} is not equal to the prompt ${v.of}`,

  tangent,

  derivative: (v, { f, answer, tex }) =>
    matchesNumerically((b) => numericDerivative(f, v.wrt, b), valueOf(answer), varsOf(f, answer))
      ? null
      : `answer ${tex} is not the derivative of ${v.of}`,

  // The constant is not a variable, so it comes off before differentiating.
  antiderivative: (v, { f, answer, tex }) => {
    const bare = stripPlusC(answer);
    return matchesNumerically((b) => numericDerivative(bare, v.wrt, b), valueOf(f), varsOf(f, bare))
      ? null
      : `d/d${v.wrt} of ${tex} is not ${v.of}`;
  },

  // In pieces between the breaks: Simpson is only accurate where f is smooth.
  'definite-integral': (v, given) => {
    const g = along(given.f, v.wrt);
    const edges = [v.from, ...(v.breaks ?? []), v.to];
    const numeric = edges.slice(1).reduce((total, to, i) => total + simpson(g, edges[i]!, to), 0);
    return integralMatches(numeric, given, v.of);
  },

  limit,
  inflection,

  'mixed-partial': (v, { f, answer, tex }) =>
    matchesNumerically((b) => numericMixedPartial(f, v.wrt, b), valueOf(answer), varsOf(f, answer))
      ? null
      : `answer ${tex} is not the mixed partial of ${v.of} in ${v.wrt.join(' and ')}`,

  'improper-integral': (v, given) => {
    const numeric = improper(along(given.f, v.wrt), v.from, v.to);
    if (!Number.isFinite(numeric)) return `the integral of ${v.of} does not settle numerically`;
    return integralMatches(numeric, given, v.of);
  },

  extremum,

  // Samples where g lands outside f's domain come back non-finite and are
  // skipped, which is what makes this work for the half-line inverses.
  inverse: (v, { f, answer, tex }) =>
    matchesNumerically(
      (b) => evaluate(f, { ...b, [v.wrt]: evaluate(answer, b) }),
      (b) => b[v.wrt]!,
      [v.wrt],
    )
      ? null
      : `${v.of} does not undo the answer ${tex}`,
};
