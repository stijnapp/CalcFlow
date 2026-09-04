# CalcFlow — practice app for the RU HBO-minor Mathematics Practice Book

> Working plan. Hand sections 1–5 to Claude Design for the mockup; sections 6–11 are the
> build spec that follows. The original approved plan is archived at
> `~/.claude/plans/https-www-cs-ru-nl-perry-hbominor-mathem-resilient-wolf.md`.

## Context

Stijn is starting a Data Science minor (pre-master equivalent) at Radboud, taught in
English, coming from a Dutch MAVO maths background. The gap is in the *prerequisite*
maths of the RU "Mathematics Practice Book" (12 chapters, 75 pages) — material he is
expected to know by heart but doesn't yet.

The book contains only ~130 fixed exercises. Reading them once isn't enough; what's
needed is **volume, on demand, anywhere** — specifically dead train time, offline.

So: a local-first installable PWA that **generates** unlimited problems from the book's
topics, lets him work them out with the S-Pen on a scribble canvas, checks the final
answer, gives graded hints when he's stuck, and tracks which topics he actually gets
wrong — weighted by how confident he was, because *confident and wrong* is a
misconception while *unsure and wrong* is just a gap.

Source: https://www.cs.ru.nl/~perry/hbominor/Mathematics%20Practice%20Book.pdf

Target devices: Galaxy S23 Ultra (portrait) and Galaxy Tab S11 (landscape only), both
with S-Pen.

---

## 1. Source material inventory (extracted from the PDF)

| Ch | Title | Exercise flavours in the book | v1 |
|----|-------|-------------------------------|-----|
| 1 | Numbers & basic arithmetic | set membership (ℕ ℤ ℚ ℝ ℂ), long addition/subtraction, distributive shortcuts, linear solve, rational equations | — |
| 2 | Powers | notable products, power rules, expand/simplify, `(a+3)²−(a−3)²`, compare `2³⁰` vs `3²⁰`, factor `x³=25x` | ✅ |
| 3 | Fractions | add/subtract/simplify, decimal expansion, combine rational expressions, solve rational equations, express α in terms of β, °F↔°C | ✅ |
| 4 | Roots | simplify surds, rationalise denominators, root equations, absolute-value equations, fractional exponents, exponential equations | ✅ |
| 5 | Curves, functions, graphs | line through 2 points, slope, intersections, domain/range, inverses, distance, circle equation/area, sketching | — |
| 6 | exp, ln, log | log laws, `5^(x+1)=7^(x−1)`, `e^(3 ln t)`, change of base, growth/decay, `e^(2x) = 20 + e^x` | ✅ |
| 7 | sin, cos, tan | degrees↔radians, exact values, double-angle, sum/difference, Pythagorean identity, simplify trig | ✅ |
| 8 | Equations, inequalities, systems | linear, quadratic (abc + completing the square), inequalities, substitution-to-quadratic, 2×2 systems, mixture problems | ✅ |
| 9 | Differentiation | power/sum/product/quotient/chain, tangent lines, extrema & optimisation, applied rates | ✅ |
| 10 | Antidifferentiation | power/exp/trig antiderivatives, linear inner substitution, partial fractions, long division, `+C` | ✅ |
| 11 | Integration | definite integrals, area between curves, absolute area, solids of revolution, applied (distance from v–t) | ✅ |
| 12 | Vectors | linear combos, magnitude, dot product, angle between, distance, parametric ↔ implicit lines, intersections | — |

**Deferred:** Ch 1 (largely long-hand arithmetic, low value), Ch 5 and Ch 12 (both need
graph/vector rendering — a separate chunk of work). **Ch 13 "Limits" is deliberately
left out** so that adding it later exercises the add-a-topic workflow for real.

Roughly a fifth of the book's exercises are **not auto-gradable** ("sketch the curve",
"prove this identity", "explain what mistake Frank made"). These are excluded from v1;
a self-graded proof mode can come later.

---

## 2. The core insight

**Do not generate a problem as `{prompt, answer}`. Generate it as a solution tree.**

