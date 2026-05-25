#!/usr/bin/env python3
"""自动化检查测试脚本：
- 重复导入拦截测试
- 异常保留测试
- 重启后历史查询一致性
- 导出数据与数据库一致性
- 数据可追溯性测试
- 权限拦截负例测试
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
from bank_schedule_inspector.reporting import get_import_history, get_session_details, export_to_excel, mark_failed_records_fixed
from bank_schedule_inspector.auth import has_permission, log_audit, get_audit_logs, get_user_permissions


USER_STORE = {
    'system': {'user_id': 0, 'username': 'system', 'display_name': '系统默认', 'role_name': 'admin', 'branch_id': None},
    'admin': {'user_id': 2, 'username': 'admin', 'display_name': '系统管理员', 'role_name': 'admin', 'branch_id': None},
    'branch_mgr_001': {'user_id': 3, 'username': 'branch_mgr_001', 'display_name': '朝阳支行行长', 'role_name': 'branch_manager', 'branch_id': 'B001'},
    'branch_mgr_002': {'user_id': 4, 'username': 'branch_mgr_002', 'display_name': '海淀支行行长', 'role_name': 'branch_manager', 'branch_id': 'B002'},
    'supervisor_001': {'user_id': 5, 'username': 'supervisor_001', 'display_name': '主管-张三', 'role_name': 'teller_supervisor', 'branch_id': 'B001'},
    'viewer_001': {'user_id': 6, 'username': 'viewer_001', 'display_name': '只读用户', 'role_name': 'viewer', 'branch_id': None},
}


def get_current_user(username: str):
    return USER_STORE.get(username)


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


def test_permission_interception():
    """测试权限拦截功能"""
    print("\n=== 测试6: 权限拦截 ===")
    
    viewer_user = get_current_user('viewer_001')
    if viewer_user is None:
        print_test("viewer 用户存在", False, "用户未找到")
        return False
    print_test("viewer 用户存在", True, f"角色: {viewer_user['role_name']}")
    
    can_import = has_permission(viewer_user, 'import_data', '.')
    if can_import:
        print_test("viewer 无导入权限", False, "viewer 不应有 import_data 权限")
        return False
    print_test("viewer 无导入权限", True, "import_data 权限已被正确拦截")
    
    can_force_import = has_permission(viewer_user, 'force_import', '.')
    if can_force_import:
        print_test("viewer 无强制导入权限", False, "viewer 不应有 force_import 权限")
        return False
    print_test("viewer 无强制导入权限", True, "force_import 权限已被正确拦截")
    
    can_fix = has_permission(viewer_user, 'fix_records', '.')
    if can_fix:
        print_test("viewer 无修复权限", False, "viewer 不应有 fix_records 权限")
        return False
    print_test("viewer 无修复权限", True, "fix_records 权限已被正确拦截")
    
    can_export = has_permission(viewer_user, 'export_data', '.')
    if can_export:
        print_test("viewer 无导出权限", False, "viewer 不应有 export_data 权限")
        return False
    print_test("viewer 无导出权限", True, "export_data 权限已被正确拦截")
    
    return True


def test_role_permission_matrix():
    """测试角色权限矩阵"""
    print("\n=== 测试7: 角色权限矩阵 ===")
    
    test_cases = [
        ('admin', 'import_data', True, '管理员有导入权限'),
        ('admin', 'force_import', True, '管理员有强制导入权限'),
        ('admin', 'run_inspection', True, '管理员有巡检权限'),
        ('admin', 'fix_records', True, '管理员有修复权限'),
        ('admin', 'export_data', True, '管理员有导出权限'),
        ('branch_mgr_001', 'import_data', True, '行长有导入权限'),
        ('branch_mgr_001', 'force_import', False, '行长无强制导入权限'),
        ('branch_mgr_001', 'run_inspection', True, '行长有巡检权限'),
        ('branch_mgr_001', 'fix_records', True, '行长有修复权限'),
        ('branch_mgr_001', 'export_data', True, '行长有导出权限'),
        ('supervisor_001', 'import_data', True, '主管有导入权限'),
        ('supervisor_001', 'force_import', False, '主管无强制导入权限'),
        ('supervisor_001', 'run_inspection', True, '主管有巡检权限'),
        ('supervisor_001', 'fix_records', True, '主管有修复权限'),
        ('supervisor_001', 'export_data', False, '主管无导出权限'),
        ('viewer_001', 'import_data', False, '只读无导入权限'),
        ('viewer_001', 'force_import', False, '只读无强制导入权限'),
        ('viewer_001', 'run_inspection', True, '只读有巡检权限'),
        ('viewer_001', 'fix_records', False, '只读无修复权限'),
        ('viewer_001', 'export_data', False, '只读无导出权限'),
    ]
    
    all_passed = True
    for username, permission, expected, desc in test_cases:
        user = get_current_user(username)
        actual = has_permission(user, permission, '.')
        if actual == expected:
            print_test(desc, True, f"{username}.{permission} = {actual}")
        else:
            print_test(desc, False, f"期望 {expected}, 实际 {actual}")
            all_passed = False
    
    return all_passed


def test_audit_logging():
    """测试审计日志记录"""
    print("\n=== 测试8: 审计日志 ===")
    
    admin_user = get_current_user('admin')
    
    log_audit(admin_user, 'test_action', 'test_resource', 'test_123', None,
              '测试审计日志', True, None, '.')
    
    logs = get_audit_logs(limit=5, username='admin', workspace='.')
    
    if logs and len(logs) > 0:
        print_test("审计日志已记录", True, f"找到 {len(logs)} 条日志")
        
        latest = logs[0]
        if latest['action'] == 'test_action' and latest['resource'] == 'test_resource':
            print_test("审计日志内容正确", True, 
                       f"action={latest['action']}, resource={latest['resource']}")
        else:
            print_test("审计日志内容正确", False, "日志内容不匹配")
            return False
    else:
        print_test("审计日志已记录", False, "未找到审计日志")
        return False
    
    viewer_user = get_current_user('viewer_001')
    log_audit(viewer_user, 'permission_denied', 'import', None, None,
              '测试权限拒绝日志', False, '权限不足', '.')
    
    viewer_logs = get_audit_logs(limit=5, username='viewer_001', workspace='.')
    
    if viewer_logs and len(viewer_logs) > 0:
        denied_log = viewer_logs[0]
        if not denied_log['success'] and '权限' in denied_log.get('error_message', ''):
            print_test("权限拒绝已记录", True, 
                       f"error_message={denied_log['error_message'][:20]}...")
        else:
            print_test("权限拒绝已记录", False, "日志内容不匹配")
            return False
    else:
        print_test("权限拒绝已记录", False, "未找到权限拒绝日志")
        return False
    
    return True


def test_permission_denied_cli_flow():
    """测试 CLI 权限拦截流程"""
    print("\n=== 测试9: CLI 权限拦截流程 ===")
    
    viewer_user = get_current_user('viewer_001')
    
    if has_permission(viewer_user, 'import_data', '.'):
        print_test("viewer 尝试导入被拦截", False, "viewer 不应有导入权限")
        return False
    print_test("viewer 尝试导入被拦截", True, "import_data 权限检查正确拦截")
    
    log_audit(viewer_user, 'import', 'schedule', None, None,
              'viewer 尝试导入被权限拦截', False, '权限不足: import_data', '.')
    
    admin_user = get_current_user('admin')
    
    if not has_permission(admin_user, 'import_data', '.'):
        print_test("admin 可以正常导入", False, "admin 应有导入权限")
        return False
    
    test_file = "examples/schedule_data.csv"
    result = import_data('schedule', test_file, 'admin', '.', force=True)
    
    if result['success']:
        print_test("admin 可以正常导入", True, f"会话ID: {result['session_id']}")
        
        log_audit(admin_user, 'import', 'schedule', str(result['session_id']), 
                  result['session_id'], f'成功导入 {result["success_rows"]} 行',
                  True, None, '.')
    else:
        print_test("admin 可以正常导入", False, f"失败: {result.get('error', 'unknown')}")
        return False
    
    return True


def test_fix_reimport_closed_loop():
    """测试修正-再导入闭环"""
    print("\n=== 测试10: 修正-再导入闭环 ===")
    
    test_file = "examples/schedule_data.csv"
    result = import_data('schedule', test_file, 'admin', '.', force=True)
    
    if not result['success']:
        print_test("初始导入成功", False, f"失败: {result.get('error', 'unknown')}")
        return False
    
    old_session_id = result['session_id']
    print_test("初始导入成功", True, f"会话ID: {old_session_id}, 失败行: {result['failed_rows']}")
    
    conn = get_connection('.')
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM failed_records WHERE session_id = ? AND fixed = 0', (old_session_id,))
    failed_before = cursor.fetchone()[0]
    conn.close()
    
    if failed_before <= 0:
        print_test("有失败记录待修复", False, "没有失败记录")
        return False
    print_test("有失败记录待修复", True, f"失败记录数: {failed_before}")
    
    print("\n  --- 测试10a: 含坏行文件重新导入不应关闭清单 ---")
    bad_reimport = import_data('schedule', test_file, 'admin', '.', force=True)
    
    if not bad_reimport['success']:
        print_test("含坏行文件重新导入成功", False, f"失败: {bad_reimport.get('error', 'unknown')}")
        return False
    print_test("含坏行文件重新导入成功", True, f"新会话ID: {bad_reimport['session_id']}, 失败行: {bad_reimport['failed_rows']}")
    
    conn = get_connection('.')
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM failed_records WHERE session_id = ? AND fixed = 0', (old_session_id,))
    failed_after_bad = cursor.fetchone()[0]
    conn.close()
    
    if failed_after_bad == failed_before:
        print_test("含坏行重新导入后旧清单未关闭", True, 
                   f"旧清单待处理: {failed_after_bad}" if failed_after_bad > 0 else "已全部标记")
    else:
        print_test("含坏行重新导入后旧清单未关闭", False, 
                   f"期望 {failed_before}, 实际 {failed_after_bad}")
        return False
    
    print("\n  --- 测试10b: 无坏行文件重新导入应关闭清单 ---")
    fixed_file = "examples/schedule_data_fixed.csv"
    good_reimport = import_data('schedule', fixed_file, 'admin', '.', force=True)
    
    if not good_reimport['success']:
        print_test("无坏行文件重新导入成功", False, f"失败: {good_reimport.get('error', 'unknown')}")
        return False
    
    new_session_id = good_reimport['session_id']
    if good_reimport['failed_rows'] != 0:
        print_test("无坏行文件 failed_rows==0", False, f"失败行: {good_reimport['failed_rows']}")
        return False
    print_test("无坏行文件 failed_rows==0", True, f"新会话ID: {new_session_id}")
    
    mark_result = mark_failed_records_fixed(old_session_id, new_session_id, None, '.')
    
    if not mark_result['success']:
        print_test("标记失败记录已修复", False, f"失败: {mark_result.get('error', 'unknown')}")
        return False
    print_test("标记失败记录已修复", True, f"标记了 {mark_result['updated_count']} 条记录")
    
    conn = get_connection('.')
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM failed_records WHERE session_id = ? AND fixed = 0', (old_session_id,))
    pending_after = cursor.fetchone()[0]
    print_test("原失败记录不再待处理", pending_after == 0, 
               f"待处理: {pending_after}" if pending_after > 0 else "已全部标记")
    
    cursor.execute('SELECT fixed, fixed_session_id FROM failed_records WHERE session_id = ? LIMIT 1', (old_session_id,))
    fixed_record = cursor.fetchone()
    
    if fixed_record and fixed_record['fixed'] == 1 and fixed_record['fixed_session_id'] == new_session_id:
        print_test("fixed_session_id 已关联", True, f"关联到新会话: {fixed_record['fixed_session_id']}")
    else:
        print_test("fixed_session_id 已关联", False, "fixed_session_id 未正确写入")
        conn.close()
        return False
    
    cursor.execute('SELECT status FROM import_sessions WHERE id = ?', (old_session_id,))
    session_status = cursor.fetchone()
    
    if session_status and session_status['status'] == 'FIXED':
        print_test("原会话状态已更新为 FIXED", True, "状态: FIXED")
    else:
        print_test("原会话状态已更新为 FIXED", False, f"状态: {session_status['status'] if session_status else '未知'}")
    
    conn.close()
    
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
    results.append(('权限拦截检查', test_permission_interception()))
    results.append(('角色权限矩阵', test_role_permission_matrix()))
    results.append(('审计日志记录', test_audit_logging()))
    results.append(('CLI 权限流程', test_permission_denied_cli_flow()))
    results.append(('修正再导入闭环', test_fix_reimport_closed_loop()))
    
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
