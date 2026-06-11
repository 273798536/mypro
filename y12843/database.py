import sqlite3
import json
from datetime import datetime
from typing import Optional, List, Dict, Any

DB_PATH = 'blood_test.db'

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()

    c.executescript('''
    CREATE TABLE IF NOT EXISTS sample_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_no TEXT UNIQUE NOT NULL,
        group_name TEXT NOT NULL,
        collect_date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reagent_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reagent_no TEXT UNIQUE NOT NULL,
        reagent_name TEXT NOT NULL,
        manufacturer TEXT,
        expire_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS culture_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_batch_id INTEGER NOT NULL,
        sample_no TEXT NOT NULL,
        patient_id TEXT,
        culture_type TEXT NOT NULL,
        culture_date TEXT NOT NULL,
        reagent_batch_id INTEGER,
        incubator_temp REAL,
        incubator_humidity REAL,
        culture_result TEXT,
        raw_data_path TEXT,
        source_file TEXT NOT NULL,
        source_import_session_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sample_batch_id) REFERENCES sample_batches(id),
        FOREIGN KEY (reagent_batch_id) REFERENCES reagent_batches(id),
        UNIQUE(sample_no, culture_date, culture_type)
    );

    CREATE TABLE IF NOT EXISTS sequencing_reads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        culture_record_id INTEGER NOT NULL,
        read_id TEXT NOT NULL,
        quality_score REAL NOT NULL,
        is_low_quality INTEGER DEFAULT 0,
        low_quality_reason TEXT,
        sequence TEXT,
        gc_content REAL,
        FOREIGN KEY (culture_record_id) REFERENCES culture_records(id)
    );

    CREATE TABLE IF NOT EXISTS micrographs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        culture_record_id INTEGER NOT NULL,
        image_path TEXT NOT NULL,
        capture_time TEXT,
        magnification TEXT,
        annotation TEXT,
        FOREIGN KEY (culture_record_id) REFERENCES culture_records(id)
    );

    CREATE TABLE IF NOT EXISTS import_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_file TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        import_time TEXT DEFAULT CURRENT_TIMESTAMP,
        operator TEXT,
        total_records INTEGER DEFAULT 0,
        new_records INTEGER DEFAULT 0,
        duplicate_records INTEGER DEFAULT 0,
        low_quality_records INTEGER DEFAULT 0,
        notes TEXT
    );

    CREATE TABLE IF NOT EXISTS review_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_batch_id INTEGER NOT NULL,
        session_name TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending',
        reviewed_at TEXT,
        reviewer TEXT,
        FOREIGN KEY (sample_batch_id) REFERENCES sample_batches(id)
    );

    CREATE TABLE IF NOT EXISTS review_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        review_session_id INTEGER NOT NULL,
        culture_record_id INTEGER NOT NULL,
        has_low_quality INTEGER DEFAULT 0,
        low_quality_reads_count INTEGER DEFAULT 0,
        reagent_batch_no TEXT,
        micrograph_count INTEGER DEFAULT 0,
        needs_review INTEGER DEFAULT 1,
        review_notes TEXT,
        review_result TEXT,
        reviewed_at TEXT,
        reviewer TEXT,
        FOREIGN KEY (review_session_id) REFERENCES review_sessions(id),
        FOREIGN KEY (culture_record_id) REFERENCES culture_records(id),
        UNIQUE(review_session_id, culture_record_id)
    );

    CREATE TABLE IF NOT EXISTS quality_control (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        review_item_id INTEGER,
        culture_record_id INTEGER NOT NULL,
        qc_type TEXT NOT NULL,
        qc_result TEXT NOT NULL,
        qc_notes TEXT,
        qc_date TEXT DEFAULT CURRENT_TIMESTAMP,
        operator TEXT,
        FOREIGN KEY (review_item_id) REFERENCES review_items(id),
        FOREIGN KEY (culture_record_id) REFERENCES culture_records(id)
    );

    CREATE TABLE IF NOT EXISTS conclusions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        review_item_id INTEGER NOT NULL,
        culture_record_id INTEGER NOT NULL,
        conclusion_text TEXT NOT NULL,
        conclusion_type TEXT NOT NULL,
        retest_needed INTEGER DEFAULT 0,
        retest_reason TEXT,
        final_decision TEXT,
        decided_at TEXT DEFAULT CURRENT_TIMESTAMP,
        decided_by TEXT,
        is_active INTEGER DEFAULT 1,
        superseded_by INTEGER,
        FOREIGN KEY (review_item_id) REFERENCES review_items(id),
        FOREIGN KEY (culture_record_id) REFERENCES culture_records(id),
        FOREIGN KEY (superseded_by) REFERENCES conclusions(id)
    );

    CREATE TABLE IF NOT EXISTS audit_trail (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        old_values TEXT,
        new_values TEXT,
        operator TEXT,
        operation_time TEXT DEFAULT CURRENT_TIMESTAMP,
        import_session_id INTEGER,
        FOREIGN KEY (import_session_id) REFERENCES import_sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_culture_sample_batch ON culture_records(sample_batch_id);
    CREATE INDEX IF NOT EXISTS idx_culture_reagent ON culture_records(reagent_batch_id);
    CREATE INDEX IF NOT EXISTS idx_reads_low_quality ON sequencing_reads(is_low_quality);
    CREATE INDEX IF NOT EXISTS idx_reads_culture ON sequencing_reads(culture_record_id);
    CREATE INDEX IF NOT EXISTS idx_review_batch ON review_sessions(sample_batch_id);
    CREATE INDEX IF NOT EXISTS idx_conclusions_active ON conclusions(is_active);
    CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_trail(table_name, record_id);
    ''')

    conn.commit()
    conn.close()

def log_audit(conn, table_name: str, record_id: int, action: str,
              old_values: Optional[Dict] = None, new_values: Optional[Dict] = None,
              operator: str = 'system', import_session_id: Optional[int] = None):
    c = conn.cursor()
    c.execute('''
        INSERT INTO audit_trail
        (table_name, record_id, action, old_values, new_values, operator, import_session_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        table_name, record_id, action,
        json.dumps(old_values, ensure_ascii=False) if old_values else None,
        json.dumps(new_values, ensure_ascii=False) if new_values else None,
        operator, import_session_id
    ))

def row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    if row is None:
        return None
    return {key: row[key] for key in row.keys()}

def rows_to_dict_list(rows: List[sqlite3.Row]) -> List[Dict[str, Any]]:
    return [row_to_dict(r) for r in rows]
