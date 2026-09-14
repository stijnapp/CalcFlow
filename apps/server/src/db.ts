import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import type { Attempt, SyncEvent } from '@calcflow/shared';

/**
 * The attempt log, which is the whole of the sync design: rows are appended and
 * never edited, the id is a device-generated ULID, and `INSERT OR IGNORE` makes
 * a repeated batch a no-op. There is no conflict resolution because there are
 * no conflicts — two devices that were offline for a week merge by union.
 *
 * `cursor` is the server's own ordering, handed back to clients so they can ask
 * for what they have not seen. AUTOINCREMENT rather than plain rowid: a deleted
 * row must never let a later attempt take a cursor a client has already passed.
 */
const SCHEMA = `
CREATE TABLE attempts (
  cursor       INTEGER PRIMARY KEY AUTOINCREMENT,
  id           TEXT    NOT NULL UNIQUE,
  device       TEXT    NOT NULL,
  ts           INTEGER NOT NULL,
  generator_id TEXT    NOT NULL,
  seed         TEXT    NOT NULL,
  gen_version  INTEGER NOT NULL,
  chapter      INTEGER NOT NULL,
  tier         TEXT    NOT NULL,
  correct      INTEGER NOT NULL,
  confidence   TEXT    NOT NULL,
  hints_used   INTEGER NOT NULL,
  hint_max_rung INTEGER NOT NULL,
  duration_ms  INTEGER NOT NULL,
  answer_raw   TEXT    NOT NULL,
  error_class  TEXT,
  self_grade   TEXT
);
CREATE INDEX attempts_ts ON attempts (ts);

-- One row, holding the settings document as the client last agreed on it.
CREATE TABLE settings (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  json       TEXT    NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

interface Row {
  cursor: number;
  id: string;
  device: string;
  ts: number;
  generator_id: string;
  seed: string;
  gen_version: number;
  chapter: number;
  tier: string;
  correct: number;
  confidence: string;
  hints_used: number;
  hint_max_rung: number;
  duration_ms: number;
  answer_raw: string;
  self_grade: string | null;
  error_class: string | null;
}

export interface Page {
  events: SyncEvent[];
  /** Where the client now stands: the last cursor it has seen. */
  cursor: number;
  more: boolean;
}

export interface StoredSettings {
  settings: unknown;
  updatedAt: number;
}

export interface Store {
  append(attempts: Attempt[]): { accepted: number; duplicates: number; cursor: number };
  read(since: number, limit: number): Page;
  head(): number;
  count(): number;
  settings(): StoredSettings | null;
  putSettings(next: StoredSettings): StoredSettings;
  close(): void;
}

export function openStore(path: string): Store {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');
  migrate(db);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO attempts
      (id, device, ts, generator_id, seed, gen_version, chapter, tier,
       correct, confidence, hints_used, hint_max_rung, duration_ms, answer_raw, error_class,
       self_grade)
    VALUES
      (@id, @device, @ts, @generatorId, @seed, @genVersion, @chapter, @tier,
       @correct, @confidence, @hintsUsed, @hintMaxRung, @durationMs, @answerRaw, @errorClass,
       @selfGrade)
  `);
  const selectSince = db.prepare('SELECT * FROM attempts WHERE cursor > ? ORDER BY cursor LIMIT ?');
  const selectHead = db.prepare('SELECT IFNULL(MAX(cursor), 0) AS head FROM attempts');
  const selectCount = db.prepare('SELECT COUNT(*) AS n FROM attempts');
  const selectSettings = db.prepare('SELECT json, updated_at FROM settings WHERE id = 1');
  const upsertSettings = db.prepare(`
    INSERT INTO settings (id, json, updated_at) VALUES (1, @json, @updatedAt)
    ON CONFLICT (id) DO UPDATE SET json = @json, updated_at = @updatedAt
  `);

  // One transaction for the batch: a flush either lands whole or not at all, so
  // a dropped connection never leaves the client guessing which half arrived.
  const appendAll = db.transaction((attempts: Attempt[]) => {
    let accepted = 0;
    for (const attempt of attempts) {
      const result = insert.run({ ...attempt, correct: attempt.correct ? 1 : 0 });
      accepted += result.changes;
    }
    return accepted;
  });

  const head = () => (selectHead.get() as { head: number }).head;

  return {
    append(attempts) {
      const accepted = appendAll(attempts);
      return { accepted, duplicates: attempts.length - accepted, cursor: head() };
    },

    read(since, limit) {
      // One more than asked for, so `more` is known without a second query.
      const rows = selectSince.all(since, limit + 1) as Row[];
      const more = rows.length > limit;
      const page = more ? rows.slice(0, limit) : rows;
      return {
        events: page.map(toEvent),
        cursor: page.length > 0 ? page[page.length - 1]!.cursor : since,
        more,
      };
    },

    head,
    count: () => (selectCount.get() as { n: number }).n,

    settings() {
      const row = selectSettings.get() as { json: string; updated_at: number } | undefined;
      if (!row) return null;
      return { settings: JSON.parse(row.json) as unknown, updatedAt: row.updated_at };
    },

    putSettings(next) {
      const current = this.settings();
      // Last write wins, and a tie leaves what is already there: two devices
      // saving in the same millisecond is not worth a merge algorithm.
      if (current && current.updatedAt >= next.updatedAt) return current;
      upsertSettings.run({ json: JSON.stringify(next.settings), updatedAt: next.updatedAt });
      return next;
    },

    close: () => db.close(),
  };
}

