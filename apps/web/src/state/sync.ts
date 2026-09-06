import { DEFAULT_SETTINGS, type Attempt, type Settings, type SyncEvent } from '@calcflow/shared';

/*
 * The client half of sync. The server holds one append-only log and hands out a
 * cursor into it; a device pushes what it has not sent, pulls what it has not
 * seen, and merges by union. Nothing is ever edited, so there is no conflict to
 * resolve and no order to agree on — only settings need a rule, and theirs is
 * last write wins.
 *
 * Everything here is pure protocol: the local store arrives as ports and the
 * network as a `fetch`. That keeps the whole exchange testable without a
 * browser, and keeps IndexedDB out of the part that has to be exactly right.
 */

/** Fields that describe *this* device and would be nonsense on another one. */
export const DEVICE_LOCAL = ['deviceName', 'backendUrl', 'token', 'lastSyncedAt'] as const;
/** Those, plus the stamp the exchange carries in the envelope instead. */
const LOCAL_ONLY = new Set<string>([...DEVICE_LOCAL, 'updatedAt']);

/** Attempts per POST. A month offline is still one or two of these. */
const PUSH_BATCH = 500;
const PULL_LIMIT = 1000;
/** A tailnet that has gone away should fail, not hang the button forever. */
const TIMEOUT_MS = 15_000;

export interface SyncPorts {
  /** Ids written on this device that the server has not accepted yet. */
  queuedIds(): Promise<string[]>;
  attemptsById(ids: string[]): Promise<Attempt[]>;
  /** The server has these now; they no longer need sending. */
  markSent(ids: string[]): Promise<void>;
  /** Adds pulled attempts to the local log, answering with the ones that were new. */
  merge(attempts: Attempt[]): Promise<Attempt[]>;
  cursor(): Promise<number>;
  setCursor(cursor: number): Promise<void>;
  settings(): Promise<Settings>;
  adoptSettings(settings: Settings): Promise<void>;
}

export interface Target {
  /** Scheme and host, no trailing slash. */
  origin: string;
  token: string;
}

export interface SyncReport {
  /** Attempts the server had not seen before. */
  sent: number;
  /** Ours it already had — an earlier push that landed without being acknowledged. */
  duplicates: number;
  received: number;
  settings: 'sent' | 'received' | 'same';
  cursor: number;
}

export type SyncFailure = 'offline' | 'auth' | 'server' | 'protocol';

export class SyncError extends Error {
  constructor(
    readonly kind: SyncFailure,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'SyncError';
  }
}

/**
 * What he types into Settings is whatever Tailscale showed him — usually a bare
 * hostname. Empty means the backend is wherever the app itself came from, which
 * is the case that needs no configuration at all: one container serving both.
 */
export function backendOrigin(raw: string, fallback?: string): string | null {
  const text = raw.trim();
  if (!text) return fallback ?? null;
  const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    // The origin alone, so a trailing slash or a pasted path costs nothing.
    return new URL(withScheme).origin;
  } catch {
    return null;
  }
}

export async function runSync(
  ports: SyncPorts,
  target: Target,
  http: typeof fetch = fetch,
): Promise<SyncReport> {
  const call = api(target, http);

  const { sent, duplicates } = await push(ports, call);
  const { received, cursor } = await pull(ports, call);
  const settings = await exchangeSettings(ports, call);

  return { sent, duplicates, received, settings, cursor };
}

// -------------------------------------------------------------------- pushing

async function push(ports: SyncPorts, call: Call): Promise<{ sent: number; duplicates: number }> {
  const ids = await ports.queuedIds();
  let sent = 0;
  let duplicates = 0;

  for (let i = 0; i < ids.length; i += PUSH_BATCH) {
    const batch = ids.slice(i, i + PUSH_BATCH);
    const attempts = await ports.attemptsById(batch);
    // An id can outlive its attempt — "clear local changes" racing a flush.
    // There is nothing to send and nothing left to wait for.
    if (attempts.length > 0) {
      const answer = await call<{ accepted: number; duplicates: number }>('POST', '/api/sync', {
        attempts,
      });
      sent += answer.accepted;
      duplicates += answer.duplicates;
    }
    // Only once the server has answered. A batch that failed stays queued, so
    // the worst a dropped connection costs is sending it a second time — which
    // the ids make free.
    await ports.markSent(batch);
  }

  return { sent, duplicates };
}

// -------------------------------------------------------------------- pulling

/*
 * Our own attempts come back down here rather than being skipped with the
 * cursor the push answered with. That cursor is the head of the log, and
 * between our last pull and this push another device may have landed attempts
 * below it — skipping to it would lose exactly those. One redundant page is the
 * price, and merging it is a no-op.
 */
