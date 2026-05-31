"""数据模型定义"""
import sqlite3
import os
from datetime import datetime
from typing import Optional, Dict, Any


DB_PATH = os.environ.get("PLEDGE_DB_PATH", "pledge_risk.db")


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    conn = get_conn()
    c = conn.cursor()

    c.execute(
        """
        CREATE TABLE IF NOT EXISTS station_archives (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            station_code TEXT UNIQUE NOT NULL,
            station_name TEXT NOT NULL,
            address TEXT,
            total_piles INTEGER NOT NULL,
            pile_type TEXT,
            power_kw REAL,
            operator TEXT,
            contract_no TEXT,
            contract_start_date TEXT,
            contract_end_date TEXT,
            revenue_share_ratio REAL,
            pledgeable_flag INTEGER DEFAULT 1,
            import_batch_no TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )

    c.execute(
        """
        CREATE TABLE IF NOT EXISTS charging_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_no TEXT UNIQUE NOT NULL,
            station_code TEXT NOT NULL,
            pile_code TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            duration_min REAL NOT NULL,
            power_kwh REAL NOT NULL,
            amount REAL NOT NULL,
            electricity_fee REAL,
            service_fee REAL,
            user_id TEXT,
            pay_status TEXT DEFAULT 'paid',
            import_batch_no TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (station_code) REFERENCES station_archives(station_code)
        )
        """
    )

    c.execute(
        """
        CREATE TABLE IF NOT EXISTS device_status (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            station_code TEXT NOT NULL,
            pile_code TEXT NOT NULL,
            report_date TEXT NOT NULL,
            online_status TEXT NOT NULL,
            offline_hours REAL DEFAULT 0,
            last_online_time TEXT,
            fault_code TEXT,
            fault_desc TEXT,
            import_batch_no TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(station_code, pile_code, report_date)
        )
        """
    )

    c.execute(
        """
        CREATE TABLE IF NOT EXISTS pledge_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pledge_no TEXT UNIQUE NOT NULL,
            station_code TEXT NOT NULL,
            pledge_amount REAL NOT NULL,
            pledge_start_date TEXT NOT NULL,
            pledge_end_date TEXT NOT NULL,
            interest_rate REAL,
            status TEXT DEFAULT 'active',
            created_at TEXT NOT NULL,
            FOREIGN KEY (station_code) REFERENCES station_archives(station_code)
        )
        """
    )

    c.execute(
        """
        CREATE TABLE IF NOT EXISTS risk_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            risk_type TEXT NOT NULL,
            risk_level TEXT NOT NULL,
            description TEXT NOT NULL,
            related_table TEXT,
            related_id INTEGER,
            related_key TEXT,
            import_batch_no TEXT,
            evidence TEXT,
            operator TEXT,
            created_at TEXT NOT NULL
        )
        """
    )

    c.execute(
        """
        CREATE TABLE IF NOT EXISTS import_batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_no TEXT UNIQUE NOT NULL,
            batch_type TEXT NOT NULL,
            operator TEXT,
            remark TEXT,
            created_at TEXT NOT NULL
        )
        """
    )

    c.execute(
        """
        CREATE TABLE IF NOT EXISTS analysis_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            analysis_type TEXT NOT NULL,
            station_code TEXT,
            result_json TEXT NOT NULL,
            batch_from TEXT,
            batch_to TEXT,
            created_at TEXT NOT NULL
        )
        """
    )

    conn.commit()
    conn.close()


def gen_batch_no(batch_type: str) -> str:
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"{batch_type.upper()}_{ts}"
