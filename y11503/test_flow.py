#!/usr/bin/env python3
"""测试完整流程"""
import httpx
import json
import time

BASE = 'http://localhost:8001/api/v1'
batch_no = 'TEST_FLOW_002'
idemp_key = 'IDEMP_FLOW_002'

print('=' * 50)
print('售后备件领用验收回放链路服务 - 流程测试')
print('=' * 50)

print('\n1. 创建批次')
data = {
    'batch_no': batch_no,
    'operator': '服务经理',
    'description': '完整流程测试',
    'idempotency_key': idemp_key,
    'duplicate_strategy': 'ignore',
    'repair_orders': [{
        'order_no': 'RO_FLOW_002',
        'customer_name': '客户A',
        'engineer': '张工',
        'is_late_submit': True
    }],
    'parts': [
        {'part_code': 'SP_FLOW_001', 'part_name': '正常备件', 'quantity': 1, 'is_returned': False, 'is_scrapped': False},
        {'part_code': 'SP_FLOW_002', 'part_name': '退回件', 'quantity': 1, 'is_returned': True, 'is_scrapped': False},
        {'part_code': 'SP_FLOW_003', 'part_name': '报废件', 'quantity': 1, 'is_returned': False, 'is_scrapped': True},
        {'part_code': '', 'part_name': '混淆备件', 'quantity': 0, 'is_returned': True, 'is_scrapped': True},
    ]
}
resp = httpx.post(f'{BASE}/batches', json=data)
result = resp.json()
print(f'   状态码: {resp.status_code}')
print(f'   批次号: {result["batch_no"]}')
print(f'   当前状态: {result["status"]}')
print(f'   备件总数: {result["total_parts"]}')
time.sleep(0.5)

print('\n2. 提交批次 (预期部分失败 - 有无效备件)')
resp = httpx.post(f'{BASE}/batches/{batch_no}/submit', json={'operator': '审核员', 'remark': '首次提交'})
result = resp.json()
print(f'   状态码: {resp.status_code}')
print(f'   当前状态: {result["status"]}')
print(f'   成功备件: {result["success_parts"]}')
print(f'   失败备件: {result["failed_parts"]}')
print(f'   错误信息: {result.get("error_message", "无")[:80]}')
time.sleep(0.5)

print('\n3. 撤回批次')
resp = httpx.post(f'{BASE}/batches/{batch_no}/withdraw', json={'operator': '服务经理', 'reason': '数据需要修正'})
result = resp.json()
print(f'   状态码: {resp.status_code}')
print(f'   当前状态: {result["status"]}')
time.sleep(0.5)

print('\n4. 重新提交')
resp = httpx.post(f'{BASE}/batches/{batch_no}/submit', json={'operator': '审核员', 'remark': '修正后重新提交'})
result = resp.json()
print(f'   状态码: {resp.status_code}')
print(f'   当前状态: {result["status"]}')
print(f'   成功备件: {result["success_parts"]}')
print(f'   失败备件: {result["failed_parts"]}')
time.sleep(0.5)

print('\n5. 人工改判通过')
resp = httpx.post(f'{BASE}/batches/{batch_no}/judge', json={'operator': '服务经理', 'approved': True, 'reason': '情况属实，予以通过'})
result = resp.json()
print(f'   状态码: {resp.status_code}')
print(f'   当前状态: {result["status"]}')
time.sleep(0.5)

print('\n6. 冻结批次 (准备导出)')
resp = httpx.post(f'{BASE}/batches/{batch_no}/freeze', json={'operator': '服务经理', 'reason': '对账完成，冻结导出'})
result = resp.json()
print(f'   状态码: {resp.status_code}')
print(f'   当前状态: {result["status"]}')
time.sleep(0.5)

print('\n7. 操作日志')
resp = httpx.get(f'{BASE}/batches/{batch_no}/logs')
logs = resp.json()
for log in logs:
    old = log['old_status'] or '-'
    new = log['new_status'] or '-'
    ts = log['created_at'][11:19]
    print(f'   [{ts}] {log["operation"]:8s} {old:12s} -> {new:12s} by {log["operator"]}')

print('\n8. 对账统计')
resp = httpx.get(f'{BASE}/reconcile')
result = resp.json()
print(f'   总批次: {result["total_batches"]}')
print(f'   总备件: {result["total_parts"]}')
print(f'   退回件: {result["returned_parts"]}')
print(f'   报废件: {result["scrapped_parts"]}')
print(f'   混淆件: {result["mixed_parts"]}')
print(f'   先领后补: {result["late_submit_orders"]}')
print(f'   状态统计: {json.dumps(result["status_summary"], ensure_ascii=False)}')

print('\n9. 导出Excel')
resp = httpx.post(f'{BASE}/batches/{batch_no}/export')
print(f'   状态码: {resp.status_code}')
if resp.status_code == 200:
    filename = resp.headers.get('content-disposition', '').split('filename=')[-1].strip('"')
    with open(f'exports/{filename}', 'wb') as f:
        f.write(resp.content)
    print(f'   导出成功: exports/{filename}')
else:
    print(f'   导出结果: {resp.text[:100]}')

print('\n10. 幂等性测试 - 重复创建 (ignore策略)')
resp = httpx.post(f'{BASE}/batches', json=data)
result = resp.json()
print(f'   状态码: {resp.status_code}')
print(f'   批次号: {result["batch_no"]}')
print(f'   备件总数: {result["total_parts"]} (说明: 数量不变表示ignore生效)')

print('\n' + '=' * 50)
print('测试完成!')
print(f'查看详情: http://localhost:8001/api/v1/batches/{batch_no}')
print('=' * 50)
