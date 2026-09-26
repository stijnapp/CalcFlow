import { ruleById, type Problem } from '@calcflow/generators';

/**
 * One tap's worth of help. A line of working is two of them: what to do, and
 * then what doing it gives. Showing both at once made the second hint the
 * answer in all but name — "chain rule" and then the whole derivative, with
 * nothing in between to try it himself against.
 */
export type Hint =
  | {
      kind: 'start';
      body: string;
      /**
       * Every card the problem touches, not just the headline one. `e^{x+3}` is
       * a chain-rule problem whose actual difficulty is remembering that e^x
       * differentiates to itself.
       */
      ruleIds: string[];
    }
  | { kind: 'move'; title: string; body?: string; ruleId?: string }
  | { kind: 'line'; tex: string; answer: boolean }
  /** One row per field he types, under that field's own name when it has one. */
  | { kind: 'answer'; answers: Array<{ label?: string; tex: string }> };

/**
 * The hints a locked card holds, under a name that says where in the working
 * they are and nothing about what they say. A title like "Take ln of both
 * sides" on a locked card was the hint, read before he had asked for it.
 */
export interface HintCard {
  label: string;
  hints: Hint[];
  /** Where its first hint sits in the order they are revealed. */
  from: number;
}

/**
 * Read straight off the generator's solution — the same lines "See the steps"
 * shows afterwards, in the same order, none of them left out — so the hints
 * and the worked solution are one staircase, climbed a tap at a time.
 */
export function buildHints(problem: Problem): HintCard[] {
  const rules = [...new Set(problem.ruleIds)].map(ruleById).filter((r) => r !== undefined);
  // `ruleIds[0]` is the headline by contract, so it is the one worth spelling
  // out in prose; the rest are listed under it and are one tap from their card.
  const rule = rules[0];
  const answer = problem.answers.map((a) => a.tex).join(' \\quad\\text{and}\\quad ');

  const cards: Array<Omit<HintCard, 'from'>> = [
    {
      label: 'Where to start',
      hints: [
        {
          kind: 'start',
          body: rule ? `${rule.name}. ${rule.note}` : 'Look for the structure before you calculate anything.',
          ruleIds: rules.map((r) => r.id),
        },
      ],
    },
  ];

  const steps = problem.solution;
  steps.forEach((step, i) => {
    const last = i === steps.length - 1;
    cards.push({
      label: `Step ${i + 1}`,
      hints: [
        { kind: 'move', title: step.ruleLabel, body: step.note, ruleId: step.ruleId },
        { kind: 'line', tex: step.expr, answer: last && landsOn(step.expr, answer) },
      ],
    });
  });

  // Working that ends on `x = -8 or x = 6`, or on a sign rather than on the
  // numbers asked for, still owes him the answer as he has to type it.
  const final = steps.at(-1);
  if (!final || !landsOn(final.expr, answer)) {
    cards.push({
      label: 'Answer',
      hints: [{ kind: 'answer', answers: problem.answers.map(({ label, tex }) => ({ label, tex })) }],
    });
  }

  let from = 0;
  return cards.map((card) => {
    const placed = { ...card, from };
    from += card.hints.length;
    return placed;
  });
}

/** How many taps the whole staircase is. */
export function hintCount(cards: readonly HintCard[]): number {
  return cards.reduce((n, c) => n + c.hints.length, 0);
}

/** The last line is the answer when it is the answer, or `f'(x) =` it. */
function landsOn(line: string, answer: string): boolean {
  const flat = (s: string) => s.replace(/\s+/g, '');
  return flat(line) === flat(answer) || flat(line).endsWith(`=${flat(answer)}`);
}
