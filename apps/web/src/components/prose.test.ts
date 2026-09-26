import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { GENERATORS, build } from '@calcflow/generators';

/*
 * The harness checks that a generator's prose has no LaTeX outside its `$`
 * fences. This checks the other half: that what is inside them compiles. `Tex`
 * renders with `throwOnError: false`, so a fence that does not would show its
 * own source in the middle of a sentence and nothing would say so.
 */
describe('question prose', () => {
  it.each(GENERATORS.map((g) => [g.id, g] as const))('renders every fence in %s', (_id, generator) => {
    for (let i = 0; i < 60; i += 1) {
      const tier = generator.supports[i % generator.supports.length]!;
      const problem = build(generator, `prose-${i}`, tier);
      const prose = [problem.promptText, problem.note, ...problem.solution.map((s) => s.note)];
      for (const text of prose) {
        if (!text) continue;
        const fenced = text.split('$').filter((_, j) => j % 2 === 1);
        for (const tex of fenced) {
          expect(() => katex.renderToString(tex, { throwOnError: true }), `${tier} #${i}: ${text}`).not.toThrow();
        }
      }
    }
  });
});
