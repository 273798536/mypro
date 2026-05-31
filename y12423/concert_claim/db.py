import sqlite3
import json
import os
from pathlib import Path

DB_PATH = os.environ.get("CONCERT_CLAIM_DB", str(Path(__file__).parent.parent / "concert_claim.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS policy_clauses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clause_code TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL,
    deductible_rate REAL NOT NULL DEFAULT 0.0,
    cross_city_clause TEXT DEFAULT '',
    effective_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    is_current INTEGER NOT NULL DEFAULT 1,
    UNIQUE(clause_code, version)
);

CREATE TABLE IF NOT EXISTS ticket_refunds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    concert_name TEXT NOT NULL,
    refund_amount REAL NOT NULL,
    refund_reason TEXT NOT NULL,
    ticket_count INTEGER NOT NULL DEFAULT 0,
    clause_code TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS venue_contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    concert_name TEXT NOT NULL,
    venue_name TEXT NOT NULL,
    rent_amount REAL NOT NULL,
    contract_terms TEXT NOT NULL,
    penalty_rate REAL NOT NULL DEFAULT 0.0,
    clause_code TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS compensation_calculations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    concert_name TEXT NOT NULL,
    ticket_refund_id INTEGER NOT NULL,
    venue_contract_id INTEGER NOT NULL,
    clause_code TEXT NOT NULL,
    clause_version INTEGER NOT NULL,
    gross_loss REAL NOT NULL,
    deductible_amount REAL NOT NULL,
    deductible_correct INTEGER NOT NULL DEFAULT 1,
    cross_city_delay INTEGER NOT NULL DEFAULT 0,
    cross_city_delay_reason TEXT DEFAULT '',
    deductible_misapply_reason TEXT DEFAULT '',
    net_compensation REAL NOT NULL,
    old_gross_loss REAL,
    old_deductible_amount REAL,
    old_net_compensation REAL,
    result_diff TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (ticket_refund_id) REFERENCES ticket_refunds(id),
    FOREIGN KEY (venue_contract_id) REFERENCES venue_contracts(id)
);

CREATE TABLE IF NOT EXISTS dispute_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    calculation_id INTEGER NOT NULL,
    note_content TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT 'system',
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (calculation_id) REFERENCES compensation_calculations(id)
);

CREATE TABLE IF NOT EXISTS report_exports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    calculation_id INTEGER NOT NULL,
    report_data TEXT NOT NULL,
    cross_city_delay_affected INTEGER NOT NULL DEFAULT 0,
    deductible_misapplied INTEGER NOT NULL DEFAULT 0,
    impact_reasons TEXT DEFAULT '[]',
    clause_version_at_export TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (calculation_id) REFERENCES compensation_calculations(id)
);

CREATE TABLE IF NOT EXISTS record_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    old_values TEXT NOT NULL,
    new_values TEXT NOT NULL,
    changed_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
"""

def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    conn = get_conn()
    conn.executescript(SCHEMA)
    conn.close()

def row_to_dict(row: sqlite3.Row) -> dict:
    if row is None:
        return None
    d = dict(row)
    for k, v in d.items():
        if isinstance(v, str):
            try:
                d[k] = json.loads(v)
            except (json.JSONDecodeError, ValueError):
                pass
    return d

def snapshot_change(conn: sqlite3.Connection, entity_type: str, entity_id: int, old_values: dict, new_values: dict):
    conn.execute(
        "INSERT INTO record_snapshots (entity_type, entity_id, old_values, new_values) VALUES (?, ?, ?, ?)",
        (entity_type, entity_id, json.dumps(old_values, ensure_ascii=False), json.dumps(new_values, ensure_ascii=False))
    )
