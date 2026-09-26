import { equivalent, evaluate, freeVars, parse, stripPlusC, tryParse, type Expr } from '@calcflow/engine';
import type { Tier } from '@calcflow/shared';
import { ruleById } from './rules.js';
import { build } from './registry.js';
import type { Generator, Problem, Verification } from './types.js';

/**
 * The thing that keeps generators honest. For every generator, a few hundred
 * instances across its whole declared region get checked against invariants the
 * generator cannot satisfy by being self-consistently wrong — in particular the
 * numeric `verify` hook, which re-derives the answer from the prompt.
 */

export interface Failure {
  generatorId: string;
  tier: Tier;
  seed: string;
  reason: string;
}

export interface FuzzOptions {
  /** Instances per generator, spread over its supported grid. */
  instances?: number;
}

export function fuzz(generator: Generator, opts: FuzzOptions = {}): Failure[] {
  const instances = opts.instances ?? 500;
  const failures: Failure[] = [];
  const tiers = generator.supports;

  for (let i = 0; i < instances; i += 1) {
    const tier = tiers[i % tiers.length]!;
    const seed = `fuzz-${i}`;
    let problem: Problem;
    try {
      problem = build(generator, seed, tier);
    } catch (err) {
      failures.push({ generatorId: generator.id, tier, seed, reason: `threw: ${String(err)}` });
      continue;
    }
    for (const reason of checkProblem(problem, generator)) {
      failures.push({ generatorId: generator.id, tier, seed, reason });
    }
    if (failures.length > 20) break;
  }
  return failures;
}

export function checkProblem(problem: Problem, generator: Generator): string[] {
  const problems: string[] = [];
  const push = (m: string) => problems.push(m);

  if (problem.answers.length === 0) push('no answers declared');

  for (const [i, spec] of problem.answers.entries()) {
    if (!spec.tex.trim()) push(`answer ${i} is empty`);
    const parsed = tryParse(spec.tex);
    if (!parsed) {
      push(`answer ${i} does not parse: ${spec.tex}`);
      continue;
    }
    if (!finiteSomewhere(parsed)) push(`answer ${i} never evaluates to a finite number: ${spec.tex}`);
    // A generator that hands back the question is a degenerate parameter set.
    if (normalise(spec.tex) === normalise(problem.prompt)) push(`answer ${i} is identical to the prompt`);
  }

  for (const id of problem.ruleIds) {
    if (!ruleById(id)) push(`ruleId "${id}" has no rule card`);
  }

  // A rule the working applies but never declares is missing from the rules-used
  // list under the answer, and from the sheet he can open from it. The order of
  // `ruleIds` is an authoring judgement and cannot be checked; being complete can.
  for (const s of problem.solution) {
    if (s.ruleId && !problem.ruleIds.includes(s.ruleId)) {
      push(`solution step "${s.ruleLabel}" applies "${s.ruleId}", which is not in ruleIds`);
    }
  }

  // Every checkable solution line must be equivalent to the answer, for a
  // value-preserving generator. A lying hint fails the build.
  if (generator.invariant === 'value-preserving') {
    const parsedAnswer = tryParse(problem.answers[0]!.tex);
    const upToConstant = problem.answers[0]!.upToConstant ?? false;
    // The constant of integration is not a variable to sample over — drop it
    // from both sides so the chain compares like with like.
    const reference = parsedAnswer ? stripPlusC(parsedAnswer) : null;
    if (reference) {
      for (const s of problem.solution) {
        if (s.display) continue;
        const parsedLine = tryParse(s.expr);
        if (!parsedLine) {
          push(`solution step "${s.ruleLabel}" does not parse: ${s.expr}`);
          continue;
        }
        const line = stripPlusC(parsedLine);
        if (!equivalent(line, reference, { mode: upToConstant ? 'constant-difference' : 'value' })) {
          push(`solution step "${s.ruleLabel}" is not equivalent to the answer: ${s.expr}`);
        }
      }
    }
  } else {
    // For equations, every checkable line must have the declared root as a solution.
    for (const s of problem.solution) {
      if (s.display) continue;
      if (!s.expr.includes('=')) continue;
      const reason = rootSatisfies(s.expr, problem);
      if (reason) push(`solution step "${s.ruleLabel}": ${reason}`);
    }
  }

  // A graph question's picture is checked the same way its maths is: the curve
  // has to parse, the window has to be a window, and a lattice problem's arrows
  // have to land on the lattice — an arrow between two grid points cannot be
  // compared with a drawn one, which is the only thing the picture is for.
  if (problem.plot) {
    const { window: w, lattice } = problem.plot;
    if (!(w.xMin < w.xMax) || !(w.yMin < w.yMax)) push(`plot window is empty: ${JSON.stringify(w)}`);
    if (!(w.step > 0)) push(`plot step must be positive, got ${w.step}`);
    for (const item of [...(problem.plot.given ?? []), ...problem.plot.answer]) {
      if (item.kind === 'curve' && !tryParse(item.of)) push(`plot curve does not parse: ${item.of}`);
      if (item.kind === 'vector' && lattice) {
        const pts = [item.to, ...(item.from ? [item.from] : [])];
        if (pts.some(([x, y]) => !Number.isInteger(x) || !Number.isInteger(y))) {
          push(`plot vector is off the lattice: ${JSON.stringify(item.to)}`);
        }
      }
    }
  }

  // The words around the maths are set as text, and only what is between `$`
  // fences goes through KaTeX. A `\\lim_{h\\to 0}` outside them reaches him as
  // its own source code.
  const prose: [string, string | undefined][] = [
    ['instruction', problem.instruction],
    ['promptText', problem.promptText],
    ['note', problem.note],
    ...problem.solution.map((s): [string, string | undefined] => [`note on "${s.ruleLabel}"`, s.note]),
  ];
  for (const [where, text] of prose) {
    const reason = text === undefined ? null : unfencedTex(text);
    if (reason) push(`${where} ${reason}: ${text}`);
  }

  if (problem.verify) {
    const reason = runVerification(problem.verify, problem);
    if (reason) push(reason);
  }

  return problems;
}

