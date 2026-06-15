import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(__file__), "drum_review.db")


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_conn() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS review_tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name TEXT NOT NULL,
            track_name TEXT,
            track_code TEXT,
            beat_version TEXT,
            source TEXT NOT NULL,
            source_row INTEGER NOT NULL,
            process_status TEXT NOT NULL DEFAULT 'pending',
            authorization_expire_date TEXT,
            authorization_note TEXT,
            impact_scope TEXT,
            raw_fields TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            updated_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS status_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            track_id INTEGER NOT NULL,
            old_status TEXT,
            new_status TEXT NOT NULL,
            operator TEXT DEFAULT 'system',
            remark TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY(track_id) REFERENCES review_tracks(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS field_mappings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            incoming_field TEXT NOT NULL UNIQUE,
            standard_field TEXT NOT NULL
        );
        """)

        cur = conn.execute("SELECT COUNT(*) FROM field_mappings")
        if cur.fetchone()[0] == 0:
            default_mappings = [
                ("文件名", "file_name"),
                ("file_name", "file_name"),
                ("fileName", "file_name"),
                ("曲目名称", "track_name"),
                ("曲目名", "track_name"),
                ("track_name", "track_name"),
                ("trackName", "track_name"),
                ("曲目编号", "track_code"),
                ("曲目ID", "track_code"),
                ("track_code", "track_code"),
                ("鼓组版本", "beat_version"),
                ("节拍版本", "beat_version"),
                ("beat_version", "beat_version"),
                ("beatVersion", "beat_version"),
                ("数据来源", "source"),
                ("来源", "source"),
                ("source", "source"),
                ("来源行号", "source_row"),
                ("行号", "source_row"),
                ("source_row", "source_row"),
                ("处理状态", "process_status"),
                ("状态", "process_status"),
                ("process_status", "process_status"),
                ("授权到期日", "authorization_expire_date"),
                ("到期日", "authorization_expire_date"),
                ("授权备注", "authorization_note"),
                ("备注", "authorization_note"),
                ("影响范围", "impact_scope"),
            ]
            conn.executemany(
                "INSERT INTO field_mappings (incoming_field, standard_field) VALUES (?, ?)",
                default_mappings
            )
