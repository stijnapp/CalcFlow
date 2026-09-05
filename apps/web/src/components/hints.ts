import { ruleById, type Problem } from '@calcflow/generators';

export interface Rung {
  num: string;
  title: string;
  body: string;
  tex?: string;
  /** Rung 1 deep-links into the rule sheet. */
  ruleId?: string;
}

/** However long the working is, a ladder past this is a solution, not a hint. */
const MAX_RUNGS = 5;

/**
 * The ladder is read straight off the generator's solution tree, one rung per
 * line of working, so its length tracks the problem rather than a fixed four.
 * A one-step expansion gets "which rule" and the answer; a four-step chain gets
 * the whole staircase. No handwriting recognition is involved: he taps until he
 * reaches something he did not already know.
 */
export function buildRungs(problem: Problem): Rung[] {
  const rule = problem.ruleIds.map(ruleById).find(Boolean);
  const answer = problem.answers.map((a) => a.tex).join(' \\quad\\text{and}\\quad ');
  const naming = rule
    ? `${rule.name}. ${rule.note}`
    : 'Look for the structure before you calculate anything.';

  const rungs: Rung[] = [{ num: '01', title: 'Which rule', body: naming, ruleId: rule?.id }];

  // Every line except the last, which is the answer and has its own rung.
  const steps = problem.solution;
  const middle = steps.slice(0, Math.max(0, steps.length - 1)).slice(0, MAX_RUNGS - 2);
  for (const step of middle) {
    const own = step.note ?? `Apply the ${step.ruleLabel.toLowerCase()}.`;
    rungs.push({
      num: label(rungs.length + 1),
      title: step.ruleLabel,
      // Repeating rung 1 word for word wastes a rung he has spent a tap on.
      body: own === naming ? `Write the ${step.ruleLabel.toLowerCase()} out before evaluating.` : own,
      // Never show the answer early, however the generator wrote its working.
      tex: step.expr === answer ? undefined : step.expr,
    });
  }

  rungs.push({
    num: label(rungs.length + 1),
    title: 'Full solution',
    body: steps.at(-1)?.note ?? 'Simplify, and this is what you should land on.',
    tex: answer,
  });

  return rungs;
}

function label(n: number): string {
  return String(n).padStart(2, '0');
}