The generator picks the parameters, so it knows the entire worked solution — every
intermediate expression, and the *name of the rule* applied at each step. Two things
fall out for free:

1. **Hints need no handwriting recognition.** The app never has to know where on the
   canvas he is. Hints are progressively revealed from the tree, and he taps until he
   reaches something he didn't already know. No local vision model, no compute cost, no
   unreliability.
2. **Intermediate checking is cheap.** Symbolic equivalence can be decided by evaluating
   two expressions at ~24 random points and comparing numerically. So an "am I still on
   track?" box can validate *any* line he types, from *any* solution path, without a CAS
   and without a server. This is what actually solves the "the app doesn't know where I
   am" problem.

The same sampling equivalence grades the final answer, plus a **form check** — the book
is emphatic that answers be *exact*, so `0.866` is rejected where `½√3` is required.

---

## 3. Product decisions

### Confirmed with the user

- **Platform:** installed PWA. Offline via service worker; S-Pen via Pointer Events
  (pressure supported). A WebView APK wrap stays possible later.
- **Answer input:** adaptive — numeric answers get a numpad, expression answers get a
  full math keyboard (√ ∫ π, fraction/exponent keys) rendering live as real maths.
- **Stats v1:** per-chapter mastery bars, confidence×correctness 2×2 with confident-wrong
  surfaced as "misconceptions", and a "study next" recommendation.
- **Chapters v1:** 2, 3, 4, 6, 7, 8, 9, 10, 11 (see table above).
- **Tablet layout:** two-pane, **canvas on the LEFT, controls on the RIGHT** — so his
  writing hand rests on the tablet rather than hanging off the edge.
- **Hints:** both the four-rung ladder *and* the on-track equivalence checker. The hint
  panel itself may scroll internally.
- **Canvas:** a fixed viewport onto an infinitely tall surface. **The page never
  scrolls — all elements stay visible — but he can pan freely within the canvas.**
  Strokes are discarded after each problem, not persisted.
- **S-Pen button: unavailable, confirmed on hardware.** Measured on both devices via a
  live pointer-event capture (~10,000 samples): `buttons` only ever takes 0 or 1, the
  barrel and eraser flags are never set, and `pointerType` is never `"eraser"`. Chrome on
  Android does not surface the S-Pen button to web pages, and the button+touch
  combination is swallowed at the system level. The Samsung Notes eraser behaviour is
  therefore **not reachable from a PWA** — see §8 for what replaces it.
- **Erase:** a tool-rail toggle (tap eraser, tap pen to go back) with a clear persistent
  active state.
- **Undo: two-finger tap on the canvas.** The Procreate/GoodNotes gesture — quick, needs
  no reach for the rail, and Samsung Notes annoyingly doesn't have it. **Three-finger tap
  redoes**, since that's the matching half of the same convention. The rail keeps its
  undo/redo buttons as well.
- **Visual:** dark-first, warm amber accent, with green/red reserved strictly for
  correct/wrong feedback. **Geist** for UI typography.

### Assumed defaults (override any of these freely)

- Non-auto-gradable exercise types excluded from v1.
- Word problems: a small set of parameterised templates per chapter, toggleable off.
- Exact form enforced; decimals rejected unless the problem says "round to".
- **Two independent sliders**, not one: *Steps* (1–5) and *Difficulty* (1–5).
- Sliders are global; the stats screen suggests per-chapter overrides once it has data.
- Adaptive difficulty as a toggle, off by default until there's history.
- Three session presets: pick chapters / everything mixed / drill weak spots.
- Multi-field answers supported (`|a|`, `|b|`, `|c|` as three fields).
- Multiple choice only for question types that are genuinely MC in the book.
- `+C` required on antiderivatives, but tracked as its own error class, not a flat wrong.
- Rule cards: the book's boxed "know this by heart" rules as a browsable sheet, linked
  from hints.
- Hints in English (matches the course and the exam vocabulary).
- Pen-only mode on by default on tablet; finger then pans the canvas instead of drawing.
- Canvas tools: pen (2 widths), eraser, undo/redo, clear, one accent colour. Nothing more.
- Sessions of 10 with a summary screen, plus an endless mode.
- Time tracked silently and shown in stats — no visible timer (it adds stress).
- **Three** confidence levels: *sure / think so / guessed*.
- **Confidence captured at submit, before the result is shown** — this is what makes the
  2×2 meaningful.
