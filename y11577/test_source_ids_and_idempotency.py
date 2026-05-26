import sys
import os
if os.path.exists('./outsource_settlement.db'):
    os.remove('./outsource_settlement.db')

from app.main import app
from fastapi.testclient import TestClient
from app.database import Base, engine, SessionLocal
from app.models.business import (
    CompensationQueue,
    SettlementSummary
)
from scripts.init_data import init_roles_and_permissions, create_test_user

Base.metadata.create_all(bind=engine)

db = SessionLocal()
init_roles_and_permissions(db)
create_test_user(db)
db.commit()
db.close()

client = TestClient(app)

print('=' * 60)
print('测试场景：扣款 → 返修 → 送货 顺序处理的source_ids完整性')
print('=' * 60)

# 1. 主管登录
response = client.post(
    '/api/v1/auth/login',
    data={'username': 'admin', 'password': 'admin123'}
)
admin_token = response.json()['access_token']
admin_headers = {'Authorization': f'Bearer {admin_token}'}
print('✓ 主管登录成功')

# 2. 创建送货单
print('\n--- 步骤1: 创建外协送货单 ---')
delivery_data = {
    'delivery_no': 'WH20240526001',
    'supplier_code': 'SUP001',
    'supplier_name': '精工机械有限公司',
    'product_code': 'PROD001',
    'product_name': '齿轮轴A',
    'delivery_date': '2024-05-26',
    'quantity': 100,
    'unit_price': 50.00,
    'total_amount': 5000.00,
    'batch_no': 'BATCH20240526',
    'work_order_no': 'WO20240526001',
    'status': 'pending'
}
response = client.post('/api/v1/deliveries/', json=delivery_data, headers=admin_headers)
print(f'创建送货单: {response.status_code}')
delivery_id = response.json()['data']['id']
print(f'送货单ID: {delivery_id}, 金额: 5000.00')

# 3. 创建返修记录
print('\n--- 步骤2: 创建返修记录 ---')
repair_data = {
    'repair_no': 'FX20240526001',
    'delivery_id': delivery_id,
    'repair_date': '2024-05-26',
    'repair_type': '尺寸超差',
    'repair_reason': '热处理变形',
    'repair_quantity': 50,
    'repair_cost': 500.00,
    'responsible_party': '供应商',
    'batch_no': 'BATCH20240526-FX01',
    'status': 'pending'
}
response = client.post('/api/v1/repairs/', json=repair_data, headers=admin_headers)
print(f'创建返修记录: {response.status_code}')
repair_id = response.json()['data']['id']
print(f'返修记录ID: {repair_id}, 费用: 500.00')

# 4. 创建扣款明细
print('\n--- 步骤3: 创建扣款明细 ---')
deduction_data = {
    'deduction_no': 'KK20240526001',
    'delivery_id': delivery_id,
    'repair_id': repair_id,
    'deduction_type': '返修扣款',
    'deduction_date': '2024-05-26',
    'deduction_amount': 500.00,
    'deduction_reason': '返修费用扣款',
    'deduction_basis': '质量协议第3条',
    'status': 'pending'
}
response = client.post('/api/v1/deductions/', json=deduction_data, headers=admin_headers)
print(f'创建扣款明细: {response.status_code}')
deduction_id = response.json()['data']['id']
print(f'扣款明细ID: {deduction_id}, 扣款: 500.00')

# 5. 按顺序处理队列：扣款 → 返修 → 送货
print('\n--- 步骤4: 按 扣款→返修→送货 顺序处理队列 ---')
db = SessionLocal()
queues = db.query(CompensationQueue).order_by(CompensationQueue.id.desc()).all()
db.close()

print(f'队列项数量: {len(queues)}')
for q in queues:
    print(f'  队列[{q.id}]: {q.business_type} - {q.status}')

# 找到扣款、返修、送货对应的队列项
deduction_queue = next((q for q in queues if q.business_type == 'deduction'), None)
repair_queue = next((q for q in queues if q.business_type == 'repair'), None)
delivery_queue = next((q for q in queues if q.business_type == 'delivery'), None)

# 按顺序处理
print(f'\n处理顺序: 扣款({deduction_queue.id}) → 返修({repair_queue.id}) → 送货({delivery_queue.id})')

# 处理扣款
response = client.post(f'/api/v1/queue/{deduction_queue.id}/process', headers=admin_headers)
print(f'处理扣款队列: {response.status_code} - {response.json()["message"]}')

db = SessionLocal()
summary = db.query(SettlementSummary).first()
print(f'  处理扣款后: delivery={summary.delivery_amount}, repair={summary.repair_amount}, deduction={summary.deduction_amount}, final={summary.final_amount}')
print(f'  source_ids: {summary.source_ids}')
db.close()

# 处理返修
response = client.post(f'/api/v1/queue/{repair_queue.id}/process', headers=admin_headers)
print(f'处理返修队列: {response.status_code} - {response.json()["message"]}')

db = SessionLocal()
summary = db.query(SettlementSummary).first()
print(f'  处理返修后: delivery={summary.delivery_amount}, repair={summary.repair_amount}, deduction={summary.deduction_amount}, final={summary.final_amount}')
print(f'  source_ids: {summary.source_ids}')
db.close()

