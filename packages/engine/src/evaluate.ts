import { type Expr, CONSTANTS } from './expr.js';

export type Bindings = Record<string, number>;

/**
 * Real-valued evaluation. Anything outside the real domain — a negative square
 * root, log of a non-positive number, a pole — comes back NaN rather than
 * throwing, because the sampler's whole job is to walk past those points.
 */
export function evaluate(e: Expr, bindings: Bindings = {}): number {
  switch (e.kind) {
    case 'num':
      return e.value;
    case 'rational':
      return e.p / e.q;
    case 'sym':
      return symbolValue(e.name, bindings);
    case 'add': {
      let sum = 0;
      for (const t of e.terms) sum += evaluate(t, bindings);
      return sum;
    }
    case 'mul': {
      let product = 1;
      for (const f of e.factors) product *= evaluate(f, bindings);
      return product;
    }
    case 'pow':
      return power(evaluate(e.base, bindings), evaluate(e.exp, bindings));
    case 'fn':
      return applyFn(e.name, e.args.map((a) => evaluate(a, bindings)));
  }
}

function symbolValue(name: string, bindings: Bindings): number {
  if (name === 'e') return Math.E;
  if (name in CONSTANTS) return CONSTANTS[name]!;
  return bindings[name] ?? NaN;
}

/** A negative base only has real powers that are whole; zero has no negative ones. */
function power(b: number, p: number): number {
  if (b < 0 && !Number.isInteger(p)) return NaN;
  if (b === 0 && p < 0) return NaN;
  return Math.pow(b, p);
}

type Unary = (x: number) => number;

/** Outside [−1, 1] an inverse sine or cosine has no real value. */
const withinUnit = (f: Unary): Unary => (x) => (x < -1 || x > 1 ? NaN : f(x));
/** Nor does a logarithm of anything that is not positive. */
const ofPositive = (f: Unary): Unary => (x) => (x <= 0 ? NaN : f(x));

const UNARY = new Map<string, Unary>([
  ['sqrt', (x) => (x < 0 ? NaN : Math.sqrt(x))],
  ['abs', Math.abs],
  ['sin', Math.sin],
  ['cos', Math.cos],
  ['tan', Math.tan],
  ['cot', (x) => 1 / Math.tan(x)],
  ['sec', (x) => 1 / Math.cos(x)],
  ['csc', (x) => 1 / Math.sin(x)],
  ['asin', withinUnit(Math.asin)],
  ['arcsin', withinUnit(Math.asin)],
  ['acos', withinUnit(Math.acos)],
  ['arccos', withinUnit(Math.acos)],
  ['atan', Math.atan],
  ['arctan', Math.atan],
  ['sinh', Math.sinh],
  ['cosh', Math.cosh],
  ['tanh', Math.tanh],
  ['exp', Math.exp],
  ['ln', ofPositive(Math.log)],
  ['lg', ofPositive(Math.log10)],
]);

function applyFn(name: string, args: number[]): number {
  if (name === 'log') return logarithm(args);
  const f = UNARY.get(name);
  return f ? f(args[0] ?? NaN) : NaN;
}

/** One argument is base 10; two is log_base(value). */
function logarithm(args: number[]): number {
  const [base = NaN, value = NaN] = args;
  if (args.length === 1) return ofPositive(Math.log10)(base);
  if (base <= 0 || base === 1 || value <= 0) return NaN;
  return Math.log(value) / Math.log(base);
}