- A light daily streak. No XP, badges or confetti.
- KaTeX's serif maths kept as-is; it reads better and separates "problem" from "chrome".

### The two sliders, concretely

*Steps* controls how many operations are chained. *Difficulty* controls how ugly the
numbers and structure are. They compose independently:

| | Steps 1 | Steps 3 | Steps 5 |
|---|---|---|---|
| **Diff 1** (integers) | `d/dx x³` | `d/dx (x³ + 2x − 7)` | `d/dx (x³ + 2x − 7)(x + 1)` |
| **Diff 3** (fractions, surds) | `d/dx √x` | `d/dx (√x)/(x+1)` | `d/dx (√x + 3/x²)/(x+1)` |
| **Diff 5** (symbolic params) | `d/dx x^a` | `d/dx ln(a + √x)` | `d/dx ln(a + √x)·e^(bx)` |

Each generator declares which region of the 5×5 grid it supports, and the session picks
only from generators that cover the requested cell.

---

## 4. Screen inventory for Claude Design

Ten screens. Dark-first, warm amber accent, generous radii, layered surfaces.

1. **Home / session setup** — chapter chips each carrying a small mastery ring; the two
   sliders; mode selector (Set of 10 / Endless / Weak spots); adaptive toggle; a large
   Start. Streak indicator, quietly, in a corner.
2. **Practice — tablet landscape.** Two-pane, static, nothing on the page scrolls:
   - **Left ~62%:** the canvas. Infinite vertical surface, panned within a fixed frame.
     A slim tool rail (pen ×2 widths, eraser, undo, redo, clear, pen-only toggle) and a
     subtle vertical position indicator at the pane's edge. The eraser is a rail toggle,
     so the rail needs a clear persistent active state — with the pen button unavailable
     it is the primary way to erase, not a fallback. Undo/redo also fire from two- and
     three-finger taps, so both need a brief non-blocking toast ("Undo") confirming the
     gesture landed — otherwise a mis-registered tap is indistinguishable from nothing
     happening.
   - **Right ~38%:** progress pill (`7 / 10`), chapter tag, the problem in KaTeX, the
     hint button, the answer field, the math keyboard, the confidence row, Submit.
3. **Practice — phone portrait.** Stacked: problem card on top, canvas in the middle
   (expandable to fullscreen), answer sheet pinned to the bottom. The math keyboard
   raises the answer sheet over the canvas rather than shrinking it.
4. **Canvas fullscreen** (phone) — the problem collapses to a thin persistent bar so it
   is still readable while writing.
5. **Hint panel** — the four rungs (*which rule* / *set it up* / *next step* /
   *full solution*) with the on-track equivalence box beneath. Slides in over the control
   column on tablet, as a bottom sheet on phone. Internally scrollable.
6. **Answer feedback** — correct and incorrect variants. Incorrect shows the reference
   answer and a "see the steps" expansion of the solution tree. The near-miss cases
   (`forgot +C`, `not in exact form`, `not fully simplified`) get their own wording
   rather than a flat red.
7. **Session summary** — score, total time, confidence breakdown, per-topic hits and
   misses, and a "practice the misses" CTA.
8. **Stats dashboard** — mastery bars, the confidence×correctness 2×2, the study-next
   card.
9. **Rule reference sheet** — the book's boxed rules, searchable, grouped by chapter.
   Hint rung 1 deep-links into it.
10. **Settings** — theme, pen-only default, hint defaults, sync status and last-synced
    time, device name, backend URL + token.

### Design tokens to establish in the mockup

Surfaces at four depths (page / card / raised / overlay); a warm amber accent used only
for interactive affordances and focus; semantic green and red used *only* for
correct/wrong so they never compete with the accent; a muted amber-adjacent tone for
"near miss". One radius scale, one spacing scale, one type scale.

