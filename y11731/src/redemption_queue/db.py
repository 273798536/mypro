"""数据库层：SQLite连接与表结构初始化。"""

from __future__ import annotations

import sqlite3
from pathlib import Path
from contextlib import contextmanager

DB_FILE = "redemption_queue.db"
SCHEMA = """
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS open_days (
    id INTEGER PRIMARY KEY,
    product_code TEXT NOT NULL,
    open_date TEXT NOT NULL,
    source TEXT NOT NULL,
    note TEXT,
    FOREIGN KEY (product_code) REFERENCES products(code),
    UNIQUE(product_code, open_date)
);

CREATE TABLE IF NOT EXISTS share_balances (
    id INTEGER PRIMARY KEY,
    product_code TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0,
    locked REAL NOT NULL DEFAULT 0,
    snapshot_date TEXT NOT NULL,
    source TEXT NOT NULL,
    FOREIGN KEY (product_code) REFERENCES products(code),
    UNIQUE(product_code, customer_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS redemption_orders (
    id INTEGER PRIMARY KEY,
    order_no TEXT NOT NULL UNIQUE,
    product_code TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    amount REAL NOT NULL,
    apply_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    is_open_day INTEGER NOT NULL DEFAULT 1,
    is_large_redemption INTEGER NOT NULL DEFAULT 0,
    defer_count INTEGER NOT NULL DEFAULT 0,
    next_process_date TEXT,
    source TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cancellation_records (
    id INTEGER PRIMARY KEY,
    order_no TEXT NOT NULL,
    cancel_date TEXT NOT NULL,
    reason TEXT,
    source TEXT NOT NULL,
    FOREIGN KEY (order_no) REFERENCES redemption_orders(order_no)
);

CREATE TABLE IF NOT EXISTS arrival_reports (
    id INTEGER PRIMARY KEY,
    order_no TEXT NOT NULL,
    arrive_date TEXT NOT NULL,
    arrive_amount REAL NOT NULL,
    source TEXT NOT NULL,
    FOREIGN KEY (order_no) REFERENCES redemption_orders(order_no)
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    operator TEXT NOT NULL DEFAULT 'SYSTEM',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON redemption_orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_product ON redemption_orders(product_code, customer_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
"""


def get_db_path() -> Path:
    return Path(DB_FILE).resolve()


@contextmanager
def get_conn():
    conn = sqlite3.connect(str(get_db_path()))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_conn() as conn:
        conn.executescript(SCHEMA)
