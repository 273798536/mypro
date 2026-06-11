import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dive_visibility.db')


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_conn()
    c = conn.cursor()

    c.execute('''
        CREATE TABLE IF NOT EXISTS dive_sites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            radius_m REAL DEFAULT 100,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS no_go_zones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            polygon TEXT NOT NULL,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS ships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            mmsi TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS ship_tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ship_id INTEGER NOT NULL,
            recorded_at TEXT NOT NULL,
            lat REAL,
            lng REAL,
            speed REAL,
            heading REAL,
            source TEXT,
            is_clean INTEGER DEFAULT 0,
            raw_data TEXT,
            FOREIGN KEY (ship_id) REFERENCES ships(id)
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS ship_tracks_clean (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            original_id INTEGER NOT NULL,
            ship_id INTEGER NOT NULL,
            recorded_at TEXT NOT NULL,
            lat REAL,
            lng REAL,
            speed REAL,
            heading REAL,
            clean_reason TEXT,
            FOREIGN KEY (original_id) REFERENCES ship_tracks(id),
            FOREIGN KEY (ship_id) REFERENCES ships(id)
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS wind_wave_forecasts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            site_id INTEGER,
            forecast_for TEXT NOT NULL,
            issued_at TEXT NOT NULL,
            wind_speed REAL,
            wind_direction REAL,
            wave_height REAL,
            wave_period REAL,
            is_delayed INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            confirmed_by TEXT,
            confirmed_at TEXT,
            FOREIGN KEY (site_id) REFERENCES dive_sites(id)
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS inspection_photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            site_id INTEGER NOT NULL,
            taken_at TEXT NOT NULL,
            photo_path TEXT,
            visibility_estimate REAL,
            notes TEXT,
            uploaded_by TEXT,
            FOREIGN KEY (site_id) REFERENCES dive_sites(id)
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS aquaculture_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            site_id INTEGER NOT NULL,
            log_date TEXT NOT NULL,
            water_temp REAL,
            turbidity REAL,
            notes TEXT,
            FOREIGN KEY (site_id) REFERENCES dive_sites(id)
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS visibility_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            site_id INTEGER NOT NULL,
            record_date TEXT NOT NULL,
            visibility_m REAL,
            confidence REAL,
            sources TEXT,
            has_no_go_violation INTEGER DEFAULT 0,
            no_go_details TEXT,
            track_missing INTEGER DEFAULT 0,
            track_missing_details TEXT,
            forecast_delayed INTEGER DEFAULT 0,
            needs_review INTEGER DEFAULT 0,
            review_notes TEXT,
            reviewed_by TEXT,
            reviewed_at TEXT,
            status TEXT DEFAULT 'draft',
            raw_calculation TEXT,
            FOREIGN KEY (site_id) REFERENCES dive_sites(id)
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS process_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_type TEXT NOT NULL,
            started_at TEXT DEFAULT CURRENT_TIMESTAMP,
            finished_at TEXT,
            status TEXT,
            records_processed INTEGER DEFAULT 0,
            records_failed INTEGER DEFAULT 0,
            missing_tracks TEXT,
            notes TEXT
        )
    ''')

    conn.commit()
    conn.close()


if __name__ == '__main__':
    init_db()
    print('Database initialized at', DB_PATH)
