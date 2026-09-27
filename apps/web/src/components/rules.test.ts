import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { RULES, makeRng, ruleExample } from '@calcflow/generators';

/*
 * `Tex` renders with `throwOnError: false`, so a card whose LaTeX does not
 * compile does not break the page — it quietly shows its own source instead,
 * which is the kind of thing that survives a hundred sessions unnoticed.
 */
describe('rule cards', () => {
  it.each(RULES.map((r) => [r.id, r.tex] as const))('renders %s', (_id, tex) => {
    expect(() => katex.renderToString(tex, { throwOnError: true })).not.toThrow();
  });

  it('gives every multi-part rule a line of its own', () => {
    // The ones that are several rules under one heading. Run together they read
    // as a wall and wrap wherever the column happens to end.
    const compound = ['power-rules', 'log-laws', 'exp-log-inverse', 'double-angle', 'exact-values', 'standard-derivatives'];
    for (const id of compound) {
      const rule = RULES.find((r) => r.id === id);
      expect(rule, id).toBeDefined();
      expect(rule!.tex, id).toContain('\\begin{aligned}');
      expect(rule!.tex, id).not.toContain('\\quad');
    }
  });
});

/*
 * The worked examples are strings assembled from random numbers, so a sign or a
 * bracket that only goes wrong for one draw in fifty is exactly the failure
 * mode. Every card gets a hundred draws.
 */
describe('rule examples', () => {
  it('covers every rule card', () => {
    const missing = RULES.filter((r) => ruleExample(r.id, makeRng('x')) === undefined);
    expect(missing.map((r) => r.id)).toEqual([]);
  });

  it.each(RULES.map((r) => [r.id] as const))('renders %s for any draw', (id) => {
    for (let i = 0; i < 100; i += 1) {
      const example = ruleExample(id, makeRng(`${id}-${i}`))!;
      for (const line of [...(example.given ? [example.given] : []), ...example.steps]) {
        expect(() => katex.renderToString(line, { throwOnError: true }), `${id} #${i}: ${line}`).not.toThrow();
        // A `+ -3` or a `- -3` is legal LaTeX and still wrong on the page.
        expect(line, `${id} #${i}`).not.toMatch(/[+-]\s+-\d/);
      }
    }
  });
});
