#!/usr/bin/env python3
"""用 TestClient 验证核心接口"""
import sys
sys.path.insert(0, '.')

from fastapi.testclient import TestClient
from main import app
from database import init_db
import json

init_db()
client = TestClient(app)

print('=' * 50)
print('TestClient 接口验证测试')
print('=' * 50)

print('\n1. 测试 health 接口')
resp = client.get('/health')
print(f'   状态: {resp.status_code}')
assert resp.status_code == 200
assert resp.json()['status'] == 'healthy'
print('   ✅ 通过')

print('\n2. 测试创建批次')
data = {
    'batch_no': 'TESTCLIENT_001',
    'operator': '测试员',
    'description': 'TestClient测试批次',
    'idempotency_key': 'IDEMP_TESTCLIENT_001',
    'duplicate_strategy': 'ignore',
    'repair_orders': [{'order_no': 'RO_TC_001', 'customer_name': '客户A', 'engineer': '张工'}],
    'parts': [
        {'part_code': 'TC_SP001', 'part_name': '正常件', 'quantity': 1, 'is_returned': False, 'is_scrapped': False},
        {'part_code': 'TC_SP002', 'part_name': '退回件', 'quantity': 1, 'is_returned': True, 'is_scrapped': False},
        {'part_code': 'TC_SP003', 'part_name': '报废件', 'quantity': 1, 'is_returned': False, 'is_scrapped': True},
    ]
}
resp = client.post('/api/v1/batches', json=data)
print(f'   状态: {resp.status_code}')
assert resp.status_code == 201
result = resp.json()
assert result['batch_no'] == 'TESTCLIENT_001'
assert result['total_parts'] == 3
print('   ✅ 通过')

print('\n3. 测试提交批次 (验证校验口径)')
resp = client.post('/api/v1/batches/TESTCLIENT_001/submit', json={'operator': '审核员'})
print(f'   状态: {resp.status_code}')
result = resp.json()
assert resp.status_code == 200
assert result['status'] == 'submitted'
assert result['success_parts'] == 3
assert result['failed_parts'] == 0

parts = {p['part_code']: p for p in result['parts']}
assert parts['TC_SP001']['validation_result'] == 'pass'
assert parts['TC_SP002']['validation_result'] == 'pass'  # 修复前是 fail
assert parts['TC_SP003']['validation_result'] == 'pass'  # 修复前是 fail
print('   ✅ 校验口径正确 - 退回件/报废件 validation_result=pass')

print('\n4. 测试获取批次详情')
resp = client.get('/api/v1/batches/TESTCLIENT_001')
print(f'   状态: {resp.status_code}')
assert resp.status_code == 200
result = resp.json()
assert result['status'] == 'submitted'
assert len(result['operation_logs']) >= 2  # CREATE + SUBMIT
print('   ✅ 通过')

print('\n5. 测试对账接口')
resp = client.get('/api/v1/reconcile')
print(f'   状态: {resp.status_code}')
assert resp.status_code == 200
result = resp.json()
assert result['total_batches'] >= 1
assert result['returned_parts'] >= 1
assert result['scrapped_parts'] >= 1
print(f'   对账结果: {json.dumps(result, ensure_ascii=False, indent=6)}')
print('   ✅ 通过')

print('\n6. 测试撤回 + 修正 + 重新提交 (withdrawn→revised→submit 链路)')
resp = client.post('/api/v1/batches/TESTCLIENT_001/withdraw', json={'operator': '服务经理', 'reason': '测试修正链路'})
assert resp.status_code == 200
assert resp.json()['status'] == 'withdrawn'
print(f'   撤回成功: withdrawn')

part_id = parts['TC_SP001']['id']
revise_data = {
    'operator': '服务经理',
    'remark': '测试修正',
    'parts': [
        {'id': part_id, 'part_code': 'TC_SP001', 'part_name': '已修正备件', 'quantity': 2, 'is_returned': False, 'is_scrapped': False},
        {'part_code': 'TC_SP004', 'part_name': '追加备件', 'quantity': 1}
    ]
}
resp = client.post('/api/v1/batches/TESTCLIENT_001/revise', json=revise_data)
assert resp.status_code == 200
result = resp.json()
assert result['status'] == 'revised'
assert result['total_parts'] == 4
print(f'   修正成功: revised, 备件数={result["total_parts"]}')

# 验证 revised 状态可以提交
resp = client.post('/api/v1/batches/TESTCLIENT_001/submit', json={'operator': '审核员'})
assert resp.status_code == 200
result = resp.json()
assert result['status'] == 'submitted'  # 修复前会报错无法提交
print(f'   重提成功: submitted (修复前 revised 状态无法提交)')
print('   ✅ withdrawn→revised→submit 链路完整可用')

print('\n' + '=' * 50)
print('✅ 所有 TestClient 接口验证通过!')
print('=' * 50)
