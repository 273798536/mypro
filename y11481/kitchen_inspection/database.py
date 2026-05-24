import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'kitchen.db')


def get_db_path():
    return DB_PATH


@contextmanager
def get_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                role TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS import_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_type TEXT NOT NULL,
                file_name TEXT,
                imported_by TEXT NOT NULL,
                imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'pending',
                total_rows INTEGER DEFAULT 0,
                valid_rows INTEGER DEFAULT 0,
                invalid_rows INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS raw_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                source_type TEXT NOT NULL,
                original_line_no INTEGER NOT NULL,
                raw_data TEXT NOT NULL,
                batch_no TEXT,
                store_id TEXT,
                record_date TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES import_sessions(id)
            );

            CREATE TABLE IF NOT EXISTS record_issues (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                record_id INTEGER NOT NULL,
                issue_type TEXT NOT NULL,
                issue_field TEXT,
                issue_description TEXT,
                severity TEXT DEFAULT 'error',
                status TEXT DEFAULT 'open',
                fixed_value TEXT,
                fixed_by TEXT,
                fixed_at TIMESTAMP,
                fix_note TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (record_id) REFERENCES raw_records(id)
            );

            CREATE TABLE IF NOT EXISTS sample_labels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                record_id INTEGER,
                batch_no TEXT,
                product_name TEXT,
                sample_time TEXT,
                sample_amount REAL,
                keeper TEXT,
                store_id TEXT,
                record_date TEXT,
                status TEXT DEFAULT 'active',
                verified_by TEXT,
                verified_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (record_id) REFERENCES raw_records(id)
            );

            CREATE TABLE IF NOT EXISTS temperature_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                record_id INTEGER,
                batch_no TEXT,
                store_id TEXT,
                measure_time TEXT,
                temperature REAL,
                measure_point TEXT,
                operator TEXT,
                record_date TEXT,
                status TEXT DEFAULT 'active',
                verified_by TEXT,
                verified_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (record_id) REFERENCES raw_records(id)
            );

            CREATE TABLE IF NOT EXISTS store_complaints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                record_id INTEGER,
                complaint_no TEXT,
                store_id TEXT,
                batch_no TEXT,
                product_name TEXT,
                complaint_type TEXT,
                complaint_desc TEXT,
                complaint_amount INTEGER,
                complaint_date TEXT,
                handler TEXT,
                handle_result TEXT,
                handle_date TEXT,
                status TEXT DEFAULT 'active',
                verified_by TEXT,
                verified_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (record_id) REFERENCES raw_records(id)
            );

            CREATE TABLE IF NOT EXISTS batch_tracking (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_no TEXT NOT NULL,
                source_type TEXT NOT NULL,
                store_id TEXT,
                record_id INTEGER,
                linked_batch_no TEXT,
                tracking_type TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_sample_labels_batch ON sample_labels(batch_no);
            CREATE INDEX IF NOT EXISTS idx_sample_labels_store ON sample_labels(store_id);
            CREATE INDEX IF NOT EXISTS idx_temp_batch ON temperature_records(batch_no);
            CREATE INDEX IF NOT EXISTS idx_temp_store ON temperature_records(store_id);
            CREATE INDEX IF NOT EXISTS idx_complaint_batch ON store_complaints(batch_no);
            CREATE INDEX IF NOT EXISTS idx_complaint_store ON store_complaints(store_id);
            CREATE INDEX IF NOT EXISTS idx_batch_tracking ON batch_tracking(batch_no);
            CREATE INDEX IF NOT EXISTS idx_raw_records_batch ON raw_records(batch_no);
        """)

        cursor.execute("SELECT COUNT(*) as cnt FROM users")
        if cursor.fetchone()['cnt'] == 0:
            cursor.executemany("""
                INSERT INTO users (username, role) VALUES (?, ?)
            """, [
                ('admin', 'supervisor'),
                ('operator1', 'entry'),
                ('reviewer1', 'reviewer'),
                ('viewer1', 'readonly')
            ])