/**
 * Schema versions, forwards only. Each step runs in its own transaction so a
 * half-applied migration is not a thing this can leave behind.
 */
function migrate(db: Database.Database): void {
  let version = db.pragma('user_version', { simple: true }) as number;

  if (version === 0) {
    db.exec(SCHEMA);
    db.pragma('user_version = 3');
    return;
  }

  // v2: the 1–5 difficulty and the separate step count became one of three
  // tiers. Attempts already in the log keep their place on the new scale rather
  // than being thrown away — roughly right beats absent on a stats page.
  if (version < 2) {
    db.exec(`
      BEGIN;
      ALTER TABLE attempts ADD COLUMN tier TEXT NOT NULL DEFAULT 'medium';
      UPDATE attempts SET tier =
        CASE WHEN difficulty <= 2 THEN 'easy'
             WHEN difficulty >= 4 THEN 'hard'
             ELSE 'medium' END;
      ALTER TABLE attempts DROP COLUMN steps;
      ALTER TABLE attempts DROP COLUMN difficulty;
      PRAGMA user_version = 2;
      COMMIT;
    `);
    version = 2;
  }

  // v3: chapters 5 and 12 ask for a drawing, which only he can mark. The three
  // buckets he marks it into ride along with the attempt.
  if (version < 3) {
    db.exec(`
      BEGIN;
      ALTER TABLE attempts ADD COLUMN self_grade TEXT;
      PRAGMA user_version = 3;
      COMMIT;
    `);
    version = 3;
  }
}

function toEvent(row: Row): SyncEvent {
  return {
    cursor: row.cursor,
    attempt: {
      id: row.id,
      device: row.device,
      ts: row.ts,
      generatorId: row.generator_id,
      seed: row.seed,
      genVersion: row.gen_version,
      chapter: row.chapter,
      tier: row.tier as Attempt['tier'],
      correct: row.correct === 1,
      confidence: row.confidence as Attempt['confidence'],
      hintsUsed: row.hints_used,
      hintMaxRung: row.hint_max_rung,
      durationMs: row.duration_ms,
      answerRaw: row.answer_raw,
      errorClass: row.error_class as Attempt['errorClass'],
      selfGrade: row.self_grade as Attempt['selfGrade'],
    },
  };
}
