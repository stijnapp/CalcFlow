# CalcFlow

Practice app for the prerequisite maths of the RU HBO-minor *Mathematics Practice
Book*. The book has ~130 fixed exercises; this generates unlimited problems from
the same topics, works offline, and tracks which topics are actually weak —
weighted by confidence, because *confident and wrong* is a misconception while
*unsure and wrong* is just a gap.

`docs/claudes_plan/plan.md` is the working plan; `additional_notes.md` beside it
covers what came after the first design pass.

## Layout

```
packages/
  engine/       AST, parser, evaluator, sampling equivalence, form checks. Zero deps.
  generators/   One file per topic, the registry, and the fuzz harness.
  shared/       Types shared by web and server: Attempt, SyncEvent, Settings.
apps/
  web/          React + Vite PWA.
  server/       Fastify + SQLite: the attempt log, sync, and the built PWA.
docs/
  adding-a-topic.md
```

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
Tailscale while developing.

## Running it for real

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
by the container talks to the container. Attempts live in a Docker volume at
`/data/calcflow.db`.

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

## What is not built yet

- Chapters 1, 5 and 12, which need graph and vector rendering.
- Chapter 13 (limits), deliberately left out so that adding it later exercises
  `docs/adding-a-topic.md` for real.
