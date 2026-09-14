# CalcFlow

Practice app for the prerequisite maths of the RU HBO-minor *Mathematics Practice
Book*. The book has ~130 fixed exercises; this generates unlimited problems from
the same topics, works offline, and tracks which topics are actually weak —
weighted by confidence, because *confident and wrong* is a misconception while
*unsure and wrong* is just a gap.

100 generators across 13 chapters, at three difficulty tiers, with the hard tier
aimed at the shape the IBC049 practice exams ask in.

`docs/claudes_plan/plan.md` is the working plan; `additional_notes.md` beside it
covers what came after the first design pass.

## Layout

```
packages/
  engine/       AST, parser, evaluator, sampling equivalence, form checks. Zero deps.
  generators/   One file per topic, the registry, and the fuzz harness.
  shared/       Types shared by web and server: Attempt, SyncEvent, Settings, Tier.
apps/
  web/          React + Vite PWA.
  server/       Fastify + SQLite: the attempt log, sync, and the built PWA.
deploy/         The server's pull-and-restart script and its systemd timer.
docs/
  adding-a-topic.md
```

`packages/shared` is the one package that ships compiled JavaScript. The others
are only ever read by Vite, which is happy with TypeScript source; the server is
plain Node, which is not.

## Running it

```
npm install
npm run dev          # http://localhost:5173, listening on the LAN too
npm run dev:server   # http://localhost:8787, needs CALCFLOW_TOKEN set
npm test             # engine property tests, generator fuzz harness, server
npm run typecheck
npm run build        # the PWA;  npm run build:server  for the other half
```

`npm run dev` binds to all interfaces, so the tablet and phone can reach it over
Tailscale while developing. The service worker is off in dev on purpose — an
install that can only precache the dev shell is an install that cannot work
offline. For that: `npm run build && npm run preview`.

## Running it on the server

Both halves live in one image, so the app and the API answer on one origin —
which is what an installed PWA needs, and what keeps a stale shell from ever
being served to it.

```
cp .env.example .env       # and put a token in it
docker compose up -d --build
tailscale serve --bg --https=443 http://localhost:8787
```

The container listens on loopback only; `tailscale serve` is what puts it on the
tailnet with a certificate, and Chrome wants that certificate before it will
offer to install the app. The same `CALCFLOW_TOKEN` goes on each device under
Settings → Sync; the backend field can stay blank there, because the app served
by the container talks to the container.

The database is a file in `./data`, bind-mounted rather than kept in a named
volume, so backing it up is copying something you can see.

**[`deploy/README.md`](deploy/README.md) is the full runbook** — deploy key,
first boot, and the systemd timer that makes `git push` the whole deployment
procedure: the server checks every two minutes, pulls, rebuilds, waits for the
container's healthcheck, and rolls back to the previous commit if it does not
come up.

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

**Three tiers, not a dial.** `easy` is one rule with kind numbers, `medium` is
the book's own exercises, `hard` is the exam. A generator declares which of the
three it has something to say at, so the easy pool cannot quietly fill with
problems that are not. The tier replaced a 1–9 slider that every generator
turned straight back into two or three branches — nine stops, six of them lying.

**Hard sessions reach across chapters.** A generator can declare `spans`, the
chapters it draws on beyond its own; those are offered only when every chapter
they need is switched on, and they take about 40% of a hard session. A problem
that needs a log law *before* the derivative rule is a different animal from
either chapter alone.

**The fuzz harness is the safety net.** Each generator is run 500 instances
across every tier it declares, and every solution step is checked against the
answer, plus an independent `verify` that re-derives the answer from the prompt.
A generator that produces a wrong *hint* fails the build.

**Graph and vector questions are drawn, and he marks them.** Chapters 5 and 12
turn the canvas into a real coordinate plane; the answer is drawn in amber over
his sketch when he submits, and a Both / Mine / Answer toggle separates them.
The typed fields still grade what can be graded; the drawing gets *Got it /
Close / Missed*. Nothing is written to the log until he marks it, which is what
keeps the log append-only.

**Sync is an append-only log, so merging is a union.** Every attempt carries a
ULID generated on the device that produced it, and the server takes a batch with
`INSERT OR IGNORE`. A device that was offline for a week pushes what it has,
pulls from the cursor it last saw, and both ends agree — there is no conflict
resolution because there are no conflicts. Stats are always computed locally
from the merged log, so the stats screen works offline too.

The exchange runs when the app comes to the front, when the network comes back,
every minute it is being looked at, and on the sync button. A failed one changes
nothing — the queue is intact and the cursor has not moved — so the next one
picks up exactly where it stopped. Settings ride along on last-write-wins, minus
the four fields that describe the device holding them.

**The stats screen is one screen, three slots, and a metric has to earn its
slot.** The standing page is capped and does not grow. Above it sits *the read*:
one sentence, which the nine tracked signals compete for in a fixed order of how
much the answer would change what he practises next. Everything else is behind
one fold. Every readout has a minimum count and a "is this notable" gate, so the
usual state is short and an empty fold is correct rather than broken.
`docs/claudes_plan/additional_notes.md` §C has the reasoning.

## Storage and migrations

The attempt log lives in IndexedDB on each device (`apps/web/src/state/db.ts`)
and in SQLite on the server (`apps/server/src/db.ts`). Both are at their
baseline version: everything written before the first deploy was test data, so
neither carries a migration for it. A store or a database file left over from
before that baseline is rebuilt empty on the next open rather than upgraded,
which is the one place either of them throws anything away.

From the first deploy on they both do, and the rules are in the comment at the
top of each `migrate`: forwards only, one numbered step per change, each in its
own transaction, and no step ever drops something that still holds a row. The
server's copy is the only one that survives a reinstalled phone.

## What is not built yet

- Chapter 1's set-membership questions (∈, ⊂). Every answer field today takes an
  expression; the `set`, `interval`, `choice` and `boolean` answer kinds exist in
  the types but nothing renders them yet.
- An Android wrapper. The S Pen's side button is unreachable from a browser —
  pressure and tilt come through, the button does not — so the eraser is a tool
  on the rail rather than a flip of the pen.
