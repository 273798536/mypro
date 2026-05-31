import sqlite3
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from app.database import DB_PATH, get_connection

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
"""

MEASUREMENTS = [
    ("north-shore", 10.0, 5.0, 18.5, "2026-01-15T08:00:00", "solid clear ice"),
    ("north-shore", 20.0, 5.0, 17.2, "2026-01-15T08:10:00", None),
    ("north-shore", 30.0, 5.0, 19.0, "2026-01-15T08:20:00", "near dock, slight surface cracks"),
    ("mid-lake", 50.0, 50.0, 12.3, "2026-01-15T08:30:00", None),
    ("mid-lake", 55.0, 50.0, 11.8, "2026-01-15T08:35:00", "thinner than expected"),
    ("south-bay", 80.0, 10.0, 4.5, "2026-01-15T08:45:00", "spring-fed area, always thin"),
    ("south-bay", 85.0, 12.0, 3.8, "2026-01-15T08:50:00", None),
    ("east-cove", 15.0, 80.0, 22.0, "2026-01-15T09:00:00", "very thick, safe zone"),
    ("east-cove", 25.0, 80.0, 21.5, "2026-01-15T09:05:00", None),
    ("east-cove", 35.0, 80.0, 23.0, "2026-01-15T09:10:00", None),
    ("east-cove", 45.0, 80.0, 20.8, "2026-01-15T09:15:00", "shallow area, consistent thickness"),
    ("sparse-zone", 60.0, 30.0, 14.0, "2026-01-15T09:20:00", "only one measurement taken so far"),
]

TEMPERATURES = [
    ("2026-01-14T06:00:00", -8.0, "weather station"),
    ("2026-01-14T12:00:00", -5.0, "weather station"),
    ("2026-01-14T18:00:00", -3.0, "weather station"),
    ("2026-01-15T00:00:00", -2.0, "weather station"),
    ("2026-01-15T06:00:00", 1.0, "weather station"),
    ("2026-01-15T09:00:00", 3.5, "manual reading"),
]

PARTICIPANTS = [
    ("north-shore", 30, "2026-01-15T10:00:00"),
    ("mid-lake", 50, "2026-01-15T10:00:00"),
    ("south-bay", 10, "2026-01-15T10:00:00"),
    ("east-cove", 80, "2026-01-15T10:00:00"),
    ("sparse-zone", 20, "2026-01-15T10:00:00"),
]


def seed():
    conn = get_connection()
    try:
        conn.executescript(SCHEMA)
        for m in MEASUREMENTS:
            conn.execute(
                "INSERT INTO measurements (zone_name, x, y, ice_thickness_cm, measured_at, notes) VALUES (?,?,?,?,?,?)",
                m
            )
        for t in TEMPERATURES:
            conn.execute(
                "INSERT INTO temperature_records (recorded_at, temperature_c, source) VALUES (?,?,?)",
                t
            )
        for p in PARTICIPANTS:
            conn.execute(
                "INSERT INTO participants (zone_name, planned_count, planned_at) VALUES (?,?,?)",
                p
            )
        conn.commit()
        print(f"seeded {len(MEASUREMENTS)} measurements, {len(TEMPERATURES)} temperature records, {len(PARTICIPANTS)} participant plans")
        print(f"database: {DB_PATH}")
        print()
        print("zones with sparse points (< 3 measurements):")
        rows = conn.execute(
            "SELECT zone_name, COUNT(*) as cnt FROM measurements GROUP BY zone_name HAVING cnt < 3"
        ).fetchall()
        for r in rows:
            print(f"  - {r['zone_name']}: {r['cnt']} point(s)")
        if not rows:
            print("  (none — all zones have 3+ points)")
        print()
        print("temperature spike check:")
        temps = conn.execute(
            "SELECT temperature_c FROM temperature_records WHERE temperature_c IS NOT NULL ORDER BY recorded_at"
        ).fetchall()
        if len(temps) >= 2:
            delta = temps[-1]["temperature_c"] - temps[0]["temperature_c"]
            print(f"  trend: {temps[0]['temperature_c']}C -> {temps[-1]['temperature_c']}C (delta {delta:+.1f}C)")
            if delta >= 5.0:
                print("  *** spike detected: >= 5C rise ***")
        print()
        print("now start the service and run: POST /api/assessment/run")
    finally:
        conn.close()


if __name__ == "__main__":
    seed()
