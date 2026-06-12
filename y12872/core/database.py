import sqlite3
import json
from datetime import datetime
from config import DB_PATH


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_conn()
    c = conn.cursor()

    c.execute('''
        CREATE TABLE IF NOT EXISTS sample_boxes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            box_code TEXT UNIQUE NOT NULL,
            expedition_name TEXT,
            station_name TEXT,
            sample_type TEXT,
            collection_time TEXT,
            storage_temp REAL,
            transport_status TEXT,
            status TEXT DEFAULT 'pending',
            abnormal_types TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            updated_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS processing_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            box_id INTEGER,
            record_type TEXT NOT NULL,
            action TEXT NOT NULL,
            operator TEXT,
            detail TEXT,
            source_file TEXT,
            source_row INTEGER,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (box_id) REFERENCES sample_boxes(id) ON DELETE CASCADE
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS aquaculture_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            log_date TEXT NOT NULL,
            station_name TEXT,
            water_temp REAL,
            salinity REAL,
            dissolved_oxygen REAL,
            ph REAL,
            feeding_amount REAL,
            mortality INTEGER DEFAULT 0,
            notes TEXT,
            source_file TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS wave_forecasts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            forecast_date TEXT NOT NULL,
            forecast_time TEXT,
            station_name TEXT,
            wave_height REAL,
            wave_period REAL,
            wind_speed REAL,
            wind_direction TEXT,
            forecast_issue_time TEXT,
            actual_arrival_time TEXT,
            is_delayed INTEGER DEFAULT 0,
            delay_reason TEXT,
            source_file TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS review_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            box_id INTEGER,
            reviewer TEXT,
            review_result TEXT,
            opinion TEXT,
            handling_suggestion TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (box_id) REFERENCES sample_boxes(id) ON DELETE CASCADE
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS data_imports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            import_type TEXT NOT NULL,
            file_name TEXT NOT NULL,
            record_count INTEGER DEFAULT 0,
            operator TEXT,
            remark TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
    ''')

    c.execute('CREATE INDEX IF NOT EXISTS idx_box_status ON sample_boxes(status)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_box_code ON sample_boxes(box_code)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_proc_box ON processing_records(box_id)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_proc_type ON processing_records(record_type)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_log_date ON aquaculture_logs(log_date)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_wave_date ON wave_forecasts(forecast_date)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_review_box ON review_notes(box_id)')

    conn.commit()
    conn.close()


def row_to_dict(row):
    if row is None:
        return None
    return {key: row[key] for key in row.keys()}


def rows_to_list(rows):
    return [row_to_dict(r) for r in rows]
