import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import {
  DEFAULT_SETTINGS,
  type Attempt,
  type Confidence,
  type ErrorClass,
  type SessionMode,
  type Settings,
} from '@calcflow/shared';

/** A problem referred to by seed rather than stored — it rebuilds exactly. */
export interface ProblemRef {
  generatorId: string;
  seed: string;
  steps: number;
  difficulty: number;
}

export interface StoredSession {
  mode: SessionMode;
  target: number | null;
  chapters: number[];
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
}

let dbPromise: Promise<IDBPDatabase<CalcFlowDB>> | null = null;

function db() {
  dbPromise ??= openDB<CalcFlowDB>('calcflow', 2, {
    upgrade(database, from) {
      if (from < 1) {
        const attempts = database.createObjectStore('attempts', { keyPath: 'id' });
        attempts.createIndex('ts', 'ts');
        attempts.createIndex('chapter', 'chapter');
        database.createObjectStore('settings');
        database.createObjectStore('syncQueue', { keyPath: 'id' });
      }
      if (from < 2) {
        database.createObjectStore('session');
      }
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
