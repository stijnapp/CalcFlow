import { answer, aside, setup } from '../authoring.js';
import type { Draft, Generator, Rng } from '../types.js';

/** A rectangle a given amount longer than it is wide, and its area. */
function rectangle(rng: Rng): Draft {
  const w = rng.int(2, 12);
  const k = rng.int(1, 9);
  const area = w * (w + k);
  const equation = `x\\left(x + ${k}\\right) = ${area}`;
  return {
    instruction: 'Find the width',
    prompt: equation,
    promptText: `A rectangle is ${k} cm longer than it is wide, and its area is ${area} cm². How wide is it?`,
    note: 'Give the width in centimetres.',
    answers: [answer(String(w), { keyboard: 'numeric', kind: 'number' })],
    solution: [
      aside('Name the unknown', `x = \\text{the width}`, `Then the length is x + ${k}.`),
      setup('quadratic-formula', 'As an equation', `x^{2} + ${k}x - ${area} = 0`),
      setup(
        'quadratic-formula',
        'Solve, and throw one away',
        `x = ${w} \\quad\\text{or}\\quad x = ${-(w + k)}`,
        'A width cannot be negative, so only one of the two is an answer to the question.',
      ),
    ],
    ruleIds: ['quadratic-formula', 'linear-solve'],
    verify: { kind: 'root', equation, wrt: 'x' },
  };
}

/** Two consecutive whole numbers with a given product. */
function consecutive(rng: Rng): Draft {
  const n = rng.int(4, 20);
  const product = n * (n + 1);
  const equation = `x\\left(x + 1\\right) = ${product}`;
  return {
    instruction: 'Find the smaller number',
    prompt: equation,
    promptText: `Two consecutive whole numbers multiply to ${product}. What is the smaller one?`,
    note: 'Both numbers are positive.',
    answers: [answer(String(n), { keyboard: 'numeric', kind: 'number' })],
    solution: [
      aside('Name the unknown', `x = \\text{the smaller number}`, 'Then the next one is x + 1.'),
      setup('quadratic-formula', 'As an equation', `x^{2} + x - ${product} = 0`),
      setup(
        'quadratic-formula',
        'Solve, and throw one away',
        `x = ${n} \\quad\\text{or}\\quad x = ${-(n + 1)}`,
        `${-(n + 1)} is a solution of the equation but not of the question — the numbers are positive.`,
      ),
    ],
    ruleIds: ['quadratic-formula', 'linear-solve'],
    verify: { kind: 'root', equation, wrt: 'x' },
  };
}

/** A pen with a fixed length of fencing and a given area: x(P/2 − x) = A. */
function fence(rng: Rng): Draft {
  const w = rng.int(3, 12);
  const l = w + rng.int(1, 9);
  const half = w + l;
  const area = w * l;
  const equation = `x\\left(${half} - x\\right) = ${area}`;
  return {
    instruction: 'Find the shorter side',
    prompt: equation,
    promptText: `A rectangular pen is fenced with ${2 * half} m of fencing and encloses ${area} m². How long is the shorter side?`,
    note: 'Give the length in metres.',
    answers: [answer(String(w), { keyboard: 'numeric', kind: 'number' })],
    solution: [
      aside(
        'Name the unknown',
        `x = \\text{the shorter side}`,
        `The two sides add to ${half}, so the other one is ${half} - x.`,
      ),
      setup('quadratic-formula', 'As an equation', `x^{2} - ${half}x + ${area} = 0`),
      setup(
        'quadratic-formula',
        'Solve, and pick the shorter',
        `x = ${w} \\quad\\text{or}\\quad x = ${l}`,
        'Both are real sides of the same rectangle — the question asked for the shorter one.',
      ),
    ],
    ruleIds: ['quadratic-formula', 'linear-solve'],
    verify: { kind: 'root', equation, wrt: 'x' },
  };
}

const MEDIUM = [rectangle, consecutive];
const HARD = [rectangle, consecutive, fence];

/**
 * The equation written in words, which is how every applied question arrives.
 * Naming the unknown and writing the sentence as an equation is most of the
 * work; the solving is chapter 8's ordinary business.
 */
export const wordProblem: Generator = {
  id: 'equations.word-problem',
  chapter: 8,
  title: 'Word problems',
  tags: ['quadratic', 'word-problem', 'solve'],
  version: 1,
  supports: ['medium', 'hard'] as const,
  invariant: 'solution-set-preserving',

  generate: ({ tier, rng }) => rng.pick(tier === 'hard' ? HARD : MEDIUM)(rng),
};
