import { answer, aside, frac, power, step, sum, term, tidy, times } from '../authoring.js';
import type { AnswerSpec, Draft, Generator, Latex, Rng, Step } from '../types.js';

/*
 * Every one of the six practice exams asks for a mixed partial derivative, and
 * always the same way: one function of x and y, differentiate in one and then
 * the other. What changes is the function — a product with an exponential, a
 * square times a log, a quotient, and twice a logarithmic derivative to open
 * with. Those are the shapes below.
 */

const MIXED = '\\frac{\\partial^{2}}{\\partial x\\,\\partial y}';
const DX = '\\frac{\\partial f}{\\partial x}';
const DY = '\\frac{\\partial f}{\\partial y}';

interface Shape {
  f: Latex;
  /** The answer, tidied. */
  result: Latex;
  steps: Step[];
  rules: string[];
  /** Asked for ∂f/∂y alone rather than the mixed one. */
  single?: boolean;
  note?: string;
  domain?: AnswerSpec['domain'];
}

/** `3x^{2}y`, `-y^{3}`, `4` — a monomial with the zero powers left out. */
function mono(c: number, px: number, py: number): Latex {
  const body = `${px ? power('x', px) : ''}${py ? power('y', py) : ''}`;
  return body === '' ? String(c) : term(c, body);
}

/** `ky`, `-2xy` — a coefficient on a product of letters. */
const lin = (k: number, body: string): Latex => term(k, body);

function polynomial(rng: Rng): Shape {
  const a = rng.nonZero(-5, 5);
  const m = rng.int(1, 3);
  const n = rng.int(m === 1 ? 2 : 1, 3);
  const b = rng.nonZero(-6, 6);
  const p = rng.int(2, 4);
  const c = rng.nonZero(-6, 6);
  const q = rng.int(2, 4);
  const f = sum([mono(a, m, n), mono(b, p, 0), mono(c, 0, q)]);
  const fx = sum([mono(a * m, m - 1, n), mono(b * p, p - 1, 0)]);
  const result = mono(a * m * n, m - 1, n - 1);
  return {
    f,
    result,
    steps: [
      aside('Differentiate in x', `${DX} = ${fx}`, 'Hold $y$ fixed: it is a number for now, so the term with only $y$ in it goes.'),
      step('partial-derivative', 'Then in y', result, 'Now $x$ is the number, and the term with only $x$ in it goes.'),
    ],
    rules: ['partial-derivative', 'power-rule'],
  };
}

function exponential(rng: Rng): Shape {
  const k = rng.pick([1, 2, 3, -1, -2]);
  const e = `e^{${lin(k, 'xy')}}`;
  const result = times(String(k), `${e}\\left(${sum(['1', lin(k, 'xy')])}\\right)`);
  return {
    f: e,
    result,
    steps: [
      aside('Differentiate in x', `${DX} = ${lin(k, 'y')}${e}`, `The chain rule brings down the derivative of $${lin(k, 'xy')}$ in $x$, which is $${lin(k, 'y')}$.`),
      step('product-rule', 'Then in y', sum([times(String(k), e), lin(k * k, `xy${e}`)]), `$${lin(k, 'y')}$ and $${e}$ both have $y$ in them: product rule.`),
      tidy('Factor', result),
    ],
    rules: ['partial-derivative', 'product-rule', 'chain-rule'],
  };
}

function sine(rng: Rng): Shape {
  const a = rng.int(1, 3);
  const arg = `\\left(${lin(a, 'xy')}\\right)`;
  const result = sum([times(String(a), `\\cos${arg}`), lin(-a * a, `xy\\sin${arg}`)]);
  return {
    f: `\\sin${arg}`,
    result,
    steps: [
      aside('Differentiate in x', `${DX} = ${lin(a, 'y')}\\cos${arg}`),
      step('product-rule', 'Then in y', result, `$${lin(a, 'y')}$ and the cosine both depend on $y$, so this one is a product.`),
    ],
    rules: ['partial-derivative', 'product-rule', 'chain-rule'],
  };
}

function expSine(rng: Rng): Shape {
  const b = rng.int(1, 3);
  const arg = `\\left(${lin(b, 'y')}\\right)`;
  const [sin, cos] = [`\\sin${arg}`, `\\cos${arg}`];
  const result = `e^{xy}\\left(\\left(1 + xy\\right)${sin} + ${lin(b, 'y')}${cos}\\right)`;
  return {
    f: `e^{xy}${sin} + ${cos}`,
    result,
    steps: [
      aside('Differentiate in x first', `${DX} = ye^{xy}${sin}`, 'The cosine has no $x$ in it and goes. That is what makes $x$ the shorter way round.'),
      step('product-rule', 'Then in y', sum([`e^{xy}${sin}`, `xye^{xy}${sin}`, lin(b, `ye^{xy}${cos}`)]), 'Three factors hold a $y$: $y$ itself, $e^{xy}$ and the sine.'),
      tidy('Factor out the exponential', result),
    ],
    rules: ['partial-derivative', 'product-rule', 'chain-rule'],
  };
}

