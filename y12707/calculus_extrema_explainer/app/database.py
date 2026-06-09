import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "calculus_extrema.db")


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        c = conn.cursor()

        c.execute("""
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_code TEXT UNIQUE NOT NULL,
                student_name TEXT,
                class_name TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)

        c.execute("""
            CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question_code TEXT UNIQUE NOT NULL,
                question_text TEXT NOT NULL,
                correct_answer REAL,
                correct_derivative TEXT,
                critical_points TEXT,
                has_zero_division_risk INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)

        c.execute("""
            CREATE TABLE IF NOT EXISTS wrong_answers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                question_id INTEGER NOT NULL,
                student_answer REAL,
                student_derivative TEXT,
                student_work TEXT,
                historical_score REAL,
                historical_score_missing INTEGER DEFAULT 0,
                answered_at TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (student_id) REFERENCES students(id),
                FOREIGN KEY (question_id) REFERENCES questions(id),
                UNIQUE(student_id, question_id)
            )
        """)

        c.execute("""
            CREATE TABLE IF NOT EXISTS processing_batches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_code TEXT UNIQUE NOT NULL,
                batch_name TEXT,
                status TEXT DEFAULT 'pending',
                total_records INTEGER DEFAULT 0,
                processed_records INTEGER DEFAULT 0,
                missing_gaps INTEGER DEFAULT 0,
                anomalies_count INTEGER DEFAULT 0,
                started_at TEXT,
                finished_at TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)

        c.execute("""
            CREATE TABLE IF NOT EXISTS batch_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id INTEGER NOT NULL,
                wrong_answer_id INTEGER NOT NULL,
                process_status TEXT DEFAULT 'pending',
                zero_division_boundary TEXT,
                boundary_valid INTEGER,
                processed_at TEXT,
                FOREIGN KEY (batch_id) REFERENCES processing_batches(id),
                FOREIGN KEY (wrong_answer_id) REFERENCES wrong_answers(id),
                UNIQUE(batch_id, wrong_answer_id)
            )
        """)

        c.execute("""
            CREATE TABLE IF NOT EXISTS constraint_checks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_record_id INTEGER NOT NULL,
                check_type TEXT NOT NULL,
                check_result TEXT,
                check_passed INTEGER,
                detail TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (batch_record_id) REFERENCES batch_records(id)
            )
        """)

        c.execute("""
            CREATE TABLE IF NOT EXISTS error_analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_record_id INTEGER NOT NULL,
                error_type TEXT NOT NULL,
                error_magnitude REAL,
                relative_error REAL,
                root_cause TEXT,
                detail TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (batch_record_id) REFERENCES batch_records(id)
            )
        """)

        c.execute("""
            CREATE TABLE IF NOT EXISTS anomalies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_record_id INTEGER NOT NULL,
                anomaly_type TEXT NOT NULL,
                severity TEXT DEFAULT 'warning',
                description TEXT,
                gap_detail TEXT,
                needs_review INTEGER DEFAULT 1,
                reviewed INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (batch_record_id) REFERENCES batch_records(id)
            )
        """)

        c.execute("""
            CREATE TABLE IF NOT EXISTS review_decisions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                anomaly_id INTEGER NOT NULL,
                reviewer TEXT NOT NULL,
                decision TEXT NOT NULL,
                handling_opinion TEXT,
                supplemental_data TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (anomaly_id) REFERENCES anomalies(id)
            )
        """)

        conn.commit()
    print(f"Database initialized at {DB_PATH}")


if __name__ == "__main__":
    init_db()
