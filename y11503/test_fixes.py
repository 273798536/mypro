#!/usr/bin/env python3
"""验证所有修复的测试脚本"""
import httpx
import json
import time

BASE = 'http://localhost:8001/api/v1'
batch_no = 'FIX_TEST_001'
idemp_key = 'IDEMP_FIX_001'

print('=' * 60)
print('售后备件领用验收回放链路服务 - 修复验证测试')
print('=' * 60)

print('\n=== 0. 健康检查 ===')
resp = httpx.get('http://localhost:8001/health')
print(f'  状态: {resp.status_code} - {resp.json()["status"]}')
assert resp.status_code == 200, '健康检查失败'

print('\n=== 1. 创建批次 (包含正常件/退回件/报废件/混淆脏件) ===')
data = {
    'batch_no': batch_no,
    'operator': '服务经理',
    'description': '修复验证测试批次',
    'idempotency_key': idemp_key,
    'duplicate_strategy': 'ignore',
    'repair_orders': [{'order_no': 'RO_FIX_001', 'customer_name': '客户A', 'engineer': '张工', 'is_late_submit': True}],
    'parts': [
        {'part_code': 'FIX_SP001', 'part_name': '正常领用件', 'quantity': 1, 'is_returned': False, 'is_scrapped': False},
        {'part_code': 'FIX_SP002', 'part_name': '退回件', 'quantity': 1, 'is_returned': True, 'is_scrapped': False},
        {'part_code': 'FIX_SP003', 'part_name': '报废件', 'quantity': 1, 'is_returned': False, 'is_scrapped': True},
        {'part_code': 'FIX_SP004', 'part_name': '混淆脏件', 'quantity': 1, 'is_returned': True, 'is_scrapped': True},
    ]
}
resp = httpx.post(f'{BASE}/batches', json=data)
result = resp.json()
print(f'  创建成功: {result["batch_no"]}')
print(f'  备件总数: {result["total_parts"]}')
assert result['status'] == 'draft'
assert result['total_parts'] == 4
part_ids = {p['part_code']: p['id'] for p in result['parts']}
dirty_part_id = part_ids['FIX_SP004']
print(f'  脏件ID: {dirty_part_id}')

print('\n=== 2. 提交批次 (验证校验口径) ===')
resp = httpx.post(f'{BASE}/batches/{batch_no}/submit', json={'operator': '审核员'})
result = resp.json()
print(f'  提交后状态: {result["status"]}')
print(f'  成功: {result["success_parts"]}, 失败: {result["failed_parts"]}')

parts = {p['part_code']: p for p in result['parts']}

print('\n  验证各备件 validation_result:')
for code in ['FIX_SP001', 'FIX_SP002', 'FIX_SP003', 'FIX_SP004']:
    p = parts[code]
    status = p['status']
    vr = p['validation_result']
    vm = p['validation_message']
    is_mixed = p['is_mixed']
    print(f'    {code}: status={status}, validation_result={vr}, is_mixed={is_mixed}')
    print(f'      message: {vm}')

assert parts['FIX_SP001']['validation_result'] == 'pass', '正常件应该是pass'
assert parts['FIX_SP001']['status'] == 'normal'

assert parts['FIX_SP002']['validation_result'] == 'pass', '退回件应该是pass (修复前是fail)'
assert parts['FIX_SP002']['status'] == 'returned'

assert parts['FIX_SP003']['validation_result'] == 'pass', '报废件应该是pass (修复前是fail)'
assert parts['FIX_SP003']['status'] == 'scrapped'

assert parts['FIX_SP004']['validation_result'] == 'fail', '混淆件应该是fail'
assert parts['FIX_SP004']['is_mixed'] == True, '混淆件应该标记is_mixed'

assert result['success_parts'] == 3, '应该有3个成功备件'
assert result['failed_parts'] == 1, '应该有1个失败备件'
assert result['status'] == 'partial_failed'
print('\n  ✅ 校验口径修复验证通过!')

print('\n=== 3. 撤回批次 ===')
resp = httpx.post(f'{BASE}/batches/{batch_no}/withdraw', json={'operator': '服务经理', 'reason': '需要修正混淆脏件'})
result = resp.json()
print(f'  撤回后状态: {result["status"]}')
assert result['status'] == 'withdrawn'

print('\n=== 4. 修正批次 (更新旧脏件 + 追加新件) ===')
revise_data = {
    'operator': '服务经理',
    'remark': '修正混淆脏件，解除双标记',
    'parts': [
        {
            'id': dirty_part_id,
            'part_code': 'FIX_SP004',
            'part_name': '修正后的脏件',
            'quantity': 1,
            'is_returned': False,
            'is_scrapped': True,
            'remark': '修正为仅报废'
        },
        {
            'part_code': 'FIX_SP005',
            'part_name': '新增修正件',
            'quantity': 1,
            'is_returned': False,
            'is_scrapped': False,
            'remark': '追加的新件'
        }
    ]
}
resp = httpx.post(f'{BASE}/batches/{batch_no}/revise', json=revise_data)
result = resp.json()
print(f'  修正后状态: {result["status"]}')
print(f'  备件总数: {result["total_parts"]}')

