import sqlite3
import os
from datetime import datetime
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audit.db")


def get_db_path():
    return DB_PATH


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_conn() as conn:
        c = conn.cursor()

        c.executescript("""
        CREATE TABLE IF NOT EXISTS import_batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_name TEXT NOT NULL,
            imported_at TIMESTAMP NOT NULL,
            source_file TEXT,
            total_records INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'imported'
        );

        CREATE TABLE IF NOT EXISTS student_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id INTEGER NOT NULL,
            question_id TEXT NOT NULL,
            student_id TEXT,
            question_text TEXT NOT NULL,
            student_answer TEXT,
            correct_answer TEXT,
            is_correct INTEGER,
            raw_data TEXT NOT NULL,
            has_error INTEGER NOT NULL DEFAULT 0,
            error_note TEXT,
            FOREIGN KEY (batch_id) REFERENCES import_batches(id)
        );

        CREATE TABLE IF NOT EXISTS boundary_cases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id INTEGER NOT NULL,
            case_type TEXT NOT NULL,
            description TEXT NOT NULL,
            original_result TEXT,
            boundary_result TEXT,
            result_changed INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (question_id) REFERENCES student_questions(id)
        );

        CREATE TABLE IF NOT EXISTS corrections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id INTEGER NOT NULL,
            field_name TEXT NOT NULL,
            old_value TEXT,
            new_value TEXT NOT NULL,
            corrected_by TEXT DEFAULT 'analyst',
            corrected_at TIMESTAMP NOT NULL,
            note TEXT,
            FOREIGN KEY (question_id) REFERENCES student_questions(id)
        );

        CREATE TABLE IF NOT EXISTS confirmations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id INTEGER NOT NULL,
            confirmed_by TEXT DEFAULT 'analyst',
            confirmed_at TIMESTAMP NOT NULL,
            note TEXT,
            FOREIGN KEY (question_id) REFERENCES student_questions(id)
        );

        CREATE TABLE IF NOT EXISTS review_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id INTEGER,
            reviewed_at TIMESTAMP NOT NULL,
            reviewed_by TEXT DEFAULT 'analyst',
            total_reviewed INTEGER NOT NULL DEFAULT 0,
            changed_count INTEGER NOT NULL DEFAULT 0,
            note TEXT
        );

        CREATE TABLE IF NOT EXISTS review_changes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            review_session_id INTEGER NOT NULL,
            question_id INTEGER NOT NULL,
            field_name TEXT NOT NULL,
            before_value TEXT,
            after_value TEXT NOT NULL,
            FOREIGN KEY (review_session_id) REFERENCES review_sessions(id),
            FOREIGN KEY (question_id) REFERENCES student_questions(id)
        );

        CREATE TABLE IF NOT EXISTS missing_answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id INTEGER NOT NULL,
            batch_id INTEGER NOT NULL,
            missing_field TEXT NOT NULL,
            noted_at TIMESTAMP NOT NULL,
            resolved INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (question_id) REFERENCES student_questions(id),
            FOREIGN KEY (batch_id) REFERENCES import_batches(id)
        );

        CREATE INDEX IF NOT EXISTS idx_questions_batch ON student_questions(batch_id);
        CREATE INDEX IF NOT EXISTS idx_questions_qid ON student_questions(question_id);
        CREATE INDEX IF NOT EXISTS idx_boundary_qid ON boundary_cases(question_id);
        CREATE INDEX IF NOT EXISTS idx_corrections_qid ON corrections(question_id);
        CREATE INDEX IF NOT EXISTS idx_missing_batch ON missing_answers(batch_id);
        """)


def now():
    return datetime.now().isoformat(timespec="seconds")
