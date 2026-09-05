import { describe, expect, it } from 'vitest';
import { parse, tryParse, ParseError } from './parse.js';
import { evaluate } from './evaluate.js';
import { equivalent } from './equivalent.js';
import { complexity, freeVars } from './expr.js';
import { hasPlusC, isExact, isSimplified, stripPlusC } from './form.js';
import { grade } from './grade.js';

const eq = (a: string, b: string, opts = {}) => equivalent(parse(a), parse(b), opts);

describe('parser', () => {
  it('reads the LaTeX the on-screen keyboard produces', () => {
    expect(evaluate(parse('\\frac{1}{2}'))).toBeCloseTo(0.5, 12);
    expect(evaluate(parse('\\sqrt{9}'))).toBeCloseTo(3, 12);
    expect(evaluate(parse('\\sqrt[3]{27}'))).toBeCloseTo(3, 12);
    expect(evaluate(parse('2\\cdot 3'))).toBe(6);
    expect(evaluate(parse('\\left(2+3\\right)\\cdot 2'))).toBe(10);
    expect(evaluate(parse('\\pi'))).toBeCloseTo(Math.PI, 12);
    expect(evaluate(parse('e^{2}'))).toBeCloseTo(Math.E ** 2, 12);
  });

  it('reads plain ASCII the same way', () => {
    expect(evaluate(parse('sqrt(9)'))).toBe(3);
    expect(evaluate(parse('1/2'))).toBe(0.5);
    expect(evaluate(parse('2*3+1'))).toBe(7);
    expect(evaluate(parse('(1+2)/(3-1)'))).toBe(1.5);
  });

  it('multiplies by juxtaposition', () => {
    expect(evaluate(parse('2x'), { x: 5 })).toBe(10);
    expect(evaluate(parse('xy'), { x: 3, y: 4 })).toBe(12);
    expect(evaluate(parse('2\\sqrt{x}'), { x: 9 })).toBe(6);
    expect(evaluate(parse('x(x+1)'), { x: 3 })).toBe(12);
  });

  it('gives a bare function its argument without swallowing the next factor', () => {
    // sin 2x is sin(2x); sin x cos x is a product of two calls.
    expect(evaluate(parse('\\sin 2x'), { x: 0.5 })).toBeCloseTo(Math.sin(1), 12);
    expect(evaluate(parse('\\sin x\\cos x'), { x: 0.5 })).toBeCloseTo(
      Math.sin(0.5) * Math.cos(0.5),
      12,
    );
    expect(evaluate(parse('\\sin^{2}x'), { x: 0.5 })).toBeCloseTo(Math.sin(0.5) ** 2, 12);
  });

  it('handles powers right-associatively and unary minus', () => {
    expect(evaluate(parse('2^{3^{2}}'))).toBe(512);
    expect(evaluate(parse('-x^{2}'), { x: 3 })).toBe(-9);
    expect(evaluate(parse('x^{-1}'), { x: 4 })).toBe(0.25);
  });

  it('reads logs with an explicit base and absolute values', () => {
    expect(evaluate(parse('\\log_{2}(8)'))).toBeCloseTo(3, 12);
    expect(evaluate(parse('\\ln e'))).toBeCloseTo(1, 12);
    expect(evaluate(parse('\\left|-3\\right|'))).toBe(3);
  });

  it('returns null rather than throwing on nonsense', () => {
    expect(tryParse('\\frac{1}{')).toBeNull();
    expect(tryParse('')).toBeNull();
    expect(() => parse('++')).toThrow(ParseError);
  });

  it('reports free variables, ignoring e and pi', () => {
    expect(freeVars(parse('a x + \\pi + e'))).toEqual(['a', 'x']);
  });
});

describe('evaluate', () => {
  it('returns NaN outside the real domain instead of throwing', () => {
    expect(evaluate(parse('\\sqrt{x}'), { x: -1 })).toBeNaN();
    expect(evaluate(parse('\\ln x'), { x: 0 })).toBeNaN();
    expect(evaluate(parse('\\frac{1}{x}'), { x: 0 })).toBeNaN();
    expect(evaluate(parse('x^{0.5}'), { x: -4 })).toBeNaN();
  });
});

describe('equivalence — pairs that must pass', () => {
  const same: Array<[string, string]> = [
    ['\\sin 2x', '2\\sin x\\cos x'],
    ['\\cos 2x', '1-2\\sin^{2}x'],
    ['\\sin^{2}x+\\cos^{2}x', '1'],
    ['(a+3)^{2}-(a-3)^{2}', '12a'],
    ['\\frac{1}{2\\sqrt{x}(a+\\sqrt{x})}', '\\frac{1}{a+\\sqrt{x}}\\cdot\\frac{1}{2\\sqrt{x}}'],
    ['\\ln(x^{2})', '2\\ln x'],
    ['e^{3\\ln x}', 'x^{3}'],
    ['\\frac{x^{2}-1}{x-1}', 'x+1'],
    ['\\sqrt{8}', '2\\sqrt{2}'],
    ['\\frac{1}{\\sqrt{2}}', '\\frac{\\sqrt{2}}{2}'],
    ['\\log_{2}(x)', '\\frac{\\ln x}{\\ln 2}'],
    ['x^{\\frac{1}{2}}', '\\sqrt{x}'],
    ['\\frac{a}{b}+\\frac{c}{b}', '\\frac{a+c}{b}'],
    ['\\tan x', '\\frac{\\sin x}{\\cos x}'],
  ];
  it.each(same)('%s === %s', (a, b) => {
    expect(eq(a, b)).toBe(true);
  });
});

