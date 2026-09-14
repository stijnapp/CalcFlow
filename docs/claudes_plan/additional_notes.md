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

---

## C. Keeping eight metrics from becoming a mess

All eight suggested metrics are in. The rule that stops them turning the stats screen
into a wall of numbers is **one screen, three slots, and a metric has to earn its slot**.

**Slot 1 — the standing page.** Unchanged, and capped: mastery per chapter, the four
confidence × correctness tiles, the two recommendation cards. Nothing new was added
here. Adding something means taking something out.

**Slot 2 — one sentence.** *The read*, a single line above the page. All eight metrics
compete for it in a fixed order of how much the answer would change what he practises
next: misremembered rule → confidence calibration → error mix → retention → stale topics
→ tier gap → speed trend → hint independence → streak. The strongest one wins the line;
the rest say nothing. As the log changes the line changes, so over weeks all eight get
read — never more than one at a time.

**Slot 3 — "Look closer".** One fold at the bottom holding the other seven, in a fixed
order, each two or three lines, each drawn the same way (a label, a bar, a number) so
none of them needs its own visual language.

Two rules keep the fold honest:

- **Silence is the default.** Every readout has a minimum count and a "is this actually
  notable" gate. A section with too little behind it is not rendered at all, the read
  line disappears entirely when nothing qualifies, and an empty fold is a correct state
  rather than a bug.
- **Nothing gets promoted for being interesting.** A metric that cannot change what he
  does next stays in the fold forever, however nice it looks.

Where each one landed:

| Metric | Slot |
|---|---|
| Confidence calibration | read + fold |
| Error-class breakdown | read + fold |
| Sure-but-wrong by rule | read + fold (rebuilt from the seed, headline rule only) |
| Retention curve | read + fold |
| Hint dependence | read + fold |
| Speed as a slope | read + fold (last 10 vs the 20 before, per chapter) |
| Accuracy by difficulty | read + fold |
| Topic staleness grid | read + fold |
| Streak | header chrome, next to the attempt count |
| Per-chapter speed indicator (§B) | already on the standing page |
