/**
 * The expression AST. Deliberately tiny: every other shape (subtraction,
 * division, negation, roots) is normalised into one of these seven nodes at
 * parse time, so evaluation and traversal only ever handle seven cases.
 */
export type Expr =
  | Num
  | Rational
  | Sym
  | Add
  | Mul
  | Pow
  | Fn;

export interface Num {
  kind: 'num';
  value: number;
  /** Written as a decimal in the source. Drives the exact-form check. */
  decimal?: boolean;
}
export interface Rational {
  kind: 'rational';
  p: number;
  q: number;
}
export interface Sym {
  kind: 'sym';
  name: string;
}
export interface Add {
  kind: 'add';
  terms: Expr[];
}
export interface Mul {
  kind: 'mul';
  factors: Expr[];
}
export interface Pow {
  kind: 'pow';
  base: Expr;
  exp: Expr;
}
export interface Fn {
  kind: 'fn';
  name: string;
  args: Expr[];
}

export const num = (value: number, decimal = false): Num => ({ kind: 'num', value, decimal });
export const sym = (name: string): Sym => ({ kind: 'sym', name });
export const fn = (name: string, ...args: Expr[]): Fn => ({ kind: 'fn', name, args });
export const pow = (base: Expr, exp: Expr): Pow => ({ kind: 'pow', base, exp });

export function rational(p: number, q: number): Expr {
  if (q === 0) return num(NaN);
  const s = q < 0 ? -1 : 1;
  const g = gcd(Math.abs(p), Math.abs(q)) || 1;
  const rp = (s * p) / g;
  const rq = (s * q) / g;
  return rq === 1 ? num(rp) : { kind: 'rational', p: rp, q: rq };
}

export const add = (...terms: Expr[]): Expr => (terms.length === 1 ? terms[0]! : { kind: 'add', terms });
export const mul = (...factors: Expr[]): Expr => (factors.length === 1 ? factors[0]! : { kind: 'mul', factors });
export const neg = (e: Expr): Expr => mul(num(-1), e);
export const sub = (a: Expr, b: Expr): Expr => add(a, neg(b));
export const div = (a: Expr, b: Expr): Expr => mul(a, pow(b, num(-1)));
export const sqrt = (e: Expr): Expr => fn('sqrt', e);

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

/** Named constants the parser resolves to numbers. */
export const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  tau: Math.PI * 2,
};

/** Depth-first walk over every node. */
export function walk(e: Expr, visit: (node: Expr) => void): void {
  visit(e);
  switch (e.kind) {
    case 'add':
      e.terms.forEach((t) => walk(t, visit));
      break;
    case 'mul':
      e.factors.forEach((f) => walk(f, visit));
      break;
    case 'pow':
      walk(e.base, visit);
      walk(e.exp, visit);
      break;
    case 'fn':
      e.args.forEach((a) => walk(a, visit));
      break;
    default:
      break;
  }
}

/** Every free variable, in first-seen order. `e` is Euler's number, not a variable. */
export function freeVars(e: Expr): string[] {
  const seen: string[] = [];
  walk(e, (n) => {
    if (n.kind === 'sym' && n.name !== 'e' && !(n.name in CONSTANTS) && !seen.includes(n.name)) {
      seen.push(n.name);
    }
  });
  return seen;
}

/** AST node count — the "is it actually simplified?" yardstick. */
export function complexity(e: Expr): number {
  let n = 0;
  walk(e, () => {
    n += 1;
  });
  return n;
}