describe('equivalence — adversarial near misses that must fail', () => {
  const different: Array<[string, string]> = [
    ['\\sin 2x', '2\\sin x'],
    ['\\cos 2x', '1-\\sin^{2}x'],
    ['\\ln(x+1)', '\\ln x+\\ln 1'],
    ['(a+b)^{2}', 'a^{2}+b^{2}'],
    ['\\sqrt{x+1}', '\\sqrt{x}+1'],
    ['\\frac{1}{a+b}', '\\frac{1}{a}+\\frac{1}{b}'],
    ['\\frac{1}{2\\sqrt{x}(a+\\sqrt{x})}', '\\frac{1}{a+\\sqrt{x}}'],
    ['x^{3}', '3x^{2}'],
    ['\\frac{d}{dx}', 'x'],
    ['2^{30}', '3^{20}'],
    ['\\tan 2x', '2\\tan x'],
  ];
  it.each(different)('%s !== %s', (a, b) => {
    // The last pair is only reachable if both sides parse; \frac{d}{dx} is a
    // quotient here, which is exactly the kind of input we must not accept.
    expect(eq(a, b)).toBe(false);
  });
});

describe('equivalence — constant difference for antiderivatives', () => {
  it('accepts an answer shifted by a constant', () => {
    expect(eq('\\frac{x^{2}}{2}+7', '\\frac{x^{2}}{2}', { mode: 'constant-difference' })).toBe(true);
    expect(eq('\\ln x', '\\ln(2x)', { mode: 'constant-difference' })).toBe(true);
  });
  it('still rejects a genuinely different antiderivative', () => {
    expect(eq('\\frac{x^{2}}{2}', '\\frac{x^{3}}{3}', { mode: 'constant-difference' })).toBe(false);
    expect(eq('x^{2}', '2x^{2}', { mode: 'constant-difference' })).toBe(false);
  });
});

describe('form checks', () => {
  it('spots the constant of integration', () => {
    expect(hasPlusC(parse('\\frac{x^{2}}{2}+C'))).toBe(true);
    expect(hasPlusC(parse('\\frac{x^{2}}{2}'))).toBe(false);
    expect(evaluate(stripPlusC(parse('x+C')), { x: 2 })).toBe(2);
  });

  it('rejects a decimal where the answer is irrational', () => {
    expect(isExact(parse('0.866'), parse('\\frac{1}{2}\\sqrt{3}'))).toBe(false);
    expect(isExact(parse('\\frac{1}{2}\\sqrt{3}'), parse('\\frac{1}{2}\\sqrt{3}'))).toBe(true);
  });

  it('allows a decimal when the answer terminates anyway', () => {
    expect(isExact(parse('0.5'), parse('\\frac{1}{2}'))).toBe(true);
    expect(isExact(parse('2.25'), parse('\\frac{9}{4}'))).toBe(true);
  });

  it('flags an answer left obviously uncollapsed', () => {
    expect(isSimplified(parse('x+1'), parse('x+1'))).toBe(true);
    expect(isSimplified(parse('\\frac{(x+1)(x-1)(x+2)(x-2)}{(x+1)(x+2)}'), parse('x^{2}-4'))).toBe(
      false,
    );
  });

  it('counts nodes for complexity', () => {
    expect(complexity(parse('x'))).toBe(1);
    expect(complexity(parse('x+1'))).toBe(3);
  });
});

describe('grade', () => {
  const ref = parse('\\frac{1}{2\\sqrt{x}(a+\\sqrt{x})}');

  it('accepts a correct answer written a different way', () => {
    const r = grade({ raw: '\\frac{1}{a+\\sqrt{x}}\\cdot\\frac{1}{2\\sqrt{x}}', reference: ref });
    expect(r).toMatchObject({ correct: true, errorClass: null });
  });

  it('classifies a wrong answer', () => {
    expect(grade({ raw: '\\frac{1}{a+\\sqrt{x}}', reference: ref }).errorClass).toBe('wrong');
  });

  it('classifies unreadable input as wrong but says it did not parse', () => {
    const r = grade({ raw: '\\frac{1}{', reference: ref });
    expect(r).toMatchObject({ correct: false, errorClass: 'wrong', parsed: false });
  });

  it('separates a missing +C from a wrong antiderivative', () => {
    const antiderivative = parse('\\frac{1}{10}(2x+1)^{5}');
    const opts = { reference: antiderivative, requires: { plusC: true }, upToConstant: true };
    expect(grade({ raw: '\\frac{1}{10}(2x+1)^{5}', ...opts }).errorClass).toBe('plus-c');
    expect(grade({ raw: '\\frac{1}{10}(2x+1)^{5}+C', ...opts }).correct).toBe(true);
    expect(grade({ raw: '\\frac{1}{5}(2x+1)^{5}+C', ...opts }).errorClass).toBe('wrong');
  });

  it('separates a decimal from a wrong answer', () => {
    const r = grade({ raw: '0.8660254037844386', reference: parse('\\frac{1}{2}\\sqrt{3}') });
    expect(r.errorClass).toBe('not-exact');
  });
});