**Typography: Geist** for all UI chrome (Geist Sans; Geist Mono where a monospace is
wanted). KaTeX's Computer Modern is left alone for maths — the serif/sans contrast is
doing useful work separating "the problem" from "the app".

### Motion budget

Nothing may delay the gap between problems by more than ~200 ms.

- **Problem → problem:** outgoing card fades and slides up 12 px over 140 ms; incoming
  rises from 12 px below over 180 ms, ease-out. Canvas clears with a 120 ms wipe.
- **Hint panel:** 220 ms spring from the right (tablet) / bottom (phone); rungs stagger
  in at 40 ms intervals.
- **Correct:** single green border pulse, 400 ms, plus a 1.0 → 1.02 → 1.0 scale.
- **Wrong:** two-cycle 6 px horizontal shake over 260 ms, red border.
- **Sliders:** handle scales to 1.15 on grab; the value readout crossfades.
- **Stats bars:** grow from zero on entry with a 60 ms stagger.
- All of it gated behind `prefers-reduced-motion`.

---

## 5. Repository shape

```
calcflow/
  packages/
    engine/        # AST, parser, evaluator, equivalence — zero deps, heavily tested
    generators/    # one file per topic + registry + fuzz harness
    shared/        # types shared by web and server (Attempt, SyncEvent, Settings)
  apps/
    web/           # React + Vite PWA
    server/        # Fastify + SQLite
  docs/
    adding-a-topic.md
  docker-compose.yml
```

---

## 6. The math engine (`packages/engine`)

Zero dependencies, pure TypeScript, the most heavily tested part of the codebase.

- **`Expr` AST:** `num | rational | symbol | add | mul | pow | fn(name, args)`.
- **Parser:** MathLive emits ASCIIMath via `getValue('ascii-math')` — parse that subset
  rather than LaTeX. (Deliberately *not* MathLive's Compute Engine: it's large, and the
  equivalence semantics need to be ours.)
- **`evaluate(expr, bindings) → number`** — real-valued, `NaN` outside the domain.
- **`equivalent(a, b, opts)`** — sample 24 points from the declared domain, skipping
  poles and `NaN`s; require ≥20 valid samples agreeing to a relative tolerance of `1e-9`.
  For antiderivatives, check that `a − b` is *constant* across samples rather than zero,
  which handles `+C` and any constant-shifted-but-correct answer.
- **`isExact(expr, reference)`** — rejects a non-integer decimal literal when the
  reference is not a terminating decimal.
- **`complexity(expr)`** — AST node count, used for "is it actually simplified?" checks.

The equivalence sampler is the single highest-risk component. It gets property tests: a
large corpus of known-equivalent and known-inequivalent expression pairs, plus adversarial
near-misses (`sin(2x)` vs `2 sin x cos x` must pass; `sin(2x)` vs `2 sin x` must fail).

---

## 7. The generator contract (`packages/generators`)

```ts
interface Generator {
  id: string;                      // "diff.chain-rule"
  chapter: number;
  title: string;
  tags: string[];                  // ["chain-rule", "ln", "sqrt"]
  version: number;                 // bump on any behaviour change
  supports: { steps: [number, number]; difficulty: [number, number] };
  invariant: 'value-preserving' | 'solution-set-preserving';
  generate(ctx: { steps: number; difficulty: number; rng: Rng }): Problem;
}

interface Problem {
  generatorId: string;
  seed: string;
  prompt: Latex;
  promptText?: string;             // word problems
  answers: AnswerSpec[];           // one entry per input field
  solution: Step[];
  ruleIds: string[];               // links into the rule cards
}

interface Step {
  ruleId: string;
  ruleLabel: string;               // "Chain rule"
  expr: Latex;                     // the line after applying it
  note?: string;
}

interface AnswerSpec {
  label?: string;                  // "|a|"
  kind: 'expression' | 'number' | 'set' | 'interval' | 'choice' | 'boolean';
  value: Expr;
  vars: string[];                  // free variables, for sampling
  domain?: Domain;
  requires?: { plusC?: boolean; exact?: boolean; simplified?: boolean };
  keyboard: KeyboardLayoutId;      // picks the adaptive keyboard variant
}
```