parts_after_revise = {p['part_code']: p for p in result['parts']}
fixed_part = parts_after_revise['FIX_SP004']
print(f'  脏件修正后: is_returned={fixed_part["is_returned"]}, is_scrapped={fixed_part["is_scrapped"]}, is_mixed={fixed_part["is_mixed"]}')
print(f'  脏件修正后状态: {fixed_part["status"]}, validation_result: {fixed_part["validation_result"]}')

assert result['status'] == 'revised', '修正后状态应该是revised'
assert result['total_parts'] == 5, '应该有5个备件 (4原+1新增)'
assert fixed_part['is_returned'] == False, '脏件应该解除is_returned标记'
assert fixed_part['is_scrapped'] == True, '脏件应该保留is_scrapped标记'
assert fixed_part['is_mixed'] == False, '脏件修正后is_mixed应该为False'
assert fixed_part['status'] == 'pending', '修正后脏件状态应为pending待重新校验'
assert 'FIX_SP005' in parts_after_revise, '应该包含新增的备件'
print('  ✅ 修正旧脏件功能验证通过!')

print('\n=== 5. 从 revised 状态重新提交 (验证 revised 可提交) ===')
try:
    resp = httpx.post(f'{BASE}/batches/{batch_no}/submit', json={'operator': '审核员', 'remark': '修正后重新提交'})
    result = resp.json()
    print(f'  提交后状态: {result["status"]}')
    print(f'  成功: {result["success_parts"]}, 失败: {result["failed_parts"]}')
    assert result['status'] in ['submitted', 'partial_failed'], 'revised状态应该可以提交'
    assert result['success_parts'] == 5, '修正后所有备件应该都通过'
    assert result['failed_parts'] == 0, '修正后不应该有失败备件'
    print('  ✅ revised→submit 链路验证通过!')
except Exception as e:
    print(f'  ❌ 提交失败: {e}')
    raise

print('\n=== 6. 查看操作日志 (验证完整追溯) ===')
resp = httpx.get(f'{BASE}/batches/{batch_no}/logs')
logs = resp.json()
print(f'  共 {len(logs)} 条操作记录:')
for log in logs:
    old = log['old_status'] or '-'
    new = log['new_status'] or '-'
    ts = log['created_at'][11:19]
    print(f'    [{ts}] {log["operation"]:8s} {old:12s} -> {new:12s} by {log["operator"]}')

operations = [log['operation'] for log in logs]
assert 'CREATE' in operations
assert 'SUBMIT' in operations
assert 'WITHDRAW' in operations
assert 'REVISE' in operations
assert 'SUBMIT' in operations[1:]  # 第二次提交
print('  ✅ 操作日志完整可追溯!')

print('\n=== 7. 冻结 + 导出 (验证一致性) ===')
resp = httpx.post(f'{BASE}/batches/{batch_no}/freeze', json={'operator': '服务经理', 'reason': '对账完成'})
print(f'  冻结后状态: {resp.json()["status"]}')
assert resp.json()['status'] == 'frozen'

resp = httpx.post(f'{BASE}/batches/{batch_no}/export')
print(f'  导出状态: {resp.status_code}')
assert resp.status_code == 200
import os
filename = f'exports/batch_{batch_no}_{time.strftime("%Y%m%d")}.xlsx'
with open(filename, 'wb') as f:
    f.write(resp.content)
print(f'  导出成功: {filename} ({os.path.getsize(filename)} bytes)')

print('\n=== 8. 对账统计 ===')
resp = httpx.get(f'{BASE}/reconcile')
result = resp.json()
print(f'  总批次: {result["total_batches"]}')
print(f'  总备件: {result["total_parts"]}')
print(f'  退回件: {result["returned_parts"]}')
print(f'  报废件: {result["scrapped_parts"]}')
print(f'  混淆件: {result["mixed_parts"]}')
print(f'  先领后补: {result["late_submit_orders"]}')
print(f'  状态统计: {json.dumps(result["status_summary"], ensure_ascii=False)}')
assert result['total_batches'] == 1
assert result['total_parts'] == 5
assert result['mixed_parts'] == 0  # 脏件已修正
print('  ✅ 对账统计正确!')

print('\n=== 9. 幂等性验证 ===')
resp = httpx.post(f'{BASE}/batches', json=data)
result = resp.json()
print(f'  重复提交后备件数: {result["total_parts"]} (原批次仍为5，说明ignore生效)')
assert result['total_parts'] == 5
print('  ✅ 幂等性验证通过!')

print('\n' + '=' * 60)
print('✅ 所有修复验证通过!')
print('=' * 60)
print(f'批次详情: {BASE}/batches/{batch_no}')
print(f'操作日志: {BASE}/batches/{batch_no}/logs')
print(f'导出文件: {filename}')
