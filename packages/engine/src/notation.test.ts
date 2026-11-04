import { describe, expect, it } from 'vitest';
import { parse } from './parse.js';
import { readDerivative, readNamed } from './notation.js';

const CTX = { wrt: 'x', of: '6x^3' };

describe('readDerivative', () => {
  it('leaves a bare expression alone', () => {
    expect(readDerivative('18x^2', CTX)).toEqual({
      body: '18x^2',
      form: 'bare',
      complaint: null,
    });
  });

  it.each([
    ["f'(x) = 18x^2", 'lagrange'],
    ["y' = 18x^2", 'lagrange'],
    ['\\frac{dy}{dx} = 18x^2', 'leibniz'],
    ['\\frac{d}{dx}(6x^3) = 18x^2', 'leibniz'],
    ['\\frac{d}{dx}\\left(6x^3\\right) = 18x^2', 'leibniz'],
    ['D(6x^3) = 18x^2', 'euler'],
    ['D_x(6x^3) = 18x^2', 'euler'],
    ['D_{x}(6x^3) = 18x^2', 'euler'],
  ])('accepts %s', (raw, form) => {
    const read = readDerivative(raw, CTX);
    expect(read.complaint, raw).toBeNull();
    expect(read.form).toBe(form);
    expect(read.body).toBe('18x^2');
  });

  it('rejects d/dx used as though it were a value', () => {
    const read = readDerivative('\\frac{d}{dx} = 18x^2', CTX);
    expect(read.body).toBe('18x^2');
    expect(read.complaint).toContain('instruction');
  });

  it('rejects the wrong variable underneath', () => {
    expect(readDerivative('\\frac{dy}{dt} = 18x^2', CTX).complaint).toContain('dx');
  });

  it('rejects D without a function to act on', () => {
    expect(readDerivative('D = 18x^2', CTX).complaint).toContain('operator');
  });

  it('rejects an operator applied to the wrong function', () => {
    expect(readDerivative('\\frac{d}{dx}(6x^2) = 18x^2', CTX).complaint).toContain('other than');
  });

  it('rejects a label that names nothing', () => {
    expect(readDerivative('answer = 18x^2', CTX).complaint).toContain('not a name');
  });

  it('does not split on an = inside a group', () => {
    expect(readDerivative('\\frac{1}{2}x^{2}', CTX).body).toBe('\\frac{1}{2}x^{2}');
  });
});

describe('readNamed', () => {
  const asked = (label: string, value = '4') => ({ said: [label, 'Find a'], reference: parse(value) });

  it.each([
    ['a = 4', '4'],
    ['a=4', '4'],
    ['a = \\frac{3}{2}', '\\frac{3}{2}'],
  ])('takes the name off %s when the question asks for a', (raw, body) => {
    expect(readNamed(raw, asked('a'))).toBe(body);
  });

  it('leaves an answer without a name alone', () => {
    expect(readNamed('4', asked('a'))).toBe('4');
  });

  it('finds the name inside a longer label', () => {
    expect(readNamed('x = -2', { said: ['smaller x', 'Solve'], reference: parse('-2') })).toBe('-2');
  });

  it('keeps a name the question never asked for', () => {
    expect(readNamed('b = 4', asked('a'))).toBe('b = 4');
  });

  it('keeps a name that is more than one letter', () => {
    expect(readNamed('ab = 4', asked('a'))).toBe('ab = 4');
  });

  it('keeps an equation that still has the unknown on both sides', () => {
    expect(readNamed('x = 2x + 1', { said: ['x'], reference: parse('2x + 1') })).toBe('x = 2x + 1');
  });
});
