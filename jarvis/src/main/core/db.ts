/**
 * SQLite persistence built on Node's built-in `node:sqlite` (Node >= 22.13,
 * bundled with Electron >= 36) — zero native dependencies. This module is
 * deliberately Electron-free so it can be unit-tested under plain Node.
 */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export type Database = DatabaseSync;

const MIGRATIONS: string[] = [
  // v1 — initial schema
  `
  CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS api_keys (
    provider   TEXT PRIMARY KEY,
    ciphertext TEXT NOT NULL,
    encrypted  INTEGER NOT NULL DEFAULT 1,
    last_four  TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS conversations (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    provider   TEXT NOT NULL,
    model      TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role            TEXT NOT NULL,
    content         TEXT NOT NULL,
    provider        TEXT,
    model           TEXT,
    created_at      TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
  CREATE TABLE IF NOT EXISTS notes (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    content    TEXT NOT NULL DEFAULT '',
    tags       TEXT NOT NULL DEFAULT '[]',
    pinned     INTEGER NOT NULL DEFAULT 0,
    kind       TEXT NOT NULL DEFAULT 'note',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    notes        TEXT NOT NULL DEFAULT '',
    due_date     TEXT,
    priority     TEXT NOT NULL DEFAULT 'medium',
    status       TEXT NOT NULL DEFAULT 'todo',
    project_id   TEXT,
    created_at   TEXT NOT NULL,
    completed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS events (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    start      TEXT NOT NULL,
    end        TEXT NOT NULL,
    all_day    INTEGER NOT NULL DEFAULT 0,
    location   TEXT NOT NULL DEFAULT '',
    notes      TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    path        TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'active',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS reminders (
    id         TEXT PRIMARY KEY,
    message    TEXT NOT NULL,
    fire_at    TEXT NOT NULL,
    fired      INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS memory (
    id           TEXT PRIMARY KEY,
    category     TEXT NOT NULL,
    key          TEXT NOT NULL,
    value        TEXT NOT NULL,
    importance   INTEGER NOT NULL DEFAULT 3,
    last_used_at TEXT,
    created_at   TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS activity_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    level      TEXT NOT NULL,
    category   TEXT NOT NULL,
    message    TEXT NOT NULL,
    meta       TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS command_history (
    id          TEXT PRIMARY KEY,
    input       TEXT NOT NULL,
    intent_kind TEXT,
    status      TEXT NOT NULL,
    output      TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS plugins (
    id      TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS profile (
    id       INTEGER PRIMARY KEY CHECK (id = 1),
    name     TEXT NOT NULL DEFAULT '',
    email    TEXT NOT NULL DEFAULT '',
    pin_hash TEXT,
    pin_salt TEXT,
    onboarded INTEGER NOT NULL DEFAULT 0
  );
  INSERT OR IGNORE INTO profile (id) VALUES (1);
  `,
];

export function openDatabase(filePath: string): Database {
  if (filePath !== ":memory:") {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }
  const db = new DatabaseSync(filePath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  migrate(db);
  return db;
}

function migrate(db: Database): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)",
  );
  const row = db
    .prepare("SELECT MAX(version) AS version FROM schema_migrations")
    .get() as { version: number | null };
  const current = row?.version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.exec("BEGIN");
    try {
      db.exec(MIGRATIONS[v]);
      db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(
        v + 1,
        new Date().toISOString(),
      );
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return crypto.randomUUID();
}