function squareLog(rng: Rng): Shape {
  const p = rng.int(1, 2);
  const q = rng.pick(p === 2 ? [1, -1] : [1, 2, -1, -2]);
  const u = sum([lin(p, 'x'), lin(q, 'y')]);
  const ln = `\\ln\\left(${u}\\right)`;
  const result = times(String(p * q), `\\left(2${ln} + 3\\right)`);
  return {
    f: `\\left(${u}\\right)^{2}${ln}`,
    result,
    steps: [
      aside('Differentiate in x', `${DX} = ${times(String(p), `\\left(2\\left(${u}\\right)${ln} + ${u}\\right)`)}`, `Product rule on $u^{2}\\ln u$, and the chain rule brings out the $${p}$ from $u = ${u}$.`),
      step('chain-rule', 'Then in y', times(String(p * q), `\\left(2${ln} + 2 + 1\\right)`), `Every $u$ now brings out a $${q}$ instead.`),
      tidy('Collect', result),
    ],
    rules: ['partial-derivative', 'product-rule', 'chain-rule'],
    // Sampled where the log is defined, whichever way round the letters are.
    domain: q < 0 ? { x: { min: 2.3, max: 2.83 }, y: { min: 0.17, max: 1 } } : undefined,
  };
}

function quotient(rng: Rng): Shape {
  const k = rng.int(1, 4);
  const top = lin(k, 'xy');
  const result = frac(lin(2 * k, 'xy'), '\\left(x + y\\right)^{3}');
  return {
    f: frac(top, 'x + y'),
    result,
    steps: [
      aside('Differentiate in x', `${DX} = ${frac(lin(k, 'y^{2}'), '\\left(x + y\\right)^{2}')}`, `Quotient rule: $${lin(k, 'y')}\\left(x + y\\right) - ${top}$ on top, and the $${top}$ cancels.`),
      step('quotient-rule', 'Then in y', frac(`${lin(2 * k, 'y')}\\left(x + y\\right)^{2} - ${lin(2 * k, 'y^{2}')}\\left(x + y\\right)`, '\\left(x + y\\right)^{4}')),
      tidy('Cancel a factor x + y', result),
    ],
    rules: ['partial-derivative', 'quotient-rule'],
  };
}

function logSquares(rng: Rng): Shape {
  const a = rng.int(1, 3);
  const b = rng.int(1, 3);
  const inner = sum([lin(a, 'x^{2}'), lin(b, 'y^{2}')]);
  const result = `-${frac(lin(4 * a * b, 'xy'), `\\left(${inner}\\right)^{2}`)}`;
  return {
    f: `\\ln\\left(${inner}\\right)`,
    result,
    steps: [
      aside('Differentiate in x', `${DX} = ${frac(lin(2 * a, 'x'), inner)}`),
      step('chain-rule', 'Then in y', `${lin(2 * a, 'x')}\\cdot ${frac(`-${lin(2 * b, 'y')}`, `\\left(${inner}\\right)^{2}`)}`, 'The top has no $y$ in it; only the bottom changes, and it is a power $-1$.'),
      tidy('Multiply out', result),
    ],
    rules: ['partial-derivative', 'chain-rule'],
  };
}

function xSine(rng: Rng): Shape {
  const a = rng.int(1, 3);
  const arg = `\\left(${lin(a, 'xy')}\\right)`;
  const result = sum([lin(2 * a, `x\\cos${arg}`), lin(-a * a, `x^{2}y\\sin${arg}`)]);
  return {
    f: `x\\sin${arg}`,
    result,
    steps: [
      aside('Differentiate in y first', `${DY} = ${lin(a, `x^{2}\\cos${arg}`)}`, 'The $y$ is only inside the sine, so this way round the first step is the chain rule alone.'),
      step('product-rule', 'Then in x', result),
    ],
    rules: ['partial-derivative', 'chain-rule', 'product-rule'],
  };
}