The RNG is seeded, so a problem is fully reproducible from
`generatorId + seed + version`. **Sync therefore only ever needs to carry the seed**,
never the rendered problem.

### The fuzz harness — the thing that keeps generators honest

For every generator, generate 500 instances across its whole supported (steps ×
difficulty) region and assert:

- the prompt renders in KaTeX without error;
- the reference answer evaluates to a finite number at sampled points;
- **every solution step is equivalent to the one before it** (for `value-preserving`
  generators) or preserves the solution set (for `solution-set-preserving` ones);
- the last step matches the declared answer;
- the answer is not trivially identical to the prompt (catches degenerate parameters);
- no answer contains a division by zero or an empty domain.

That step-chain invariant is the important one — it catches essentially every class of
generator bug, including the silent ones where the answer is right but the *hints* lie.

### Adding a topic later

`docs/adding-a-topic.md` documents the contract, and one generator ships as a
heavily-commented reference implementation to copy. Adding limits = write one file,
register it, run the harness. Nothing else in the app changes.

---

## 8. Frontend (`apps/web`)

React + TypeScript + Vite. PWA via `vite-plugin-pwa` (Workbox), precaching the app shell,
Geist and KaTeX fonts and MathLive assets so a cold start on the train works.

- **Math rendering:** KaTeX, bundled.
- **Math input:** MathLive `<math-field>` with custom virtual-keyboard layouts per
  `AnswerSpec.kind` — that's the "adaptive" behaviour.
- **Canvas:** hand-rolled on Pointer Events, not a library, because pen-only mode,
  pressure, panning and the eraser button all need direct control. Committed strokes
  render to an offscreen bitmap; only the live stroke redraws per frame. Strokes are held
  in world coordinates with a `panY` offset, giving the infinite vertical surface inside a
  fixed frame. `pointerType === 'pen'` draws; touch pans when pen-only is on.
- **State:** Zustand. **Storage:** IndexedDB via `idb` — stores for `attempts`,
  `settings`, `syncQueue`. **Motion:** Framer Motion. **Styling:** Tailwind v4 over CSS
  custom-property design tokens, so the mockup's tokens transfer directly.

### Pen capabilities — measured, not assumed

Captured live on both target devices before committing to any of this:

| | Tab S11 | S23 Ultra |
|---|---|---|
| Sample rate | ~482 Hz | ~407 Hz |
| `getCoalescedEvents()` | yes | yes |
| Pressure | 12-bit (1/4095 steps), full 0→1 | same |
| `tiltX` / `tiltY` | reported | reported |
| `twist`, `tangentialPressure` | always 0 | always 0 |
| Button / barrel / eraser | **never reported** | **never reported** |

So: draw from `getCoalescedEvents()` rather than raw `pointermove`, or ~75% of the
sample rate is thrown away and diagonal strokes visibly facet. Pressure drives stroke
width. Tilt is available if we ever want a chisel/shading nib, but isn't needed for
handwriting.

### Erasing

The S-Pen button cannot be read (see the table above), so erasing is a **tool-rail
toggle**: tap the eraser, it stays active until you tap the pen again, with a clear
persistent active state in the rail. This is the primary mechanism, not a fallback.

Erasing is stroke-wise — hit-test and remove whole strokes, not pixels. Far cheaper,
matches how strokes are stored, and undo stays trivial.

If the rail toggle proves annoying in daily use, the escape hatch is a **WebView APK
wrapper**: a native Android shell *can* read `MotionEvent.BUTTON_STYLUS_PRIMARY` (which
is exactly how Samsung Notes does it) and bridge it into the page as a synthetic event.
That's the only route to the real button behaviour, and it's a small Kotlin shell around
the same web app — worth doing only if the toggle actually gets in the way.

### Undo/redo gestures

**Two-finger tap undoes, three-finger tap redoes** — the Procreate/GoodNotes convention.

