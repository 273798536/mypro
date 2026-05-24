#!/usr/bin/env python3
"""自动化检查测试脚本：
- 重复导入拦截测试
- 异常保留测试
- 重启后历史查询一致性
- 导出数据与数据库一致性
"""

import sys
import os
import sqlite3
import json
import hashlib
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent / 'src'))

from bank_schedule_inspector.database import init_database, get_connection, get_db_path, is_initialized
from bank_schedule_inspector.importer import import_data, calculate_file_hash, check_duplicate_import
from bank_schedule_inspector.reporting import get_import_history, get_session_details, export_to_excel


def print_test(name, passed, message=""):
    status = "✓ PASS" if passed else "✗ FAIL"
    color = "\033[32m" if passed else "\033[31m"
    reset = "\033[0m"
    print(f"{color}{status}{reset} {name}")
    if message:
        print(f"      {message}")


def test_duplicate_import():
    """测试重复导入拦截功能"""
    print("\n=== 测试1: 重复导入拦截 ===")
    
    test_file = "examples/schedule_data.csv"
    
    result1 = import_data('schedule', test_file, 'test_user', '.', force=False)
    if not result1['success']:
        print_test("首次导入", False, f"失败: {result1.get('error', 'unknown')}")
        return False
    print_test("首次导入成功", True, f"会话ID: {result1['session_id']}")
    
    result2 = import_data('schedule', test_file, 'test_user', '.', force=False)
    if result2['success'] == False and 'existing_session' in result2:
        print_test("重复导入被拦截", True, f"检测到已有会话: {result2['existing_session']['session_uuid'][:8]}...")
    else:
        print_test("重复导入被拦截", False, "重复导入未被正确拦截")
        return False
    
    result3 = import_data('schedule', test_file, 'test_user', '.', force=True)
    if result3['success'] and result3.get('force_imported'):
        print_test("强制覆盖导入", True, f"新会话ID: {result3['session_id']}")
    else:
        print_test("强制覆盖导入", False, f"失败: {result3.get('error', 'unknown')}")
        return False
    
    return True


def test_failed_records_retention():
    """测试失败记录保留功能"""
    print("\n=== 测试2: 失败记录保留 ===")
    
    test_file = "examples/schedule_data.csv"
    result = import_data('schedule', test_file, 'test_user', '.', force=True)
    
    if not result['success']:
        print_test("导入成功", False, f"失败: {result.get('error', 'unknown')}")
        return False
    
    session_id = result['session_id']
    
    conn = get_connection('.')
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM failed_records WHERE session_id = ?', (session_id,))
    failed_count = cursor.fetchone()[0]
    conn.close()
    
    if failed_count > 0:
        print_test("失败记录被保留", True, f"保留了 {failed_count} 条失败记录")
        
        conn = get_connection('.')
        cursor = conn.cursor()
        cursor.execute('SELECT original_line_no, error_message FROM failed_records WHERE session_id = ? LIMIT 1', (session_id,))
        record = cursor.fetchone()
        conn.close()
        
        if record and record['original_line_no'] > 0:
            print_test("原始行号保留", True, f"原始行号: {record['original_line_no']}")
            print_test("错误信息保留", True, f"错误: {record['error_message'][:30]}...")
        else:
            print_test("原始行号保留", False, "原始行号未正确记录")
            return False
    else:
        print_test("失败记录被保留", False, "未保留失败记录")
        return False
    
    return True


def test_restart_history_consistency():
    """测试重启后历史查询一致性"""
    print("\n=== 测试3: 重启后历史一致性 ===")
    
    history_before = get_import_history(limit=10, workspace='.')
    session_count_before = len(history_before)
    
    import os
    import importlib
    import bank_schedule_inspector.database
    import bank_schedule_inspector.reporting
    importlib.reload(bank_schedule_inspector.database)
    importlib.reload(bank_schedule_inspector.reporting)
    
    from bank_schedule_inspector.reporting import get_import_history as get_import_history_reloaded
    history_after = get_import_history_reloaded(limit=10, workspace='.')
    session_count_after = len(history_after)
    
    if session_count_before == session_count_after:
        print_test("重启后历史数量一致", True, f"会话数: {session_count_before}")
        
        if history_before and history_after:
            if history_before[0]['id'] == history_after[0]['id']:
                print_test("重启后历史顺序一致", True, f"最新会话ID: {history_before[0]['id']}")
            else:
                print_test("重启后历史顺序一致", False, "顺序不一致")
                return False
    else:
        print_test("重启后历史数量一致", False, f"前: {session_count_before}, 后: {session_count_after}")
        return False
    
    return True


