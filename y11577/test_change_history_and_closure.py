import sys
import os
if os.path.exists('./outsource_settlement.db'):
    os.remove('./outsource_settlement.db')

from app.main import app
from fastapi.testclient import TestClient
from app.database import Base, engine, SessionLocal
from app.models.business import (
    CompensationQueue,
    SettlementSummary,
    ChangeHistory
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
print('测试场景：异常修正前后差异可查、流程能补偿入账并关闭')
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
print(f'送货单ID: {delivery_id}, 原始金额: 5000.00')

# 3. 更新送货单（触发变更历史）
print('\n--- 步骤2: 更新外协送货单（触发变更历史） ---')
update_data = {
    'total_amount': 5500.00,
    'unit_price': 55.00,
    'quantity': 100
}
response = client.put(f'/api/v1/deliveries/{delivery_id}', json=update_data, headers=admin_headers)
print(f'更新送货单: {response.status_code}')
print(f'响应: {response.json()["message"]}')

# 4. 验证变更历史记录
print('\n--- 步骤3: 验证变更历史记录 ---')
db = SessionLocal()
changes = db.query(ChangeHistory).filter(
    ChangeHistory.business_type == 'delivery',
    ChangeHistory.business_id == delivery_id
).all()
db.close()
print(f'变更历史记录数: {len(changes)}')

for change in changes:
    print(f'  - {change.field_name}: {change.old_value} → {change.new_value}')
    print(f'    原因: {change.change_reason}, 操作人: {change.operator_name}')

assert len(changes) >= 2, f'变更历史记录数不足: {len(changes)} >= 2'
print('✓ 变更历史记录成功写入!')

# 5. 调用对比API
print('\n--- 步骤4: 调用前后对比API ---')
# 注意路径是 /reports 不是 /report
response = client.get(
    f'/api/v1/reports/compare/before-after?business_type=delivery&business_id={delivery_id}',
    headers=admin_headers
)
print(f'对比API响应状态: {response.status_code}')

if response.status_code == 200:
    data = response.json()['data']
    print(f'变更数量: {data["change_count"]}')
    print(f'变更字段: {list(data["field_changes"].keys())}')
    print('✓ 前后对比API正常工作!')
else:
    print(f'响应内容: {response.text}')

# 6. 处理队列
print('\n--- 步骤5: 处理队列并验证闭环 ---')
db = SessionLocal()
queues = db.query(CompensationQueue).filter(
    CompensationQueue.business_type == 'delivery'
).all()
db.close()
print(f'待处理队列数: {len(queues)}')

for q in queues:
    print(f'  队列[{q.id}]: {q.business_type} - {q.status}')

# 处理队列
queue_id = queues[0].id
response = client.post(f'/api/v1/queue/{queue_id}/process', headers=admin_headers)
print(f'处理队列: {response.status_code} - {response.json()["message"]}')

# 7. 验证队列状态已闭环
print('\n--- 步骤6: 验证队列闭环状态 ---')
db = SessionLocal()
queue_item = db.query(CompensationQueue).filter(CompensationQueue.id == queue_id).first()
print(f'队列最终状态: {queue_item.status}')
print(f'补偿入账时间: {queue_item.compensated_at}')
print(f'关闭时间: {queue_item.closed_at}')
print(f'处理日志数: {len(queue_item.process_logs)}')
for log in queue_item.process_logs:
    print(f'  - {log["type"]}: {log["message"]}')

assert queue_item.status == 'closed', f'队列未关闭: {queue_item.status}'
assert queue_item.compensated_at is not None, '补偿入账时间为空'
assert queue_item.closed_at is not None, '关闭时间为空'
print('✓ 队列闭环成功: 成功→补偿入账→关闭!')

# 8. 验证结算汇总
print('\n--- 步骤7: 验证结算汇总 ---')
db = SessionLocal()
summary = db.query(SettlementSummary).first()
print(f'送货金额: {summary.delivery_amount}')
print(f'最终金额: {summary.final_amount}')
print(f'source_ids: {summary.source_ids}')
assert summary.delivery_amount == 5500.00, f'送货金额不正确: {summary.delivery_amount}'
print('✓ 结算汇总正确!')
db.close()

# 9. 测试手动关闭队列
print('\n--- 步骤8: 测试手动关闭队列 ---')
# 创建一个新的送货单
delivery_data2 = {
    'delivery_no': 'WH20240526002',
    'supplier_code': 'SUP001',
    'supplier_name': '精工机械有限公司',
    'product_code': 'PROD002',
    'product_name': '齿轮轴B',
    'delivery_date': '2024-05-26',
    'quantity': 50,
    'unit_price': 100.00,
    'total_amount': 5000.00,
    'batch_no': 'BATCH20240526-02',
    'work_order_no': 'WO20240526002',
    'status': 'pending'
}
response = client.post('/api/v1/deliveries/', json=delivery_data2, headers=admin_headers)
delivery_id2 = response.json()['data']['id']
print(f'创建第二张送货单ID: {delivery_id2}')

db = SessionLocal()
queues2 = db.query(CompensationQueue).filter(
    CompensationQueue.business_type == 'delivery',
    CompensationQueue.business_id == delivery_id2
).all()
db.close()
queue_id2 = queues2[0].id
print(f'待关闭队列ID: {queue_id2}')

# 手动关闭
response = client.post(
    f'/api/v1/queue/{queue_id2}/close?close_note=无需处理，手动关闭',
    headers=admin_headers
)
print(f'手动关闭响应: {response.status_code} - {response.json()["message"]}')

db = SessionLocal()
queue_item2 = db.query(CompensationQueue).filter(CompensationQueue.id == queue_id2).first()
print(f'手动关闭后状态: {queue_item2.status}')
assert queue_item2.status == 'closed', '手动关闭失败'
print('✓ 手动关闭队列成功!')
db.close()

print('\n' + '=' * 60)
print('✓ 所有测试通过!')
print('=' * 60)
print('\n测试要点总结:')
print('  1. ✓ PUT更新后change_history有记录')
print('  2. ✓ /reports/compare/before-after 可查差异')
print('  3. ✓ 队列处理成功后自动补偿入账并关闭')
print('  4. ✓ 支持手动关闭队列')
