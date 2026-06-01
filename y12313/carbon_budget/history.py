import json
import hashlib
import sqlite3
import os
from datetime import datetime
from typing import Any


DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "carbon_budget.db")


def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = _connect()
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS runs (
            run_id TEXT PRIMARY KEY,
            started_at TEXT NOT NULL,
            finished_at TEXT,
            status TEXT NOT NULL DEFAULT 'running'
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT NOT NULL,
            record_type TEXT NOT NULL,
            fingerprint TEXT NOT NULL,
            data TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(fingerprint)
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS constraint_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            constraint_key TEXT NOT NULL,
            explanation TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 1,
            changed_at TEXT NOT NULL,
            UNIQUE(constraint_key, version)
        )
    """)
    conn.commit()
    conn.close()


def start_run() -> str:
    conn = _connect()
    run_id = _fingerprint({"ts": datetime.now().isoformat(), "rand": os.urandom(8).hex()})
    conn.execute("INSERT INTO runs (run_id, started_at, status) VALUES (?, ?, ?)",
                 (run_id, datetime.now().isoformat(), "running"))
    conn.commit()
    conn.close()
    return run_id


def finish_run(run_id: str):
    conn = _connect()
    conn.execute("UPDATE runs SET finished_at = ?, status = ? WHERE run_id = ?",
                 (datetime.now().isoformat(), "finished", run_id))
    conn.commit()
    conn.close()


def append_history(run_id: str, record_type: str, data: Any) -> bool:
    fp = _fingerprint({"type": record_type, "data": data})
    conn = _connect()
    try:
        conn.execute(
            "INSERT INTO history (run_id, record_type, fingerprint, data, created_at) VALUES (?, ?, ?, ?, ?)",
            (run_id, record_type, fp, json.dumps(data, ensure_ascii=False, default=str), datetime.now().isoformat())
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()


def load_history(record_type: str = None) -> list:
    conn = _connect()
    if record_type:
        rows = conn.execute(
            "SELECT * FROM history WHERE record_type = ? ORDER BY created_at",
            (record_type,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM history ORDER BY created_at").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def save_constraint_version(constraint_key: str, explanation: str) -> int:
    conn = _connect()
    row = conn.execute(
        "SELECT version, explanation FROM constraint_versions WHERE constraint_key = ? ORDER BY version DESC LIMIT 1",
        (constraint_key,)
    ).fetchone()
    if row and row["explanation"] == explanation:
        conn.close()
        return row["version"]
    version = (row["version"] if row else 0) + 1
    conn.execute(
        "INSERT INTO constraint_versions (constraint_key, explanation, version, changed_at) VALUES (?, ?, ?, ?)",
        (constraint_key, explanation, version, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()
    return version


def load_constraint_versions(constraint_key: str = None) -> list:
    conn = _connect()
    if constraint_key:
        rows = conn.execute(
            "SELECT * FROM constraint_versions WHERE constraint_key = ? ORDER BY version",
            (constraint_key,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM constraint_versions ORDER BY constraint_key, version").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def _fingerprint(obj: Any) -> str:
    raw = json.dumps(obj, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
