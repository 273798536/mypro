import sqlite3
import os

DB_PATH = os.environ.get("POLAR_ICE_DB", "polar_ice.db")

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS tide_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_file TEXT NOT NULL,
    station TEXT NOT NULL,
    obs_time TEXT NOT NULL,
    tide_height REAL,
    tide_type TEXT,
    import_batch TEXT NOT NULL,
    import_ts TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(station, obs_time, import_batch)
);

CREATE TABLE IF NOT EXISTS ship_track (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_file TEXT NOT NULL,
    vessel_name TEXT NOT NULL,
    mmsi TEXT,
    obs_time TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    speed_kn REAL,
    heading_deg REAL,
    raw_note TEXT,
    import_batch TEXT NOT NULL,
    import_ts TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(mmsi, obs_time, import_batch)
);

CREATE TABLE IF NOT EXISTS assessment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_name TEXT NOT NULL,
    assess_date TEXT NOT NULL,
    ice_condition TEXT,
    wind_wave_forecast TEXT,
    risk_level TEXT CHECK(risk_level IN ('low','medium','high','extreme')),
    tide_conflict TEXT,
    track_issue TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','revised')),
    created_ts TEXT NOT NULL DEFAULT (datetime('now')),
    updated_ts TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(route_name, assess_date)
);

CREATE TABLE IF NOT EXISTS assessment_detail (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id INTEGER NOT NULL REFERENCES assessment(id),
    tide_table_id INTEGER REFERENCES tide_table(id),
    ship_track_id INTEGER REFERENCES ship_track(id),
    note TEXT,
    UNIQUE(assessment_id, tide_table_id, ship_track_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id INTEGER NOT NULL REFERENCES assessment(id),
    action TEXT NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    operator TEXT NOT NULL DEFAULT 'system',
    reason TEXT,
    created_ts TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS import_dedup (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    source_file TEXT NOT NULL,
    import_batch TEXT NOT NULL,
    row_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'accepted' CHECK(status IN ('accepted','duplicate','conflict')),
    created_ts TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(table_name, row_hash)
);

CREATE INDEX IF NOT EXISTS idx_tide_station_time ON tide_table(station, obs_time);
CREATE INDEX IF NOT EXISTS idx_track_mmsi_time ON ship_track(mmsi, obs_time);
CREATE INDEX IF NOT EXISTS idx_assess_route_date ON assessment(route_name, assess_date);
CREATE INDEX IF NOT EXISTS idx_audit_assessment ON audit_log(assessment_id);
CREATE INDEX IF NOT EXISTS idx_import_dedup_lookup ON import_dedup(table_name, row_hash);
"""


def get_conn(db_path=None):
    p = db_path or DB_PATH
    conn = sqlite3.connect(p)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db(db_path=None):
    conn = get_conn(db_path)
    conn.executescript(SCHEMA_SQL)
    conn.commit()
    conn.close()
    return db_path or DB_PATH
