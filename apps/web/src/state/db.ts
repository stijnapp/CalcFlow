import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { DEFAULT_SETTINGS, type Attempt, type Settings } from '@calcflow/shared';

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
  /** Attempts not yet accepted by the server. Flushed on focus and every 60 s. */
  syncQueue: {
    key: string;
    value: { id: string; queuedAt: number };
  };
}

let dbPromise: Promise<IDBPDatabase<CalcFlowDB>> | null = null;

function db() {
  dbPromise ??= openDB<CalcFlowDB>('calcflow', 1, {
    upgrade(database) {
      const attempts = database.createObjectStore('attempts', { keyPath: 'id' });
      attempts.createIndex('ts', 'ts');
      attempts.createIndex('chapter', 'chapter');
      database.createObjectStore('settings');
      database.createObjectStore('syncQueue', { keyPath: 'id' });
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

export async function loadSettings(): Promise<Settings> {
  const stored = await (await db()).get('settings', 'current');
  return stored ? { ...DEFAULT_SETTINGS, ...stored } : DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await (await db()).put('settings', settings, 'current');
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
