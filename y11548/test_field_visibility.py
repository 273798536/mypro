#!/usr/bin/env python3
import requests
from datetime import datetime, timedelta
import uuid

BASE = 'http://localhost:8001'

def login(username, password):
    resp = requests.post(f'{BASE}/auth/token', data={'username': username, 'password': password})
    return resp.json()['access_token']

def test_field_visibility():
    print("=" * 60)
    print("权限可见性测试 - 不同角色可见字段和可操作动作")
    print("=" * 60)
    
    # 获取各角色token
    admin_token = login('admin', 'admin123')
    reviewer_token = login('reviewer', 'review123')
    entry_token = login('entry', 'entry123')
    viewer_token = login('viewer', 'view123')
    
    admin_headers = {'Authorization': f'Bearer {admin_token}'}
    reviewer_headers = {'Authorization': f'Bearer {reviewer_token}'}
    entry_headers = {'Authorization': f'Bearer {entry_token}'}
    viewer_headers = {'Authorization': f'Bearer {viewer_token}'}
    
    # 创建测试批次和物料
    batch_no = f'TEST-FIELD-{uuid.uuid4().hex[:4].upper()}'
    resp = requests.post(f'{BASE}/batches', headers=admin_headers, json={
        'batch_no': batch_no,
        'exhibition_name': '权限可见性测试批次',
        'location': '测试',
        'start_date': (datetime.now() - timedelta(days=1)).isoformat(),
        'end_date': (datetime.now() + timedelta(days=1)).isoformat()
    })
    batch_id = resp.json()['id']
    print(f"\n✓ 创建测试批次: {batch_id}")
    
    # 添加测试物料
    resp = requests.post(f'{BASE}/materials', headers=entry_headers, json={
        'batch_id': batch_id,
        'material_code': 'MAT-VIS-001',
        'material_name': '权限测试物料',
        'quantity': 10,
        'category': '电子设备',
        'specification': '14寸笔记本',
        'warehouse_location': 'A-01',
        'remark': '这是一条敏感备注信息'
    })
    material_id = resp.json()['id']
    print(f"✓ 添加测试物料: {material_id}")
    
    print("\n" + "-" * 60)
    print("测试1: 不同角色访问 /materials 可见字段对比")
    print("-" * 60)
    
    roles = [
        ('只读用户 (viewer)', viewer_headers, ['id', 'batch_id', 'material_code', 'material_name', 'quantity', 'status', 'created_at']),
        ('录入员 (entry)', entry_headers, ['id', 'batch_id', 'material_code', 'material_name', 'quantity', 'status', 'created_at', 'category', 'specification', 'unit', 'warehouse_location', 'remark']),
        ('复核员 (reviewer)', reviewer_headers, ['id', 'batch_id', 'material_code', 'material_name', 'quantity', 'status', 'created_at', 'category', 'specification', 'unit', 'warehouse_location', 'remark', 'created_by', 'updated_at']),
        ('主管 (admin)', admin_headers, ['*']),
    ]
    
    sensitive_fields = ['category', 'specification', 'remark', 'created_by', 'updated_at', 'warehouse_location']
    
    for role_name, headers, expected_fields in roles:
        resp = requests.get(f'{BASE}/materials/{material_id}', headers=headers)
        data = resp.json()
        actual_fields = sorted(data.keys())
        
        print(f"\n{role_name}:")
        print(f"  实际可见字段: {actual_fields}")
        
        # 检查敏感字段是否被正确过滤
        if expected_fields == ['*']:
            # 主管应该看到所有字段
            if all(f in data for f in sensitive_fields):
                print(f"  ✓ 主管可以看到所有字段 (包括敏感字段)")
            else:
                missing = [f for f in sensitive_fields if f not in data]
                print(f"  ✗ 主管缺少字段: {missing}")
        else:
            # 其他角色应该只能看到授权字段
            unexpected_fields = [f for f in actual_fields if f not in expected_fields]
            if not unexpected_fields:
                print(f"  ✓ 字段过滤正确，未暴露未授权字段")
            else:
                print(f"  ✗ 暴露了未授权字段: {unexpected_fields}")
            
            # 检查特定敏感字段
            if role_name == '只读用户 (viewer)':
                should_not_see = ['category', 'specification', 'remark', 'created_by', 'updated_at', 'warehouse_location']
                leaked = [f for f in should_not_see if f in data]
                if not leaked:
                    print(f"  ✓ 只读用户无法看到敏感信息 (category, specification, remark, created_by 等)")
                else:
                    print(f"  ✗ 只读用户看到了敏感字段: {leaked}")
    
    print("\n" + "-" * 60)
    print("测试2: 不同角色可操作动作对比")
    print("-" * 60)
    
    # 测试只读用户无法创建
    resp = requests.post(f'{BASE}/materials', headers=viewer_headers, json={
        'batch_id': batch_id,
        'material_code': 'TEST-HACK',
        'material_name': '越权测试',
        'quantity': 1
    })
    if resp.status_code == 403:
        print(f"\n✓ 只读用户无法创建物料 (返回 403)")
    else:
        print(f"\n✗ 只读用户越权创建成功 (返回 {resp.status_code})")
    
    # 测试只读用户无法修改
    resp = requests.put(f'{BASE}/materials/{material_id}', headers=viewer_headers, json={
        'quantity': 9999
    })
    if resp.status_code == 403:
        print(f"✓ 只读用户无法修改物料 (返回 403)")
    else:
        print(f"✗ 只读用户越权修改成功 (返回 {resp.status_code})")
    
    # 测试录入员可以修改草稿
    resp = requests.put(f'{BASE}/materials/{material_id}', headers=entry_headers, json={
        'quantity': 15
    })
    if resp.status_code == 200:
        print(f"✓ 录入员可以修改草稿状态的物料")
    else:
        print(f"✗ 录入员无法修改草稿: {resp.status_code}")
    
    # 测试复核员可以冻结
    resp = requests.post(f'{BASE}/materials/{material_id}/transition', headers=entry_headers, json={
        'target_status': 'submitted'
    })
    
    resp = requests.post(f'{BASE}/materials/{material_id}/transition', headers=reviewer_headers, json={
        'target_status': 'reviewed'
    })
    if resp.status_code == 200:
        print(f"✓ 复核员可以复核物料 (状态转为 reviewed)")
    else:
        print(f"✗ 复核员无法复核: {resp.status_code} - {resp.json().get('detail')}")
    
    # 测试录入员无法修改已复核的记录
    resp = requests.put(f'{BASE}/materials/{material_id}', headers=entry_headers, json={
        'quantity': 9999
    })
    if resp.status_code == 400:
        print(f"✓ 录入员无法修改已复核的物料 (返回 400)")
    else:
        print(f"✗ 录入员越权修改已复核记录 (返回 {resp.status_code})")
    
    # 测试主管可以冻结批次
    resp = requests.post(f'{BASE}/batches/{batch_id}/transition', headers=admin_headers, json={
        'target_status': 'frozen'
    })
    if resp.status_code == 200:
        print(f"✓ 主管可以冻结批次")
    else:
        print(f"✗ 主管无法冻结批次: {resp.status_code}")
    
    # 测试复核员无法冻结批次
    # 先创建一个新批次用于测试
    resp2 = requests.post(f'{BASE}/batches', headers=admin_headers, json={
        'batch_no': batch_no + '-2',
        'exhibition_name': '权限测试批次2',
        'start_date': (datetime.now() - timedelta(days=1)).isoformat(),
        'end_date': (datetime.now() + timedelta(days=1)).isoformat()
    })
    batch2_id = resp2.json()['id']
    
    resp = requests.post(f'{BASE}/batches/{batch2_id}/transition', headers=reviewer_headers, json={
        'target_status': 'frozen'
    })
    if resp.status_code == 403:
        print(f"✓ 复核员无法冻结批次 (返回 403)")
    else:
        print(f"✗ 复核员越权冻结批次 (返回 {resp.status_code})")
    
    print("\n" + "=" * 60)
    print("权限可见性测试完成")
    print("=" * 60)
    
    print("\n权限矩阵总结:")
    print("| 操作 | 只读 | 录入员 | 复核员 | 主管 |")
    print("|------|------|--------|--------|------|")
    print("| 查看基础字段 | ✓ | ✓ | ✓ | ✓ |")
    print("| 查看敏感字段(remark/created_by) | ✗ | ✓ | ✓ | ✓ |")
    print("| 创建记录 | ✗ | ✓ | ✓ | ✓ |")
    print("| 修改草稿 | ✗ | ✓ | ✓ | ✓ |")
    print("| 复核/冻结记录 | ✗ | ✗ | ✓ | ✓ |")
    print("| 冻结批次 | ✗ | ✗ | ✗ | ✓ |")
    print("| 删除记录 | ✗ | ✗ | ✗ | ✓ |")
    
    return 0

if __name__ == "__main__":
    import sys
    sys.exit(test_field_visibility())
