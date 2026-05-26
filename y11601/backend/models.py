import sqlite3
import json
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'margin_system.db')


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_connection()
    c = conn.cursor()

    c.executescript("""
        CREATE TABLE IF NOT EXISTS contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            underlying TEXT NOT NULL,
            option_type TEXT NOT NULL CHECK(option_type IN ('CALL','PUT')),
            strike REAL NOT NULL,
            expiry_date TEXT NOT NULL,
            multiplier REAL NOT NULL DEFAULT 10000,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS positions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account TEXT NOT NULL,
            contract_code TEXT NOT NULL,
            direction TEXT NOT NULL CHECK(direction IN ('LONG','SHORT')),
            quantity INTEGER NOT NULL,
            open_price REAL NOT NULL,
            open_date TEXT NOT NULL DEFAULT (datetime('now')),
            source TEXT NOT NULL DEFAULT 'manual',
            note TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(contract_code) REFERENCES contracts(code)
        );

        CREATE TABLE IF NOT EXISTS quotes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contract_code TEXT NOT NULL,
            price REAL NOT NULL,
            iv REAL NOT NULL,
            delta REAL NOT NULL,
            gamma REAL NOT NULL,
            vega REAL NOT NULL,
            theta REAL NOT NULL,
            spot_price REAL NOT NULL,
            timestamp TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(contract_code) REFERENCES contracts(code)
        );

        CREATE TABLE IF NOT EXISTS margin_calculations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            position_id INTEGER NOT NULL,
            quote_id INTEGER NOT NULL,
            required_margin REAL NOT NULL,
            available_margin REAL NOT NULL DEFAULT 0,
            margin_ratio REAL NOT NULL,
            risk_level TEXT NOT NULL CHECK(risk_level IN ('SAFE','WARNING','DANGER','CRITICAL')),
            iv_jump_detected INTEGER NOT NULL DEFAULT 0,
            iv_jump_pct REAL,
            combo_offset_applied INTEGER NOT NULL DEFAULT 0,
            combo_offset_amount REAL NOT NULL DEFAULT 0,
            raw_calculation TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(position_id) REFERENCES positions(id),
            FOREIGN KEY(quote_id) REFERENCES quotes(id)
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            margin_calc_id INTEGER NOT NULL,
            account TEXT NOT NULL,
            contract_code TEXT NOT NULL,
            required_amount REAL NOT NULL,
            current_margin REAL NOT NULL,
            shortfall REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','SENT','ACKNOWLEDGED','RESOLVED','CANCELLED')),
            dedup_key TEXT NOT NULL,
            is_duplicate INTEGER NOT NULL DEFAULT 0,
            duplicate_of INTEGER,
            channel TEXT NOT NULL DEFAULT 'SYSTEM',
            sent_at TEXT,
            acknowledged_at TEXT,
            resolved_at TEXT,
            note TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(margin_calc_id) REFERENCES margin_calculations(id),
            FOREIGN KEY(duplicate_of) REFERENCES notifications(id)
        );

        CREATE TABLE IF NOT EXISTS margin_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            notification_id INTEGER,
            account TEXT NOT NULL,
            action_type TEXT NOT NULL CHECK(action_type IN ('DEPOSIT','CLOSE','OFFSET','MANUAL_ADJUST','REJECT')),
            amount REAL NOT NULL,
            detail TEXT,
            operator TEXT NOT NULL DEFAULT 'system',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(notification_id) REFERENCES notifications(id)
        );

        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_type TEXT NOT NULL,
            entity_id INTEGER,
            action TEXT NOT NULL,
            before_data TEXT,
            after_data TEXT,
            operator TEXT NOT NULL DEFAULT 'system',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS risk_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_type TEXT NOT NULL,
            period TEXT NOT NULL,
            generated_at TEXT NOT NULL DEFAULT (datetime('now')),
            summary TEXT NOT NULL,
            data TEXT NOT NULL,
            operator TEXT NOT NULL DEFAULT 'system'
        );

        CREATE INDEX IF NOT EXISTS idx_positions_account ON positions(account);
        CREATE INDEX IF NOT EXISTS idx_quotes_contract_time ON quotes(contract_code, timestamp);
        CREATE INDEX IF NOT EXISTS idx_margin_calc_risk ON margin_calculations(risk_level);
        CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
        CREATE INDEX IF NOT EXISTS idx_notifications_dedup ON notifications(dedup_key, status);
        CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
    """)

    conn.commit()
    conn.close()


def audit(entity_type, entity_id, action, before_data=None, after_data=None, operator='system'):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "INSERT INTO audit_log (entity_type, entity_id, action, before_data, after_data, operator) VALUES (?, ?, ?, ?, ?, ?)",
        (entity_type, entity_id, action, json.dumps(before_data, ensure_ascii=False), json.dumps(after_data, ensure_ascii=False), operator)
    )
    conn.commit()
    conn.close()
