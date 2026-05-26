import sys
from app.main import app
from fastapi.testclient import TestClient
from app.database import Base, engine, SessionLocal
from app.models.business import (
    OutsourceDelivery,
    CompensationQueue,
    SettlementSummary
)
from scripts.init_data import init_roles_and_permissions, create_test_user

print("删除旧数据库...")
import os
if os.path.exists('./outsource_settlement.db'):
    os.remove('./outsource_settlement.db')

print("创建数据库表...")
Base.metadata.create_all(bind=engine)

print("初始化权限和用户...")
db = SessionLocal()
init_roles_and_permissions(db)
create_test_user(db)
db.commit()
db.close()

client = TestClient(app)

# 1. 测试录入员登录
print('\n=== 1. 测试录入员登录 ===')
response = client.post(
    '/api/v1/auth/login',
    data={'username': 'entry', 'password': 'entry123'}
)
print(f'登录状态: {response.status_code}')
assert response.status_code == 200, f'登录失败: {response.text}'
entry_token = response.json()['access_token']
entry_headers = {'Authorization': f'Bearer {entry_token}'}
print('✓ 录入员登录成功')

# 2. 测试录入外协送货单
print('\n=== 2. 测试录入外协送货单 ===')
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
response = client.post(
    '/api/v1/deliveries/',
    json=delivery_data,
    headers=entry_headers
)
print(f'创建送货单状态: {response.status_code}')
assert response.status_code == 200, f'创建失败: {response.text}'
result = response.json()
print(f'响应: {result["message"]}')

data = result['data']
print(f'返回数据字段: {list(data.keys()) if isinstance(data, dict) else list(data.model_dump().keys())}')
assert 'delivery_no' in data, '缺少 delivery_no 字段'
assert data.get('unit_price') is None, '录入员不应看到 unit_price'
assert data.get('total_amount') is None, '录入员不应看到 total_amount'
print('✓ 字段脱敏正常 - 单价/金额已隐藏')

delivery_id = data['id']
print(f'送货单ID: {delivery_id}')

# 3. 测试重复提交同一送货单
print('\n=== 3. 测试重复提交同一送货单（幂等性）===')
response = client.post(
    '/api/v1/deliveries/',
    json=delivery_data,
    headers=entry_headers
)
print(f'重复提交状态: {response.status_code}')
assert response.status_code == 200, f'重复提交失败: {response.text}'
result = response.json()
print(f'响应: {result["message"]}')
assert result['data']['id'] == delivery_id, '重复提交应该返回相同ID'
print('✓ 幂等性正常 - 重复提交返回同一条记录')

# 4. 测试查询送货单列表
print('\n=== 4. 测试查询送货单列表 ===')
response = client.get('/api/v1/deliveries/', headers=entry_headers)
print(f'查询列表状态: {response.status_code}')
assert response.status_code == 200, f'查询失败: {response.text}'
result = response.json()
print(f'记录数: {result["total"]}')
assert result['total'] == 1, '应该只有1条记录'

item = result['data'][0]
assert 'delivery_no' in item, '缺少 delivery_no 字段'
assert item.get('unit_price') is None, '录入员不应看到 unit_price'
assert item.get('total_amount') is None, '录入员不应看到 total_amount'
print('✓ 列表字段脱敏正常')

# 5. 主管登录处理队列
print('\n=== 5. 主管登录处理队列 ===')
response = client.post(
    '/api/v1/auth/login',
    data={'username': 'admin', 'password': 'admin123'}
)
assert response.status_code == 200, f'主管登录失败: {response.text}'
admin_token = response.json()['access_token']
admin_headers = {'Authorization': f'Bearer {admin_token}'}
print('✓ 主管登录成功')

# 查看队列统计
response = client.get('/api/v1/queue/statistics', headers=admin_headers)
print(f'队列统计状态: {response.status_code}')
assert response.status_code == 200, f'队列统计失败: {response.text}'
stats = response.json()['data']
print(f'队列状态: {stats["overview"]}')

# 6. 处理队列项
print('\n=== 6. 处理队列项 ===')
db = SessionLocal()
queue_item = db.query(CompensationQueue).filter(
    CompensationQueue.business_type == 'delivery'
).first()
db.close()
print(f'队列项ID: {queue_item.id}, 状态: {queue_item.status}')

