import requests
import json

BASE_URL = "http://localhost:8000"

def test_core_flow():
    print("=" * 60)
    print("核心功能测试")
    print("=" * 60)
    
    print("\n1. 初始化用户...")
    response = requests.get(f"{BASE_URL}/api/v1/auth/init")
    print(f"   状态: {response.status_code}")
    print(f"   结果: {response.json()}")
    
    print("\n2. 登录...")
    login_data = {"username": "entry", "password": "123456"}
    response = requests.post(f"{BASE_URL}/api/v1/auth/login", data=login_data)
    print(f"   登录状态: {response.status_code}")
    if response.status_code == 200:
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print(f"   Token获取成功")
    else:
        print(f"   错误: {response.text}")
        return
    
    print("\n3. 创建退供申请（含datetime）...")
    app_data = {
        "application_no": "APP-TEST-001",
        "batch_no": "TEST001",
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
        "inspection_photos": [
            {
                "photo_url": "http://example.com/photo1.jpg",
                "photo_type": "damaged",
                "description": "外包装破损",
                "upload_time": "2026-05-25T10:30:00",
                "uploader": "测试员",
                "is_defective": True
            }
        ],
        "logistics_receipts": [
            {
                "tracking_no": "SF1234567890",
                "courier_company": "顺丰",
                "ship_date": "2026-05-25T10:30:00",
                "receive_date": "2026-05-25T10:30:00",
                "actual_quantity": 100,
                "damaged_quantity": 5
            }
        ]
    }
    response = requests.post(f"{BASE_URL}/api/v1/return/", json=app_data, headers=headers)
    print(f"   创建状态: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"   创建成功! ID: {result.get('id')}")
        print(f"   可见字段: {list(result.keys())}")
        app_id = result['id']
    else:
        print(f"   错误: {response.text}")
        return
    
    print("\n4. 权限过滤测试 - 只读用户查看...")
    login_ro = {"username": "readonly", "password": "123456"}
    response_ro = requests.post(f"{BASE_URL}/api/v1/auth/login", data=login_ro)
    token_ro = response_ro.json()["access_token"]
    headers_ro = {"Authorization": f"Bearer {token_ro}"}
    
    response = requests.get(f"{BASE_URL}/api/v1/return/{app_id}", headers=headers_ro)
    print(f"   查看状态: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"   可见字段数: {len(result)} 个")
        print(f"   可见字段列表: {sorted(list(result.keys()))}")
    else:
        print(f"   错误: {response.text}")
    
    print("\n5. 主管登录...")
    login_sup = {"username": "supervisor", "password": "123456"}
    response_sup = requests.post(f"{BASE_URL}/api/v1/auth/login", data=login_sup)
    token_sup = response_sup.json()["access_token"]
    headers_sup = {"Authorization": f"Bearer {token_sup}"}
    print(f"   主管登录成功")
    
    print("\n6. 自动化检查 - 重复导入...")
    response = requests.get(f"{BASE_URL}/api/v1/system-check/duplicate-imports", headers=headers_sup)
    print(f"   状态: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"   通过: {result['passed']}")
    else:
        print(f"   错误: {response.text}")
    
    print("\n7. 自动化检查 - 重启历史...")
    response = requests.get(f"{BASE_URL}/api/v1/system-check/restart-history", headers=headers_sup)
    print(f"   状态: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"   通过: {result['passed']}")
    else:
        print(f"   错误: {response.text}")
    
    print("\n8. CSV导出（脱敏）...")
    response = requests.get(f"{BASE_URL}/api/v1/export/applications/csv", headers=headers_sup)
    print(f"   导出状态: {response.status_code}")
    if response.status_code == 200:
        print(f"   导出成功! 内容长度: {len(response.content)} 字节")
        print(f"   内容预览: {response.content[:200].decode('utf-8', errors='ignore')}")
    else:
        print(f"   错误: {response.text}")
    
    print("\n" + "=" * 60)
    print("✅ 核心测试完成!")
    print("=" * 60)

if __name__ == "__main__":
    test_core_flow()
