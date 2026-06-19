import sqlite3
import os
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "vector_index_tracker.db"


def get_connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS models (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model_name TEXT NOT NULL,
            model_version TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(model_name, model_version)
        );

        CREATE TABLE IF NOT EXISTS eval_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model_id INTEGER NOT NULL,
            run_name TEXT NOT NULL,
            threshold REAL NOT NULL,
            dataset_name TEXT,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE,
            UNIQUE(model_id, run_name)
        );

        CREATE TABLE IF NOT EXISTS eval_samples (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id INTEGER NOT NULL,
            sample_id TEXT NOT NULL,
            query_text TEXT,
            expected_result TEXT,
            actual_result TEXT,
            score REAL NOT NULL,
            predicted_label INTEGER NOT NULL,
            true_label INTEGER NOT NULL,
            is_boundary INTEGER DEFAULT 0,
            source_file TEXT,
            source_row INTEGER,
            raw_object TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (run_id) REFERENCES eval_runs(id) ON DELETE CASCADE,
            UNIQUE(run_id, sample_id)
        );

        CREATE TABLE IF NOT EXISTS manual_judgments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sample_global_id TEXT NOT NULL,
            sample_id TEXT NOT NULL,
            judge_label INTEGER NOT NULL,
            judge_reason TEXT,
            judge_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(sample_global_id)
        );

        CREATE TABLE IF NOT EXISTS contamination_flags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sample_id INTEGER NOT NULL,
            run_id INTEGER NOT NULL,
            contamination_type TEXT NOT NULL,
            description TEXT,
            flagged_by TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sample_id) REFERENCES eval_samples(id) ON DELETE CASCADE,
            FOREIGN KEY (run_id) REFERENCES eval_runs(id) ON DELETE CASCADE,
            UNIQUE(sample_id)
        );

        CREATE TABLE IF NOT EXISTS run_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id INTEGER NOT NULL,
            metric_name TEXT NOT NULL,
            metric_value REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (run_id) REFERENCES eval_runs(id) ON DELETE CASCADE,
            UNIQUE(run_id, metric_name)
        );
    """)

    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    print(f"Database initialized at {DB_PATH}")
