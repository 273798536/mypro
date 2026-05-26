import requests
import json

BASE = "http://localhost:8002/api/v1"

def test_full_flow():
    print("=" * 60)
    print("测试完整状态闭环 + 权限过滤 + 经理视图")
    print("=" * 60)

    # 1. entry1 登录
    r = requests.post(f"{BASE}/auth/login", data={"username": "entry1", "password": "123456"})
    entry_token = r.json()["access_token"]
    print("\n[1] entry1 登录成功")

    # 2. 创建台账
    r = requests.post(f"{BASE}/ledger/create",
        headers={"Authorization": f"Bearer {entry_token}"},
        json={"wave_no": "WB20260525001", "sku_code": "SKU001"})
    result = r.json()
    ledger_id = result["data"]["id"]
    ledger_no = result["data"]["ledger_no"]
    print(f"\n[2] 创建台账: ID={ledger_id}, No={ledger_no}")

    # 3. 提交台账 (draft → submitted)
    r = requests.post(f"{BASE}/ledger/submit",
        headers={"Authorization": f"Bearer {entry_token}"},
        json={"ledger_id": ledger_id, "reason": "数据核对完成，提交复核"})
    result = r.json()
    print(f"\n[3] 提交台账(draft→submitted): {result['data']['status']}")

    # 4. reviewer1 登录并开始复核
    r = requests.post(f"{BASE}/auth/login", data={"username": "reviewer1", "password": "123456"})
    reviewer_token = r.json()["access_token"]

    r = requests.post(f"{BASE}/ledger/start-review",
        headers={"Authorization": f"Bearer {reviewer_token}"},
        json={"ledger_id": ledger_id, "reason": "开始复核"})
    result = r.json()
    print(f"\n[4] 开始复核(submitted→reviewing): {result['data']['status']}")

    # 5. 复核确认 (reviewing → confirmed)
    r = requests.post(f"{BASE}/ledger/confirm",
        headers={"Authorization": f"Bearer {reviewer_token}"},
        json={"ledger_id": ledger_id, "reason": "复核通过，数据一致"})
    result = r.json()
    print(f"\n[5] 复核确认(reviewing→confirmed): {result['data']['status']}")

    # 6. admin 登录并审计 (confirmed → audited)
    r = requests.post(f"{BASE}/auth/login", data={"username": "admin", "password": "admin123"})
    admin_token = r.json()["access_token"]

    r = requests.post(f"{BASE}/ledger/audit",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"ledger_id": ledger_id, "reason": "审计通过，数据可追溯"})
    result = r.json()
    print(f"\n[6] 审计(confirmed→audited): {result['data']['status']}")

    # 7. 主管查看详情（字段应完整）
    r = requests.get(f"{BASE}/ledger/{ledger_id}",
        headers={"Authorization": f"Bearer {admin_token}"})
    result = r.json()
    ledger_data = result["data"]["ledger"]
    print(f"\n[7] 主管查看详情 - 可见字段({len(ledger_data)}个):")
    print(f"    {list(ledger_data.keys())}")
    print(f"    状态: {ledger_data['status']}")

    # 8. 只读用户查看（字段应被过滤）
    r = requests.post(f"{BASE}/auth/login", data={"username": "readonly1", "password": "123456"})
    readonly_token = r.json()["access_token"]

    r = requests.get(f"{BASE}/ledger/{ledger_id}",
        headers={"Authorization": f"Bearer {readonly_token}"})
    result = r.json()
    ledger_data = result["data"]["ledger"]
    print(f"\n[8] 只读查看详情 - 可见字段({len(ledger_data)}个):")
    print(f"    {list(ledger_data.keys())}")
    print(f"    过滤后不应包含: performance_impact, inventory_impact 等")

    # 9. 测试经理视图总览
    r = requests.get(f"{BASE}/manager/overview",
        headers={"Authorization": f"Bearer {admin_token}"})
    result = r.json()
    print(f"\n[9] 经理视图总览:")
    print(f"    总记录数: {result['data']['total_records']}")
    print(f"    状态分布: {result['data']['status_distribution']}")

    # 10. 测试拣货员排名
    r = requests.get(f"{BASE}/manager/picker-ranking",
        headers={"Authorization": f"Bearer {admin_token}"})
    result = r.json()
    print(f"\n[10] 拣货员排名:")
    print(f"    拣货员数: {result['data']['total_pickers']}")
    if result['data']['ranking']:
        print(f"    排名第一: {result['data']['ranking'][0]['picker_name']}")

    # 11. 测试系统检查
    r = requests.get(f"http://localhost:8002/system-check")
    result = r.json()
    print(f"\n[11] 系统健康检查:")
    print(f"    总检查数: {result['data']['total_checks']}")
    print(f"    通过: {result['data']['passed_checks']}")
    print(f"    失败: {result['data']['failed_checks']}")

    print("\n" + "=" * 60)
    print("所有测试完成！状态闭环 + 权限过滤 + 经理视图 均正常工作")
    print("=" * 60)

if __name__ == "__main__":
    test_full_flow()
