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
 */
export const LATEX_KEYS: readonly LatexKey[] = [
  { id: 'frac', name: 'fraction', tex: '\\frac{\\square}{\\square}', insert: '\\frac{}{}' },
  { id: 'sqrt', name: 'square root', tex: '\\sqrt{\\square}', insert: '\\sqrt{}' },
  { id: 'nthroot', name: 'nth root', tex: '\\sqrt[n]{\\square}', insert: '\\sqrt[]{}' },
  { id: 'power', name: 'exponent', tex: '\\square^{n}', insert: '^{}' },
  { id: 'sub', name: 'subscript', tex: '\\square_{n}', insert: '_{}' },
  { id: 'ddx', name: 'derivative', tex: '\\frac{d}{dx}', insert: '\\frac{d}{dx}' },
  { id: 'dydx', name: 'dy/dx', tex: '\\frac{dy}{dx}', insert: '\\frac{dy}{dx}' },
  { id: 'integral', name: 'integral', tex: '\\int\\square\\,dx', insert: '\\int \\, dx', caretAt: 4 },
  { id: 'defint', name: 'definite integral', tex: '\\int_a^b', insert: '\\int_{}^{}', caretAt: 6 },
  { id: 'lim', name: 'limit', tex: '\\lim_{x \\to 0}', insert: '\\lim_{x \\to }', caretAt: 12 },
  { id: 'sum', name: 'sum', tex: '\\sum_{n}^{}', insert: '\\sum_{}^{}', caretAt: 6 },
  { id: 'ln', name: 'natural log', tex: '\\ln', insert: '\\ln()', caretAt: 4 },
  { id: 'log', name: 'log base n', tex: '\\log_{n}', insert: '\\log_{}()', caretAt: 6 },
  { id: 'exp', name: 'e to the x', tex: 'e^{x}', insert: 'e^{}' },
  { id: 'sin', name: 'sine', tex: '\\sin', insert: '\\sin()', caretAt: 5 },
  { id: 'cos', name: 'cosine', tex: '\\cos', insert: '\\cos()', caretAt: 5 },
  { id: 'tan', name: 'tangent', tex: '\\tan', insert: '\\tan()', caretAt: 5 },
  { id: 'abs', name: 'absolute value', tex: '|\\square|', insert: '\\left|\\right|', caretAt: 6 },
  { id: 'paren', name: 'brackets', tex: '(\\square)', insert: '()', caretAt: 1 },
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

export function latexKey(id: string): LatexKey | undefined {
  return BY_ID.get(id);
}

const EMPTY_PAIR = /\{\}|\[\]|\(\)/;

/** Where the caret should sit after inserting: inside the first empty pair. */
export function caretOffset(key: LatexKey): number {
  if (key.caretAt !== undefined) return key.caretAt;
  const pair = EMPTY_PAIR.exec(key.insert);
  return pair ? pair.index + 1 : key.insert.length;
}
