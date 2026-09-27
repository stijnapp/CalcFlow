import { equivalent, stripPlusC, tryParse } from '@calcflow/engine';
import type { Tier } from '@calcflow/shared';
import { finiteSomewhere } from './numerics.js';
import type { PlotItem } from './plot.js';
import { ruleById } from './rules.js';
import { build } from './registry.js';
import type { Generator, Problem } from './types.js';
import { rootSatisfies, runVerification } from './verify.js';

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

/** One thing a problem has to get right: the ways it does not, if any. */
type Check = (problem: Problem, generator: Generator) => string[];

export function checkProblem(problem: Problem, generator: Generator): string[] {
  return CHECKS.flatMap((check) => check(problem, generator));
}

const checkAnswers: Check = (problem) => {
  const out: string[] = [];
  if (problem.answers.length === 0) out.push('no answers declared');
  // A vector is drawn as well as typed, and a third box pushes the drawing off
  // a phone's screen.
  if (problem.plot?.lattice && problem.answers.length > 2) {
    out.push(`a lattice question asks for ${problem.answers.length} typed answers; two at most`);
  }
  problem.answers.forEach((spec, i) => out.push(...answerFaults(spec.tex, i, problem.prompt)));
  return out;
};

function answerFaults(tex: string, i: number, prompt: string): string[] {
  const out: string[] = [];
  if (!tex.trim()) out.push(`answer ${i} is empty`);
  const parsed = tryParse(tex);
  if (!parsed) return [...out, `answer ${i} does not parse: ${tex}`];
  if (!finiteSomewhere(parsed)) out.push(`answer ${i} never evaluates to a finite number: ${tex}`);
  // A generator that hands back the question is a degenerate parameter set.
  if (normalise(tex) === normalise(prompt)) out.push(`answer ${i} is identical to the prompt`);
  return out;
}

/**
 * Every rule named has a card, and every rule the working applies is named. A
 * rule the working applies but never declares is missing from the rules-used
 * list under the answer, and from the sheet that opens from it. The order of
 * `ruleIds` is an authoring judgement and cannot be checked; being complete can.
 */
const checkRules: Check = ({ ruleIds, solution }) => [
  ...ruleIds.filter((id) => !ruleById(id)).map((id) => `ruleId "${id}" has no rule card`),
  ...solution
    .filter((s) => s.ruleId && !ruleIds.includes(s.ruleId))
    .map((s) => `solution step "${s.ruleLabel}" applies "${s.ruleId}", which is not in ruleIds`),
];

/**
 * Every checkable line of the working must agree with the answer: equal to it,
 * for a value-preserving generator, and solved by it, for an equation. A lying
 * hint fails the build.
 */
const checkWorking: Check = (problem, generator) =>
  generator.invariant === 'value-preserving' ? valueFaults(problem) : rootFaults(problem);

function valueFaults(problem: Problem): string[] {
  const first = problem.answers[0];
  const parsed = first && tryParse(first.tex);
  if (!parsed) return [];
  // The constant of integration is not a variable to sample over — drop it
  // from both sides so the chain compares like with like.
  const reference = stripPlusC(parsed);
  const mode = first.upToConstant ? 'constant-difference' : 'value';
  return problem.solution
    .filter((s) => !s.display)
    .flatMap((s) => {
      const line = tryParse(s.expr);
      if (!line) return [`solution step "${s.ruleLabel}" does not parse: ${s.expr}`];
      return equivalent(stripPlusC(line), reference, { mode })
        ? []
        : [`solution step "${s.ruleLabel}" is not equivalent to the answer: ${s.expr}`];
    });
}

function rootFaults(problem: Problem): string[] {
  return problem.solution
    .filter((s) => !s.display && s.expr.includes('='))
    .flatMap((s) => {
      const reason = rootSatisfies(s.expr, problem);
      return reason ? [`solution step "${s.ruleLabel}": ${reason}`] : [];
    });
}

/**
 * A graph question's picture is checked the same way its maths is: the curve
 * has to parse, the window has to be a window, and a lattice problem's arrows
 * have to land on the lattice — an arrow between two grid points cannot be
 * compared with a drawn one, which is the only thing the picture is for.
 */
const checkPlot: Check = ({ plot }) => {
  if (!plot) return [];
  const { window: w, lattice } = plot;
  const out: string[] = [];
  if (!(w.xMin < w.xMax) || !(w.yMin < w.yMax)) out.push(`plot window is empty: ${JSON.stringify(w)}`);
  if (!(w.step > 0)) out.push(`plot step must be positive, got ${w.step}`);
  for (const item of [...(plot.given ?? []), ...plot.answer]) {
    if (item.kind === 'curve' && !tryParse(item.of)) out.push(`plot curve does not parse: ${item.of}`);
    if (lattice && offLattice(item)) out.push(`plot vector is off the lattice: ${JSON.stringify(item)}`);
  }
  return out;
};

function offLattice(item: PlotItem): boolean {
  if (item.kind !== 'vector') return false;
  const ends = item.from ? [item.to, item.from] : [item.to];
  return ends.some(([x, y]) => !Number.isInteger(x) || !Number.isInteger(y));
}

/**
 * The words around the maths are set as text, and only what is between `$`
 * fences goes through KaTeX. A `\\lim_{h\\to 0}` outside them reaches the
 * student as its own source code.
 */
const checkProse: Check = (problem) => {
  const prose: [string, string | undefined][] = [
    ['instruction', problem.instruction],
    ['promptText', problem.promptText],
    ['note', problem.note],
    ...problem.solution.map((s): [string, string | undefined] => [`note on "${s.ruleLabel}"`, s.note]),
  ];
  return prose.flatMap(([where, text]) => {
    const reason = text === undefined ? null : unfencedTex(text);
    return reason ? [`${where} ${reason}: ${text}`] : [];
  });
};

const checkVerification: Check = (problem) => {
  const reason = problem.verify ? runVerification(problem.verify, problem) : null;
  return reason ? [reason] : [];
};

const CHECKS: Check[] = [
  checkAnswers,
  checkRules,
  checkWorking,
  checkPlot,
  checkProse,
  checkVerification,
];

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

function normalise(tex: string): string {
  return tex.replace(/[\s{}]/g, '').replace(/\\left|\\right/g, '');
}
