import type { CustomKey } from '@calcflow/shared';

export interface LatexKey {
  id: string;
  /** Rendered on the key itself. */
  tex: string;
  /** Inserted verbatim at the caret. */
  insert: string;
  /** Where the caret lands, counted from the start of `insert`. */
  caretAt?: number;
  /** Shown in settings, where a rendered fragment alone is too terse. */
  name: string;
}

/**
 * Everything that is a chore to type by hand. Single characters (x, 2, +) are
 * left to the keyboard he already has.
 *
 * Key faces spell their placeholders as ordinary letters rather than `\square`:
 * a row of empty boxes reads as glyphs that failed to load, which is exactly
 * the wrong first impression for a key that is about to type real notation.
 */
export const LATEX_KEYS: readonly LatexKey[] = [
  { id: 'frac', name: 'fraction', tex: '\\frac{a}{b}', insert: '\\frac{}{}' },
  { id: 'sqrt', name: 'square root', tex: '\\sqrt{a}', insert: '\\sqrt{}' },
  { id: 'nthroot', name: 'nth root', tex: '\\sqrt[n]{a}', insert: '\\sqrt[]{}' },
  { id: 'power', name: 'exponent', tex: 'a^{n}', insert: '^{}' },
  { id: 'sub', name: 'subscript', tex: 'a_{n}', insert: '_{}' },
  { id: 'ddx', name: 'derivative', tex: '\\frac{d}{dx}', insert: '\\frac{d}{dx}' },
  { id: 'dydx', name: 'dy/dx', tex: '\\frac{dy}{dx}', insert: '\\frac{dy}{dx}' },
  { id: 'integral', name: 'integral', tex: '\\int a\\,dx', insert: '\\int \\, dx', caretAt: 4 },
  { id: 'defint', name: 'definite integral', tex: '\\int_{a}^{b}', insert: '\\int_{}^{}', caretAt: 6 },
  { id: 'lim', name: 'limit', tex: '\\lim_{x \\to 0}', insert: '\\lim_{x \\to }', caretAt: 12 },
  { id: 'sum', name: 'sum', tex: '\\sum_{n}^{k}', insert: '\\sum_{}^{}', caretAt: 6 },
  { id: 'ln', name: 'natural log', tex: '\\ln(a)', insert: '\\ln()', caretAt: 4 },
  { id: 'log', name: 'log base n', tex: '\\log_{n}(a)', insert: '\\log_{}()', caretAt: 6 },
  { id: 'exp', name: 'e to the x', tex: 'e^{x}', insert: 'e^{}' },
  { id: 'sin', name: 'sine', tex: '\\sin', insert: '\\sin()', caretAt: 5 },
  { id: 'cos', name: 'cosine', tex: '\\cos', insert: '\\cos()', caretAt: 5 },
  { id: 'tan', name: 'tangent', tex: '\\tan', insert: '\\tan()', caretAt: 5 },
  { id: 'abs', name: 'absolute value', tex: '|a|', insert: '\\left|\\right|', caretAt: 6 },
  { id: 'paren', name: 'brackets', tex: '(a)', insert: '()', caretAt: 1 },
  { id: 'pi', name: 'pi', tex: '\\pi', insert: '\\pi' },
  { id: 'theta', name: 'theta', tex: '\\theta', insert: '\\theta' },
  { id: 'infty', name: 'infinity', tex: '\\infty', insert: '\\infty' },
  { id: 'cdot', name: 'times', tex: '\\cdot', insert: '\\cdot' },
  { id: 'pm', name: 'plus or minus', tex: '\\pm', insert: '\\pm' },
  { id: 'leq', name: 'at most', tex: '\\leq', insert: '\\leq' },
  { id: 'geq', name: 'at least', tex: '\\geq', insert: '\\geq' },
  { id: 'plusc', name: 'plus C', tex: '+C', insert: '+C' },
];

const BY_ID = new Map(LATEX_KEYS.map((key) => [key.id, key]));

/** His own keys join the same pool, so nothing downstream has to know which. */
export function asLatexKey(custom: CustomKey): LatexKey {
  return { id: custom.id, name: custom.insert, tex: custom.tex, insert: custom.insert };
}

export function keyPool(custom: readonly CustomKey[]): LatexKey[] {
  return [...LATEX_KEYS, ...custom.map(asLatexKey)];
}

export function latexKey(id: string, custom: readonly CustomKey[] = []): LatexKey | undefined {
  const own = custom.find((c) => c.id === id);
  return own ? asLatexKey(own) : BY_ID.get(id);
}

/** The ids on the row, resolved and in order, skipping anything since deleted. */
export function resolveKeys(ids: readonly string[], custom: readonly CustomKey[]): LatexKey[] {
  return ids.map((id) => latexKey(id, custom)).filter((k) => k !== undefined);
}

const EMPTY_PAIR = /\{\}|\[\]|\(\)/;

/** Where the caret should sit after inserting: inside the first empty pair. */
export function caretOffset(key: LatexKey): number {
  if (key.caretAt !== undefined) return key.caretAt;
  const pair = EMPTY_PAIR.exec(key.insert);
  return pair ? pair.index + 1 : key.insert.length;
}
