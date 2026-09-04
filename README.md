# CalcFlow

Practice app for the prerequisite maths of the RU HBO-minor *Mathematics Practice
Book*. The book has ~130 fixed exercises; this generates unlimited problems from
the same topics, works offline, and tracks which topics are actually weak —
weighted by confidence, because *confident and wrong* is a misconception while
*unsure and wrong* is just a gap.

`plan.md` is the working plan. `additional_notes.md` covers what came after the
first design pass.

## Layout

```
packages/
  engine/       AST, parser, evaluator, sampling equivalence, form checks. Zero deps.
  generators/   One file per topic, the registry, and the fuzz harness.
  shared/       Types shared by web and server: Attempt, SyncEvent, Settings.
apps/
  web/          React + Vite PWA.
docs/
  adding-a-topic.md
```

## Running it

```
npm install
npm run dev          # http://localhost:5173, listening on the LAN too
npm test             # engine property tests + the generator fuzz harness
npm run typecheck
npm run build
```

`npm run dev` binds to all interfaces, so the tablet and phone can reach it over
Tailscale while developing.

## How it works

**Problems are solution trees, not `{prompt, answer}` pairs.** The generator
picks the parameters, so it knows every intermediate expression and the name of
the rule applied at each step. Hints are read off that tree — no handwriting
recognition, no local vision model.

**Equivalence is decided numerically.** Two expressions are compared at 24
sampled points, skipping poles and points outside the domain. That accepts any
correct answer regardless of the route taken to it, needs no CAS, and runs
entirely on-device. Antiderivatives are compared up to a constant difference,
which is what makes `+C` work.

**The fuzz harness is the safety net.** Each generator is run 500 times across
its declared (steps × difficulty) region, and every solution step is checked
against the answer. A generator that produces a wrong *hint* fails the build.

## What is not built yet

- The Fastify + SQLite backend and the sync flow (`apps/server`). The settings
  screen collects the backend URL and token; nothing sends yet, and attempts
  queue in IndexedDB in the meantime.
- Chapters 1, 5 and 12, which need graph and vector rendering.
- Chapter 13 (limits), deliberately left out so that adding it later exercises
  `docs/adding-a-topic.md` for real.
