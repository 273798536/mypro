"""数据库模块：SQLite 本地存储，所有表带处理留痕，支持追溯"""

import sqlite3
import os
from datetime import datetime
from contextlib import contextmanager


DB_PATH = os.environ.get("OWI_DB_PATH", "owi_data.db")


@contextmanager
def get_conn(db_path=None):
    path = db_path or DB_PATH
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db(db_path=None):
    """初始化数据库，所有表已存在则跳过"""
    path = db_path or DB_PATH
    with get_conn(path) as conn:
        c = conn.cursor()

        c.executescript("""
        -- 巡检任务表
        CREATE TABLE IF NOT EXISTS inspection_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_code TEXT UNIQUE NOT NULL,
            wind_farm TEXT NOT NULL,
            planned_date TEXT NOT NULL,
            tide_window_start TEXT,
            tide_window_end TEXT,
            status TEXT DEFAULT 'pending',
            ship_name TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- 船舶轨迹表
        CREATE TABLE IF NOT EXISTS ship_tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER,
            ship_name TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            lon REAL NOT NULL,
            lat REAL NOT NULL,
            speed REAL,
            heading REAL,
            source TEXT,
            FOREIGN KEY (task_id) REFERENCES inspection_tasks(id)
        );

        -- 风浪预报数据表
        CREATE TABLE IF NOT EXISTS wave_forecasts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            forecast_date TEXT NOT NULL,
            wind_farm TEXT NOT NULL,
            wave_height REAL,
            wind_speed REAL,
            wind_direction REAL,
            forecast_time TEXT,
            is_delayed INTEGER DEFAULT 0,
            received_at TEXT DEFAULT (datetime('now')),
            source_file TEXT,
            data_source TEXT
        );

        -- 水质监测数据表
        CREATE TABLE IF NOT EXISTS water_quality (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sample_date TEXT NOT NULL,
            wind_farm TEXT NOT NULL,
            ph REAL,
            turbidity REAL,
            dissolved_oxygen REAL,
            temperature REAL,
            sample_location TEXT,
            source_file TEXT,
            received_at TEXT DEFAULT (datetime('now'))
        );

        -- 风险分层结果表（与水质预警共用同一批处理记录）
        CREATE TABLE IF NOT EXISTS risk_assessments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER,
            task_code TEXT,
            assessment_date TEXT DEFAULT (datetime('now')),
            risk_level TEXT NOT NULL,
            risk_score REAL,
            factors TEXT,
            wave_forecast_id INTEGER,
            water_quality_id INTEGER,
            status TEXT DEFAULT 'active',
            FOREIGN KEY (task_id) REFERENCES inspection_tasks(id),
            FOREIGN KEY (wave_forecast_id) REFERENCES wave_forecasts(id),
            FOREIGN KEY (water_quality_id) REFERENCES water_quality(id)
        );

        -- 水质预警表（与风险分层共用处理记录）
        CREATE TABLE IF NOT EXISTS water_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            risk_assessment_id INTEGER,
            alert_level TEXT NOT NULL,
            alert_type TEXT,
            description TEXT,
            triggered_at TEXT DEFAULT (datetime('now')),
            status TEXT DEFAULT 'active',
            FOREIGN KEY (risk_assessment_id) REFERENCES risk_assessments(id)
        );

        -- 处理记录表：所有操作留痕，是追溯的核心
        CREATE TABLE IF NOT EXISTS processing_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            operation TEXT NOT NULL,
            entity_type TEXT,
            entity_id INTEGER,
            source_ref TEXT,
            result_ref TEXT,
            operator TEXT DEFAULT 'system',
            details TEXT,
            timestamp TEXT DEFAULT (datetime('now'))
        );

        -- 复核记录表
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            risk_assessment_id INTEGER,
            review_type TEXT,
            original_value TEXT,
            corrected_value TEXT,
            reviewer TEXT,
            reason TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (risk_assessment_id) REFERENCES risk_assessments(id)
        );

        CREATE INDEX IF NOT EXISTS idx_tasks_code ON inspection_tasks(task_code);
        CREATE INDEX IF NOT EXISTS idx_logs_entity ON processing_logs(entity_type, entity_id);
        CREATE INDEX IF NOT EXISTS idx_risk_task ON risk_assessments(task_code);
        CREATE INDEX IF NOT EXISTS idx_wave_farm ON wave_forecasts(wind_farm, forecast_date);
        """)


def log_processing(conn, operation, entity_type=None, entity_id=None,
                   source_ref=None, result_ref=None, details=None, operator="system"):
    """写入处理日志，所有数据变更都要走这里"""
    conn.execute("""
        INSERT INTO processing_logs
        (operation, entity_type, entity_id, source_ref, result_ref, details, operator)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (operation, entity_type, entity_id, source_ref, result_ref, details, operator))
