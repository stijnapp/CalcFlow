import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type Attempt, type Settings } from '@calcflow/shared';
import { SyncError, backendOrigin, runSync, type SyncPorts } from './sync';

/*
 * The client half of the exchange, against a stand-in for the server that obeys
 * the contract in `apps/server/README.md`: append-only, idempotent on the ULID,
 * a server-assigned cursor that only ever moves forward, and last-write-wins
 * settings. The real server has its own tests for its side of that contract;
 * these are about what this half does with the answers.
 */

const TOKEN = 'a-token-of-sixteen-plus';
const ORIGIN = 'https://calcflow.example.ts.net';

// --------------------------------------------------------------- the stand-in

interface Backend {
  fetch: typeof fetch;
  log: Attempt[];
  settings: { settings: Record<string, unknown>; updatedAt: number } | null;
  calls: string[];
}

function backend(options: { pageSize?: number; token?: string } = {}): Backend {
  const pageSize = options.pageSize ?? 1000;
  const token = options.token ?? TOKEN;
  const state: Backend = {
    log: [],
    settings: null,
    calls: [],
    fetch: async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      state.calls.push(`${method} ${url.pathname}`);

      const headers = (init?.headers ?? {}) as Record<string, string>;
      if (headers['x-calcflow-token'] !== token) return reply(401, { error: 'unauthorized' });

      const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined;

      if (url.pathname === '/api/sync' && method === 'POST') {
        const attempts = (body as { attempts: Attempt[] }).attempts;
        let accepted = 0;
        for (const attempt of attempts) {
          if (state.log.some((a) => a.id === attempt.id)) continue;
          state.log.push(attempt);
          accepted += 1;
        }
        return reply(200, {
          accepted,
          duplicates: attempts.length - accepted,
          cursor: state.log.length,
        });
      }

      if (url.pathname === '/api/sync' && method === 'GET') {
        const since = Number(url.searchParams.get('since') ?? 0);
        const limit = Math.min(Number(url.searchParams.get('limit') ?? pageSize), pageSize);
        const slice = state.log.slice(since, since + limit);
        return reply(200, {
          events: slice.map((attempt, i) => ({ cursor: since + i + 1, attempt })),
          cursor: since + slice.length,
          more: since + slice.length < state.log.length,
        });
      }

      if (url.pathname === '/api/settings' && method === 'GET') {
        return reply(200, state.settings ?? { settings: null, updatedAt: 0 });
      }

      if (url.pathname === '/api/settings' && method === 'PUT') {
        const put = body as { settings: Record<string, unknown>; updatedAt: number };
        if (!state.settings || put.updatedAt > state.settings.updatedAt) state.settings = put;
        return reply(200, state.settings);
      }

      return reply(404, { error: 'not found' });
    },
  };
  return state;
}

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// ------------------------------------------------------------------- a device

interface Device {
  ports: SyncPorts;
  attempts: Map<string, Attempt>;
  queue: Set<string>;
  settings: Settings;
  cursor: number;
  /** Answers `n` problems offline: written locally, waiting to be sent. */
  solve(n?: number): Attempt[];
}

let minted = 0;

function device(name: string): Device {
  const self: Device = {
    attempts: new Map(),
    queue: new Set(),
    settings: { ...DEFAULT_SETTINGS, deviceName: name },
    cursor: 0,

    solve(n = 1) {
      const made: Attempt[] = [];
      for (let i = 0; i < n; i += 1) {
        minted += 1;
        const attempt: Attempt = {
          id: `01J${String(minted).padStart(23, '0')}`,
          device: name,
          ts: 1_700_000_000_000 + minted,
          generatorId: 'frac-add',
          seed: `seed-${minted}`,
          genVersion: 1,
          chapter: 2,
          tier: 'medium',
          correct: true,
          confidence: 'sure',
          hintsUsed: 0,
          hintMaxRung: 0,
          durationMs: 4200,
          answerRaw: '\\frac{1}{2}',
          errorClass: null,
          selfGrade: null,
        };
        self.attempts.set(attempt.id, attempt);
        self.queue.add(attempt.id);
        made.push(attempt);
      }
      return made;
    },

    ports: {
      queuedIds: async () => [...self.queue],
      attemptsById: async (ids) =>
        ids.map((id) => self.attempts.get(id)).filter((a): a is Attempt => a !== undefined),
      markSent: async (ids) => {
        for (const id of ids) self.queue.delete(id);
      },
      merge: async (incoming) => {
        const fresh = incoming.filter((a) => !self.attempts.has(a.id));
        for (const a of fresh) self.attempts.set(a.id, a);
        return fresh;
      },
      cursor: async () => self.cursor,
      setCursor: async (cursor) => {
        self.cursor = cursor;
      },
      settings: async () => self.settings,
      adoptSettings: async (settings) => {
        self.settings = settings;
      },
    },
  };
  return self;
}

const target = { origin: ORIGIN, token: TOKEN };

function sync(from: Device, to: Backend) {
  return runSync(from.ports, target, to.fetch);
}

// ---------------------------------------------------------------------- tests

