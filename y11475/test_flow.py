import requests
import warnings
warnings.filterwarnings('ignore')

BASE = 'http://localhost:8000'

print("=== 验证权限控制和撤回后导入功能 ===\n")

# 1. 创建批次
r = requests.post(f'{BASE}/api/batches', json={
    'name': '测试撤回后导入',
    'created_by': '行政助理-小王'
})
print(f'1. 创建批次: {r.status_code}')
batch = r.json()
batch_id = batch['id']
print(f'   批次ID: {batch_id}')
print()

# 2. 陌生人冻结（应403）
r = requests.post(f'{BASE}/api/batches/{batch_id}/freeze', json={
    'operator': '陌生人',
    'reason': '测试'
})
print(f'2. 陌生人冻结: {r.status_code}')
print(f'   响应: {r.json()}')
print()

# 3. 复核员冻结（应403）
r = requests.post(f'{BASE}/api/batches/{batch_id}/freeze', json={
    'operator': '复核员-老李',
    'reason': '测试'
})
print(f'3. 复核员冻结: {r.status_code}')
print(f'   响应: {r.json()}')
print()

# 4. 行政经理冻结（应200）
r = requests.post(f'{BASE}/api/batches/{batch_id}/freeze', json={
    'operator': '行政经理-张总',
    'reason': '正式冻结'
})
print(f'4. 行政经理冻结: {r.status_code}')
print(f'   响应: {r.json()}')
print()

# 5. 撤回批次
r = requests.post(f'{BASE}/api/batches/{batch_id}/recall', json={
    'operator': '行政经理-张总',
    'reason': '发现遗漏材料，撤回补充'
})
print(f'5. 撤回批次: {r.status_code}')
print(f'   响应: {r.json()}')
print()

# 6. 撤回后导入门禁数据（应成功）
with open('test_access_card.xlsx', 'rb') as f:
    r = requests.post(
        f'{BASE}/api/batches/{batch_id}/import',
        files={'file': ('test_access_card.xlsx', f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')},
        data={
            'source_type': 'access_card',
            'uploaded_by': '行政助理-小王'
        }
    )
print(f'6. 撤回后导入门禁: {r.status_code}')
if r.status_code == 200:
    print(f'   成功！导入{len(r.json().get("records", []))}条记录')
else:
    print(f'   失败: {r.text}')
print()

print("=== 测试完成 ===")
