"""内部元数据数据库，用于存储快照历史、迁移记录、审计日志等。"""
import sqlite3
import os
from contextlib import contextmanager
from datetime import datetime

from .config import get_config


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    UNIQUE(name, version)
);

CREATE TABLE IF NOT EXISTS migration_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    migration_name TEXT NOT NULL,
    batch_id TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    duration_ms INTEGER,
    error_message TEXT,
    created_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS migration_status (
    migration_name TEXT PRIMARY KEY,
    current_status TEXT NOT NULL,
    last_run_id INTEGER,
    slow_query_cause TEXT,
    slow_query_cause_changed_at TEXT,
    slow_query_cause_changed_by TEXT,
    previous_slow_query_cause TEXT,
    page_order_unstable INTEGER DEFAULT 0,
    page_order_reviewed_by TEXT,
    page_order_reviewed_at TEXT,
    page_order_review_reason TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    operator TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lock_wait_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    migration_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    wait_seconds REAL NOT NULL,
    detected_at TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_migration_runs_batch ON migration_runs(batch_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_name ON snapshots(name);
"""


def get_db_path() -> str:
    """获取元数据库路径。"""
    cfg = get_config()
    return cfg.db_path


def init_db():
    """初始化元数据库表结构。"""
    db_path = get_db_path()
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    with get_conn() as conn:
        conn.executescript(SCHEMA_SQL)


@contextmanager
def get_conn():
    """获取数据库连接上下文。"""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def now_iso() -> str:
    """返回当前 ISO 格式时间字符串。"""
    return datetime.now().isoformat(timespec="seconds")
