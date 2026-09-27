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
  // A vector is drawn as well as typed, and a third box pushes the drawing off
  // a phone's screen.
  if (problem.plot?.lattice && problem.answers.length > 2) {
    push(`a lattice question asks for ${problem.answers.length} typed answers; two at most`);
  }

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
    case 'tangent': {
      const f = tryParse(v.of);
      const at = tryParse(v.at);
      if (!f || !at) return `verify does not parse: ${v.of} at ${v.at}`;
      const line = (b: Record<string, number>) => {
        const point = { ...b, [v.wrt]: evaluate(at, b) };
        return evaluate(f, point) + numericDerivative(f, v.wrt, point) * (b[v.wrt]! - point[v.wrt]!);
      };
      return matchesNumerically(line, (b) => evaluate(answer, b), varsOf(f, at, answer))
        ? null
        : `answer ${answerTex} is not the tangent to ${v.of} at ${v.wrt} = ${v.at}`;
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
      const edges = [v.from, ...(v.breaks ?? []), v.to];
      const numeric = edges.slice(1).reduce((total, to, i) => total + simpson(f, v.wrt, edges[i]!, to), 0);
      const declared = evaluate(answer);
      return Math.abs(numeric - declared) <= 1e-6 * Math.max(1, Math.abs(declared))
        ? null
        : `answer ${answerTex} (${declared}) does not match the integral of ${v.of} (${numeric})`;
    }
    case 'limit': {
      const f = tryParse(v.of);
      if (!f) return `verify.of does not parse: ${v.of}`;
      const targetTex = v.equals ?? answerTex;
      const target = tryParse(targetTex);
      if (!target) return `verify.equals does not parse: ${targetTex}`;
      const declared = evaluate(target);
      if (!Number.isFinite(declared)) return `${targetTex} is not a finite value`;
      return approaches(f, v, declared)
        ? null
        : `${v.of} does not approach ${targetTex} (${declared}) as ${v.wrt} → ${v.at}`;
    }
    case 'inflection': {
      const f = tryParse(v.of);
      if (!f) return `verify.of does not parse: ${v.of}`;
      const g = (x: number) => evaluate(f, { [v.wrt]: x });
      const bend = (x: number) => (g(x + 1e-3) - 2 * g(x) + g(x - 1e-3)) / 1e-6;
      for (const spec of problem.answers) {
        const at = evaluate(parse(spec.tex));
        const [left, mid, right] = [bend(at - 1e-2), bend(at), bend(at + 1e-2)];
        const flips = left * right < 0 && Math.abs(mid) <= 1e-2 * Math.max(Math.abs(left), Math.abs(right));
        if (!flips) return `${v.of} does not change how it bends at ${spec.tex}`;
      }
      return null;
    }
    case 'mixed-partial': {
      const f = tryParse(v.of);
      if (!f) return `verify.of does not parse: ${v.of}`;
      return matchesNumerically(
        (b) => numericMixedPartial(f, v.wrt, b),
        (b) => evaluate(answer, b),
        varsOf(f, answer),
      )
        ? null
        : `answer ${answerTex} is not the mixed partial of ${v.of} in ${v.wrt.join(' and ')}`;
    }
    case 'improper-integral': {
      const f = tryParse(v.of);
      if (!f) return `verify.of does not parse: ${v.of}`;
      const g = (x: number) => evaluate(f, { [v.wrt]: x });
      const numeric = improper(g, v.from, v.to);
      const declared = evaluate(answer);
      if (!Number.isFinite(numeric)) return `the integral of ${v.of} does not settle numerically`;
      return Math.abs(numeric - declared) <= 1e-6 * Math.max(1, Math.abs(declared))
        ? null
        : `answer ${answerTex} (${declared}) does not match the integral of ${v.of} (${numeric})`;
    }
    case 'extremum': {
      const f = tryParse(v.of);
      if (!f) return `verify.of does not parse: ${v.of}`;
      const g = (x: number) => evaluate(f, { [v.wrt]: x });
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

/**
 * ∂²f/∂a∂b from the four corners of a square around the point, with the
 * leading error extrapolated away the same way as the one-variable case, and
 * NaN where the two widths disagree.
 */
function numericMixedPartial(
  f: Expr,
  [u, v]: readonly [string, string],
  bindings: Record<string, number>,
): number {
  const x = bindings[u]!;
  const y = bindings[v]!;
  const at = (dx: number, dy: number) => evaluate(f, { ...bindings, [u]: x + dx, [v]: y + dy });
  const corners = (h: number) => (at(h, h) - at(h, -h) - at(-h, h) + at(-h, -h)) / (4 * h * h);
  const h = 1e-3 * Math.max(1, Math.abs(x), Math.abs(y));
  const d1 = corners(h);
  const d2 = corners(h / 2);
  if (Math.abs(d1 - d2) > 1e-2 * Math.max(1, Math.abs(d2))) return NaN;
  return (4 * d2 - d1) / 3;
}

/**
 * Double-exponential quadrature: tanh-sinh on a finite interval, exp-sinh on a
 * half-line. Both crowd their points towards the ends fast enough that an
 * integrable blow-up there, or a tail out to infinity, costs nothing — which is
 * exactly what Simpson cannot do. Two step sizes have to agree, or the answer
 * is NaN rather than a confident wrong number.
 */
function improper(g: (x: number) => number, a: number, b: number | 'inf'): number {
  const run = (h: number): number => {
    let total = 0;
    for (let k = -Math.ceil(4 / h); k <= Math.ceil(4 / h); k += 1) {
      const t = k * h;
      const u = (Math.PI / 2) * Math.sinh(t);
      let x: number;
      let w: number;
      if (b === 'inf') {
        x = a + Math.exp(u);
        w = Math.exp(u) * (Math.PI / 2) * Math.cosh(t);
      } else {
        const half = (b - a) / 2;
        // How far from the nearer end, worked out without the cancellation
        // that would put the point exactly on the end it is approaching.
        const gap = (2 * half) / (Math.exp(2 * Math.abs(u)) + 1);
        x = u >= 0 ? b - gap : a + gap;
        w = (half * (Math.PI / 2) * Math.cosh(t)) / Math.cosh(u) ** 2;
      }
      if (w === 0 || x === a || x === b) continue;
      const fx = g(x);
      if (Number.isFinite(fx)) total += w * fx;
    }
    return total * h;
  };
  const coarse = run(1 / 16);
  const fine = run(1 / 32);
  return Math.abs(coarse - fine) <= 1e-8 * Math.max(1, Math.abs(fine)) ? fine : NaN;
}

/** Where g is largest on [a, b]: a grid to find the hill, then golden sections to its top. */
function search(g: (x: number) => number, a: number, b: number): { at: number } {
  const n = 4000;
  let best = a;
  let top = -Infinity;
  for (let i = 0; i <= n; i += 1) {
    const x = a + ((b - a) * i) / n;
    const y = g(x);
    if (Number.isFinite(y) && y > top) [best, top] = [x, y];
  }
  const step = (b - a) / n;
  let lo = Math.max(a, best - step);
  let hi = Math.min(b, best + step);
  const phi = (Math.sqrt(5) - 1) / 2;
  for (let i = 0; i < 80; i += 1) {
    const m1 = hi - phi * (hi - lo);
    const m2 = lo + phi * (hi - lo);
    if (g(m1) >= g(m2)) hi = m2;
    else lo = m1;
  }
  return { at: (lo + hi) / 2 };
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
    // Each variable walks its own way, or every function of x − y would only
    // ever be sampled where it is ln 0.
    for (const [j, v] of vars.entries()) bindings[v] = 0.3 + ((i * 0.37 + j * 0.71) % 2.2);
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
    for (const [j, v] of vars.entries()) bindings[v] = 0.3 + ((i * 0.11 + j * 0.9) % 3);
    if (Number.isFinite(evaluate(e, bindings))) return true;
  }
  return false;
}

function normalise(tex: string): string {
  return tex.replace(/[\s{}]/g, '').replace(/\\left|\\right/g, '');
}
