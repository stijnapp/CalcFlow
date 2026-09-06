# `@calcflow/server`

Fastify + SQLite. Holds the attempt log, hands it back to whichever device asks,
and serves the built PWA from the same origin.

Every route under `/api/` except `/api/health` needs `X-CalcFlow-Token`. It is
compared as a SHA-256 digest so a wrong guess takes the same time as a right one
and its length leaks nothing. Tailscale is what actually keeps this private; the
token is what stops a moment without Tailscale from being a moment wide open.

## The log

Attempts are appended and never edited. The id is a ULID minted on the device
that produced the attempt, so `INSERT OR IGNORE` is the whole merge: a batch that
arrives twice lands once, and two devices that were offline for a week meet as a
union. `cursor` is the server's own ordering — `AUTOINCREMENT`, so a cursor a
client has already passed can never be handed to a later attempt.

### `GET /api/sync?since=<cursor>&limit=<n>`

Events after the cursor, oldest first. `since` defaults to 0 and `limit` to 1000
(5000 max).

```json
{ "events": [{ "cursor": 1, "attempt": { "id": "01J…", "…": "…" } }],
  "cursor": 1, "more": false }
```

`cursor` is where the client now stands — the last one it has seen, or `since`
again if there was nothing new. Keep asking while `more` is true.

### `POST /api/sync`

```json
{ "attempts": [ { "id": "01J…", "…": "…" } ] }
```

→ `{ "accepted": 2, "duplicates": 1, "cursor": 3 }`, where `cursor` is the head
of the log afterwards. The batch is one transaction, so a dropped connection
never lands half of it.

A malformed attempt fails the **whole** batch with `400` and the offending index
— `attempts[1]: confidence is not valid`. Both sides are generated from the same
`Attempt` type, so this can only mean a bug, and a bug that drops attempts
quietly is the one failure an append-only log exists to not have. Fields the
server does not know about are dropped rather than stored.

### `GET | PUT /api/settings`

```json
{ "settings": { "…": "…" }, "updatedAt": 1756000000000 }
```

Last write wins on `updatedAt`; a tie keeps what is stored. The winner comes back
from a `PUT` either way, so a device that lost the race learns what it lost to in
the same round trip. Anything device-local — `backendUrl`, `token`, `deviceName`,
`lastSyncedAt` — is the client's to leave out; the server stores the document it
is handed.

### `GET /api/health`

`{ "ok": true }`, no token, for the container healthcheck.

## Configuration

| Variable | Default | |
| --- | --- | --- |
| `CALCFLOW_TOKEN` | — | Required, ≥16 characters. The server refuses to start without it. |
| `CALCFLOW_DB` | `calcflow.db` | `/data/calcflow.db` in the image. |
| `CALCFLOW_WEB` | — | Directory of the built PWA. Unset serves the API alone. |
| `CALCFLOW_ORIGINS` | reflect any | Comma-separated, if the app is ever served from elsewhere. |
| `HOST` / `PORT` | `0.0.0.0` / `8787` | |
| `LOG_LEVEL` | `info` | |

## Locally

```
CALCFLOW_TOKEN=$(openssl rand -base64 24) npm run dev:server
```

`npm test` covers it: the token, paging, idempotency, validation, settings, and
the two-device merge from the plan's acceptance list, all through `app.inject()`
against an in-memory database.
