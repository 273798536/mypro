import sqlite3
import os
from contextlib import contextmanager

DEFAULT_DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "neg_sample_tracker.db"
)


def get_db(db_path=None):
    if db_path is None:
        db_path = DEFAULT_DB_PATH
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def get_db_cursor(db_path=None):
    conn = get_db(db_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db(db_path=None):
    with get_db_cursor(db_path) as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT NOT NULL UNIQUE,
            model_version TEXT,
            data_source TEXT,
            raw_snapshot_path TEXT,
            status TEXT NOT NULL DEFAULT 'reviewing',
            status_reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS feature_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT NOT NULL,
            feature_name TEXT NOT NULL,
            feature_value TEXT,
            raw_value TEXT,
            data_source TEXT,
            is_raw_dirty INTEGER DEFAULT 0,
            snapshot_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (run_id) REFERENCES runs(run_id)
        );

        CREATE INDEX IF NOT EXISTS idx_feature_snapshots_run_id
            ON feature_snapshots(run_id);

        CREATE TABLE IF NOT EXISTS param_changes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT NOT NULL,
            param_name TEXT NOT NULL,
            old_value TEXT,
            new_value TEXT,
            change_reason TEXT,
            change_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (run_id) REFERENCES runs(run_id)
        );

        CREATE INDEX IF NOT EXISTS idx_param_changes_run_id
            ON param_changes(run_id);

        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT NOT NULL UNIQUE,
            report_content TEXT,
            feature_summary TEXT,
            param_summary TEXT,
            conclusion TEXT,
            action_items TEXT,
            generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (run_id) REFERENCES runs(run_id)
        );

        CREATE TABLE IF NOT EXISTS manual_decisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT NOT NULL,
            decision TEXT NOT NULL,
            decision_note TEXT,
            decided_by TEXT,
            model_version_snapshot TEXT,
            prev_decision_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (run_id) REFERENCES runs(run_id),
            FOREIGN KEY (prev_decision_id) REFERENCES manual_decisions(id)
        );

        CREATE INDEX IF NOT EXISTS idx_manual_decisions_run_id
            ON manual_decisions(run_id);

        CREATE TABLE IF NOT EXISTS run_conflicts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT NOT NULL,
            conflict_type TEXT NOT NULL,
            conflict_detail TEXT,
            resolved INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (run_id) REFERENCES runs(run_id)
        );

        CREATE INDEX IF NOT EXISTS idx_run_conflicts_run_id
            ON run_conflicts(run_id);
        """)