describe('pushing', () => {
  it('sends what is queued and stops waiting for it', async () => {
    const server = backend();
    const phone = device('phone');
    phone.solve(3);

    const report = await sync(phone, server);

    expect(report.sent).toBe(3);
    expect(report.duplicates).toBe(0);
    expect(server.log).toHaveLength(3);
    expect(phone.queue.size).toBe(0);
  });

  it('sends nothing twice', async () => {
    const server = backend();
    const phone = device('phone');
    phone.solve(2);
    await sync(phone, server);
    phone.solve(1);

    const report = await sync(phone, server);

    expect(report.sent).toBe(1);
    expect(server.log).toHaveLength(3);
  });

  it('is idempotent when an accepted batch was never acknowledged', async () => {
    const server = backend();
    const phone = device('phone');
    const [again] = phone.solve(1);
    await sync(phone, server);
    // The server took it, the answer was lost, so it is still queued here.
    phone.queue.add(again!.id);

    const report = await sync(phone, server);

    expect(report.sent).toBe(0);
    expect(report.duplicates).toBe(1);
    expect(server.log).toHaveLength(1);
  });

  it('leaves the queue alone when the push fails', async () => {
    const server = backend({ token: 'a-different-token' });
    const phone = device('phone');
    phone.solve(2);

    await expect(sync(phone, server)).rejects.toThrow(SyncError);
    expect(phone.queue.size).toBe(2);
    expect(server.log).toHaveLength(0);
  });

  it('skips an id whose attempt was cleared out from under it', async () => {
    const server = backend();
    const phone = device('phone');
    const [gone] = phone.solve(1);
    phone.attempts.delete(gone!.id);

    const report = await sync(phone, server);

    expect(report.sent).toBe(0);
    expect(phone.queue.size).toBe(0);
    expect(server.calls).not.toContain('POST /api/sync');
  });
});

describe('pulling', () => {
  it('brings down what another device left', async () => {
    const server = backend();
    const tablet = device('tablet');
    tablet.solve(2);
    await sync(tablet, server);

    const phone = device('phone');
    const report = await sync(phone, server);

    expect(report.received).toBe(2);
    expect(phone.attempts.size).toBe(2);
    expect(phone.cursor).toBe(2);
  });

  it('asks only for what it has not seen', async () => {
    const server = backend();
    const tablet = device('tablet');
    tablet.solve(2);
    await sync(tablet, server);
    const phone = device('phone');
    await sync(phone, server);

    const report = await sync(phone, server);

    expect(report.received).toBe(0);
    expect(phone.cursor).toBe(2);
  });

  it('follows the pages to the end of the log', async () => {
    const server = backend({ pageSize: 10 });
    const tablet = device('tablet');
    tablet.solve(25);
    await sync(tablet, server);

    const phone = device('phone');
    server.calls.length = 0;
    const report = await sync(phone, server);

    expect(report.received).toBe(25);
    expect(phone.cursor).toBe(25);
    expect(server.calls.filter((c) => c === 'GET /api/sync')).toHaveLength(3);
  });

  it('does not count its own attempts coming back as received', async () => {
    const server = backend();
    const phone = device('phone');
    phone.solve(2);

    const report = await sync(phone, server);

    expect(report.sent).toBe(2);
    expect(report.received).toBe(0);
    expect(phone.attempts.size).toBe(2);
  });

  it('leaves the cursor where it was when a page fails to land', async () => {
    const server = backend();
    const tablet = device('tablet');
    tablet.solve(2);
    await sync(tablet, server);

    const phone = device('phone');
    phone.ports.merge = async () => {
      throw new Error('the local store went away');
    };
    await expect(sync(phone, server)).rejects.toThrow('the local store went away');
    expect(phone.cursor).toBe(0);
  });
});

describe('two devices offline', () => {
  /* The acceptance test from the plan: solve on both while apart, then meet. */
  it('each ends up holding every attempt exactly once', async () => {
    const server = backend();
    const phone = device('phone');
    const tablet = device('tablet');
    phone.solve(4);
    tablet.solve(3);

    await sync(phone, server);
    await sync(tablet, server);
    // The phone comes back for the tablet's afternoon.
    await sync(phone, server);

    expect(server.log).toHaveLength(7);
    expect(phone.attempts.size).toBe(7);
    expect(tablet.attempts.size).toBe(7);
    expect([...phone.attempts.keys()].sort()).toEqual([...tablet.attempts.keys()].sort());
    expect(phone.queue.size).toBe(0);
    expect(tablet.queue.size).toBe(0);
  });
});

