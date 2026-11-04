# CalcFlow

A practice app for the prerequisite maths of Radboud University's HBO minor,
built around its *Mathematics Practice Book*. The book has about 130 fixed
exercises. CalcFlow generates as many new ones as you want from the same topics,
grades any correct form of an answer, walks you through the solution one step at
a time when you are stuck, and keeps track of which topics are actually weak.

It is a progressive web app: install it on a phone or tablet and it works
offline, with a canvas for scratch work that takes S Pen pressure. A small
server keeps the practice history of every device in sync.

- **114 topic generators across 13 chapters**, from fractions and powers to
  integration and limits, each at up to three tiers. *Easy* is one rule with
  friendly numbers, *medium* is the book's own exercises, and *hard* is the shape
  the IBC049 practice exams ask in, including problems that combine chapters.
- **Hints are the real solution.** Each problem carries its own worked
  solution, and the hint panel reveals it a step at a time, with the rule each
  step applies. Every rule links to a reference card with a worked example.
- **Confidence counts.** Every answer is marked *sure*, *think so* or *guessed*.
  Being confidently wrong points to a misconception, while being unsure and
  wrong is just a gap, and the stats screen tells the two apart.
- **Sessions that adapt.** Sets of a fixed length, endless practice, *weak spots*
  (chapters under 70% mastery), and *build speed* (right answers that are still
  slow). Topics can be switched off, or asked for in every set.
- **Light and dark themes**, following the device by default.

Chapters 5 (graphs) and 12 (vectors) are switched off for now: their answers are
drawn on a coordinate plane rather than typed, and that interaction is being
reworked.

## Running it

All you need is Docker with Compose. The image builds both halves, the web app
and the API, and serves them from one port.

```bash
git clone <this repo> calcflow && cd calcflow
cp .env.example .env
# Put a sync token in .env. Any random string of 16+ characters works:
#   openssl rand -base64 24
docker compose up -d --build
```

The first build takes a minute or two. Then open <http://localhost:8787>.

- **Logs:** `docker compose logs -f`
- **Stop:** `docker compose down`
- **Update:** `git pull && docker compose up -d --build`

Practice history is stored in `./data/calcflow.db`, a plain SQLite file in the
checkout. To back it up, copy the file while the container is stopped, or use
`sqlite3 data/calcflow.db ".backup backup.db"` while it runs.

### On a phone or tablet

The container only listens on `localhost`. To reach it from other devices, put
it behind HTTPS: browsers will not install a web app or run it offline from a
plain-HTTP address. With [Tailscale](https://tailscale.com) that is one command:

```bash
tailscale serve --bg --https=443 http://localhost:8787
```

Open the `https://<machine>.<tailnet>.ts.net` address on the device and install
it from the browser menu. To sync, enter the token from `.env` under
**Settings → Sync** on each device. The backend address can stay empty, because
the app talks to the server it was loaded from.

[`deploy/README.md`](deploy/README.md) covers running it permanently on a home
server: a systemd timer that pulls `main`, rebuilds, waits for the healthcheck,
and rolls back if the new build does not come up.

### If the container will not start

`docker compose logs` says why. The two likely causes:

- **`CALCFLOW_TOKEN is missing a value`.** `.env` does not exist or has no
  token in it.
- **`… is not writable by uid 1000`.** The container runs as uid 1000 and
  writes to `./data`. On Linux, if your own uid is different (check with
  `id -u`), hand the folder over with `sudo chown -R 1000:1000 data`.

## Developing

Needs Node 24 (the version the image uses) and npm.

```bash
npm install
npm run dev          # the web app on http://localhost:5173, also on your LAN
npm run dev:server   # the API on http://localhost:8787; needs CALCFLOW_TOKEN set
npm test             # engine tests, the generator fuzz harness, server tests
npm run lint
npm run typecheck
npm run build        # the PWA; `npm run build:server` builds the API
```

The web app runs fine without the server; sync just stays off. The service
worker is disabled in dev, so to try offline mode or installing, use
`npm run build && npm run preview`.

[`docs/adding-a-topic.md`](docs/adding-a-topic.md) walks through writing a new
generator.

### Layout

```
packages/
  engine/       Parser, evaluator, numeric equivalence and form checks. No dependencies.
  generators/   One file per topic, the registry, the rule cards and the fuzz harness.
  shared/       Types used by both apps: Attempt, Settings, Tier, the chapter list.
apps/
  web/          React + Vite PWA.
  server/       Fastify + SQLite: the attempt log, sync, and serving the built PWA.
deploy/         Pull-and-restart script and systemd units for a home server.
docs/           Writing a topic, and the original design plan and mockups.
```

`packages/shared` is the only package that compiles to JavaScript. The server is
plain Node and needs it built. Everything else is read from TypeScript source
by Vite and Vitest.

## How it works

**Problems are solution trees, not prompt and answer pairs.** A generator picks
the numbers itself, so it knows every intermediate step and the rule applied at
each one. The hints are read straight off that tree, so no handwriting
recognition is needed.

**Answers are compared numerically.** Your expression and the reference are
evaluated at 24 sampled points, skipping poles and points outside the domain.
Any correct form is accepted, whatever route led to it, without a computer
algebra system and entirely on the device. Antiderivatives are compared up to a
constant, which is how `+C` works. Near misses get their own feedback, so a
missing `+C`, a decimal where an exact value was asked for, or an answer left
unsimplified is reported as exactly that, not just as wrong.

**The fuzz harness is the safety net.** Every generator is run 500 times
across each tier it supports. Every step of every solution is checked against
the final answer, and an independent check re-derives the answer from the
question. A generator that produces a wrong *hint* fails the test suite.

**Sync is an append-only log, so merging is a union.** Each attempt gets an id
(a ULID) on the device that made it, and the server inserts batches with
`INSERT OR IGNORE`. A device that was offline for a week pushes what it has and
pulls what it missed, and there are no conflicts to resolve. Stats are always
computed on the device from the merged log, so they work offline too. Settings
sync as last-write-wins, except the ones that only make sense on one device.

**The stats screen stays one screen.** At the top is a single sentence, the most
useful thing the log says right now, chosen from nine signals in a fixed order of
how much they would change what to practise next. Each readout has a minimum
sample size and only appears when it says something notable, so an empty fold
means there is nothing worth saying yet.

### Storage

The log lives in IndexedDB on each device (`apps/web/src/state/db.ts`) and in
SQLite on the server (`apps/server/src/db.ts`). Both schemas are versioned and
migrate forwards only. Each change is one numbered step in its own transaction,
and no step may drop data. The server's copy is the one that survives a
reinstalled phone.

The original design plan and its reasoning are in [`docs/claudes_plan/`](docs/claudes_plan).
