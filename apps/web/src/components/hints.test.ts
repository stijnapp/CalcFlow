import { describe, expect, it } from 'vitest';
import { GENERATORS, build } from '@calcflow/generators';
import { buildHints, hintCount } from './hints';

describe('hints', () => {
  it.each(GENERATORS.map((g) => [g.id, g] as const))('walks the whole solution of %s', (_id, generator) => {
    for (let i = 0; i < 20; i += 1) {
      const tier = generator.supports[i % generator.supports.length]!;
      const problem = build(generator, `hints-${i}`, tier);
      const cards = buildHints(problem);
      const hints = cards.flatMap((c) => c.hints);

      // A locked card says where it is in the working and nothing else.
      for (const card of cards) expect(card.label).toMatch(/^(Where to start|Step \d+|Answer)$/);

      // Every line of the worked solution, in order, each as its move and then
      // what it gives — the same staircase "See the steps" shows afterwards.
      const lines = hints.filter((h) => h.kind === 'line').map((h) => h.tex);
      expect(lines).toEqual(problem.solution.map((s) => s.expr));
      const moves = hints.filter((h) => h.kind === 'move').map((h) => h.title);
      expect(moves).toEqual(problem.solution.map((s) => s.ruleLabel));

      // Where each card starts is where the one before it ended.
      expect(cards.map((c) => c.from)).toEqual(
        cards.map((_, j) => hintCount(cards.slice(0, j))),
      );

      // The last tap is the answer, whether the working ends on it or not.
      const last = hints.at(-1)!;
      expect(last.kind === 'answer' || (last.kind === 'line' && last.answer)).toBe(true);
      // And only the last tap is flagged as it.
      expect(hints.slice(0, -1).some((h) => h.kind === 'answer' || (h.kind === 'line' && h.answer))).toBe(false);
    }
  });

  it('does not repeat an answer the working already ends on', () => {
    const generator = GENERATORS.find((g) => g.id === 'diff.chain-rule')!;
    const cards = buildHints(build(generator, 'repeat', generator.supports[0]!));
    expect(cards.map((c) => c.label)).toEqual(['Where to start', 'Step 1', 'Step 2']);
  });
});
