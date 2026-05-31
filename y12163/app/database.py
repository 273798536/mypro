import sqlite3
import os
from datetime import datetime
from typing import Optional
from contextlib import contextmanager

DB_PATH = os.environ.get("ICE_DB_PATH", "ice_safety.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_name TEXT NOT NULL,
    x REAL,
    y REAL,
    ice_thickness_cm REAL NOT NULL,
    measured_at TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS temperature_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recorded_at TEXT,
    temperature_c REAL,
    source TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_name TEXT NOT NULL,
    planned_count INTEGER NOT NULL DEFAULT 0,
    planned_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_name TEXT NOT NULL,
    assessed_at TEXT NOT NULL DEFAULT (datetime('now')),
    risk_level TEXT NOT NULL,
    avg_thickness_cm REAL,
    min_thickness_cm REAL,
    max_safe_load_kg REAL,
    current_load_kg REAL,
    safety_margin REAL,
    measurement_count INTEGER NOT NULL DEFAULT 0,
    sparse_point_warning TEXT,
    temperature_warning TEXT,
    overcapacity_warning TEXT,
    recommendations TEXT
);

CREATE INDEX IF NOT EXISTS idx_measurements_zone ON measurements(zone_name);
CREATE INDEX IF NOT EXISTS idx_participants_zone ON participants(zone_name);
CREATE INDEX IF NOT EXISTS idx_assessments_zone ON assessments(zone_name);
CREATE INDEX IF NOT EXISTS idx_assessments_time ON assessments(assessed_at);
CREATE INDEX IF NOT EXISTS idx_temp_time ON temperature_records(recorded_at);
"""


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.executescript(SCHEMA)


def insert_measurement(conn, zone_name: str, x, y, ice_thickness_cm: float,
                       measured_at: Optional[str], notes: Optional[str]) -> int:
    cur = conn.execute(
        "INSERT INTO measurements (zone_name, x, y, ice_thickness_cm, measured_at, notes) VALUES (?, ?, ?, ?, ?, ?)",
        (zone_name, x, y, ice_thickness_cm, measured_at, notes)
    )
    return cur.lastrowid


def update_measurement(conn, mid: int, x, y, ice_thickness_cm, measured_at, notes) -> bool:
    sets = []
    vals = []
    if x is not None:
        sets.append("x = ?")
        vals.append(x)
    if y is not None:
        sets.append("y = ?")
        vals.append(y)
    if ice_thickness_cm is not None:
        sets.append("ice_thickness_cm = ?")
        vals.append(ice_thickness_cm)
    if measured_at is not None:
        sets.append("measured_at = ?")
        vals.append(measured_at)
    if notes is not None:
        sets.append("notes = ?")
        vals.append(notes)
    if not sets:
        return False
    vals.append(mid)
    conn.execute(f"UPDATE measurements SET {', '.join(sets)} WHERE id = ?", vals)
    return True


def get_measurements(conn, zone_name: Optional[str] = None):
    if zone_name:
        return conn.execute(
            "SELECT * FROM measurements WHERE zone_name = ? ORDER BY measured_at DESC",
            (zone_name,)
        ).fetchall()
    return conn.execute("SELECT * FROM measurements ORDER BY zone_name, measured_at DESC").fetchall()


def get_measurement_by_id(conn, mid: int):
    return conn.execute("SELECT * FROM measurements WHERE id = ?", (mid,)).fetchone()


def delete_measurement(conn, mid: int) -> bool:
    cur = conn.execute("DELETE FROM measurements WHERE id = ?", (mid,))
    return cur.rowcount > 0


def insert_temperature(conn, recorded_at: Optional[str], temperature_c, source: Optional[str]) -> int:
    cur = conn.execute(
        "INSERT INTO temperature_records (recorded_at, temperature_c, source) VALUES (?, ?, ?)",
        (recorded_at, temperature_c, source)
    )
    return cur.lastrowid


def get_temperatures(conn, hours: Optional[int] = None):
    if hours:
        cutoff = datetime.utcnow().isoformat()
        return conn.execute(
            "SELECT * FROM temperature_records WHERE recorded_at >= datetime(?, ?) ORDER BY recorded_at DESC",
            (cutoff, f"-{hours} hours")
        ).fetchall()
    return conn.execute("SELECT * FROM temperature_records ORDER BY recorded_at DESC").fetchall()


def insert_participant(conn, zone_name: str, planned_count: int, planned_at: Optional[str]) -> int:
    cur = conn.execute(
        "INSERT INTO participants (zone_name, planned_count, planned_at) VALUES (?, ?, ?)",
        (zone_name, planned_count, planned_at)
    )
    return cur.lastrowid


def get_participants(conn, zone_name: Optional[str] = None):
    if zone_name:
        return conn.execute(
            "SELECT * FROM participants WHERE zone_name = ? ORDER BY planned_at DESC",
            (zone_name,)
        ).fetchall()
    return conn.execute("SELECT * FROM participants ORDER BY zone_name, planned_at DESC").fetchall()


def insert_assessment(conn, zone_name: str, assessed_at: str, risk_level: str,
                      avg_thickness_cm, min_thickness_cm, max_safe_load_kg,
                      current_load_kg, safety_margin, measurement_count: int,
                      sparse_point_warning, temperature_warning,
                      overcapacity_warning, recommendations: str) -> int:
    cur = conn.execute(
        """INSERT INTO assessments
        (zone_name, assessed_at, risk_level, avg_thickness_cm, min_thickness_cm,
         max_safe_load_kg, current_load_kg, safety_margin, measurement_count,
         sparse_point_warning, temperature_warning, overcapacity_warning, recommendations)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (zone_name, assessed_at, risk_level, avg_thickness_cm, min_thickness_cm,
         max_safe_load_kg, current_load_kg, safety_margin, measurement_count,
         sparse_point_warning, temperature_warning, overcapacity_warning, recommendations)
    )
    return cur.lastrowid


def get_latest_assessment(conn, zone_name: str):
    return conn.execute(
        "SELECT * FROM assessments WHERE zone_name = ? ORDER BY assessed_at DESC LIMIT 1",
        (zone_name,)
    ).fetchone()


def get_all_latest_assessments(conn):
    return conn.execute("""
        SELECT a.* FROM assessments a
        INNER JOIN (
            SELECT zone_name, MAX(assessed_at) as max_at FROM assessments GROUP BY zone_name
        ) b ON a.zone_name = b.zone_name AND a.assessed_at = b.max_at
        ORDER BY a.zone_name
    """).fetchall()


def get_assessment_history(conn, zone_name: str, limit: int = 20):
    return conn.execute(
        "SELECT * FROM assessments WHERE zone_name = ? ORDER BY assessed_at DESC LIMIT ?",
        (zone_name, limit)
    ).fetchall()


def get_zone_measurement_count(conn, zone_name: str) -> int:
    row = conn.execute("SELECT COUNT(*) as cnt FROM measurements WHERE zone_name = ?", (zone_name,)).fetchone()
    return row["cnt"] if row else 0


def get_zone_measurements(conn, zone_name: str):
    return conn.execute(
        "SELECT * FROM measurements WHERE zone_name = ? ORDER BY measured_at DESC",
        (zone_name,)
    ).fetchall()


def get_latest_participant(conn, zone_name: str):
    return conn.execute(
        "SELECT * FROM participants WHERE zone_name = ? ORDER BY created_at DESC LIMIT 1",
        (zone_name,)
    ).fetchone()