describe('settings', () => {
  it('sends its own when the server has none', async () => {
    const server = backend();
    const phone = device('phone');
    phone.settings = { ...phone.settings, tier: 'hard' as const, updatedAt: 1000 };

    const report = await sync(phone, server);

    expect(report.settings).toBe('sent');
    expect(server.settings?.settings.tier).toBe('hard');
  });

  it('keeps this device out of the document it sends', async () => {
    const server = backend();
    const phone = device('phone');
    phone.settings = {
      ...phone.settings,
      backendUrl: 'calcflow.example.ts.net',
      token: TOKEN,
      lastSyncedAt: 42,
      updatedAt: 1000,
    };

    await sync(phone, server);

    expect(server.settings?.settings).not.toHaveProperty('token');
    expect(server.settings?.settings).not.toHaveProperty('backendUrl');
    expect(server.settings?.settings).not.toHaveProperty('deviceName');
    expect(server.settings?.settings).not.toHaveProperty('lastSyncedAt');
    expect(server.settings?.settings).not.toHaveProperty('updatedAt');
  });

  it('takes a newer document without taking the other device with it', async () => {
    const server = backend();
    const tablet = device('tablet');
    tablet.settings = { ...tablet.settings, tier: 'hard' as const, penOnly: false, updatedAt: 2000 };
    await sync(tablet, server);

    const phone = device('phone');
    phone.settings = { ...phone.settings, token: TOKEN, tier: 'easy' as const, updatedAt: 1000 };
    const report = await sync(phone, server);

    expect(report.settings).toBe('received');
    expect(phone.settings.tier).toBe('hard');
    expect(phone.settings.penOnly).toBe(false);
    expect(phone.settings.updatedAt).toBe(2000);
    // Its own name, address and key are still its own.
    expect(phone.settings.deviceName).toBe('phone');
    expect(phone.settings.token).toBe(TOKEN);
  });

  it('leaves an older document alone', async () => {
    const server = backend();
    const tablet = device('tablet');
    tablet.settings = { ...tablet.settings, tier: 'hard' as const, updatedAt: 1000 };
    await sync(tablet, server);

    const phone = device('phone');
    phone.settings = { ...phone.settings, tier: 'easy' as const, updatedAt: 3000 };
    const report = await sync(phone, server);

    expect(report.settings).toBe('sent');
    expect(phone.settings.tier).toBe('easy');
    expect(server.settings?.settings.tier).toBe('easy');
  });

  it('does nothing when both stamps agree', async () => {
    const server = backend();
    const tablet = device('tablet');
    tablet.settings = { ...tablet.settings, updatedAt: 1000 };
    await sync(tablet, server);

    const phone = device('phone');
    phone.settings = { ...phone.settings, updatedAt: 1000 };

    expect((await sync(phone, server)).settings).toBe('same');
  });

  it('ignores fields it does not know and fields of the wrong type', async () => {
    const server = backend();
    server.settings = {
      settings: { tier: 99, chapters: [1, 2], somethingNewer: true },
      updatedAt: 5000,
    };
    const phone = device('phone');

    await sync(phone, server);

    expect(phone.settings.tier).toBe(DEFAULT_SETTINGS.tier);
    expect(phone.settings.chapters).toEqual([1, 2]);
    expect(phone.settings).not.toHaveProperty('somethingNewer');
  });
});

describe('failures', () => {
  it('names a rejected token', async () => {
    const server = backend({ token: 'another-token-entirely' });
    await expect(sync(device('phone'), server)).rejects.toMatchObject({
      kind: 'auth',
      message: 'Backend rejected the token',
    });
  });

  it('names an unreachable backend', async () => {
    const phone = device('phone');
    const dead: typeof fetch = () => Promise.reject(new TypeError('Failed to fetch'));
    await expect(runSync(phone.ports, target, dead)).rejects.toMatchObject({ kind: 'offline' });
  });

  it('passes on what the server said was wrong with a batch', async () => {
    const phone = device('phone');
    phone.solve(1);
    const picky: typeof fetch = async () =>
      reply(400, { error: 'attempts[0]: confidence is not valid' });

    await expect(runSync(phone.ports, target, picky)).rejects.toMatchObject({
      kind: 'protocol',
      message: 'attempts[0]: confidence is not valid',
    });
    expect(phone.queue.size).toBe(1);
  });

  it('says so when the address is not this server at all', async () => {
    const phone = device('phone');
    const html: typeof fetch = async () =>
      new Response('<!doctype html><title>Sign in</title>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });

    await expect(runSync(phone.ports, target, html)).rejects.toMatchObject({
      kind: 'protocol',
      message: 'That address is not a CalcFlow backend',
    });
  });
});

describe('backendOrigin', () => {
  it('assumes https for the bare hostname Tailscale shows him', () => {
    expect(backendOrigin('calcflow.example.ts.net')).toBe('https://calcflow.example.ts.net');
  });

  it('keeps a scheme and a port that were given', () => {
    expect(backendOrigin('http://localhost:8787')).toBe('http://localhost:8787');
  });

  it('drops a trailing slash and surrounding space', () => {
    expect(backendOrigin('  https://box.ts.net/  ')).toBe('https://box.ts.net');
  });

  it('falls back only when the field is empty', () => {
    expect(backendOrigin('', 'https://served.from')).toBe('https://served.from');
    expect(backendOrigin('box.ts.net', 'https://served.from')).toBe('https://box.ts.net');
    expect(backendOrigin('')).toBeNull();
  });

  it('answers with nothing for something that is not an address', () => {
    expect(backendOrigin('http://')).toBeNull();
  });
});
