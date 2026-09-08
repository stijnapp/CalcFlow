import type { Problem } from '@calcflow/generators';

/**
 * The question and his answer, written out as something he can paste straight
 * into a chat. Seeing the worked solution tells him *what* the answer was; a
 * wrong answer he cannot account for is a different problem, and this hands the
 * whole thing over so he can ask about his own line rather than retype it.
 *
 * The maths goes over as raw LaTeX between dollars — it is what the app has,
 * and it is what a chat window will render.
 */
export function askPrompt(problem: Problem, answers: string[]): string {
  const question = [
    problem.instruction,
    problem.promptText ?? `$${problem.prompt}$`,
    problem.note,
  ]
    .filter(Boolean)
    .join(' ');

  const mine = answers.filter(Boolean);
  const written =
    mine.length > 0 ? mine.map((a) => `$${a}$`).join(' and ') : 'nothing — I got stuck';

  return [
    `I have this problem:\n\n${question}`,
    `and this is the answer I gave:\n\n${written}`,
    'Explain to me where I went wrong, and walk through every step of the process.',
  ].join('\n\n');
}