def test_export_consistency():
    """测试导出数据与数据库一致性"""
    print("\n=== 测试4: 导出数据一致性 ===")
    
    history = get_import_history(limit=1, workspace='.')
    if not history:
        print_test("有数据可导出", False, "无导入历史")
        return False
    
    session_id = history[0]['id']
    session_from_db = get_session_details(session_id, '.')
    
    export_result = export_to_excel(session_id, f'test_export_{session_id}.xlsx', True, '.')
    
    if export_result['success']:
        print_test("导出功能正常", True, f"导出文件: {export_result['output_file']}")
        
        export_file = Path(export_result['output_file'])
        if export_file.exists():
            file_size = export_file.stat().st_size
            print_test("导出文件存在", True, f"文件大小: {file_size} bytes")
            
            if file_size > 1000:
                print_test("导出文件有内容", True, f"文件非空")
            else:
                print_test("导出文件有内容", False, "文件太小，可能为空")
                return False
        else:
            print_test("导出文件存在", False, "文件不存在")
            return False
    else:
        print_test("导出功能正常", False, f"失败: {export_result.get('error', 'unknown')}")
        return False
    
    success_count_in_db = session_from_db.get('success_rows', 0)
    records_count = len(session_from_db.get('success_records', []))
    
    if success_count_in_db == records_count:
        print_test("数据库记录数一致", True, f"成功记录数: {success_count_in_db}")
    else:
        print_test("数据库记录数一致", False, f"记录数: {records_count}, 期望: {success_count_in_db}")
        return False
    
    return True


def test_data_traceability():
    """测试数据可追溯性"""
    print("\n=== 测试5: 数据可追溯性 ===")
    
    conn = get_connection('.')
    cursor = conn.cursor()
    
    cursor.execute('''
    SELECT ts.*, s.source_file, s.imported_at
    FROM teller_schedules ts
    JOIN import_sessions s ON ts.session_id = s.id
    LIMIT 1
    ''')
    record = cursor.fetchone()
    conn.close()
    
    if record:
        print_test("记录可追溯到导入源", True, f"来源文件: {record['source_file']}")
        print_test("记录包含柜员信息", True, f"柜员: {record['teller_name']}({record['teller_id']})")
        print_test("记录包含网点信息", True, f"网点: {record['branch_name']}({record['branch_id']})")
    else:
        print_test("有数据可追溯", False, "无排班数据")
        return False
    
    return True


def main():
    print("=" * 60)
    print("银行网点排班多源导入巡检工具 - 自动化检查")
    print("=" * 60)
    
    if not is_initialized('.'):
        print("初始化数据库...")
        init_database('.')
    
    results = []
    
    results.append(('重复导入拦截', test_duplicate_import()))
    results.append(('失败记录保留', test_failed_records_retention()))
    results.append(('重启历史一致', test_restart_history_consistency()))
    results.append(('导出数据一致', test_export_consistency()))
    results.append(('数据可追溯', test_data_traceability()))
    
    print("\n" + "=" * 60)
    print("测试汇总")
    print("=" * 60)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        print_test(name, result)
    
    print("\n" + "-" * 60)
    print(f"总计: {passed}/{total} 测试通过")
    
    if passed == total:
        print("\033[32m✓ 所有测试通过!\033[0m")
        return 0
    else:
        print(f"\033[31m✗ {total - passed} 项测试失败\033[0m")
        return 1


if __name__ == '__main__':
    sys.exit(main())
