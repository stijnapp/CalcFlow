import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import {
  DEFAULT_SETTINGS,
  type Attempt,
  type Confidence,
  type ErrorClass,
  type SelfGrade,
  type SessionMode,
  type Settings,
  type Tier,
} from '@calcflow/shared';
import type { CanvasState } from '@/canvas/strokes';

/** A problem referred to by seed rather than stored — it rebuilds exactly. */
export interface ProblemRef {
  generatorId: string;
  seed: string;
  tier: Tier;
}

export interface StoredSession {
  mode: SessionMode;
  target: number | null;
  chapters: number[];
  /** Where adaptive difficulty had got to; see `Session.level`. */
  level: number;
  only?: string[];
  done: Array<
    ProblemRef & {
      correct: boolean;
      errorClass: ErrorClass | null;
      confidence: Confidence;
      durationMs: number;
      hintMaxRung: number;
    }
  >;
  problem: ProblemRef;
  elapsedMs: number;
  answers: string[];
  activeField: number;
  confidence: Confidence | null;
  rung: number;
  onTrackLine: string;
  /** Absent until he has drawn something. */
  canvas?: CanvasState;
  /** Set once a graph question's sketch has been marked, so it is not marked twice. */
  selfGrade: SelfGrade | null;
  answered: boolean;
  savedAt: number;
}

interface CalcFlowDB extends DBSchema {
  attempts: {
    key: string;
    value: Attempt;
    indexes: { ts: number; chapter: number };
  };
  settings: {
    key: string;
    value: Settings;
  };
  /** The one session in flight, so backgrounding the app costs nothing. */
  session: {
    key: string;
    value: StoredSession;
  };
  /** Attempts not yet accepted by the server. Flushed on focus and every 60 s. */
  syncQueue: {
    key: string;
    value: { id: string; queuedAt: number };
  };
  /** Sync bookkeeping that belongs to this device alone — currently the cursor. */
  meta: {
    key: string;
    value: number;
  };
}

let dbPromise: Promise<IDBPDatabase<CalcFlowDB>> | null = null;

/*
 * One creation path and no upgrade branches. Everything stored before the app
 * was deployed was him testing it, and carrying that forward cost more code
 * than the rows were worth — so a browser holding an older store has it
 * dropped and rebuilt rather than rewritten.
 *
 * This is the baseline the real migrations start from. From the first deploy
 * on, the log is his history and the only copy of it: a change to what is
 * stored gets `VERSION` bumped and an `if (from < n)` branch here that carries
 * the existing rows across, never a `deleteObjectStore`.
 */
const VERSION = 5;

function db() {
  dbPromise ??= openDB<CalcFlowDB>('calcflow', VERSION, {
    upgrade(database) {
      // Snapshotted, because deleting a store mutates the live list.
      for (const name of [...database.objectStoreNames]) database.deleteObjectStore(name);

      const attempts = database.createObjectStore('attempts', { keyPath: 'id' });
      attempts.createIndex('ts', 'ts');
      attempts.createIndex('chapter', 'chapter');
      database.createObjectStore('settings');
      database.createObjectStore('session');
      database.createObjectStore('syncQueue', { keyPath: 'id' });
      database.createObjectStore('meta');
    },
  });
  return dbPromise;
}

export async function loadAttempts(): Promise<Attempt[]> {
  return (await db()).getAllFromIndex('attempts', 'ts');
}

export async function saveAttempt(attempt: Attempt): Promise<void> {
  const database = await db();
  const tx = database.transaction(['attempts', 'syncQueue'], 'readwrite');
  // `put` rather than `add`: the ULID makes a repeat write idempotent, which is
  // what lets the same log be merged from two devices without care.
  await tx.objectStore('attempts').put(attempt);
  await tx.objectStore('syncQueue').put({ id: attempt.id, queuedAt: Date.now() });
  await tx.done;
}

/** Wholesale replacement, for loading or clearing the sample log. */
export async function putAttempts(attempts: Attempt[], clearFirst: boolean): Promise<void> {
  const database = await db();
  const tx = database.transaction('attempts', 'readwrite');
  if (clearFirst) await tx.store.clear();
  await Promise.all(attempts.map((a) => tx.store.put(a)));
  await tx.done;
}

export async function loadSettings(): Promise<Settings> {
  const stored = await (await db()).get('settings', 'current');
  // Spread over the defaults rather than returned as-is: a settings field added
  // in a later build is missing from what an installed copy stored, and that is
  // the one kind of drift that does not need a version bump to fix.
  return stored ? { ...DEFAULT_SETTINGS, ...stored } : DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await (await db()).put('settings', settings, 'current');
}

export async function loadStoredSession(): Promise<StoredSession | null> {
  return (await (await db()).get('session', 'current')) ?? null;
}

export async function saveStoredSession(session: StoredSession): Promise<void> {
  await (await db()).put('session', session, 'current');
}

export async function clearStoredSession(): Promise<void> {
  await (await db()).delete('session', 'current');
}

export async function queuedCount(): Promise<number> {
  return (await db()).count('syncQueue');
}

export async function clearQueue(ids: string[]): Promise<void> {
  const database = await db();
  const tx = database.transaction('syncQueue', 'readwrite');
  await Promise.all(ids.map((id) => tx.store.delete(id)));
  await tx.done;
}

export async function queuedIds(): Promise<string[]> {
  return (await db()).getAllKeys('syncQueue');
}

/** The queued attempts themselves. Ids whose attempt is gone are simply absent. */
export async function attemptsById(ids: string[]): Promise<Attempt[]> {
  const database = await db();
  const tx = database.transaction('attempts', 'readonly');
  const found = await Promise.all(ids.map((id) => tx.store.get(id)));
  await tx.done;
  return found.filter((a): a is Attempt => a !== undefined);
}

/**
 * Folds pulled attempts into the local log and answers with the ones that were
 * new. They deliberately do not join the sync queue: the server is where they
 * came from, and sending them back would only cost a round trip to be told so.
 */
export async function mergeAttempts(incoming: Attempt[]): Promise<Attempt[]> {
  if (incoming.length === 0) return [];
  const database = await db();
  const tx = database.transaction('attempts', 'readwrite');
  const known = await Promise.all(incoming.map((a) => tx.store.getKey(a.id)));
  const fresh = incoming.filter((_, i) => known[i] === undefined);
  await Promise.all(fresh.map((a) => tx.store.put(a)));
  await tx.done;
  return fresh;
}

/** How far into the server's log this device has read. */
export async function loadCursor(): Promise<number> {
  return (await (await db()).get('meta', 'syncCursor')) ?? 0;
}

export async function saveCursor(cursor: number): Promise<void> {
  await (await db()).put('meta', cursor, 'syncCursor');
}

/**
 * Drops attempts and their queue entries together. Only ever called with ids
 * that are still queued, which is what makes "clear local changes" mean exactly
 * that: anything the server has already accepted stays.
 */
export async function deleteAttempts(ids: string[]): Promise<void> {
  const database = await db();
  const tx = database.transaction(['attempts', 'syncQueue'], 'readwrite');
  const attempts = tx.objectStore('attempts');
  const queue = tx.objectStore('syncQueue');
  await Promise.all(ids.flatMap((id) => [attempts.delete(id), queue.delete(id)]));
  await tx.done;
}
