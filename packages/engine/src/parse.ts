import {
  type Expr,
  add,
  div,
  fn,
  mul,
  neg,
  num,
  pow,
  sub,
  sym,
} from './expr.js';

/**
 * Parses the subset of maths this app can produce: LaTeX as emitted by the
 * on-screen keyboard, and the plain ASCII form MathLive gives back from
 * `getValue('ascii-math')`. One tokenizer covers both, so the same parser keeps
 * working when the keyboard is swapped for a real math field.
 */

const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'arcsin', 'arccos', 'arctan', 'asin', 'acos', 'atan',
  'sinh', 'cosh', 'tanh',
  'ln', 'log', 'lg', 'exp', 'sqrt', 'abs',
]);

const CONSTANT_NAMES = new Set(['pi', 'tau']);

/** LaTeX spacing and decoration that carries no meaning. */
const IGNORED_COMMANDS = new Set([
  'left', 'right', 'quad', 'qquad', 'displaystyle', 'textstyle', 'limits',
  'mathrm', 'mathit', 'text', 'operatorname', 'big', 'Big', 'bigg', 'Bigg',
]);

type Token =
  | { t: 'num'; v: number; decimal: boolean }
  | { t: 'name'; v: string }
  | { t: 'fn'; v: string }
  | { t: 'cmd'; v: string }
  | { t: 'op'; v: string };

export class ParseError extends Error {}

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (c === '\\') {
      let j = i + 1;
      while (j < src.length && /[a-zA-Z]/.test(src[j]!)) j += 1;
      if (j === i + 1) {
        // \, \! \; \: \  — spacing escapes
        i += 2;
        continue;
      }
      let name = src.slice(i + 1, j);
      i = j;
      // `\sin x` is usually written with a space, but `\sinx` reaches us from
      // string-built LaTeX often enough to be worth peeling apart rather than
      // rejecting: take the known command off the front, leave the rest as
      // ordinary letters.
      if (!isKnownCommand(name)) {
        const head = longestKnownCommandPrefix(name);
        if (head) {
          i -= name.length - head.length;
          name = head;
        }
      }
      if (IGNORED_COMMANDS.has(name)) continue;
      if (name === 'cdot' || name === 'times') out.push({ t: 'op', v: '*' });
      else if (name === 'div') out.push({ t: 'op', v: '/' });
      else if (name === 'frac' || name === 'dfrac' || name === 'tfrac') out.push({ t: 'cmd', v: 'frac' });
      else if (FUNCTIONS.has(name)) out.push({ t: 'fn', v: name });
      else if (CONSTANT_NAMES.has(name)) out.push({ t: 'name', v: name });
      else out.push({ t: 'cmd', v: name });
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      let j = i;
      while (j < src.length && /[0-9]/.test(src[j]!)) j += 1;
      let decimal = false;
      if (src[j] === '.' && /[0-9]/.test(src[j + 1] ?? '')) {
        decimal = true;
        j += 1;
        while (j < src.length && /[0-9]/.test(src[j]!)) j += 1;
      }
      out.push({ t: 'num', v: Number(src.slice(i, j)), decimal });
      i = j;
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      let j = i;
      while (j < src.length && /[a-zA-Z]/.test(src[j]!)) j += 1;
      let run = src.slice(i, j);
      // Greedily peel known names off the front; anything left is a run of
      // single-letter variables, so `xy` is x·y but `sinx` is sin(x).
      while (run.length) {
        const hit = longestKnownPrefix(run);
        if (hit) {
          out.push(FUNCTIONS.has(hit) ? { t: 'fn', v: hit } : { t: 'name', v: hit });
          run = run.slice(hit.length);
        } else {
          out.push({ t: 'name', v: run[0]! });
          run = run.slice(1);
        }
      }
      i = j;
      continue;
    }
    if ('+-*/^(){}[]|_,='.includes(c)) {
      out.push({ t: 'op', v: c });
      i += 1;
      continue;
    }
    if (c === '·') {
      out.push({ t: 'op', v: '*' });
      i += 1;
      continue;
    }
    if (c === '−') {
      out.push({ t: 'op', v: '-' });
      i += 1;
      continue;
    }
    throw new ParseError(`Unexpected character ${JSON.stringify(c)}`);
  }
  return out;
}

const COMMAND_NAMES = new Set([
  ...FUNCTIONS,
  ...CONSTANT_NAMES,
  ...IGNORED_COMMANDS,
  'frac', 'dfrac', 'tfrac', 'cdot', 'times', 'div',
]);

function isKnownCommand(name: string): boolean {
  return COMMAND_NAMES.has(name);
}

function longestKnownCommandPrefix(run: string): string | null {
  for (let len = Math.min(run.length - 1, 12); len >= 2; len -= 1) {
    const candidate = run.slice(0, len);
    if (COMMAND_NAMES.has(candidate)) return candidate;
  }
  return null;
}

function longestKnownPrefix(run: string): string | null {
  for (let len = Math.min(run.length, 7); len >= 2; len -= 1) {
    const candidate = run.slice(0, len).toLowerCase();
    if (FUNCTIONS.has(candidate) || CONSTANT_NAMES.has(candidate)) return run.slice(0, len);
  }
  return null;
}

class Parser {
  private pos = 0;
  /** Depth of open |…| bars, so a closing bar is never read as a new factor. */
  private absDepth = 0;
  constructor(private readonly toks: Token[]) {}

  private peek(k = 0): Token | undefined {
    return this.toks[this.pos + k];
  }
  private next(): Token | undefined {
    return this.toks[this.pos++];
  }
  private eatOp(v: string): boolean {
    const t = this.peek();
    if (t && t.t === 'op' && t.v === v) {
      this.pos += 1;
      return true;
    }
    return false;
  }
  private expectOp(v: string): void {
    if (!this.eatOp(v)) throw new ParseError(`Expected ${v}`);
  }

