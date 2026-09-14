import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import type { FastifyInstance } from 'fastify';
import type { Attempt } from '@calcflow/shared';
import { buildApp } from './app.js';
import { readConfig } from './config.js';
import { openStore, type Store } from './db.js';

const TOKEN = 'a-token-long-enough';
const AUTH = { 'x-calcflow-token': TOKEN };

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
let counter = 0;

/** A well-formed ULID; only its uniqueness matters to these tests. */
function id(): string {
  counter += 1;
  let out = '';
  let n = counter;
  for (let i = 0; i < 26; i += 1) {
    out = ALPHABET[n % 32]! + out;
    n = Math.floor(n / 32);
  }
  return out;
}

function attempt(patch: Partial<Attempt> = {}): Attempt {
  return {
    id: id(),
    device: 'phone',
    ts: 1_756_000_000_000,
    generatorId: 'ch03-add-fractions',
    seed: 'abc123',
    genVersion: 1,
    chapter: 3,
    tier: 'medium',
    correct: true,
    confidence: 'sure',
    hintsUsed: 0,
    hintMaxRung: 0,
    durationMs: 42_000,
    answerRaw: '\\frac{5}{6}',
    errorClass: null,
    selfGrade: null,
    ...patch,
  };
}

let app: FastifyInstance;
let store: Store;

beforeEach(async () => {
  store = openStore(':memory:');
  app = await buildApp({
    config: {
      host: '127.0.0.1',
      port: 0,
      dbPath: ':memory:',
      webRoot: null,
      token: TOKEN,
      origins: true,
      logLevel: 'silent',
    },
    store,
  });
});

afterEach(async () => {
  await app.close();
  store.close();
});

const post = (attempts: unknown[]) =>
  app.inject({ method: 'POST', url: '/api/sync', headers: AUTH, payload: { attempts } });

const pull = (since = 0, limit?: number) =>
  app.inject({
    method: 'GET',
    url: `/api/sync?since=${since}${limit === undefined ? '' : `&limit=${limit}`}`,
    headers: AUTH,
  });

