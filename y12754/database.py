import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chemical_audit.db')


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_conn()
    c = conn.cursor()

    c.execute('''
        CREATE TABLE IF NOT EXISTS reagents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            cas_no TEXT,
            formula TEXT,
            standard_concentration_min REAL,
            standard_concentration_max REAL,
            standard_ph_min REAL,
            standard_ph_max REAL,
            hazard_level TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS requisitions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            req_no TEXT UNIQUE NOT NULL,
            reagent_id INTEGER NOT NULL,
            reagent_name TEXT NOT NULL,
            concentration REAL NOT NULL,
            ph_value REAL,
            quantity REAL NOT NULL,
            unit TEXT DEFAULT 'g',
            project_group TEXT NOT NULL,
            applicant TEXT NOT NULL,
            apply_date TEXT NOT NULL,
            purpose TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT (datetime('now','localtime')),
            updated_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (reagent_id) REFERENCES reagents(id)
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS anomalies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            requisition_id INTEGER NOT NULL,
            anomaly_type TEXT NOT NULL,
            field_name TEXT,
            expected_value TEXT,
            actual_value TEXT,
            severity TEXT DEFAULT 'warning',
            action_type TEXT NOT NULL,
            description TEXT NOT NULL,
            is_resolved INTEGER DEFAULT 0,
            resolved_at TEXT,
            resolved_note TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (requisition_id) REFERENCES requisitions(id) ON DELETE CASCADE
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS safety_remarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            requisition_id INTEGER NOT NULL,
            remark_text TEXT NOT NULL,
            operator TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (requisition_id) REFERENCES requisitions(id) ON DELETE CASCADE
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            requisition_id INTEGER,
            action TEXT NOT NULL,
            detail TEXT,
            operator TEXT DEFAULT 'system',
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (requisition_id) REFERENCES requisitions(id) ON DELETE SET NULL
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS balance_calculations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            requisition_id INTEGER NOT NULL,
            version INTEGER NOT NULL DEFAULT 1,
            balance_result TEXT NOT NULL,
            concentration_deviation REAL,
            ph_deviation REAL,
            risk_score REAL,
            calculated_at TEXT DEFAULT (datetime('now','localtime')),
            remark_ids TEXT,
            FOREIGN KEY (requisition_id) REFERENCES requisitions(id) ON DELETE CASCADE
        )
    ''')

    conn.commit()
    conn.close()


def seed_sample_data():
    conn = get_conn()
    c = conn.cursor()

    c.execute("SELECT COUNT(*) FROM reagents")
    if c.fetchone()[0] > 0:
        conn.close()
        return

    reagents = [
        ('浓硫酸', '7664-93-9', 'H2SO4', 95.0, 98.0, 0.0, 1.0, '剧毒'),
        ('氢氧化钠', '1310-73-2', 'NaOH', 30.0, 50.0, 13.0, 14.0, '腐蚀'),
        ('盐酸', '7647-01-0', 'HCl', 36.0, 38.0, 0.0, 1.5, '腐蚀'),
        ('硝酸', '7697-37-2', 'HNO3', 65.0, 68.0, 0.0, 1.0, '氧化'),
        ('过氧化氢', '7722-84-1', 'H2O2', 28.0, 32.0, 3.5, 5.5, '氧化'),
    ]
    c.executemany('''
        INSERT INTO reagents (name, cas_no, formula, standard_concentration_min, standard_concentration_max,
                              standard_ph_min, standard_ph_max, hazard_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', reagents)

    conn.commit()
    conn.close()