  parse(): Expr {
    const e = this.expression();
    if (this.pos < this.toks.length) {
      const t = this.peek()!;
      throw new ParseError(`Unexpected trailing input near ${JSON.stringify(t.v)}`);
    }
    return e;
  }

  /** expression := term (('+' | '-') term)* */
  expression(): Expr {
    let e = this.term();
    for (;;) {
      if (this.eatOp('+')) e = add(e, this.term());
      else if (this.eatOp('-')) e = sub(e, this.term());
      else return e;
    }
  }

  /** term := unary (('*' | '/')? unary)* — juxtaposition multiplies. */
  term(): Expr {
    let e = this.unary();
    for (;;) {
      if (this.eatOp('*')) e = mul(e, this.unary());
      else if (this.eatOp('/')) e = div(e, this.unary());
      else if (this.startsFactor()) e = mul(e, this.unary());
      else return e;
    }
  }

  private startsFactor(): boolean {
    const t = this.peek();
    if (!t) return false;
    if (t.t === 'num' || t.t === 'name' || t.t === 'fn') return true;
    if (t.t === 'cmd') return true;
    if (t.t === 'op') {
      if (t.v === '|') return this.absDepth === 0;
      return t.v === '(' || t.v === '{';
    }
    return false;
  }

  unary(): Expr {
    if (this.eatOp('-')) return neg(this.unary());
    if (this.eatOp('+')) return this.unary();
    return this.power();
  }

  /** power := primary ('^' unary)? — right-associative, and `-` binds into the exponent. */
  power(): Expr {
    const base = this.primary();
    if (this.eatOp('^')) return pow(base, this.unary());
    return base;
  }

  /** A braced group, or the single token that follows `^` / `_` without braces. */
  private group(): Expr {
    if (this.eatOp('{')) {
      const e = this.expression();
      this.expectOp('}');
      return e;
    }
    if (this.eatOp('(')) {
      const e = this.expression();
      this.expectOp(')');
      return e;
    }
    const t = this.next();
    if (!t) throw new ParseError('Unexpected end of input');
    if (t.t === 'num') return num(t.v, t.decimal);
    if (t.t === 'name') return sym(t.v);
    throw new ParseError('Expected a group');
  }

  primary(): Expr {
    const t = this.peek();
    if (!t) throw new ParseError('Unexpected end of input');

    if (t.t === 'num') {
      this.pos += 1;
      return num(t.v, t.decimal);
    }
    if (t.t === 'name') {
      this.pos += 1;
      return sym(t.v);
    }
    if (t.t === 'cmd') {
      this.pos += 1;
      if (t.v === 'frac') return div(this.group(), this.group());
      throw new ParseError(`Unsupported command \\${t.v}`);
    }
    if (t.t === 'fn') {
      this.pos += 1;
      return this.functionCall(t.v);
    }
    if (t.t === 'op') {
      if (t.v === '(' || t.v === '{') {
        this.pos += 1;
        const e = this.expression();
        this.expectOp(t.v === '(' ? ')' : '}');
        return e;
      }
      if (t.v === '|') {
        this.pos += 1;
        this.absDepth += 1;
        const e = this.expression();
        this.absDepth -= 1;
        this.expectOp('|');
        return fn('abs', e);
      }
    }
    throw new ParseError(`Unexpected token ${JSON.stringify(t.v)}`);
  }

  private functionCall(name: string): Expr {
    if (name === 'sqrt') {
      // \sqrt[n]{x} is the n-th root.
      if (this.eatOp('[')) {
        const n = this.expression();
        this.expectOp(']');
        return pow(this.group(), div(num(1), n));
      }
      return fn('sqrt', this.group());
    }
    // log with an explicit base: \log_{a}(x) or log_a x
    let base: Expr | null = null;
    if (name === 'log' && this.eatOp('_')) base = this.group();

    // An exponent right after the name applies to the whole call: sin^2 x.
    let outerExp: Expr | null = null;
    if (this.eatOp('^')) outerExp = this.group();

    const arg = this.functionArgument();
    const call = base ? fn('log', base, arg) : fn(name, arg);
    // sin^{-1} is the inverse, not a reciprocal — the one exception.
    if (outerExp) {
      if (outerExp.kind === 'num' && outerExp.value === -1 && name.length === 3) {
        return fn(`arc${name}`, arg);
      }
      return pow(call, outerExp);
    }
    return call;
  }

  /**
   * `sin(x)` and `sin x` both work. Bare application takes one factor, but a
   * leading number pulls in what follows, so `sin 2x` is sin(2x) while
   * `sin x cos x` is sin(x)·cos(x).
   */
  private functionArgument(): Expr {
    const t = this.peek();
    if (t && t.t === 'op' && (t.v === '(' || t.v === '{')) return this.group();

    let e = this.power();
    if (e.kind === 'num') {
      while (this.startsFactor()) {
        const nxt = this.peek()!;
        if (nxt.t === 'fn') break;
        e = mul(e, this.power());
      }
    }
    return e;
  }
}

export function parse(src: string): Expr {
  const cleaned = src.replace(/\\\\/g, ' ').trim();
  if (!cleaned) throw new ParseError('Nothing to parse');
  return new Parser(tokenize(cleaned)).parse();
}

/** Parses, returning null instead of throwing — for grading user input. */
export function tryParse(src: string): Expr | null {
  try {
    return parse(src);
  } catch {
    return null;
  }
}