/**
 * Why a line of prose would show raw LaTeX, or null if it would not. Outside
 * the fences a backslash command, a braced superscript or subscript, or a brace
 * of any kind is markup nobody will render.
 */
export function unfencedTex(text: string): string | null {
  const parts = text.split('$');
  if (parts.length % 2 === 0) return 'has an unclosed $ fence';
  const outside = parts.filter((_, i) => i % 2 === 0).join(' ');
  const markup = /\\[a-zA-Z]+|[\^_]\{|[{}]/.exec(outside);
  return markup ? `has LaTeX outside $ fences ("${markup[0]}")` : null;
}

/** Independent numeric checks — the ones that catch a wrong answer, not just an inconsistent one. */
function runVerification(v: Verification, problem: Problem): string | null {
  const answerTex = problem.answers[0]!.tex;
  const answer = tryParse(answerTex);
  if (!answer) return `answer does not parse: ${answerTex}`;

  switch (v.kind) {
    case 'identity': {
      const source = tryParse(v.of);
      if (!source) return `verify.of does not parse: ${v.of}`;
      return equivalent(source, answer)
        ? null
        : `answer ${answerTex} is not equal to the prompt ${v.of}`;
    }
    case 'derivative': {
      const f = tryParse(v.of);
      if (!f) return `verify.of does not parse: ${v.of}`;
      return matchesNumerically(
        (b) => numericDerivative(f, v.wrt, b),
        (b) => evaluate(answer, b),
        varsOf(f, answer),
      )
        ? null
        : `answer ${answerTex} is not the derivative of ${v.of}`;
    }
    case 'antiderivative': {
      const integrand = tryParse(v.of);
      if (!integrand) return `verify.of does not parse: ${v.of}`;
      // Strip the constant before differentiating.
      const bare = parse(answerTex.replace(/\s*\+\s*C\s*$/, ''));
      return matchesNumerically(
        (b) => numericDerivative(bare, v.wrt, b),
        (b) => evaluate(integrand, b),
        varsOf(integrand, bare),
      )
        ? null
        : `d/d${v.wrt} of ${answerTex} is not ${v.of}`;
    }
    case 'definite-integral': {
      const f = tryParse(v.of);
      if (!f) return `verify.of does not parse: ${v.of}`;
      const numeric = simpson(f, v.wrt, v.from, v.to);
      const declared = evaluate(answer);
      return Math.abs(numeric - declared) <= 1e-6 * Math.max(1, Math.abs(declared))
        ? null
        : `answer ${answerTex} (${declared}) does not match the integral of ${v.of} (${numeric})`;
    }
    case 'limit': {
      const f = tryParse(v.of);
      if (!f) return `verify.of does not parse: ${v.of}`;
      const declared = evaluate(answer);
      if (!Number.isFinite(declared)) return `answer ${answerTex} is not a finite value`;
      return approaches(f, v, declared)
        ? null
        : `${v.of} does not approach ${answerTex} (${declared}) as ${v.wrt} → ${v.at}`;
    }
    case 'inverse': {
      const f = tryParse(v.of);
      if (!f) return `verify.of does not parse: ${v.of}`;
      // Samples where g lands outside f's domain come back non-finite and are
      // skipped, which is what makes this work for the half-line inverses.
      return matchesNumerically(
        (b) => evaluate(f, { ...b, [v.wrt]: evaluate(answer, b) }),
        (b) => b[v.wrt]!,
        [v.wrt],
      )
        ? null
        : `${v.of} does not undo the answer ${answerTex}`;
    }
    case 'root':
      return rootSatisfies(v.equation, problem);
  }
}

/**
 * Walks in towards the point and checks that the function goes where the answer
 * says. Two steps in rather than one, with the leading error extrapolated away:
 * a difference quotient one thousandth from the point is still a thousandth
 * off, which is not precision enough to tell a right answer from a nearly right
 * one.
 */
function approaches(
  f: Expr,
  v: { wrt: string; at: number | 'inf' | '-inf'; side?: 'left' | 'right' },
  declared: number,
): boolean {
  const at = (x: number): number => evaluate(f, { [v.wrt]: x });

  /** Richardson on a 1/n error term: the pair, with the first order removed. */
  const towards = (near: number, nearer: number): boolean => {
    const v1 = at(near);
    const v2 = at(nearer);
    if (!Number.isFinite(v1) || !Number.isFinite(v2)) return false;
    const extrapolated = (10 * v2 - v1) / 9;
    return Math.abs(extrapolated - declared) <= 1e-4 * Math.max(1, Math.abs(declared));
  };

  if (v.at === 'inf') return towards(1e3, 1e4);
  if (v.at === '-inf') return towards(-1e3, -1e4);

  const a = v.at;
  const left = towards(a - 1e-3, a - 1e-4);
  const right = towards(a + 1e-3, a + 1e-4);
  if (v.side === 'left') return left;
  if (v.side === 'right') return right;
  return left && right;
}

/** Every declared answer must satisfy the equation. */
function rootSatisfies(equation: string, problem: Problem): string | null {
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
    const bindings = { x: value };
    const l = evaluate(lhs, bindings);
    const r = evaluate(rhs, bindings);
    if (!Number.isFinite(l) || !Number.isFinite(r)) return `equation is undefined at x = ${value}`;
    if (Math.abs(l - r) > 1e-6 * Math.max(1, Math.abs(l), Math.abs(r))) {
      return `x = ${spec.tex} (${value}) does not satisfy ${equation}`;
    }
  }
  return null;
}

