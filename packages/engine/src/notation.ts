import { equivalent } from './equivalent.js';
import { tryParse } from './parse.js';

/** Which of the four ways of writing a derivative the student reached for. */
export type DerivativeForm = 'bare' | 'lagrange' | 'leibniz' | 'euler';

export interface DerivativeRead {
  /** The expression to grade, with any label in front of it taken off. */
  body: string;
  form: DerivativeForm;
  /**
   * What is wrong with the label, in its own terms. Null when it reads
   * correctly — including when there was no label at all.
   */
  complaint: string | null;
}

export interface DerivativeContext {
  /** The variable being differentiated with respect to, usually `x`. */
  wrt: string;
  /** The function from the prompt, so an operator form can be checked against it. */
  of?: string;
}

/**
 * Reads an answer to "differentiate this" that the student has labelled. The four
 * notations are all in the book and all say the same thing, so all four are
 * accepted:
 *
 *     18x^2            f'(x) = 18x^2
 *     \frac{dy}{dx} = 18x^2       \frac{d}{dx}(6x^3) = 18x^2
 *     D(6x^3) = 18x^2             D_x(6x^3) = 18x^2
 *
 * The difference between `\frac{dy}{dx}` and `\frac{d}{dx}` is the one worth
 * being strict about: the first is the derivative, the second is an instruction
 * to take one, and `\frac{d}{dx} = 18x^2` is a sentence with no subject. Saying
 * so is more use than marking it wrong.
 */
export function readDerivative(raw: string, ctx: DerivativeContext): DerivativeRead {
  const at = splitAt(raw);
  if (at < 0) return { body: raw, form: 'bare', complaint: null };

  const label = clean(raw.slice(0, at));
  const body = raw.slice(at + 1).trim();
  for (const read of LABELS) {
    const found = read(label, ctx);
    if (found) return { body, ...found };
  }
  const d = ctx.wrt;
  return {
    body,
    form: 'bare',
    complaint: `That is not a name for the derivative. Use f'(${d}) =, dy/d${d} =, d/d${d}(…) = or D_${d}(…) = — or write the expression on its own.`,
  };
}

type Label = Omit<DerivativeRead, 'body'>;

/** One notation: how it reads the label, or null when the label is not written in it. */
type LabelReader = (label: string, ctx: DerivativeContext) => Label | null;

/** f'(x) = …, y' = … */
const lagrange: LabelReader = (label, { wrt: d }) => {
  const m = /^([a-zA-Z])\s*'\s*(?:\(\s*([a-zA-Z])\s*\))?$/.exec(label);
  if (!m) return null;
  const arg = m[2];
  return {
    form: 'lagrange',
    complaint:
      arg && arg !== d
        ? `The prompt differentiates with respect to ${d}, so the prime is on ${m[1]}(${d}).`
        : null,
  };
};

/** \frac{dy}{dx} = … — a value, and nothing may follow it. */
const ratio: LabelReader = (label, { wrt: d }) => {
  const m = /^\\frac\{\s*d\s*([a-zA-Z])\s*\}\{\s*d\s*([a-zA-Z])\s*\}$/.exec(label);
  if (!m) return null;
  return {
    form: 'leibniz',
    complaint: m[2] === d ? null : `The variable underneath should be d${d}, not d${m[2]}.`,
  };
};

/** \frac{d}{dx}(…) = … — an operator, and it needs something to act on. */
const operator: LabelReader = (label, ctx) => {
  const m = /^\\frac\{\s*d\s*\}\{\s*d\s*([a-zA-Z])\s*\}([\s\S]*)$/.exec(label);
  if (!m) return null;
  const d = ctx.wrt;
  const complaint =
    m[1] !== d
      ? `The variable underneath should be d${d}.`
      : appliedComplaint(
          m[2],
          ctx,
          `d/d${d} on its own is an instruction, not a value. Either apply it to the function — d/d${d}(f(${d})) = … — or write dy/d${d} = … instead.`,
        );
  return { form: 'leibniz', complaint };
};

/** D(…) = …, D_x(…) = … */
const euler: LabelReader = (label, ctx) => {
  const m = /^D(?:_\s*\{?\s*([a-zA-Z])\s*\}?)?([\s\S]*)$/.exec(label);
  if (!m) return null;
  const d = ctx.wrt;
  const complaint =
    m[1] !== undefined && m[1] !== d
      ? `D carries the variable it differentiates: D_${d}.`
      : appliedComplaint(
          m[2],
          ctx,
          `D is an operator, so it needs the function after it: D_${d}(f(${d})) = …`,
        );
  return { form: 'euler', complaint };
};

const LABELS = [lagrange, ratio, operator, euler];

/** An operator form's operand: missing, or not the function in the prompt, or fine. */
function appliedComplaint(
  operand: string | undefined,
  ctx: DerivativeContext,
  missing: string,
): string | null {
  const on = clean(operand ?? '');
  return on === '' ? missing : operandComplaint(on, ctx);
}

/** Whether what the operator was applied to is the function in the prompt. */
function operandComplaint(on: string, ctx: DerivativeContext): string | null {
  if (!ctx.of) return null;
  const mine = tryParse(strip(on));
  const theirs = tryParse(strip(ctx.of));
  if (!mine || !theirs) return null;
  if (equivalent(mine, theirs)) return null;
  return 'The operator is applied to something other than the function in the question.';
}

/** The first `=` that is not inside a group; everything before it is the label. */
function splitAt(raw: string): number {
  let depth = 0;
  for (let i = 0; i < raw.length; i += 1) {
    const c = raw[i]!;
    if (c === '\\') {
      i += 1;
      continue;
    }
    if (c === '{' || c === '(' || c === '[') depth += 1;
    else if (c === '}' || c === ')' || c === ']') depth -= 1;
    else if (c === '=' && depth <= 0) return i;
  }
  return -1;
}

/** LaTeX that decorates rather than means, and the spaces around it. */
function clean(s: string): string {
  return s
    .replace(/\\left|\\right|\\!|\\,|\\;|\\:|\\quad|\\qquad/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/** One layer of brackets around an operand, which the operator forms all have. */
function strip(s: string): string {
  const inner = clean(s);
  return /^\((.*)\)$/.test(inner) ? inner.slice(1, -1) : inner;
}
