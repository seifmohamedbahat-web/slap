"""SQLite storage for Jarvis.

Phase 1 only creates the schema. The `activity_log` table is the audit-trail /
undo backbone for later phases: every mutating action will record a row with
its before-state (`undo_state`) so it can be reversed. Nothing writes to it
yet — Phase 1 tools are strictly read-only.
"""
import sqlite3
from pathlib import Path

from .config import get_settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS activity_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    category    TEXT NOT NULL,   -- files | apps | system | shell | analysis
    action      TEXT NOT NULL,   -- e.g. move_file, launch_app, run_command
    detail      TEXT,            -- JSON: human-readable description + params
    undo_state  TEXT,            -- JSON before-state; NULL for irreversible/read-only
    undone_at   TEXT             -- set when the action has been rolled back
);

CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON activity_log (timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_log_category  ON activity_log (category);
"""


def db_file() -> Path:
    path = get_settings().db_path
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(db_file())
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)


def recent_activity(limit: int = 100) -> list[dict]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM activity_log ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
    return [dict(r) for r in rows]
