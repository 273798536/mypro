import requests
import json

BASE_URL = "http://localhost:8000"

def test_round3_fixes():
    print("=" * 60)
    print("第三轮修复验证测试 - 台账闭环验证")
    print("=" * 60)
    
    print("\n1. 初始化用户...")
    response = requests.get(f"{BASE_URL}/api/v1/auth/init")
    print(f"   状态: {response.status_code}")
    
    print("\n2. 登录账号...")
    login_entry = {"username": "entry", "password": "123456"}
    login_reviewer = {"username": "reviewer", "password": "123456"}
    login_sup = {"username": "supervisor", "password": "123456"}
    
    response = requests.post(f"{BASE_URL}/api/v1/auth/login", data=login_entry)
    token_entry = response.json()["access_token"]
    headers_entry = {"Authorization": f"Bearer {token_entry}"}
    print(f"   录入员登录成功")
    
    response = requests.post(f"{BASE_URL}/api/v1/auth/login", data=login_reviewer)
    token_reviewer = response.json()["access_token"]
    headers_reviewer = {"Authorization": f"Bearer {token_reviewer}"}
    print(f"   复核员登录成功")
    
    response = requests.post(f"{BASE_URL}/api/v1/auth/login", data=login_sup)
    token_sup = response.json()["access_token"]
    headers_sup = {"Authorization": f"Bearer {token_sup}"}
    print(f"   主管登录成功")
    
    print("\n" + "-" * 60)
    print("测试1: 创建退供申请")
    print("-" * 60)
    
    app_data = {
        "application_no": "APP-LEDGER-001",
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
    print("测试2: 状态流转 (提交)")
    print("-" * 60)
    
    transition_data = {"new_status": "submitted", "change_reason": "提交审核"}
    response = requests.post(
        f"{BASE_URL}/api/v1/return/{app_id}/transition",
        json=transition_data,
        headers=headers_reviewer
    )
    print(f"   提交状态: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"   流转成功! 状态: {result.get('status')}")
    else:
        print(f"   错误: {response.text}")
    
    print("\n" + "-" * 60)
    print("测试3: 添加退款流水")
    print("-" * 60)
    
    refund_data = {
        "refund_no": "RF-LEDGER-001",
        "refund_date": "2026-05-25T10:30:00",
        "actual_amount": 5000.00,
        "settlement_amount": 4800.00,
        "difference_amount": 200.00,
        "difference_reason": "供应商扣款",
        "confirmed_by": "财务",
        "supplier_approved_batches": ["BATCH001"]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/v1/return/{app_id}/refund",
        json=refund_data,
        headers=headers_reviewer
    )
    print(f"   添加退款状态: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"   添加成功! 退款单号: {result.get('refund_no')}")
    else:
        print(f"   错误: {response.text}")
    
    print("\n" + "-" * 60)
    print("测试4: 获取台账记录")
    print("-" * 60)
    
    response = requests.get(f"{BASE_URL}/api/v1/ledger/application/{app_id}", headers=headers_sup)
    print(f"   获取台账状态: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        ledger_id = result['id']
        print(f"   台账获取成功! ID: {ledger_id}")
        print(f"   是否关闭: {result.get('is_closed')}")
    else:
        print(f"   错误: {response.text}")
        return
    
    print("\n" + "-" * 60)
    print("测试5: 关闭台账 (修复 db.func.now())")
    print("-" * 60)
    
    response = requests.post(
        f"{BASE_URL}/api/v1/ledger/{ledger_id}/close",
        headers=headers_sup
    )
    print(f"   关闭台账状态: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"   关闭成功! 是否关闭: {result.get('is_closed')}")
        print(f"   关闭时间: {result.get('closed_at')}")
        if result.get('is_closed') and result.get('closed_at'):
            print("   ✅ 台账关闭验证通过: db.func.now() 修复成功")
        else:
            print("   ❌ 台账关闭验证失败")
    else:
        print(f"   错误: {response.text}")
        print("   ❌ 台账关闭验证失败")
    
    print("\n" + "-" * 60)
    print("测试6: 获取脏记录列表")
    print("-" * 60)
    
    response = requests.get(
        f"{BASE_URL}/api/v1/ledger/{ledger_id}/dirty-records",
        headers=headers_reviewer
    )
    print(f"   获取脏记录状态: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"   脏记录数: {len(result)}")
        if result:
            dirty_id = result[0]['id']
            print(f"   第一条脏记录ID: {dirty_id}")
        else:
            print("   (无脏记录，跳过脏记录处理测试)")
            dirty_id = None
    else:
        print(f"   错误: {response.text}")
        dirty_id = None
    
    if dirty_id:
        print("\n" + "-" * 60)
        print("测试7: 处理脏记录 (修复 db.func.now())")
        print("-" * 60)
        
        response = requests.post(
            f"{BASE_URL}/api/v1/ledger/dirty-records/{dirty_id}/resolve",
            params={"handling_opinion": "已核实并修正"},
            headers=headers_reviewer
        )
        print(f"   处理脏记录状态: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"   处理成功! {result.get('message')}")
            print("   ✅ 脏记录处理验证通过: db.func.now() 修复成功")
        else:
            print(f"   错误: {response.text}")
            print("   ❌ 脏记录处理验证失败")
    
    print("\n" + "-" * 60)
    print("测试8: 台账汇总视图")
    print("-" * 60)
    
    response = requests.get(f"{BASE_URL}/api/v1/ledger/summary/by-role", headers=headers_sup)
    print(f"   汇总状态: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"   总申请数: {result.get('total_applications')}")
        print(f"   总台账数: {result.get('total_ledgers')}")
        print(f"   已关闭台账: {result.get('closed_ledgers')}")
        print(f"   待处理脏记录: {result.get('pending_dirty_records')}")
        print("   ✅ 台账汇总验证通过")
    else:
        print(f"   错误: {response.text}")
        print("   ❌ 台账汇总验证失败")
    
    print("\n" + "=" * 60)
    print("✅ 第三轮修复验证完成!")
    print("=" * 60)

if __name__ == "__main__":
    test_round3_fixes()