Detection, per gesture: N touch pointers go down within ~150 ms of each other, all lift
within ~300 ms of the first down, and none travels more than ~12 px. Any pointer
exceeding the movement threshold cancels the candidate immediately, so a two-finger pan
of the canvas never fires an undo. Ignore the gesture entirely while a pen contact is
active. Rapid repeat taps must each fire, so undo can be held down by drumming.

The canvas already needs `touch-action: none` for panning; that also stops the browser
claiming two-finger pinch before we see it.

Every gesture shows a brief non-blocking toast naming what it did. Without that, a tap
that failed the movement threshold is indistinguishable from an undo that had nothing
left to undo, which is exactly the kind of ambiguity that makes a gesture feel broken.

Every problem is generated on-device. Practice never touches the network.

---

## 9. Backend (`apps/server`)

Fastify + TypeScript + SQLite (`better-sqlite3`), one multi-stage Docker image that also
serves the built PWA as static files. One `docker compose up`, one volume, no external
database. Reachable only over Tailscale, with a shared token in `X-CalcFlow-Token` so it
isn't wide open if Tailscale ever isn't in front of it.

**Sync is an append-only event log**, which makes merging trivial — no conflict
resolution logic at all:

```sql
CREATE TABLE attempts (
  id TEXT PRIMARY KEY,      -- ULID, generated on-device
  device TEXT, ts INTEGER,
  generator_id TEXT, seed TEXT, gen_version INTEGER,
  steps INTEGER, difficulty INTEGER,
  correct INTEGER, confidence TEXT,          -- sure | think | guess
  hints_used INTEGER, hint_max_rung INTEGER,
  duration_ms INTEGER, answer_raw TEXT,
  error_class TEXT                            -- plus-c | not-exact | not-simplified | wrong
);
```

- `GET /api/sync?since=<cursor>` → events after the cursor
- `POST /api/sync` → a batch of events, idempotent via `INSERT OR IGNORE` on the ULID
- `GET|PUT /api/settings` → last-write-wins on `updated_at`

Outgoing events queue in IndexedDB and flush on focus, every 60 s while online, and on
manual pull-to-sync. Stats are always computed locally from the merged log, so the stats
screen works offline too.

---

## 10. Build phases

0. Scaffold, design tokens, `packages/engine` with equivalence + its property tests.
1. Generator contract, fuzz harness, and three generators (fractions, powers,
   differentiation) to prove the shape.
2. Practice UI — both layouts, the canvas (coalesced events + pressure-driven width),
   the adaptive math keyboard.
3. Hints — the ladder, the on-track checker, the rule cards.
4. Attempt log, stats dashboard, session summary.
5. Backend, sync, PWA/offline hardening.
6. Remaining generators out to the full v1 chapter scope.
7. **Add limits as a dry run** of `docs/adding-a-topic.md`, and fix whatever that exposes.

---

## 11. Verification

- **`npm test`** — engine property tests plus the generator fuzz harness (500 instances
  per generator, full invariant chain). This is the main safety net; a generator that
  produces a wrong hint fails the build.
- **Layouts** — Chrome DevTools device emulation for the S23 Ultra and Tab S11 viewports
  first, then both real devices over Tailscale. Confirm on the tablet that the page
  itself never scrolls and that only the canvas pans.
- **Pen** — on real hardware: pressure varies stroke width smoothly across its 12-bit
  range, strokes drawn fast stay smooth (proving coalesced events are being consumed),
  palm rejection works with pen-only on, and finger pans rather than draws. Eraser toggle
  survives a problem transition without getting stuck on.
- **Gestures** — two-finger tap undoes and three-finger tap redoes, on both devices and
  in fullscreen canvas; a two-finger *pan* never fires an undo; drumming two fingers
  undoes repeatedly; neither fires while the pen is touching the screen.
- **Offline** — airplane mode, cold-start the installed PWA, complete a full set of 10,
  re-enable network, confirm the attempts sync.
- **Two-device merge** — solve offline on the phone, solve on the tablet, bring both
  online; each device must end up showing every attempt exactly once.
- **Content spot-check** — work through one generated problem per chapter by hand
  against the book's own worked solutions, to catch conventions the fuzz harness can't
  (notation, expected answer form).