describe('the token', () => {
  it('is required', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/sync' });
    expect(res.statusCode).toBe(401);
  });

  it('has to be the right one', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/sync',
      headers: { 'x-calcflow-token': 'a-token-long-enougX' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('is not asked for by the health check', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});

describe('the attempt log', () => {
  it('accepts a batch and hands back cursors for it', async () => {
    const res = await post([attempt(), attempt()]);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ accepted: 2, duplicates: 0, cursor: 2 });

    const page = await pull();
    expect(page.json().events).toHaveLength(2);
    expect(page.json().cursor).toBe(2);
    expect(page.json().more).toBe(false);
  });

  it('round-trips every field of an attempt', async () => {
    const one = attempt({
      correct: false,
      confidence: 'guess',
      errorClass: 'plus-c',
      hintsUsed: 3,
      hintMaxRung: 2,
      answerRaw: 'x^2',
    });
    await post([one]);
    expect((await pull()).json().events[0].attempt).toEqual(one);
  });

  it('ignores an attempt it already has', async () => {
    const one = attempt();
    await post([one]);
    const again = await post([one, attempt()]);
    expect(again.json()).toMatchObject({ accepted: 1, duplicates: 1 });
    expect((await pull()).json().events).toHaveLength(2);
  });

  it('is idempotent when the same flush arrives twice', async () => {
    const batch = [attempt(), attempt(), attempt()];
    await post(batch);
    const replay = await post(batch);
    expect(replay.json()).toMatchObject({ accepted: 0, duplicates: 3, cursor: 3 });
    expect(store.count()).toBe(3);
  });

  it('pages, and says when there is more', async () => {
    await post([attempt(), attempt(), attempt(), attempt(), attempt()]);
    const first = await pull(0, 2);
    expect(first.json().events).toHaveLength(2);
    expect(first.json()).toMatchObject({ cursor: 2, more: true });

    const second = await pull(first.json().cursor, 2);
    expect(second.json().events.map((e: { cursor: number }) => e.cursor)).toEqual([3, 4]);

    const last = await pull(4, 2);
    expect(last.json()).toMatchObject({ cursor: 5, more: false });
  });

  it('leaves the cursor where it was when there is nothing new', async () => {
    await post([attempt()]);
    expect((await pull(1)).json()).toEqual({ events: [], cursor: 1, more: false });
  });

  it('refuses a malformed attempt and keeps the whole batch out', async () => {
    const res = await post([attempt(), { ...attempt(), confidence: 'certain' }]);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('attempts[1]: confidence is not valid');
    expect(store.count()).toBe(0);
  });

  it('refuses an id that is not a ULID', async () => {
    const res = await post([{ ...attempt(), id: 'not-a-ulid' }]);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('attempts[0]: id is not valid');
  });

  it('refuses a missing field', async () => {
    const { durationMs: _omitted, ...missing } = attempt();
    const res = await post([missing]);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('attempts[0]: durationMs is missing');
  });

  it('drops a field it does not know about', async () => {
    await post([{ ...attempt(), smuggled: 'nope' }]);
    expect((await pull()).json().events[0].attempt.smuggled).toBeUndefined();
  });

  it('refuses a body that is not a batch', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/sync',
      headers: AUTH,
      payload: { attempt: attempt() },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('two devices that were both offline', () => {
  it('each end up with every attempt exactly once', async () => {
    const phone = [attempt({ device: 'phone' }), attempt({ device: 'phone' })];
    const tablet = [attempt({ device: 'tablet' })];

    // The phone comes online first and pulls nothing it does not have.
    await post(phone);
    const phonePull = await pull(2);
    expect(phonePull.json().events).toHaveLength(0);

    // Then the tablet, which pushes its own and pulls the phone's.
    await post(tablet);
    const tabletPull = await pull(0);
    expect(tabletPull.json().events).toHaveLength(3);

    // The phone catches up on the tablet's, and only that.
    const phoneCatchUp = await pull(phonePull.json().cursor);
    expect(phoneCatchUp.json().events.map((e: { attempt: Attempt }) => e.attempt.device)).toEqual([
      'tablet',
    ]);

    // And a re-push of everything by either device changes nothing.
    const replay = await post([...phone, ...tablet]);
    expect(replay.json()).toMatchObject({ accepted: 0, duplicates: 3 });
    expect(store.count()).toBe(3);
  });
});

describe('settings', () => {
  const put = (settings: unknown, updatedAt: number) =>
    app.inject({ method: 'PUT', url: '/api/settings', headers: AUTH, payload: { settings, updatedAt } });

  it('are empty until something is saved', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/settings', headers: AUTH })).json()).toEqual(
      { settings: null, updatedAt: 0 },
    );
  });

  it('keep the newer of two saves', async () => {
    await put({ level: 3 }, 1000);
    const older = await put({ level: 9 }, 500);
    expect(older.json()).toEqual({ settings: { level: 3 }, updatedAt: 1000 });

    const newer = await put({ level: 5 }, 2000);
    expect(newer.json()).toEqual({ settings: { level: 5 }, updatedAt: 2000 });
    expect((await app.inject({ method: 'GET', url: '/api/settings', headers: AUTH })).json()).toEqual(
      { settings: { level: 5 }, updatedAt: 2000 },
    );
  });

  it('keep what is stored when the timestamps tie', async () => {
    await put({ level: 3 }, 1000);
    expect((await put({ level: 9 }, 1000)).json()).toEqual({ settings: { level: 3 }, updatedAt: 1000 });
  });

  it('refuse a save without a timestamp', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers: AUTH,
      payload: { settings: { level: 3 } },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('configuration', () => {
  it('will not start without a token', () => {
    expect(() => readConfig({})).toThrow(/CALCFLOW_TOKEN is not set/);
  });

  it('will not start with a token short enough to guess', () => {
    expect(() => readConfig({ CALCFLOW_TOKEN: 'short' })).toThrow(/shorter than 16/);
  });

  it('will not start pointed at a web root that is not there', () => {
    expect(() => readConfig({ CALCFLOW_TOKEN: TOKEN, CALCFLOW_WEB: '/no/such/place' })).toThrow(
      /does not exist/,
    );
  });

  it('reads the defaults otherwise', () => {
    expect(readConfig({ CALCFLOW_TOKEN: TOKEN })).toEqual({
      host: '0.0.0.0',
      port: 8787,
      dbPath: 'calcflow.db',
      webRoot: null,
      token: TOKEN,
      origins: true,
      logLevel: 'info',
    });
  });
});

describe('a database from before the first deploy', () => {
  /*
   * What the store looked like while the app was still being built: a 1–5
   * difficulty and a separate step count where the tier is now, and nothing
   * for the self-grade. No migration carries it forward, so opening it has to
   * be a rebuild — the alternative is what actually happened, which is a
   * server that starts, prepares a statement naming a column that is not
   * there, and dies on the first line of its own boot.
   */
  const BEFORE = `
    CREATE TABLE attempts (
      cursor       INTEGER PRIMARY KEY AUTOINCREMENT,
      id           TEXT    NOT NULL UNIQUE,
      device       TEXT    NOT NULL,
      ts           INTEGER NOT NULL,
      generator_id TEXT    NOT NULL,
      seed         TEXT    NOT NULL,
      gen_version  INTEGER NOT NULL,
      chapter      INTEGER NOT NULL,
      steps        INTEGER NOT NULL,
      difficulty   INTEGER NOT NULL,
      correct      INTEGER NOT NULL,
      confidence   TEXT    NOT NULL,
      hints_used   INTEGER NOT NULL,
      hint_max_rung INTEGER NOT NULL,
      duration_ms  INTEGER NOT NULL,
      answer_raw   TEXT    NOT NULL,
      error_class  TEXT
    );
    CREATE INDEX attempts_ts ON attempts (ts);
    CREATE TABLE settings (
      id         INTEGER PRIMARY KEY CHECK (id = 1),
      json       TEXT    NOT NULL,
      updated_at INTEGER NOT NULL
    );
    INSERT INTO attempts
      (id, device, ts, generator_id, seed, gen_version, chapter, steps, difficulty,
       correct, confidence, hints_used, hint_max_rung, duration_ms, answer_raw, error_class)
    VALUES
      ('OLD0000000000000000000000', 'phone', 1, 'ch03-add-fractions', 'abc', 1, 3, 2, 4,
       1, 'sure', 0, 0, 1000, 'x', NULL);
    PRAGMA user_version = 1;
  `;

  let dir: string;
  let path: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'calcflow-test-'));
    path = join(dir, 'calcflow.db');
    const before = new Database(path);
    before.exec(BEFORE);
    before.close();
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('opens, and takes an attempt on the shape the app writes now', () => {
    const store = openStore(path);
    store.append([attempt()]);
    expect(store.count()).toBe(1);
    store.close();
  });

  it('keeps none of what it held, and says so in its version', () => {
    openStore(path).close();
    const after = new Database(path);
    expect(after.pragma('user_version', { simple: true })).toBe(3);
    expect(after.prepare('SELECT COUNT(*) AS n FROM attempts').get()).toEqual({ n: 0 });
    after.close();
  });

  it('leaves a database already at the baseline alone', () => {
    const first = openStore(path);
    first.append([attempt()]);
    first.close();

    // The rebuild is a one-off for a shape that predates the log being real.
    // Opening twice must not be how he loses a week of practice.
    const second = openStore(path);
    expect(second.count()).toBe(1);
    second.close();
  });
});
