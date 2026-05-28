import sqlite3
import json
from pathlib import Path

DB_PATH = Path(__file__).parent / "waterfall.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS funds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    total_commitment REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS investors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fund_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    share_percentage REAL NOT NULL,
    commitment_amount REAL NOT NULL,
    investor_type TEXT NOT NULL DEFAULT 'lp',
    FOREIGN KEY (fund_id) REFERENCES funds(id)
);

CREATE TABLE IF NOT EXISTS distribution_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fund_id INTEGER NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    effective_date TEXT NOT NULL,
    preferred_return_rate REAL NOT NULL DEFAULT 0.08,
    catch_up_rate REAL NOT NULL DEFAULT 1.0,
    carried_interest_rate REAL NOT NULL DEFAULT 0.20,
    residual_split_gp REAL NOT NULL DEFAULT 0.20,
    residual_split_lp REAL NOT NULL DEFAULT 0.80,
    hurdle_tiers TEXT NOT NULL DEFAULT '[]',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (fund_id) REFERENCES funds(id)
);

CREATE TABLE IF NOT EXISTS co_investments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    investor_id INTEGER NOT NULL,
    fund_id INTEGER NOT NULL,
    co_invest_amount REAL NOT NULL,
    discount_rate REAL NOT NULL DEFAULT 0.0,
    batch_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (investor_id) REFERENCES investors(id),
    FOREIGN KEY (fund_id) REFERENCES funds(id)
);

CREATE TABLE IF NOT EXISTS distributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fund_id INTEGER NOT NULL,
    rule_id INTEGER NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (fund_id) REFERENCES funds(id),
    FOREIGN KEY (rule_id) REFERENCES distribution_rules(id)
);

CREATE TABLE IF NOT EXISTS waterfall_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    distribution_id INTEGER NOT NULL,
    step_order INTEGER NOT NULL,
    step_type TEXT NOT NULL,
    total_amount REAL NOT NULL DEFAULT 0.0,
    description TEXT,
    FOREIGN KEY (distribution_id) REFERENCES distributions(id)
);

CREATE TABLE IF NOT EXISTS distribution_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    distribution_id INTEGER NOT NULL,
    waterfall_step_id INTEGER NOT NULL,
    investor_id INTEGER NOT NULL,
    amount REAL NOT NULL DEFAULT 0.0,
    percentage REAL NOT NULL DEFAULT 0.0,
    is_co_invest INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (distribution_id) REFERENCES distributions(id),
    FOREIGN KEY (waterfall_step_id) REFERENCES waterfall_steps(id),
    FOREIGN KEY (investor_id) REFERENCES investors(id)
);

CREATE TABLE IF NOT EXISTS pending_confirmations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    distribution_id INTEGER NOT NULL,
    investor_id INTEGER NOT NULL,
    reason_type TEXT NOT NULL,
    reason_detail TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    next_action TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT,
    FOREIGN KEY (distribution_id) REFERENCES distributions(id),
    FOREIGN KEY (investor_id) REFERENCES investors(id)
);

CREATE TABLE IF NOT EXISTS dispute_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    distribution_id INTEGER NOT NULL,
    investor_id INTEGER,
    note TEXT NOT NULL,
    created_by TEXT NOT NULL DEFAULT 'system',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (distribution_id) REFERENCES distributions(id),
    FOREIGN KEY (investor_id) REFERENCES investors(id)
);

CREATE TABLE IF NOT EXISTS rule_change_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id INTEGER NOT NULL,
    from_version INTEGER NOT NULL,
    to_version INTEGER NOT NULL,
    change_detail TEXT,
    changed_by TEXT NOT NULL DEFAULT 'system',
    changed_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (rule_id) REFERENCES distribution_rules(id)
);
"""


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_conn()
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()
