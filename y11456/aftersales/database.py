import sqlite3
import os
from contextlib import contextmanager
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'aftersales.db')


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with get_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS batches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_no TEXT UNIQUE NOT NULL,
                created_at TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                description TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS source_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id INTEGER NOT NULL,
                file_type TEXT NOT NULL,
                file_name TEXT NOT NULL,
                file_hash TEXT NOT NULL,
                imported_at TEXT NOT NULL,
                total_rows INTEGER NOT NULL,
                FOREIGN KEY (batch_id) REFERENCES batches(id),
                UNIQUE(batch_id, file_type, file_hash)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS raw_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id INTEGER NOT NULL,
                source_file_id INTEGER NOT NULL,
                source_type TEXT NOT NULL,
                original_row_no INTEGER NOT NULL,
                order_no TEXT,
                sku_code TEXT,
                sku_name TEXT,
                refund_amount REAL,
                refund_reason TEXT,
                problem_type TEXT,
                quantity INTEGER,
                user_remark TEXT,
                warehouse_remark TEXT,
                leader_remark TEXT,
                external_receipt TEXT,
                parsed_data TEXT NOT NULL,
                raw_data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (batch_id) REFERENCES batches(id),
                FOREIGN KEY (source_file_id) REFERENCES source_files(id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS aftersales_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id INTEGER NOT NULL,
                order_no TEXT NOT NULL,
                sku_code TEXT NOT NULL,
                sku_name TEXT,
                combined_refund_amount REAL,
                leader_refund_amount REAL,
                warehouse_refund_amount REAL,
                problem_type TEXT,
                final_problem_type TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                is_frozen INTEGER NOT NULL DEFAULT 0,
                is_exported INTEGER NOT NULL DEFAULT 0,
                leader_remark TEXT,
                warehouse_remark TEXT,
                user_remark TEXT,
                external_receipt TEXT,
                quantity INTEGER,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (batch_id) REFERENCES batches(id),
                UNIQUE(batch_id, order_no, sku_code)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS check_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                check_type TEXT NOT NULL,
                check_result TEXT NOT NULL,
                detail TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (order_id) REFERENCES aftersales_orders(id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS adjustments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                adjust_type TEXT NOT NULL,
                old_value TEXT,
                new_value TEXT,
                operator TEXT,
                reason TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (order_id) REFERENCES aftersales_orders(id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS export_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id INTEGER NOT NULL,
                export_time TEXT NOT NULL,
                export_type TEXT NOT NULL,
                record_count INTEGER NOT NULL,
                file_path TEXT,
                operator TEXT,
                FOREIGN KEY (batch_id) REFERENCES batches(id)
            )
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_raw_batch ON raw_records(batch_id)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_raw_order ON raw_records(order_no)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_orders_batch ON aftersales_orders(batch_id)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_orders_status ON aftersales_orders(status)
        ''')
        
        conn.commit()


@contextmanager
def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def get_db_path():
    return DB_PATH
