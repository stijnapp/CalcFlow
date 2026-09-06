# Adding a topic

A topic is one file, one line in the registry, and a test run. Nothing else in
the app changes: the practice UI, the hint ladder, the stats and the sync log all
read from the generator contract.

`packages/generators/src/topics/ch09-differentiation.ts` is the reference
implementation. Copy it.

## 1. Write the generator

```ts
export const myTopic: Generator = {
  id: 'chapter.topic',        // stable forever — attempts store it
  chapter: 13,
  title: 'Limits',
  tags: ['limits'],
  version: 1,                 // bump on any behaviour change
  supports: { steps: [1, 3], difficulty: [1, 4] },
  invariant: 'value-preserving',
  generate({ steps, difficulty, rng }) { /* … */ },
};
```

`supports` is the region of the 5×5 (steps × difficulty) grid this topic can
actually fill. The session only draws from generators covering the cell the
sliders are on, so declaring a range you cannot serve produces bad problems, and
declaring one too narrow just means the topic comes up less often.

`generate` returns a `Draft`:

| field | what it is |
|---|---|
| `instruction` | The imperative above the maths: "Differentiate", "Solve for x". |
| `prompt` | The problem, as LaTeX. |
| `promptText` | Prose, for a word problem. Optional. |
| `note` | Conditions and the form wanted: "a is a positive constant." |
| `answers` | One `AnswerSpec` per input field. Build them with `answer(tex)`. |
| `solution` | The worked steps, each naming the rule it applied. |
| `ruleIds` | Rule cards this touches, **headline rule first**. Every id needs a card in `rules.ts`. |
| `verify` | An independent numeric check. See below. |

### Write the answer once

`answer('\\frac{1}{2\\sqrt{x}}')` parses the LaTeX to get the AST used for
grading, so the string he is shown and the value he is graded against cannot
drift apart. The helpers in `authoring.ts` (`frac`, `poly`, `power`, `times`,
`fracTex`) keep the LaTeX readable — `times` in particular folds away the
coefficients that would otherwise print as `2\sqrt{x}2\sqrt{…}`.

### The solution tree is the hint ladder

The hint panel is read straight off `solution`. That is why hints need no
handwriting recognition: he taps until he reaches a line he did not already
know. Give each step a `note` saying *why*, not just *what* — the note is the
sentence he reads.

Not every line applies a rule. Collecting like terms or tidying a numerator is
not something anybody looks up, and naming a card for it puts a rule in the
rules-used list that the problem never taught. Use `tidy(label, expr, note?)`
from `authoring.ts` for those, and `step(ruleId, …)` only where a boxed rule is
genuinely being applied.

### `ruleIds[0]` is the headline

Hint rung 1 is "which rule", and it names `ruleIds[0]` — so that has to be the
thing he has to *spot*, not the first mechanical move. `(x²−25)/(x+5)` listed
cancelling first and duly told him "Cancelling" for a problem whose whole point
is the difference of squares.

The harness checks the list is *complete* — every `ruleId` a solution step
applies has to appear in it. Nothing can check that the first one is the
interesting one; that part is on the author.

A step that still carries an unapplied operator (`\frac{d}{dx}(…)`, a `±`, a
bracket with bounds) cannot be evaluated. Mark it `display: true`. Use this
sparingly: every line that *can* be checked must be.

## 2. Declare a verification

`verify` is the invariant that catches an algebra slip, because it re-derives the
answer from the prompt rather than trusting the generator's own working.

| kind | what the harness does |
|---|---|
| `identity` | Checks the answer is equal to `of` at sampled points. |
| `derivative` | Differentiates `of` numerically and compares to the answer. |
| `antiderivative` | Differentiates the answer and compares to `of`. |
| `definite-integral` | Integrates `of` over `[from, to]` by Simpson's rule. |
| `root` | Substitutes every declared answer into `equation`. |

## 3. Register it

Add the export to `GENERATORS` in `packages/generators/src/registry.ts`, and a
rule card in `rules.ts` for every id in `ruleIds`.

If the chapter is new, add it to `CHAPTERS` in `packages/shared/src/chapters.ts`.
The home screen, the stats dashboard and the chapter filters all read from there.

## 4. Run the harness

```
npm test
```

Every generator gets 500 instances across its whole declared grid, asserting
that:

- it does not throw, anywhere in its supported region;
- the prompt and every answer parse;
- the answer evaluates to a finite number somewhere in its domain;
- the answer is not just the prompt again (which catches degenerate parameters);
- every ruleId has a rule card, and every rule a solution step applies is
  declared in `ruleIds`;
- every checkable solution line is equivalent to the answer — for a
  `solution-set-preserving` generator, every checkable line has the declared root
  as a solution;
- `verify` holds.

The step-chain invariant is the one that matters most. It catches the class of
bug where the answer happens to be right but the *hints* lie, which is the worst
thing this app could do.

## Conventions worth keeping

- **Exact, not decimal.** The book is emphatic. `requires.exact` defaults on.
- **`+C` on indefinite integrals**, with `upToConstant: true` so any
  constant-shifted correct answer is accepted, and `requires.plusC` so a missing
  one is reported as its own error class rather than a flat wrong.
- **Build equations from their roots**, so the answers stay exact and the
  discriminant is a perfect square.
- **Keep ln and √ arguments positive** across the whole sampling domain, or the
  equivalence check runs out of valid samples and the problem fails the harness.
