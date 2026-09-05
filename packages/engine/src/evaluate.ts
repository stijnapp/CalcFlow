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
    case 'sym': {
      if (e.name === 'e') return Math.E;
      if (e.name in CONSTANTS) return CONSTANTS[e.name]!;
      const v = bindings[e.name];
      return v === undefined ? NaN : v;
    }
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
    case 'pow': {
      const b = evaluate(e.base, bindings);
      const p = evaluate(e.exp, bindings);
      if (b < 0 && !Number.isInteger(p)) return NaN;
      if (b === 0 && p < 0) return NaN;
      return Math.pow(b, p);
    }
    case 'fn':
      return applyFn(e.name, e.args.map((a) => evaluate(a, bindings)));
  }
}

function applyFn(name: string, args: number[]): number {
  const x = args[0] ?? NaN;
  switch (name) {
    case 'sqrt':
      return x < 0 ? NaN : Math.sqrt(x);
    case 'abs':
      return Math.abs(x);
    case 'sin':
      return Math.sin(x);
    case 'cos':
      return Math.cos(x);
    case 'tan':
      return Math.tan(x);
    case 'cot':
      return 1 / Math.tan(x);
    case 'sec':
      return 1 / Math.cos(x);
    case 'csc':
      return 1 / Math.sin(x);
    case 'asin':
    case 'arcsin':
      return x < -1 || x > 1 ? NaN : Math.asin(x);
    case 'acos':
    case 'arccos':
      return x < -1 || x > 1 ? NaN : Math.acos(x);
    case 'atan':
    case 'arctan':
      return Math.atan(x);
    case 'sinh':
      return Math.sinh(x);
    case 'cosh':
      return Math.cosh(x);
    case 'tanh':
      return Math.tanh(x);
    case 'exp':
      return Math.exp(x);
    case 'ln':
      return x <= 0 ? NaN : Math.log(x);
    case 'lg':
      return x <= 0 ? NaN : Math.log10(x);
    case 'log': {
      // One argument is base 10; two is log_base(value).
      if (args.length === 1) return x <= 0 ? NaN : Math.log10(x);
      const base = x;
      const value = args[1] ?? NaN;
      if (base <= 0 || base === 1 || value <= 0) return NaN;
      return Math.log(value) / Math.log(base);
    }
    default:
      return NaN;
  }
}
