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
    CREATE TABLE roles (
        role_id INTEGER PRIMARY KEY AUTOINCREMENT,
        role_name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP NOT NULL
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE permissions (
        permission_id INTEGER PRIMARY KEY AUTOINCREMENT,
        permission_name TEXT UNIQUE NOT NULL,
        resource TEXT NOT NULL,
        action TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP NOT NULL
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE role_permissions (
        role_id INTEGER NOT NULL,
        permission_id INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(role_id),
        FOREIGN KEY (permission_id) REFERENCES permissions(permission_id)
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        role_id INTEGER NOT NULL,
        branch_id TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP NOT NULL,
        FOREIGN KEY (role_id) REFERENCES roles(role_id)
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE audit_logs (
        audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT NOT NULL,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        resource_id TEXT,
        session_id INTEGER,
        detail TEXT,
        ip_address TEXT,
        success BOOLEAN NOT NULL,
        error_message TEXT,
        created_at TIMESTAMP NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        FOREIGN KEY (session_id) REFERENCES import_sessions(id)
    )
    ''')
    
    cursor.execute('''
    INSERT INTO system_metadata (key, value, updated_at)
    VALUES (?, ?, ?)
    ''', ('db_version', '1.1', datetime.now().isoformat()))
    
    default_roles = [
        ('admin', '系统管理员', datetime.now().isoformat()),
        ('branch_manager', '支行行长', datetime.now().isoformat()),
        ('teller_supervisor', '主管', datetime.now().isoformat()),
        ('viewer', '只读用户', datetime.now().isoformat()),
    ]
    cursor.executemany('INSERT INTO roles (role_name, description, created_at) VALUES (?, ?, ?)', default_roles)
    
    default_permissions = [
        ('import_data', 'import', 'create', '导入数据', datetime.now().isoformat()),
        ('force_import', 'import', 'force', '强制覆盖导入', datetime.now().isoformat()),
        ('run_inspection', 'inspection', 'run', '运行巡检', datetime.now().isoformat()),
        ('fix_records', 'records', 'fix', '修正记录', datetime.now().isoformat()),
        ('export_data', 'export', 'create', '导出数据', datetime.now().isoformat()),
        ('view_history', 'history', 'view', '查看历史', datetime.now().isoformat()),
        ('manage_users', 'users', 'manage', '用户管理', datetime.now().isoformat()),
    ]
    cursor.executemany('INSERT INTO permissions (permission_name, resource, action, description, created_at) VALUES (?, ?, ?, ?, ?)', default_permissions)
    
    admin_perms = [
        (1, 1, datetime.now().isoformat()),
        (1, 2, datetime.now().isoformat()),
        (1, 3, datetime.now().isoformat()),
        (1, 4, datetime.now().isoformat()),
        (1, 5, datetime.now().isoformat()),
        (1, 6, datetime.now().isoformat()),
        (1, 7, datetime.now().isoformat()),
    ]
    manager_perms = [
        (2, 1, datetime.now().isoformat()),
        (2, 3, datetime.now().isoformat()),
        (2, 4, datetime.now().isoformat()),
        (2, 5, datetime.now().isoformat()),
        (2, 6, datetime.now().isoformat()),
    ]
    supervisor_perms = [
        (3, 1, datetime.now().isoformat()),
        (3, 3, datetime.now().isoformat()),
        (3, 4, datetime.now().isoformat()),
        (3, 6, datetime.now().isoformat()),
    ]
    viewer_perms = [
        (4, 3, datetime.now().isoformat()),
        (4, 6, datetime.now().isoformat()),
    ]
    cursor.executemany('INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)', 
                      admin_perms + manager_perms + supervisor_perms + viewer_perms)
    
    default_users = [
        ('system', '系统默认', 1, None, 1, datetime.now().isoformat()),
        ('admin', '系统管理员', 1, None, 1, datetime.now().isoformat()),
        ('branch_mgr_001', '朝阳支行行长', 2, 'B001', 1, datetime.now().isoformat()),
        ('branch_mgr_002', '海淀支行行长', 2, 'B002', 1, datetime.now().isoformat()),
        ('supervisor_001', '主管-张三', 3, 'B001', 1, datetime.now().isoformat()),
        ('viewer_001', '只读用户', 4, None, 1, datetime.now().isoformat()),
    ]
    cursor.executemany('INSERT INTO users (username, display_name, role_id, branch_id, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?)', default_users)
    
    conn.commit()
    conn.close()
    
    return True, f"数据库初始化完成: {db_path}"


def is_initialized(workspace: Optional[str] = None) -> bool:
    return get_db_path(workspace).exists()
