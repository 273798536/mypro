import sqlite3
import json
import hashlib
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "beat_annotate.db"


def _get_conn():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = _get_conn()
    cur = conn.cursor()
    cur.executescript("""
        CREATE TABLE IF NOT EXISTS audio_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            duration_sec REAL,
            bpm REAL,
            import_time TEXT NOT NULL,
            content_hash TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS beat_markers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            audio_file_id INTEGER NOT NULL,
            beat_index INTEGER NOT NULL,
            timestamp_sec REAL NOT NULL,
            is_downbeat INTEGER DEFAULT 0,
            source TEXT DEFAULT 'auto',
            UNIQUE(audio_file_id, beat_index),
            FOREIGN KEY(audio_file_id) REFERENCES audio_files(id)
        );

        CREATE TABLE IF NOT EXISTS action_annotations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            audio_file_id INTEGER NOT NULL,
            beat_marker_id INTEGER NOT NULL,
            action_name TEXT,
            performer TEXT,
            notes TEXT,
            is_manual_override INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            version INTEGER DEFAULT 1,
            content_hash TEXT NOT NULL UNIQUE,
            FOREIGN KEY(audio_file_id) REFERENCES audio_files(id),
            FOREIGN KEY(beat_marker_id) REFERENCES beat_markers(id)
        );

        CREATE TABLE IF NOT EXISTS annotation_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            annotation_id INTEGER NOT NULL,
            field_name TEXT NOT NULL,
            old_value TEXT,
            new_value TEXT,
            changed_by TEXT DEFAULT 'system',
            changed_at TEXT NOT NULL,
            change_reason TEXT,
            content_hash TEXT,
            FOREIGN KEY(annotation_id) REFERENCES action_annotations(id)
        );

        CREATE TABLE IF NOT EXISTS drift_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            audio_file_id INTEGER NOT NULL,
            beat_marker_id INTEGER NOT NULL,
            expected_timestamp REAL,
            actual_timestamp REAL,
            drift_sec REAL NOT NULL,
            detected_at TEXT NOT NULL,
            resolved INTEGER DEFAULT 0,
            FOREIGN KEY(audio_file_id) REFERENCES audio_files(id),
            FOREIGN KEY(beat_marker_id) REFERENCES beat_markers(id)
        );

        CREATE TABLE IF NOT EXISTS issues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            audio_file_id INTEGER NOT NULL,
            issue_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            description TEXT NOT NULL,
            beat_marker_id INTEGER,
            annotation_id INTEGER,
            detected_at TEXT NOT NULL,
            resolved INTEGER DEFAULT 0,
            FOREIGN KEY(audio_file_id) REFERENCES audio_files(id)
        );

        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            audio_file_id INTEGER NOT NULL,
            report_type TEXT NOT NULL,
            content TEXT NOT NULL,
            generated_at TEXT NOT NULL,
            content_hash TEXT NOT NULL UNIQUE,
            FOREIGN KEY(audio_file_id) REFERENCES audio_files(id)
        );
    """)
    conn.commit()
    conn.close()


def get_conn():
    return _get_conn()


def _hash_dict(d):
    raw = json.dumps(d, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def hash_content(d):
    return _hash_dict(d)
