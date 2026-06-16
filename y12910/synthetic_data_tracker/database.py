import sqlite3
import os
from pathlib import Path

DB_DIR = Path(__file__).parent / "data"
DB_PATH = DB_DIR / "tracker.db"


def get_connection() -> sqlite3.Connection:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_material TEXT NOT NULL DEFAULT '',
            prompt_version TEXT NOT NULL DEFAULT '',
            content TEXT NOT NULL DEFAULT '',
            content_hash TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'imported'
                CHECK(status IN ('imported','pending_review','confirmed','rejected')),
            feedback TEXT NOT NULL DEFAULT '',
            notes TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_records_status ON records(status);
        CREATE INDEX IF NOT EXISTS idx_records_content_hash ON records(content_hash);

        CREATE TABLE IF NOT EXISTS version_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            record_id INTEGER NOT NULL,
            field_name TEXT NOT NULL,
            old_value TEXT NOT NULL DEFAULT '',
            new_value TEXT NOT NULL DEFAULT '',
            prompt_version TEXT NOT NULL DEFAULT '',
            changed_at TEXT NOT NULL DEFAULT (datetime('now')),
            changed_by TEXT NOT NULL DEFAULT '',
            FOREIGN KEY(record_id) REFERENCES records(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_version_logs_record ON version_logs(record_id);

        CREATE TABLE IF NOT EXISTS source_traces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            record_id INTEGER NOT NULL,
            source_type TEXT NOT NULL
                CHECK(source_type IN ('prompt','human_feedback','import','status_change')),
            source_ref TEXT NOT NULL DEFAULT '',
            prompt_version TEXT NOT NULL DEFAULT '',
            snapshot TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(record_id) REFERENCES records(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_source_traces_record ON source_traces(record_id);
    """)
    conn.commit()
    conn.close()