async function pull(ports: SyncPorts, call: Call): Promise<{ received: number; cursor: number }> {
  let cursor = await ports.cursor();
  let received = 0;

  for (;;) {
    const page = await call<{ events: SyncEvent[]; cursor: number; more: boolean }>(
      'GET',
      `/api/sync?since=${cursor}&limit=${PULL_LIMIT}`,
    );
    const fresh = await ports.merge(page.events.map((e) => e.attempt));
    received += fresh.length;

    // The cursor moves only after the attempts it covers are stored. Crashing
    // in between costs a page re-pulled; the other order would skip it, and
    // nothing would ever notice.
    if (!(page.cursor > cursor)) break;
    cursor = page.cursor;
    await ports.setCursor(cursor);
    if (!page.more) break;
  }

  return { received, cursor };
}

// ------------------------------------------------------------------- settings

async function exchangeSettings(
  ports: SyncPorts,
  call: Call,
): Promise<'sent' | 'received' | 'same'> {
  const local = await ports.settings();
  const remote = await call<{ settings: unknown; updatedAt: number }>('GET', '/api/settings');

  if (remote.settings && remote.updatedAt > local.updatedAt) {
    await ports.adoptSettings(applyShared(local, remote.settings, remote.updatedAt));
    return 'received';
  }
  if (local.updatedAt <= remote.updatedAt) return 'same';

  const winner = await call<{ settings: unknown; updatedAt: number }>('PUT', '/api/settings', {
    settings: shared(local),
    updatedAt: local.updatedAt,
  });
  // The winner comes back either way, so losing the race still costs one trip.
  if (winner.settings && winner.updatedAt > local.updatedAt) {
    await ports.adoptSettings(applyShared(local, winner.settings, winner.updatedAt));
    return 'received';
  }
  return 'sent';
}

/** Everything except this device's own name, address, key and clock. */
function shared(settings: Settings): Record<string, unknown> {
  return Object.fromEntries(Object.entries(settings).filter(([key]) => !LOCAL_ONLY.has(key)));
}

/**
 * Folds a document from another device onto this one. Only keys this build
 * knows, and only where the type matches the default, so a document written by
 * a newer or half-broken client cannot put a string where a number goes and
 * take the app down with it on the next launch.
 */
function applyShared(local: Settings, incoming: unknown, updatedAt: number): Settings {
  if (typeof incoming !== 'object' || incoming === null) return { ...local, updatedAt };

  const accepted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(incoming as Record<string, unknown>)) {
    if (LOCAL_ONLY.has(key) || !(key in DEFAULT_SETTINGS)) continue;
    const reference = DEFAULT_SETTINGS[key as keyof Settings];
    if (typeof value !== typeof reference) continue;
    if (Array.isArray(value) !== Array.isArray(reference)) continue;
    accepted[key] = value;
  }
  return { ...local, ...accepted, updatedAt } as Settings;
}

// ------------------------------------------------------------------ transport

type Call = <T>(method: string, path: string, body?: unknown) => Promise<T>;

function api(target: Target, http: typeof fetch): Call {
  return async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { 'x-calcflow-token': target.token };
    if (body !== undefined) headers['content-type'] = 'application/json';

    let response: Response;
    try {
      response = await http(target.origin + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        // The token is the credential; there are no cookies to send anywhere.
        credentials: 'omit',
        cache: 'no-store',
      });
    } catch (cause) {
      const timedOut = cause instanceof Error && cause.name === 'TimeoutError';
      throw new SyncError('offline', timedOut ? 'Backend did not answer' : 'Backend unreachable', {
        cause,
      });
    }

    if (response.status === 401) throw new SyncError('auth', 'Backend rejected the token');
    if (!response.ok) {
      const detail = await reason(response);
      // A 400 means the two halves disagree about the shape of an attempt,
      // which is a bug rather than a bad moment: say so instead of retrying.
      throw new SyncError(
        response.status === 400 ? 'protocol' : 'server',
        detail ?? `Backend answered ${response.status}`,
      );
    }

    try {
      return (await response.json()) as T;
    } catch (cause) {
      // HTML where JSON should be: the address points at something that is not
      // this server, or at a proxy's own sign-in page.
      throw new SyncError('protocol', 'That address is not a CalcFlow backend', { cause });
    }
  };
}

async function reason(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'error' in body) {
      const error = (body as { error: unknown }).error;
      if (typeof error === 'string') return error;
    }
  } catch {
    // No body, or not JSON. Then the status is the whole story.
  }
  return null;
}
