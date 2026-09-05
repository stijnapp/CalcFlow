/**
 * The book's boxed "know this by heart" rules, as browsable cards. Hint rung 1
 * deep-links here by `id`, so every ruleId a generator emits should have a card.
 */
export interface RuleCard {
  id: string;
  chapter: number;
  name: string;
  tex: string;
  note: string;
}

export const RULES: readonly RuleCard[] = [
  {
    id: 'notable-products',
    chapter: 2,
    name: 'Squaring a binomial',
    tex: '(a\\pm b)^{2}=a^{2}\\pm 2ab+b^{2}',
    note: 'Square the first, twice the product, square the last. The middle term is the one people drop.',
  },
  {
    id: 'difference-of-squares',
    chapter: 2,
    name: 'Difference of squares',
    tex: '(a+b)(a-b)=a^{2}-b^{2}',
    note: 'The two middle terms cancel, which is what makes it worth spotting rather than expanding.',
  },
  {
    id: 'power-rules',
    chapter: 2,
    name: 'Power rules',
    tex: 'a^{m}a^{n}=a^{m+n},\\quad \\frac{a^{m}}{a^{n}}=a^{m-n},\\quad (a^{m})^{n}=a^{mn}',
    note: 'Exponents add when the bases multiply, and multiply only when the powers are nested.',
  },
  {
    id: 'negative-exponent',
    chapter: 2,
    name: 'Negative exponents',
    tex: 'a^{-n}=\\frac{1}{a^{n}}',
    note: 'A negative exponent means a reciprocal, never a negative result.',
  },
  {
    id: 'fraction-add',
    chapter: 3,
    name: 'Adding fractions',
    tex: '\\frac{a}{b}+\\frac{c}{d}=\\frac{ad+bc}{bd}',
    note: 'Any common denominator works; the least one saves the simplifying afterwards.',
  },
  {
    id: 'fraction-simplify',
    chapter: 3,
    name: 'Cancelling',
    tex: '\\frac{ac}{bc}=\\frac{a}{b}',
    note: 'Only whole factors cancel. A term that is added, not multiplied, stays put.',
  },
  {
    id: 'surd-simplify',
    chapter: 4,
    name: 'Simplifying surds',
    tex: '\\sqrt{a^{2}b}=a\\sqrt{b}',
    note: 'Pull out the largest square factor. √72 = √(36·2) = 6√2.',
  },
  {
    id: 'rationalise',
    chapter: 4,
    name: 'Rationalising a denominator',
    tex: '\\frac{1}{\\sqrt{a}+b}=\\frac{\\sqrt{a}-b}{a-b^{2}}',
    note: 'Multiply top and bottom by the conjugate; the denominator loses its root.',
  },
  {
    id: 'fractional-exponent',
    chapter: 4,
    name: 'Fractional exponents',
    tex: 'a^{m/n}=\\sqrt[n]{a^{m}}',
    note: 'The denominator is the root, the numerator is the power. Order does not matter.',
  },
  {
    id: 'log-laws',
    chapter: 6,
    name: 'Log laws',
    tex: '\\log_a(xy)=\\log_a x+\\log_a y,\\quad \\log_a(x^{n})=n\\log_a x',
    note: 'Products become sums, powers come out front. There is no rule for log(x+y).',
  },
  {
    id: 'change-of-base',
    chapter: 6,
    name: 'Change of base',
    tex: '\\log_a x=\\frac{\\ln x}{\\ln a}',
    note: 'The route to any base your calculator lacks.',
  },
  {
    id: 'exp-log-inverse',
    chapter: 6,
    name: 'exp and ln undo each other',
    tex: 'e^{\\ln x}=x,\\quad \\ln(e^{x})=x',
    note: 'So e^{3 ln t} is t³ — bring the 3 inside first.',
  },
  {
    id: 'exponential-equation',
    chapter: 6,
    name: 'Solving an exponential equation',
    tex: 'a^{x}=b\\iff x=\\frac{\\ln b}{\\ln a}',
    note: 'Take logs of both sides; the unknown comes down from the exponent.',
  },
  {
    id: 'radians',
    chapter: 7,
    name: 'Degrees and radians',
    tex: '180^\\circ=\\pi\\ \\text{rad}',
    note: 'Multiply by π/180 to go to radians, by 180/π to come back.',
  },
  {
    id: 'pythagorean-identity',
    chapter: 7,
    name: 'Pythagorean identity',
    tex: '\\sin^{2}x+\\cos^{2}x=1',
    note: 'The one identity everything else in the chapter is built from.',
  },
  {
    id: 'double-angle',
    chapter: 7,
    name: 'Double angle',
    tex: '\\sin 2x=2\\sin x\\cos x,\\quad \\cos 2x=1-2\\sin^{2}x',
    note: 'cos 2x has three equivalent forms; pick whichever leaves the tidier expression.',
  },
  {
    id: 'exact-values',
    chapter: 7,
    name: 'Exact values',
    tex: '\\sin\\tfrac{\\pi}{6}=\\tfrac{1}{2},\\quad \\sin\\tfrac{\\pi}{4}=\\tfrac{1}{2}\\sqrt{2},\\quad \\sin\\tfrac{\\pi}{3}=\\tfrac{1}{2}\\sqrt{3}',
    note: 'Know the 30–60–90 and 45–45–90 triangles and the rest follow.',
  },
  {
    id: 'quadratic-formula',
    chapter: 8,
    name: 'Quadratic formula',
    tex: 'x=\\frac{-b\\pm\\sqrt{b^{2}-4ac}}{2a}',
    note: 'The discriminant b²−4ac tells you how many real roots there are before you solve.',
  },
  {
    id: 'linear-solve',
    chapter: 8,
    name: 'Solving a linear equation',
    tex: 'ax+b=cx+d\\iff x=\\frac{d-b}{a-c}',
    note: 'Collect the unknowns on one side, the numbers on the other, then divide once.',
  },
  {
    id: 'power-rule',
    chapter: 9,
    name: 'Power rule',
    tex: '\\frac{d}{dx}x^{n}=nx^{n-1}',
    note: 'Works for every real n, including negative and fractional ones.',
  },
  {
    id: 'chain-rule',
    chapter: 9,
    name: 'Chain rule',
    tex: '\\frac{d}{dx}f(g(x))=f\'(g(x))\\cdot g\'(x)',
    note: 'Differentiate the outside at the inside, then multiply by the derivative of the inside.',
  },
  {
    id: 'product-rule',
    chapter: 9,
    name: 'Product rule',
    tex: '(uv)\'=u\'v+uv\'',
    note: 'Both terms, always. The derivative of a product is not the product of derivatives.',
  },
  {
    id: 'quotient-rule',
    chapter: 9,
    name: 'Quotient rule',
    tex: '\\left(\\frac{u}{v}\\right)\'=\\frac{u\'v-uv\'}{v^{2}}',
    note: 'The numerator subtracts, so the order matters — u′v comes first.',
  },
  {
    id: 'standard-derivatives',
    chapter: 9,
    name: 'Standard derivatives',
    tex: '(\\sin x)\'=\\cos x,\\quad (\\cos x)\'=-\\sin x,\\quad (e^{x})\'=e^{x},\\quad (\\ln x)\'=\\tfrac{1}{x}',
    note: 'The minus on the derivative of cos is the one that gets forgotten.',
  },
  {
    id: 'antiderivative-power',
    chapter: 10,
    name: 'Antiderivative of a power',
    tex: '\\int x^{n}\\,dx=\\frac{x^{n+1}}{n+1}+C,\\quad n\\neq-1',
    note: 'n = −1 is the exception: that integral is ln|x| + C.',
  },
  {
    id: 'linear-substitution',
    chapter: 10,
    name: 'Linear inner function',
    tex: '\\int f(ax+b)\\,dx=\\frac{1}{a}F(ax+b)+C',
    note: 'Divide by the derivative of the inside — but only when the inside is linear.',
  },
  {
    id: 'plus-c',
    chapter: 10,
    name: 'The constant of integration',
    tex: '\\int f(x)\\,dx=F(x)+C',
    note: 'An indefinite integral is a family of functions. Without +C the answer names only one.',
  },
  {
    id: 'definite-integral',
    chapter: 11,
    name: 'Definite integral',
    tex: '\\int_a^b f(x)\\,dx=F(b)-F(a)',
    note: 'No +C once the bounds go in — it cancels.',
  },
  {
    id: 'area-between',
    chapter: 11,
    name: 'Area between two curves',
    tex: 'A=\\int_a^b \\left(f(x)-g(x)\\right)dx',
    note: 'Upper curve minus lower, and split the integral wherever they cross.',
  },
];

export function ruleById(id: string): RuleCard | undefined {
  return RULES.find((r) => r.id === id);
}
