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

/**
 * Reads one token at `i` — or skips something that carries no meaning — and
 * returns where the next one starts. Null when the character is not its kind.
 */
type Scanner = (src: string, i: number, out: Token[]) => number | null;

const LETTER = /[a-zA-Z]/;
const DIGIT = /\d/;

/** Where the run of characters matching `pattern` that starts at `j` ends. */
function runEnd(src: string, j: number, pattern: RegExp): number {
  let end = j;
  while (end < src.length && pattern.test(src[end]!)) end += 1;
  return end;
}

const skipSpace: Scanner = (src, i) => (/\s/.test(src[i]!) ? i + 1 : null);

const scanCommand: Scanner = (src, i, out) => {
  if (src[i] !== '\\') return null;
  const end = runEnd(src, i + 1, LETTER);
  // \, \! \; \: \  — spacing escapes
  if (end === i + 1) return i + 2;
  const whole = src.slice(i + 1, end);
  // `\sin x` is usually written with a space, but `\sinx` reaches us from
  // string-built LaTeX often enough to be worth peeling apart rather than
  // rejecting: take the known command off the front, leave the rest as
  // ordinary letters.
  const name = COMMAND_NAMES.has(whole) ? whole : (longestKnownCommandPrefix(whole) ?? whole);
  const token = commandToken(name);
  if (token) out.push(token);
  return i + 1 + name.length;
};

const COMMAND_OPS = new Map([
  ['cdot', '*'],
  ['times', '*'],
  ['div', '/'],
]);
const FRACTIONS = new Set(['frac', 'dfrac', 'tfrac']);

/** What a backslash command stands for; null when it is only spacing or decoration. */
function commandToken(name: string): Token | null {
  if (IGNORED_COMMANDS.has(name)) return null;
  const op = COMMAND_OPS.get(name);
  if (op) return { t: 'op', v: op };
  if (FRACTIONS.has(name)) return { t: 'cmd', v: 'frac' };
  if (FUNCTIONS.has(name)) return { t: 'fn', v: name };
  if (CONSTANT_NAMES.has(name)) return { t: 'name', v: name };
  return { t: 'cmd', v: name };
}

const scanNumber: Scanner = (src, i, out) => {
  const starts = DIGIT.test(src[i]!) || (src[i] === '.' && DIGIT.test(src[i + 1] ?? ''));
  if (!starts) return null;
  let end = runEnd(src, i, DIGIT);
  const decimal = src[end] === '.' && DIGIT.test(src[end + 1] ?? '');
  if (decimal) end = runEnd(src, end + 1, DIGIT);
  out.push({ t: 'num', v: Number(src.slice(i, end)), decimal });
  return end;
};

const scanLetters: Scanner = (src, i, out) => {
  if (!LETTER.test(src[i]!)) return null;
  const end = runEnd(src, i, LETTER);
  // Greedily peel known names off the front; anything left is a run of
  // single-letter variables, so `xy` is x·y but `sinx` is sin(x).
  let run = src.slice(i, end);
  while (run.length) {
    const hit = longestKnownPrefix(run) ?? run[0]!;
    out.push(FUNCTIONS.has(hit) ? { t: 'fn', v: hit } : { t: 'name', v: hit });
    run = run.slice(hit.length);
  }
  return end;
};

const OPERATORS = '+-*/^(){}[]|_,=';
/** The typographic forms a paste can bring in. */
const UNICODE_OPS = new Map([
  ['·', '*'],
  ['−', '-'],
]);

const scanOperator: Scanner = (src, i, out) => {
  const c = src[i]!;
  const v = OPERATORS.includes(c) ? c : UNICODE_OPS.get(c);
  if (v === undefined) return null;
  out.push({ t: 'op', v });
  return i + 1;
};

const SCANNERS = [skipSpace, scanCommand, scanNumber, scanLetters, scanOperator];

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) i = scanOne(src, i, out);
  return out;
}

function scanOne(src: string, i: number, out: Token[]): number {
  for (const scan of SCANNERS) {
    const next = scan(src, i, out);
    if (next !== null) return next;
  }
  throw new ParseError(`Unexpected character ${JSON.stringify(src[i])}`);
}

const COMMAND_NAMES = new Set([
  ...FUNCTIONS,
  ...CONSTANT_NAMES,
  ...IGNORED_COMMANDS,
  ...COMMAND_OPS.keys(),
  ...FRACTIONS,
]);

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
