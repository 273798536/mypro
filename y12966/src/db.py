import sqlite3
import os
import json
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'warehouse_lineage.db')
SCHEMA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'database', 'schema.sql')


@contextmanager
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def init_database():
    if os.path.exists(DB_PATH):
        print(f"数据库已存在: {DB_PATH}")
        return False
    
    with open(SCHEMA_PATH, 'r') as f:
        schema_sql = f.read()
    
    with get_db_connection() as conn:
        conn.executescript(schema_sql)
    
    print(f"数据库初始化完成: {DB_PATH}")
    return True


def row_to_dict(row):
    if row is None:
        return None
    return {key: row[key] for key in row.keys()}


def rows_to_dict_list(rows):
    return [row_to_dict(row) for row in rows]


def execute_query(sql, params=None, fetch=True):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        if params:
            cursor.execute(sql, params)
        else:
            cursor.execute(sql)
        
        if fetch:
            return rows_to_dict_list(cursor.fetchall())
        return cursor.rowcount


def execute_insert(sql, params=None):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        if params:
            cursor.execute(sql, params)
        else:
            cursor.execute(sql)
        return cursor.lastrowid
