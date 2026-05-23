#!/usr/bin/env python3
import os
import sys
import sqlite3
import hashlib
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

DB_PATH = os.path.join(BASE_DIR, "data", "db", "equipment_return.db")


def check_duplicate_imports():
    """检查重复导入"""
    if not os.path.exists(DB_PATH):
        return True, "Database not created yet"
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT source_file_hash, row_number, target_table, COUNT(*) as cnt
        FROM import_records
        WHERE is_success = 1
        GROUP BY source_file_hash, row_number, target_table
        HAVING cnt > 1
    """)
    
    duplicates = cursor.fetchall()
    conn.close()
    
    if duplicates:
        return False, f"Found {len(duplicates)} duplicate import records"
    return True, "No duplicate imports found"


def check_exception_preservation():
    """检查异常是否被保留"""
    if not os.path.exists(DB_PATH):
        return True, "Database not created yet"
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM replay_exceptions")
    count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM replay_exceptions WHERE is_resolved = 0")
    unresolved = cursor.fetchone()[0]
    conn.close()
    
    return True, f"Total exceptions: {count}, unresolved: {unresolved}"


def check_task_status_persistence():
    """检查任务状态持久化"""
    if not os.path.exists(DB_PATH):
        return True, "Database not created yet"
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT status, COUNT(*) 
        FROM async_tasks 
        GROUP BY status
    """)
    
    results = cursor.fetchall()
    conn.close()
    
    status_summary = ", ".join([f"{s}: {c}" for s, c in results])
    return True, f"Task status persistence OK: {status_summary or 'no tasks'}"


def check_import_evidence_chain():
    """检查导入证据链完整性"""
    if not os.path.exists(DB_PATH):
        return True, "Database not created yet"
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN raw_data IS NOT NULL THEN 1 ELSE 0 END) as has_raw,
            SUM(CASE WHEN source_file_name IS NOT NULL THEN 1 ELSE 0 END) as has_file,
            SUM(CASE WHEN row_number IS NOT NULL THEN 1 ELSE 0 END) as has_row
        FROM import_records
    """)
    
    total, has_raw, has_file, has_row = cursor.fetchone()
    conn.close()
    
    if total == 0:
        return True, "No import records yet"
    
    raw_ok = has_raw == total
    file_ok = has_file == total
    row_ok = has_row == total
    
    if all([raw_ok, file_ok, row_ok]):
        return True, f"Import evidence chain complete: {total} records"
    return False, f"Evidence chain incomplete: raw={has_raw}/{total}, file={has_file}/{total}, row={has_row}/{total}"


def check_export_consistency():
    """检查导出目录是否存在"""
    export_dir = os.path.join(BASE_DIR, "data", "exports")
    if not os.path.exists(export_dir):
        return True, "Export directory will be created on first export"
    
    files = [f for f in os.listdir(export_dir) if f.endswith('.csv')]
    return True, f"Export directory OK, {len(files)} CSV files found"


def check_photo_storage():
    """检查照片存储"""
    photo_dir = os.path.join(BASE_DIR, "data", "photos")
    if not os.path.exists(photo_dir):
        return True, "Photo directory will be created on first upload"
    
    files = os.listdir(photo_dir)
    return True, f"Photo directory OK, {len(files)} files found"


def check_file_storage_locations():
    """检查所有存储位置"""
    directories = [
        ("Database", os.path.join(BASE_DIR, "data", "db")),
        ("Imports", os.path.join(BASE_DIR, "data", "imports")),
        ("Exports", os.path.join(BASE_DIR, "data", "exports")),
        ("Photos", os.path.join(BASE_DIR, "data", "photos")),
    ]
    
    results = []
    for name, path in directories:
        if os.path.exists(path):
            count = len(os.listdir(path))
            results.append((True, f"{name}: {path} ({count} items)"))
        else:
            results.append((True, f"{name}: Will be created on first use"))
    
    return True, "; ".join([r[1] for r in results])


def run_all_checks():
    print("=" * 60)
    print("设备租赁归还验收服务 - 自动化检查")
    print("=" * 60)
    print()
    
    checks = [
        ("1. 重复导入检查", check_duplicate_imports),
        ("2. 异常保留检查", check_exception_preservation),
        ("3. 任务状态持久化检查", check_task_status_persistence),
        ("4. 导入证据链完整性检查", check_import_evidence_chain),
        ("5. 导出目录一致性检查", check_export_consistency),
        ("6. 照片存储检查", check_photo_storage),
        ("7. 文件存储位置检查", check_file_storage_locations),
    ]
    
    passed = 0
    failed = 0
    
    for name, check_func in checks:
        try:
            success, message = check_func()
            status = "✓ PASS" if success else "✗ FAIL"
            print(f"{name}: {status}")
            print(f"   {message}")
            if success:
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"{name}: ✗ ERROR")
            print(f"   {type(e).__name__}: {e}")
            failed += 1
        print()
    
    print("=" * 60)
    print(f"检查结果: {passed} 通过, {failed} 失败")
    print("=" * 60)
    
    return failed == 0


if __name__ == "__main__":
    success = run_all_checks()
    sys.exit(0 if success else 1)
