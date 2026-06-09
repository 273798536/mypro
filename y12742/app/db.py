import sqlite3
import os
from datetime import datetime
from typing import Optional, List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "rank_stability.db")


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.executescript("""
        CREATE TABLE IF NOT EXISTS batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_tag TEXT UNIQUE NOT NULL,
            created_at TEXT NOT NULL,
            source_file TEXT,
            remark TEXT
        );

        CREATE TABLE IF NOT EXISTS teams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id INTEGER NOT NULL,
            team_name TEXT NOT NULL,
            raw_score REAL,
            raw_rank INTEGER,
            FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS calc_drafts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id INTEGER NOT NULL,
            team_id INTEGER NOT NULL,
            adjusted_score REAL,
            adjusted_rank INTEGER,
            stability_index REAL,
            rank_delta INTEGER,
            error_magnitude REAL,
            is_warning INTEGER DEFAULT 0,
            warning_reason TEXT,
            calc_note TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
            FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            draft_id INTEGER NOT NULL UNIQUE,
            status TEXT NOT NULL DEFAULT 'pending',
            reviewer TEXT,
            review_opinion TEXT,
            reviewed_at TEXT,
            FOREIGN KEY (draft_id) REFERENCES calc_drafts(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS run_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id INTEGER NOT NULL,
            phase TEXT NOT NULL,
            operator TEXT,
            detail TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS params (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id INTEGER NOT NULL,
            param_key TEXT NOT NULL,
            param_value REAL NOT NULL,
            description TEXT,
            FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_teams_batch ON teams(batch_id);
        CREATE INDEX IF NOT EXISTS idx_drafts_batch ON calc_drafts(batch_id);
        CREATE INDEX IF NOT EXISTS idx_drafts_team ON calc_drafts(team_id);
        CREATE INDEX IF NOT EXISTS idx_runs_batch ON run_records(batch_id);
        """)
        conn.commit()
    finally:
        conn.close()


def log_run(batch_id: int, phase: str, operator: str = "assistant", detail: str = "") -> None:
    conn = get_conn()
    try:
        conn.execute(
            "INSERT INTO run_records(batch_id, phase, operator, detail, created_at) VALUES(?,?,?,?,?)",
            (batch_id, phase, operator, detail, datetime.now().isoformat(timespec="seconds"))
        )
        conn.commit()
    finally:
        conn.close()


def create_batch(batch_tag: str, source_file: Optional[str] = None, remark: str = "") -> int:
    conn = get_conn()
    try:
        cur = conn.execute(
            "INSERT INTO batches(batch_tag, created_at, source_file, remark) VALUES(?,?,?,?)",
            (batch_tag, datetime.now().isoformat(timespec="seconds"), source_file, remark)
        )
        conn.commit()
        batch_id = cur.lastrowid
        log_run(batch_id, "create_batch", detail=f"tag={batch_tag}, source={source_file}")
        return batch_id
    finally:
        conn.close()


def list_batches() -> List[Dict[str, Any]]:
    conn = get_conn()
    try:
        rows = conn.execute("SELECT * FROM batches ORDER BY id DESC").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_batch(batch_id: int) -> Optional[Dict[str, Any]]:
    conn = get_conn()
    try:
        row = conn.execute("SELECT * FROM batches WHERE id=?", (batch_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_batch_by_tag(tag: str) -> Optional[Dict[str, Any]]:
    conn = get_conn()
    try:
        row = conn.execute("SELECT * FROM batches WHERE batch_tag=?", (tag,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def list_runs(batch_id: int) -> List[Dict[str, Any]]:
    conn = get_conn()
    try:
        rows = conn.execute(
            "SELECT * FROM run_records WHERE batch_id=? ORDER BY id ASC",
            (batch_id,)
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
