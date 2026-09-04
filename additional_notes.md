# CalcFlow — additional notes (post-mockup expansions)

`plan.md` is frozen. Everything below is new, discovered after the first Claude Design
pass. These are written for Claude Design, not as a build spec.

---

## A. Typed LaTeX on the canvas

New tool-rail entry: **T** (alongside pen, eraser, undo, redo, clear). Claude Design has
already mocked this one — confirming the shape here for the record:

- Selecting **T** suspends drawing and opens a **LaTeX source bar** along the bottom of
  the canvas.
- Typing in that bar renders a **committed vs. active** distinction:
  - the **active block** shows a caret plus ✓ / ✕ to confirm or discard it,
  - once confirmed it becomes a **committed block** — a floating box containing the
    rendered LaTeX, sitting on the canvas like a sticky note.
- Committed blocks can be **dragged around** the canvas freely, same as any other
  canvas content, so he can position a typed formula next to the handwritten step it
  belongs to.
- This is **visual only** — a typed block is not "real" editable math the app parses or
  grades. It's there so he doesn't have to hand-write long expressions he already knows
  (e.g. copying a rule down before applying it). No parsing, no equivalence checking, no
  interaction with the answer/grading system.
- Pen input stays fully suspended while **T** mode is active; switching back to pen
  re-enables drawing and hides the source bar.

Open question for the mockup to help answer: does a committed block need a delete
affordance beyond "clear canvas", or is drag-to-trash / long-press enough? Leaving this
to Claude Design's judgment for now.

---

## B. Speed-per-chapter in stats

New signal alongside correctness and confidence: **how long problems in each chapter
take**, so he can tell "I get these right but I'm slow" apart from "I get these right
and I'm fast" — and deliberately drill the slow-but-correct chapters to build fluency,
not just accuracy.

- Duration is already tracked silently per attempt (see `plan.md` §9, `duration_ms`) —
  this is a **new view on existing data**, not a new tracking requirement.
- Needs a per-chapter **speed indicator** somewhere in the stats dashboard (§4 screen 8)
  — e.g. a fast/average/slow badge or a small sparkline next to each chapter's mastery
  bar. Relative to his own median across chapters, not an absolute external benchmark
  (there's no "correct" speed to compare against, just his own baseline).
  Exact visual form left to Claude Design.
- This plausibly changes the **"study next" recommendation** too: "confident and wrong"
  chapters stay the top-priority misconceptions, but a "correct and slow" chapter is a
  reasonable second-tier suggestion — fluency practice rather than error correction.
- Session mode idea (not yet confirmed, flagging for Claude Design to consider): a
  fourth preset alongside *Set of 10 / Endless / Weak spots* — something like
  **"build speed"** that pulls from correct-but-slow chapters. Not committing to this
  yet; wanted to surface it while the idea is fresh.
