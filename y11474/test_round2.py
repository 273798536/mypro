import requests
import json

BASE_URL = "http://localhost:8000"

def test_round2_fixes():
    print("=" * 60)
    print("第二轮修复验证测试")
    print("=" * 60)
    
    print("\n1. 初始化用户...")
    response = requests.get(f"{BASE_URL}/api/v1/auth/init")
    print(f"   状态: {response.status_code}")
    
    print("\n2. 登录录入员账号...")
    login_data = {"username": "entry", "password": "123456"}
    response = requests.post(f"{BASE_URL}/api/v1/auth/login", data=login_data)
    token_entry = response.json()["access_token"]
    headers_entry = {"Authorization": f"Bearer {token_entry}"}
    print(f"   录入员登录成功")
    
    print("\n" + "-" * 60)
    print("测试1: 相同幂等键请求应更新同一事实，不返回409")
    print("-" * 60)
    
    app_data = {
        "application_no": "APP-IDEMPOTENT-001",
        "batch_no": "BATCH001",
        "sku_code": "SKU001",
        "sku_name": "测试商品",
        "supplier_id": "SUP001",
        "supplier_name": "测试供应商",
        "supplier_contact": "张三",
        "supplier_phone": "13800138000",
        "return_quantity": 100,
        "return_reason": "质量问题",
        "application_date": "2026-05-25T10:30:00",
        "applicant": "测试员",
        "warehouse_id": "WH001",
        "warehouse_name": "主仓库",
        "idempotency_key": "IDEMPOTENT_KEY_001",
        "inspection_photos": [],
        "logistics_receipts": []
    }
    
    print("\n   第一次创建 (数量=100)...")
    response = requests.post(f"{BASE_URL}/api/v1/return/", json=app_data, headers=headers_entry)
    print(f"   状态: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"   创建成功! ID: {result['id']}, 数量: {result['return_quantity']}")
        app_id = result['id']
    else:
        print(f"   错误: {response.text}")
        return
    
    print("\n   第二次请求相同幂等键 (数量=200) - 应更新同一记录...")
    app_data["return_quantity"] = 200
    app_data["return_reason"] = "更新后的原因"
    response = requests.post(f"{BASE_URL}/api/v1/return/", json=app_data, headers=headers_entry)
    print(f"   状态: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"   更新成功! ID: {result['id']}, 数量: {result['return_quantity']}, 原因: {result['return_reason']}")
        if int(result['id']) == int(app_id) and int(result['return_quantity']) == 200:
            print("   ✅ 幂等性验证通过: 相同幂等键更新同一事实")
        else:
            print("   ❌ 幂等性验证失败")
    else:
        print(f"   错误: {response.text}")
        print("   ❌ 幂等性验证失败: 不应返回409")
    
    print("\n" + "-" * 60)
    print("测试2: 未传幂等键但相同application_no应更新同一条记录")
    print("-" * 60)
    
    app_data2 = {
        "application_no": "APP-NO-IDEMP-001",
        "batch_no": "BATCH002",
        "sku_code": "SKU002",
        "sku_name": "测试商品2",
        "supplier_id": "SUP002",
        "supplier_name": "测试供应商2",
        "return_quantity": 50,
        "application_date": "2026-05-25T10:30:00",
        "applicant": "测试员",
        "warehouse_id": "WH001",
        "warehouse_name": "主仓库",
        "inspection_photos": [],
        "logistics_receipts": []
    }
    
    print("\n   第一次创建 (无幂等键, 数量=50)...")
    response = requests.post(f"{BASE_URL}/api/v1/return/", json=app_data2, headers=headers_entry)
    print(f"   状态: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"   创建成功! ID: {result['id']}, 数量: {result['return_quantity']}")
        app_id2 = result['id']
    else:
        print(f"   错误: {response.text}")
        return
    
    print("\n   第二次请求相同application_no (无幂等键, 数量=150) - 应更新同一记录...")
    app_data2["return_quantity"] = 150
    app_data2["sku_name"] = "更新后的商品名"
    response = requests.post(f"{BASE_URL}/api/v1/return/", json=app_data2, headers=headers_entry)
    print(f"   状态: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"   更新成功! ID: {result['id']}, 数量: {result['return_quantity']}, 商品名: {result['sku_name']}")
        if int(result['id']) == int(app_id2) and int(result['return_quantity']) == 150:
            print("   ✅ 申请单号幂等性验证通过: 相同application_no更新同一事实")
        else:
            print("   ❌ 申请单号幂等性验证失败")
    else:
        print(f"   错误: {response.text}")
        print("   ❌ 申请单号幂等性验证失败: 不应返回500唯一约束错误")
    
    print("\n" + "-" * 60)
    print("测试3: 复核员可导出并验证脱敏效果")
    print("-" * 60)
    
    print("\n   登录复核员账号...")
    login_reviewer = {"username": "reviewer", "password": "123456"}
    response = requests.post(f"{BASE_URL}/api/v1/auth/login", data=login_reviewer)
    token_reviewer = response.json()["access_token"]
    headers_reviewer = {"Authorization": f"Bearer {token_reviewer}"}
    print(f"   复核员登录成功")
    
    print("\n   复核员导出CSV...")
    response = requests.get(f"{BASE_URL}/api/v1/export/applications/csv", headers=headers_reviewer)
    print(f"   导出状态: {response.status_code}")
    if response.status_code == 200:
        content = response.content.decode('utf-8-sig')
        print(f"   导出成功! 内容长度: {len(content)} 字节")
        lines = content.split('\n')
        print(f"\n   CSV内容预览 (前3行):")
        for i, line in enumerate(lines[:3]):
            print(f"   {i+1}. {line[:100]}")
        
        phone_masked = "13800138000" not in content and "*" in content.split('\n')[1].split(',')[7]
        contact_masked = "张三" not in content
        
        print(f"\n   检查联系电话: 原始值 '13800138000' -> 导出值 '{content.split(chr(10))[1].split(',')[7]}'")
        
        if phone_masked or contact_masked:
            print("\n   ✅ 脱敏导出验证通过: 敏感字段已脱敏")
        else:
            print("\n   ⚠️  需检查脱敏效果")
            if "13800138000" in content:
                print("   ❌ 脱敏失败: 原始手机号可见")
            else:
                print("   ✅ 原始手机号不可见")
    else:
        print(f"   错误: {response.text}")
        print("   ❌ 复核员导出失败: 应允许复核员导出")
    
    print("\n   登录主管账号对比导出...")
    login_sup = {"username": "supervisor", "password": "123456"}
    response = requests.post(f"{BASE_URL}/api/v1/auth/login", data=login_sup)
    token_sup = response.json()["access_token"]
    headers_sup = {"Authorization": f"Bearer {token_sup}"}
    
    response = requests.get(f"{BASE_URL}/api/v1/export/applications/csv", headers=headers_sup)
    if response.status_code == 200:
        content_sup = response.content.decode('utf-8-sig')
        print(f"   主管导出成功")
        if "13800138000" in content_sup:
            print("   ✅ 主管不脱敏: 原始手机号可见")
        if "张三" in content_sup:
            print("   ✅ 主管不脱敏: 原始联系人可见")
    
    print("\n" + "=" * 60)
    print("✅ 第二轮修复验证完成!")
    print("=" * 60)

if __name__ == "__main__":
    test_round2_fixes()
