"""数据库连接和初始化模块"""
import sqlite3
import json
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple

DEFAULT_DB_PATH = Path(__file__).parent.parent / "cc_dispute.db"

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS trust_receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_no TEXT NOT NULL,
    source_file TEXT NOT NULL,
    raw_content TEXT NOT NULL,
    card_no TEXT,
    dispute_amount REAL,
    dispute_date TEXT,
    approver_name TEXT,
    original_approver_name TEXT,
    imported_at TEXT NOT NULL,
    is_dirty INTEGER NOT NULL DEFAULT 0,
    dirty_fields TEXT,
    UNIQUE(receipt_no, source_file)
);

CREATE TABLE IF NOT EXISTS approvers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    current_name TEXT NOT NULL UNIQUE,
    previous_names TEXT DEFAULT '[]',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dispute_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trust_receipt_id INTEGER NOT NULL,
    card_no TEXT,
    dispute_amount REAL,
    dispute_date TEXT,
    approver_id INTEGER,
    approver_name_snapshot TEXT,
    conclusion TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    is_suspended INTEGER NOT NULL DEFAULT 0,
    suspend_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (trust_receipt_id) REFERENCES trust_receipts(id),
    FOREIGN KEY (approver_id) REFERENCES approvers(id)
);

CREATE TABLE IF NOT EXISTS manual_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dispute_record_id INTEGER NOT NULL,
    note_content TEXT NOT NULL,
    operator TEXT NOT NULL,
    created_at TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_by TEXT,
    deleted_at TEXT,
    FOREIGN KEY (dispute_record_id) REFERENCES dispute_records(id)
);

CREATE TABLE IF NOT EXISTS history_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dispute_record_id INTEGER NOT NULL,
    old_conclusion TEXT,
    new_conclusion TEXT,
    old_materials TEXT,
    new_note TEXT,
    change_reason TEXT NOT NULL,
    operator TEXT NOT NULL,
    changed_at TEXT NOT NULL,
    FOREIGN KEY (dispute_record_id) REFERENCES dispute_records(id)
);

CREATE INDEX IF NOT EXISTS idx_dispute_status ON dispute_records(status);
CREATE INDEX IF NOT EXISTS idx_dispute_suspended ON dispute_records(is_suspended);
CREATE INDEX IF NOT EXISTS idx_notes_record ON manual_notes(dispute_record_id);
CREATE INDEX IF NOT EXISTS idx_history_record ON history_changes(dispute_record_id);
"""

RECORD_STATUS = {
    "PENDING": "待处理",
    "CONFIRMED": "已处理",
    "SUSPENDED": "挂起待确认",
    "NEED_EVIDENCE": "待补证据"
}


class DatabaseError(Exception):
    """数据库操作异常基类"""
    pass


class Database:
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = Path(db_path) if db_path else DEFAULT_DB_PATH
        self._conn: Optional[sqlite3.Connection] = None

    def _get_connection(self) -> sqlite3.Connection:
        if self._conn is None:
            self._conn = sqlite3.connect(str(self.db_path))
            self._conn.row_factory = sqlite3.Row
            self._conn.execute("PRAGMA foreign_keys = ON")
        return self._conn

    @contextmanager
    def transaction(self):
        conn = self._get_connection()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise

    def close(self):
        if self._conn:
            self._conn.close()
            self._conn = None

    def initialize(self) -> None:
        with self.transaction() as conn:
            conn.executescript(CREATE_TABLES_SQL)

    def now_str(self) -> str:
        return datetime.now().isoformat(timespec="seconds")