// ------------------------------------------------------------------ numerics

function varsOf(...exprs: Expr[]): string[] {
  return Array.from(new Set(exprs.flatMap(freeVars)));
}

/**
 * Central difference, Richardson-extrapolated for accuracy.
 *
 * Returns NaN where the two stencils disagree, which the caller skips. A
 * difference quotient says nothing about a point whose neighbourhood contains a
 * pole — `\tan x` a thousandth away from π/2 samples both sides of infinity and
 * comes back with a confident wrong number. The two widths agreeing to a part in
 * a thousand is the cheap test for "smooth across the stencil"; where they do
 * not, the point is unusable rather than failed.
 */
function numericDerivative(f: Expr, wrt: string, bindings: Record<string, number>): number {
  const x = bindings[wrt]!;
  const h = Math.max(1e-4, Math.abs(x) * 1e-4);
  const at = (v: number) => evaluate(f, { ...bindings, [wrt]: v });
  const d1 = (at(x + h) - at(x - h)) / (2 * h);
  const d2 = (at(x + h / 2) - at(x - h / 2)) / h;
  if (Math.abs(d1 - d2) > 1e-3 * Math.max(1, Math.abs(d2))) return NaN;
  return (4 * d2 - d1) / 3;
}

function simpson(f: Expr, wrt: string, a: number, b: number, n = 2000): number {
  const h = (b - a) / n;
  let total = evaluate(f, { [wrt]: a }) + evaluate(f, { [wrt]: b });
  for (let i = 1; i < n; i += 1) {
    total += (i % 2 ? 4 : 2) * evaluate(f, { [wrt]: a + i * h });
  }
  return (total * h) / 3;
}

/**
 * Compares two numeric functions over a spread of points. The tolerance is loose
 * because one side is a finite difference — this is checking for an algebra
 * mistake, not for floating-point drift.
 */
function matchesNumerically(
  left: (b: Record<string, number>) => number,
  right: (b: Record<string, number>) => number,
  vars: string[],
): boolean {
  let agreed = 0;
  let seen = 0;
  for (let i = 0; i < 40 && agreed < 12; i += 1) {
    const bindings: Record<string, number> = {};
    for (const v of vars) bindings[v] = 0.3 + ((i * 0.37) % 2.2);
    const l = left(bindings);
    const r = right(bindings);
    if (!Number.isFinite(l) || !Number.isFinite(r)) continue;
    seen += 1;
    if (Math.abs(l - r) > 1e-4 * Math.max(1, Math.abs(l), Math.abs(r))) return false;
    agreed += 1;
  }
  return seen > 0 && agreed >= Math.min(6, seen);
}

function finiteSomewhere(e: Expr): boolean {
  const vars = freeVars(e);
  for (let i = 0; i < 32; i += 1) {
    const bindings: Record<string, number> = {};
    for (const v of vars) bindings[v] = 0.3 + i * 0.11;
    if (Number.isFinite(evaluate(e, bindings))) return true;
  }
  return false;
}

function normalise(tex: string): string {
  return tex.replace(/[\s{}]/g, '').replace(/\\left|\\right/g, '');
}