response = client.post(
    f'/api/v1/queue/{queue_item.id}/process',
    headers=admin_headers
)
print(f'处理队列状态: {response.status_code}')
assert response.status_code == 200, f'处理失败: {response.text}'
print(f'处理结果: {response.json()["message"]}')

# 7. 验证结算汇总
print('\n=== 7. 验证结算汇总 ===')
db = SessionLocal()
summary = db.query(SettlementSummary).first()
db.close()
if summary:
    print(f'送货金额: {summary.delivery_amount}')
    assert summary.delivery_amount == 5000.00, f'金额应该是5000，实际是{summary.delivery_amount}'
    print('✓ 结算汇总正常 - 金额正确')
else:
    print('WARNING: 结算汇总未生成')
    sys.exit(1)

# 8. 再次处理同一队列项
print('\n=== 8. 测试重复处理队列项 ===')
response = client.post(
    f'/api/v1/queue/{queue_item.id}/process',
    headers=admin_headers
)
print(f'重复处理状态: {response.status_code}')
assert response.status_code == 200, f'重复处理失败: {response.text}'
print(f'重复处理结果: {response.json()["message"]}')

db = SessionLocal()
summary = db.query(SettlementSummary).first()
db.close()
if summary:
    print(f'重复处理后送货金额: {summary.delivery_amount}')
    assert summary.delivery_amount == 5000.00, f'重复处理后金额应该还是5000，实际是{summary.delivery_amount}'
    print('✓ 防重复累加正常 - 金额未重复计算')

# 9. 测试主管查看送货单
print('\n=== 9. 测试主管查看送货单（可见所有字段）===')
response = client.get(f'/api/v1/deliveries/{delivery_id}', headers=admin_headers)
assert response.status_code == 200
admin_data = response.json()['data']
assert admin_data.get('unit_price') is not None, '主管应该看到 unit_price'
assert admin_data.get('total_amount') is not None, '主管应该看到 total_amount'
print('✓ 主管权限正常 - 可见所有字段')

# 10. 测试只读用户
print('\n=== 10. 测试只读用户权限 ===')
response = client.post(
    '/api/v1/auth/login',
    data={'username': 'viewer', 'password': 'viewer123'}
)
assert response.status_code == 200
viewer_token = response.json()['access_token']
viewer_headers = {'Authorization': f'Bearer {viewer_token}'}

response = client.get(f'/api/v1/deliveries/{delivery_id}', headers=viewer_headers)
assert response.status_code == 200
viewer_data = response.json()['data']
assert viewer_data.get('unit_price') is None, '只读用户不应看到 unit_price'
assert viewer_data.get('total_amount') is None, '只读用户不应看到 total_amount'
print('✓ 只读用户权限正常')

# 11. 测试临时补录单
print('\n=== 11. 测试临时补录单 ===')
supplement_data = {
    'supplement_no': 'BL20240526001',
    'supplement_type': '夜间抢修',
    'supplement_date': '2024-05-26',
    'supplement_reason': '夜间抢修无单，补录',
    'related_order_no': 'WH20240526001',
    'supplement_content': {'repair_hours': 3, 'workers': 2},
    'amount': 1500.00,
    'status': 'pending'
}
response = client.post(
    '/api/v1/supplements/',
    json=supplement_data,
    headers=entry_headers
)
print(f'创建临时补录单状态: {response.status_code}')
assert response.status_code == 200, f'创建失败: {response.text}'
result = response.json()
print(f'响应: {result["message"]}')
print('✓ 临时补录单API可用')

# 12. 测试看板
print('\n=== 12. 测试老板看板 ===')
response = client.get('/api/v1/reports/dashboard/overview', headers=admin_headers)
print(f'看板状态: {response.status_code}')
assert response.status_code == 200, f'看板失败: {response.text}'
dashboard = response.json()['data']
print(f'看板概览: {list(dashboard.keys())}')
assert 'queue_status' in dashboard
assert 'error_breakdown' in dashboard
assert 'retryable_count' in dashboard
assert 'dead_letter_count' in dashboard
print(f'可重试数量: {dashboard["retryable_count"]}')
print(f'死信数量: {dashboard["dead_letter_count"]}')
print('✓ 老板看板正常 - 可见可重试分类和死信处理')

print('\n' + '='*50)
print('✓ 所有测试通过！')
print('='*50)
