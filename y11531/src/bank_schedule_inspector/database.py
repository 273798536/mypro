import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple


DB_FILENAME = "schedule_inspector.db"


def get_db_path(workspace: Optional[str] = None) -> Path:
    if workspace:
        return Path(workspace) / DB_FILENAME
    return Path.cwd() / DB_FILENAME


def get_connection(workspace: Optional[str] = None) -> sqlite3.Connection:
    db_path = get_db_path(workspace)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_database(workspace: Optional[str] = None) -> Tuple[bool, str]:
    db_path = get_db_path(workspace)
    if db_path.exists():
        return False, f"数据库已存在: {db_path}"
    
    conn = get_connection(workspace)
    cursor = conn.cursor()
    
    cursor.execute('''
    CREATE TABLE import_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_uuid TEXT UNIQUE NOT NULL,
        source_type TEXT NOT NULL,
        source_file TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        imported_by TEXT DEFAULT 'system',
        imported_at TIMESTAMP NOT NULL,
        total_rows INTEGER NOT NULL,
        success_rows INTEGER NOT NULL,
        failed_rows INTEGER NOT NULL,
        status TEXT NOT NULL,
        remark TEXT,
        UNIQUE(source_type, file_hash)
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE failed_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        source_type TEXT NOT NULL,
        original_line_no INTEGER NOT NULL,
        raw_data TEXT NOT NULL,
        error_message TEXT NOT NULL,
        error_type TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        fixed BOOLEAN DEFAULT 0,
        fixed_session_id INTEGER,
        FOREIGN KEY (session_id) REFERENCES import_sessions(id),
        FOREIGN KEY (fixed_session_id) REFERENCES import_sessions(id)
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE teller_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        teller_id TEXT NOT NULL,
        teller_name TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        branch_name TEXT NOT NULL,
        schedule_date DATE NOT NULL,
        shift_type TEXT NOT NULL,
        start_time TEXT,
        end_time TEXT,
        window_no TEXT,
        is_training BOOLEAN DEFAULT 0,
        is_leave BOOLEAN DEFAULT 0,
        remarks TEXT,
        created_at TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (session_id) REFERENCES import_sessions(id),
        UNIQUE(teller_id, schedule_date, session_id)
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE leave_forms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        teller_id TEXT NOT NULL,
        teller_name TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        leave_type TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        start_time TEXT,
        end_time TEXT,
        approver TEXT,
        remarks TEXT,
        created_at TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (session_id) REFERENCES import_sessions(id)
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE business_forecasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        branch_id TEXT NOT NULL,
        branch_name TEXT NOT NULL,
        forecast_date DATE NOT NULL,
        time_slot TEXT NOT NULL,
        forecast_volume INTEGER NOT NULL,
        confidence_level REAL,
        remarks TEXT,
        created_at TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (session_id) REFERENCES import_sessions(id),
        UNIQUE(branch_id, forecast_date, time_slot, session_id)
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE inspection_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        branch_id TEXT NOT NULL,
        check_date DATE NOT NULL,
        check_type TEXT NOT NULL,
        check_item TEXT NOT NULL,
        severity TEXT NOT NULL,
        result_value TEXT,
        expected_value TEXT,
        related_tellers TEXT,
        description TEXT NOT NULL,
        fixed BOOLEAN DEFAULT 0,
        created_at TIMESTAMP NOT NULL,
        FOREIGN KEY (session_id) REFERENCES import_sessions(id)
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE system_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL
    )
    ''')
    
    cursor.execute('''
    INSERT INTO system_metadata (key, value, updated_at)
    VALUES (?, ?, ?)
    ''', ('db_version', '1.0', datetime.now().isoformat()))
    
    conn.commit()
    conn.close()
    
    return True, f"数据库初始化完成: {db_path}"


def is_initialized(workspace: Optional[str] = None) -> bool:
    return get_db_path(workspace).exists()
