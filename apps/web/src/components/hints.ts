import { ruleById, type Problem } from '@calcflow/generators';

export interface Rung {
  num: string;
  title: string;
  body: string;
  tex?: string;
  /** Rung 1 deep-links into the rule sheet. */
  ruleId?: string;
}

/**
 * The four-rung ladder, read straight off the generator's solution tree. No
 * handwriting recognition is involved: he taps until he reaches something he
 * did not already know.
 */
export function buildRungs(problem: Problem): Rung[] {
  const checkable = problem.solution.filter((s) => !s.display);
  const first = problem.solution[0];
  const middle = checkable[0] ?? first;
  const rule = problem.ruleIds.map(ruleById).find(Boolean);
  const answer = problem.answers.map((a) => a.tex).join(' \\quad\\text{and}\\quad ');

  const naming = rule ? `${rule.name}. ${rule.note}` : 'Look for the structure before you calculate anything.';
  const setupBody = first?.note ?? `Start with the ${first?.ruleLabel.toLowerCase() ?? 'first step'}.`;

  const rungs: Rung[] = [
    { num: '01', title: 'Which rule', body: naming, ruleId: rule?.id },
    {
      num: '02',
      title: 'Set it up',
      // Repeating rung 1 word for word wastes a rung he has spent a tap on.
      body: setupBody === naming ? `Write the ${first?.ruleLabel.toLowerCase()} out before evaluating anything.` : setupBody,
      tex: first?.expr,
    },
    {
      num: '03',
      title: 'Next step',
      body: middle?.note ?? `Then apply the ${middle?.ruleLabel.toLowerCase() ?? 'next rule'}.`,
    },
    { num: '04', title: 'Full solution', body: 'Simplify, and this is what you should land on.', tex: answer },
  ];

  // Only show rung 3's expression when it is genuinely an intermediate line.
  // With a single checkable step it *is* the answer, and rung 4 has a job to do.
  if (checkable.length >= 2 && middle) rungs[2]!.tex = middle.expr;

  return rungs;
}