# 处理送货
response = client.post(f'/api/v1/queue/{delivery_queue.id}/process', headers=admin_headers)
print(f'处理送货队列: {response.status_code} - {response.json()["message"]}')

db = SessionLocal()
summary = db.query(SettlementSummary).first()
print(f'  处理送货后: delivery={summary.delivery_amount}, repair={summary.repair_amount}, deduction={summary.deduction_amount}, final={summary.final_amount}')
print(f'  source_ids: {summary.source_ids}')
db.close()

# 验证结果
print('\n--- 验证结果 ---')
expected_delivery = 5000.00
expected_repair = 500.00
expected_deduction = 500.00
expected_final = expected_delivery + expected_repair - expected_deduction  # 5000

db = SessionLocal()
summary = db.query(SettlementSummary).first()

print(f'期望金额: delivery={expected_delivery}, repair={expected_repair}, deduction={expected_deduction}, final={expected_final}')
print(f'实际金额: delivery={summary.delivery_amount}, repair={summary.repair_amount}, deduction={summary.deduction_amount}, final={summary.final_amount}')

assert summary.delivery_amount == expected_delivery, f'delivery_amount错误: {summary.delivery_amount} != {expected_delivery}'
assert summary.repair_amount == expected_repair, f'repair_amount错误: {summary.repair_amount} != {expected_repair}'
assert summary.deduction_amount == expected_deduction, f'deduction_amount错误: {summary.deduction_amount} != {expected_deduction}'
assert summary.final_amount == expected_final, f'final_amount错误: {summary.final_amount} != {expected_final}'
print('✓ 金额正确!')

# 验证source_ids包含所有类型
source_ids = summary.source_ids or {}
print(f'\nsource_ids内容: {source_ids}')
assert 'delivery' in source_ids, 'source_ids缺少delivery'
assert 'repair' in source_ids, 'source_ids缺少repair'
assert 'deduction' in source_ids, 'source_ids缺少deduction'
print('✓ source_ids包含所有类型!')
db.close()

print('\n' + '=' * 60)
print('测试场景：重复提交同一送货单后金额不翻倍')
print('=' * 60)

# 重复提交同一送货单
print('\n--- 重复提交同一送货单 ---')
response = client.post('/api/v1/deliveries/', json=delivery_data, headers=admin_headers)
print(f'重复提交送货单: {response.status_code} - {response.json()["message"]}')
new_delivery_id = response.json()['data']['id']
print(f'返回的送货单ID: {new_delivery_id}')
assert new_delivery_id == delivery_id, f'重复提交应该返回相同ID: {new_delivery_id} != {delivery_id}'
print('✓ 重复提交返回相同送货单ID!')

# 查看队列状态
db = SessionLocal()
queues = db.query(CompensationQueue).filter(CompensationQueue.business_type == 'delivery').all()
print(f'\ndelivery队列数量: {len(queues)}')
for q in queues:
    print(f'  队列[{q.id}]: {q.status} - retry_count={q.retry_count}')

# 找到PENDING状态的队列项（应该是被重新入队的那个）
pending_queue = next((q for q in queues if q.status == 'pending'), None)
if pending_queue:
    print(f'\n重新处理队列项 {pending_queue.id}...')
    response = client.post(f'/api/v1/queue/{pending_queue.id}/process', headers=admin_headers)
    print(f'处理结果: {response.status_code} - {response.json()["message"]}')
else:
    print('\n没有待处理的队列项，说明已跳过重复处理')
db.close()

# 验证金额没有翻倍
print('\n--- 验证重复处理后金额 ---')
db = SessionLocal()
summary = db.query(SettlementSummary).first()

print(f'期望金额: delivery={expected_delivery}, repair={expected_repair}, deduction={expected_deduction}, final={expected_final}')
print(f'实际金额: delivery={summary.delivery_amount}, repair={summary.repair_amount}, deduction={summary.deduction_amount}, final={summary.final_amount}')

assert summary.delivery_amount == expected_delivery, f'重复处理后delivery_amount翻倍: {summary.delivery_amount} != {expected_delivery}'
assert summary.repair_amount == expected_repair, f'repair_amount错误: {summary.repair_amount} != {expected_repair}'
assert summary.deduction_amount == expected_deduction, f'deduction_amount错误: {summary.deduction_amount} != {expected_deduction}'
assert summary.final_amount == expected_final, f'final_amount错误: {summary.final_amount} != {expected_final}'
print('✓ 金额未翻倍!')

# 验证source_ids仍然完整
source_ids = summary.source_ids or {}
print(f'\n最终source_ids: {source_ids}')
assert 'delivery' in source_ids, 'source_ids缺少delivery'
assert 'repair' in source_ids, 'source_ids缺少repair'
assert 'deduction' in source_ids, 'source_ids缺少deduction'
assert len(source_ids['delivery']) == 1, f'delivery来源ID不应该重复: {source_ids["delivery"]}'
assert len(source_ids['repair']) == 1, f'repair来源ID不应该重复: {source_ids["repair"]}'
assert len(source_ids['deduction']) == 1, f'deduction来源ID不应该重复: {source_ids["deduction"]}'
print('✓ source_ids完整且无重复!')
db.close()

print('\n' + '=' * 60)
print('✓ 所有测试通过!')
print('=' * 60)
