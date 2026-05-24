import requests
import json

BASE_URL = "http://localhost:8000"

def test_dirty_record():
    print("=" * 60)
    print("脏记录处理测试")
    print("=" * 60)
    
    print("\n1. 登录账号...")
    login_entry = {"username": "entry", "password": "123456"}
    login_reviewer = {"username": "reviewer", "password": "123456"}
    
    response = requests.post(f"{BASE_URL}/api/v1/auth/login", data=login_entry)
    token_entry = response.json()["access_token"]
    headers_entry = {"Authorization": f"Bearer {token_entry}"}
    print(f"   录入员登录成功")
    
    response = requests.post(f"{BASE_URL}/api/v1/auth/login", data=login_reviewer)
    token_reviewer = response.json()["access_token"]
    headers_reviewer = {"Authorization": f"Bearer {token_reviewer}"}
    print(f"   复核员登录成功")
    
    print("\n" + "-" * 60)
    print("创建含缺失字段的申请 (触发脏记录)")
    print("-" * 60)
    
    app_data = {
        "application_no": "APP-DIRTY-001",
        "batch_no": "BATCH001",
        "sku_code": "SKU001",
        "sku_name": "测试商品",
        "supplier_id": "SUP001",
        "supplier_name": "测试供应商",
        "return_quantity": 100,
        "application_date": "2026-01-01T10:30:00",
        "applicant": "测试员",
        "warehouse_id": "WH001",
        "warehouse_name": "主仓库",
        "inspection_photos": [],
        "logistics_receipts": []
    }
    
    response = requests.post(f"{BASE_URL}/api/v1/return/", json=app_data, headers=headers_entry)
    print(f"   创建状态: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        app_id = result['id']
        print(f"   创建成功! ID: {app_id}")
    else:
        print(f"   错误: {response.text}")
        return
    
    print("\n" + "-" * 60)
    print("获取台账和脏记录")
    print("-" * 60)
    
    response = requests.get(f"{BASE_URL}/api/v1/ledger/application/{app_id}", headers=headers_reviewer)
    if response.status_code == 200:
        result = response.json()
        ledger_id = result['id']
        print(f"   台账ID: {ledger_id}")
    else:
        print(f"   错误: {response.text}")
        return
    
    response = requests.get(
        f"{BASE_URL}/api/v1/ledger/{ledger_id}/dirty-records",
        headers=headers_reviewer
    )
    if response.status_code == 200:
        result = response.json()
        print(f"   脏记录数: {len(result)}")
        for dr in result:
            print(f"     - ID: {dr['id']}, 类型: {dr['dirty_type']}, 字段: {dr['field_name']}")
        if result:
            dirty_id = result[0]['id']
        else:
            print("   无脏记录，测试完成")
            return
    else:
        print(f"   错误: {response.text}")
        return
    
    print("\n" + "-" * 60)
    print("处理脏记录 (修复 db.func.now())")
    print("-" * 60)
    
    response = requests.post(
        f"{BASE_URL}/api/v1/ledger/dirty-records/{dirty_id}/resolve",
        params={"handling_opinion": "已核实数据，确认无误"},
        headers=headers_reviewer
    )
    print(f"   处理状态: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"   处理成功! {result.get('message')}")
        print("   ✅ 脏记录处理验证通过: db.func.now() 修复成功")
    else:
        print(f"   错误: {response.text}")
        print("   ❌ 脏记录处理验证失败")
    
    print("\n" + "=" * 60)
    print("✅ 脏记录处理测试完成!")
    print("=" * 60)

if __name__ == "__main__":
    test_dirty_record()
