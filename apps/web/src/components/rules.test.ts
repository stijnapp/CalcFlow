import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { RULES } from '@calcflow/generators';

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
