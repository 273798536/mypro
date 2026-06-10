import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dissolution.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def db_session():
    conn = get_db()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


STATUS_PENDING = "待复核"
STATUS_IN_PROGRESS = "复核中"
STATUS_PASSED = "通过"
STATUS_FAILED = "不通过"


def init_db():
    with db_session() as conn:
        c = conn.cursor()

        c.execute(
            """
            CREATE TABLE IF NOT EXISTS dissolution_batches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_no TEXT UNIQUE NOT NULL,
                run_index INTEGER NOT NULL DEFAULT 1,
                imported_at TEXT NOT NULL,
                imported_by TEXT DEFAULT '操作人',
                source_file TEXT,
                remark TEXT,
                overall_status TEXT DEFAULT '待复核',
                created_at TEXT NOT NULL
            )
            """
        )

        c.execute(
            """
            CREATE TABLE IF NOT EXISTS dissolution_samples (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id INTEGER NOT NULL,
                sample_no TEXT NOT NULL,
                product_name TEXT,
                batch_number TEXT,
                test_date TEXT,
                analyst TEXT,
                weighing_value REAL,
                weighing_unit TEXT,
                weighing_precision_ok INTEGER DEFAULT 1,
                medium TEXT,
                temperature REAL,
                rotation_speed REAL,
                time_points TEXT,
                dissolution_data TEXT,
                spectrum_data TEXT,
                fill_remark TEXT,
                missing_fields TEXT,
                old_format INTEGER DEFAULT 0,
                review_status TEXT DEFAULT '待复核',
                reviewer TEXT,
                reviewed_at TEXT,
                review_comment TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (batch_id) REFERENCES dissolution_batches(id) ON DELETE CASCADE
            )
            """
        )

        c.execute(
            """
            CREATE TABLE IF NOT EXISTS temperature_curves (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sample_id INTEGER NOT NULL,
                time_min REAL NOT NULL,
                temperature_c REAL NOT NULL,
                is_anomaly INTEGER DEFAULT 0,
                anomaly_note TEXT,
                FOREIGN KEY (sample_id) REFERENCES dissolution_samples(id) ON DELETE CASCADE
            )
            """
        )

        c.execute(
            """
            CREATE TABLE IF NOT EXISTS review_findings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sample_id INTEGER NOT NULL,
                finding_type TEXT NOT NULL,
                severity TEXT DEFAULT 'warning',
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                field_ref TEXT,
                raw_value TEXT,
                suggestion TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (sample_id) REFERENCES dissolution_samples(id) ON DELETE CASCADE
            )
            """
        )

        c.execute(
            """
            CREATE TABLE IF NOT EXISTS safety_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id INTEGER NOT NULL,
                sample_id INTEGER,
                alert_type TEXT NOT NULL,
                severity TEXT DEFAULT 'warning',
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                linked_finding_id INTEGER,
                acknowledged INTEGER DEFAULT 0,
                acknowledged_by TEXT,
                acknowledged_at TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (batch_id) REFERENCES dissolution_batches(id) ON DELETE CASCADE,
                FOREIGN KEY (sample_id) REFERENCES dissolution_samples(id) ON DELETE CASCADE
            )
            """
        )

        c.execute(
            """
            CREATE TABLE IF NOT EXISTS status_audit (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id INTEGER,
                sample_id INTEGER,
                from_status TEXT,
                to_status TEXT NOT NULL,
                operator TEXT DEFAULT '操作人',
                comment TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (batch_id) REFERENCES dissolution_batches(id) ON DELETE SET NULL,
                FOREIGN KEY (sample_id) REFERENCES dissolution_samples(id) ON DELETE SET NULL
            )
            """
        )


def generate_batch_no():
    now = datetime.now()
    date_part = now.strftime("%Y%m%d")
    with db_session() as conn:
        c = conn.cursor()
        c.execute(
            "SELECT COUNT(*) FROM dissolution_batches WHERE batch_no LIKE ?",
            (f"DR{date_part}%",),
        )
        seq = c.fetchone()[0] + 1
    return f"DR{date_part}{seq:03d}"


def get_next_run_index():
    with db_session() as conn:
        c = conn.cursor()
        c.execute("SELECT COALESCE(MAX(run_index), 0) + 1 FROM dissolution_batches")
        return c.fetchone()[0]