function powerTower(rng: Rng): Shape {
  const a = rng.int(1, 3);
  const ay = lin(a, 'y');
  const lowered = `x^{${ay} - 1}`;
  const result = times(String(a), `${lowered}\\left(1 + ${lin(a, 'y')}\\ln x\\right)`);
  return {
    f: `x^{${ay}}`,
    result,
    steps: [
      aside('Take logs', `\\ln f = ${ay}\\ln x`, 'A variable in the exponent: logarithmic differentiation.'),
      aside('Differentiate in y', `${DY} = f\\cdot ${a} \\ln x = ${times(String(a), `x^{${ay}}\\ln x`)}`),
      step('product-rule', 'Then in x', sum([times(String(a), lowered), lin(a * a, `y${lowered}\\ln x`)]), `The power rule on $x^{${ay}}$ with $y$ held fixed, and $\\frac{1}{x}$ from the log.`),
      tidy('Factor', result),
    ],
    rules: ['partial-derivative', 'logarithmic-differentiation', 'product-rule', 'power-rule'],
    note: 'x is positive.',
  };
}

function expOver(rng: Rng): Shape {
  const k = rng.int(1, 2);
  const f = frac(`e^{${lin(k, 'xy')}}`, 'xy');
  const fy = `\\left(${lin(k, 'x')} - \\frac{1}{y}\\right)`;
  const fx = `\\left(${lin(k, 'y')} - \\frac{1}{x}\\right)`;
  const result = `${f}\\left(${fx}${fy} + ${k}\\right)`;
  return {
    f,
    result,
    steps: [
      aside('Take logs', `\\ln f = ${lin(k, 'xy')} - \\ln x - \\ln y`, 'A product and a quotient: the log turns them into a sum.'),
      aside('Differentiate in y', `${DY} = f\\cdot ${fy}`),
      step('product-rule', 'Then in x', sum([`${f}${fx}${fy}`, times(String(k), f)]), `$f$ and the bracket both depend on $x$. $\\frac{\\partial f}{\\partial x}$ is $f\\cdot ${fx}$ by the same logarithm.`),
      tidy('Factor out f', result),
    ],
    rules: ['partial-derivative', 'logarithmic-differentiation', 'product-rule'],
    note: 'x and y are positive.',
  };
}

function logFirst(rng: Rng): Shape {
  const k = rng.int(1, 3);
  const f = frac(`xye^{${lin(k, 'xy')}}`, '\\sqrt{x + y}');
  const inside = `\\frac{1}{y} + ${lin(k, 'x')} - \\frac{1}{2\\left(x + y\\right)}`;
  const bracket = `\\left(${inside}\\right)`;
  const result = `${f}${bracket}`;
  return {
    f,
    result,
    single: true,
    steps: [
      aside('Take logs', `\\ln f = \\ln x + \\ln y + ${lin(k, 'xy')} - \\frac{1}{2}\\ln\\left(x + y\\right)`, 'Four factors become four terms, and each differentiates on its own.'),
      aside('Differentiate in y', `\\frac{1}{f}${DY} = ${inside}`, '$\\ln x$ has no $y$ in it and goes.'),
      step('logarithmic-differentiation', 'Multiply back by f', result),
    ],
    rules: ['logarithmic-differentiation', 'partial-derivative'],
    note: 'x and y are positive. Use logarithmic differentiation.',
  };
}

const MEDIUM = [polynomial, exponential, sine];
const HARD = [expSine, squareLog, quotient, logSquares, xSine, powerTower, expOver, logFirst];

/** ∂²f/∂x∂y: hold one letter still, differentiate in the other, then swap. */
export const mixedPartial: Generator = {
  id: 'diff.partial',
  chapter: 9,
  title: 'Mixed partial derivatives',
  tags: ['differentiation', 'partial'],
  version: 1,
  supports: ['medium', 'hard'],
  invariant: 'value-preserving',

  generate({ tier, rng }): Draft {
    const s = rng.pick(tier === 'hard' ? HARD : MEDIUM)(rng);
    return {
      instruction: s.single ? 'Find the partial derivative' : 'Find the mixed partial derivative',
      prompt: s.single ? `\\frac{\\partial}{\\partial y}\\left(${s.f}\\right)` : `${MIXED}\\left(${s.f}\\right)`,
      ...(s.note ? { note: s.note } : {}),
      answers: [answer(s.result, { keyboard: 'calculus', ...(s.domain ? { domain: s.domain } : {}) })],
      solution: s.steps,
      ruleIds: s.rules,
      verify: s.single
        ? { kind: 'derivative', of: s.f, wrt: 'y' }
        : { kind: 'mixed-partial', of: s.f, wrt: ['x', 'y'] },
    };
  },
};
