import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'marine_verification.db')


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        record_no TEXT UNIQUE NOT NULL,
        project_name TEXT NOT NULL,
        construction_area TEXT NOT NULL,
        coordinates TEXT,
        planned_date TEXT,
        construction_type TEXT,
        submitter TEXT,
        submit_time TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS weather_forecasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        record_id INTEGER NOT NULL,
        forecast_date TEXT NOT NULL,
        wind_level REAL,
        wave_height REAL,
        visibility REAL,
        forecast_source TEXT,
        forecast_time TEXT,
        is_delayed INTEGER DEFAULT 0,
        delay_reason TEXT,
        received_time TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS risk_assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        record_id INTEGER NOT NULL,
        assessment_version INTEGER NOT NULL,
        risk_level TEXT NOT NULL,
        risk_score REAL,
        assessment_criteria TEXT,
        affected_conclusions TEXT,
        assessment_time TEXT DEFAULT CURRENT_TIMESTAMP,
        assessor TEXT,
        is_latest INTEGER DEFAULT 1,
        FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS anomalies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        record_id INTEGER NOT NULL,
        anomaly_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT NOT NULL,
        next_action TEXT NOT NULL,
        is_resolved INTEGER DEFAULT 0,
        resolution_note TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        resolved_at TEXT,
        FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS assessment_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        record_id INTEGER NOT NULL,
        old_risk_level TEXT,
        new_risk_level TEXT,
        change_reason TEXT,
        affected_fields TEXT,
        changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
    )
    ''')

    conn.commit()
    conn.close()
    print("数据库初始化完成")


if __name__ == '__main__':
    init_db()
