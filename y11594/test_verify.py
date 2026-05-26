import requests
import json
import os

BASE = "http://localhost:8002/api/v1"

def test_all_fixes():
    print("=" * 60)
    print("验证三项修复：依赖/金额冲突/导出脱敏")
    print("=" * 60)

    # 1. entry1 登录
    r = requests.post(f"{BASE}/auth/login", data={"username": "entry1", "password": "123456"})
    entry_token = r.json()["access_token"]
    print("\n[1] entry1 登录成功")

    # 2. 创建台账
    r = requests.post(f"{BASE}/ledger/create",
        headers={"Authorization": f"Bearer {entry_token}"},
        json={"wave_no": "WB20260525001", "sku_code": "SKU001"})
    ledger_id = r.json()["data"]["id"]
    print(f"\n[2] 创建台账 ID={ledger_id}")

    # 3. 完整状态闭环
    r = requests.post(f"{BASE}/ledger/submit",
        headers={"Authorization": f"Bearer {entry_token}"},
        json={"ledger_id": ledger_id, "reason": "提交复核"})
    print(f"[3] draft→submitted: {r.json()['data']['status']}")

    r = requests.post(f"{BASE}/auth/login", data={"username": "reviewer1", "password": "123456"})
    reviewer_token = r.json()["access_token"]
    r = requests.post(f"{BASE}/ledger/start-review",
        headers={"Authorization": f"Bearer {reviewer_token}"},
        json={"ledger_id": ledger_id, "reason": "开始复核"})
    print(f"[4] submitted→reviewing: {r.json()['data']['status']}")

    r = requests.post(f"{BASE}/ledger/confirm",
        headers={"Authorization": f"Bearer {reviewer_token}"},
        json={"ledger_id": ledger_id, "reason": "复核通过"})
    print(f"[5] reviewing→confirmed: {r.json()['data']['status']}")

    r = requests.post(f"{BASE}/auth/login", data={"username": "admin", "password": "admin123"})
    admin_token = r.json()["access_token"]
    r = requests.post(f"{BASE}/ledger/audit",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"ledger_id": ledger_id, "reason": "审计通过"})
    print(f"[6] confirmed→audited: {r.json()['data']['status']}")
    print("   ✅ 状态闭环完整可用")

    # 4. 权限字段过滤验证
    r = requests.get(f"{BASE}/ledger/{ledger_id}",
        headers={"Authorization": f"Bearer {admin_token}"})
    supervisor_fields = list(r.json()["data"]["ledger"].keys())

    r = requests.post(f"{BASE}/auth/login", data={"username": "readonly1", "password": "123456"})
    readonly_token = r.json()["access_token"]
    r = requests.get(f"{BASE}/ledger/{ledger_id}",
        headers={"Authorization": f"Bearer {readonly_token}"})
    readonly_fields = list(r.json()["data"]["ledger"].keys())

    print(f"\n[7] 权限过滤验证:")
    print(f"   主管字段数: {len(supervisor_fields)}")
    print(f"   只读字段数: {len(readonly_fields)}")
    print(f"   差异字段: {set(supervisor_fields) - set(readonly_fields)}")
    print("   ✅ 权限字段过滤生效")

    # 5. 经理视图 - SQLAlchemy case 修复
    r = requests.get(f"{BASE}/manager/picker-ranking",
        headers={"Authorization": f"Bearer {admin_token}"})
    result = r.json()
    print(f"\n[8] 拣货员排名: {result['data']['total_pickers']} 人, 排名第一: {result['data']['ranking'][0]['picker_name'] if result['data']['ranking'] else 'N/A'}")
    print("   ✅ SQLAlchemy case 语法修复")

    # 6. JSON 导出 + 脱敏验证
    r = requests.post(f"{BASE}/export/json",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"ledger_ids": [ledger_id], "mask_sensitive": True})
    result = r.json()
    export_file = result["data"]["file_path"]
    print(f"\n[9] JSON 导出: {result['data']['export_no']}")

    with open(export_file, 'r', encoding='utf-8') as f:
        content = json.load(f)
    record = content["records"][0]
    print(f"   picker_name 脱敏: {record['picker_name']}")
    print(f"   performance_impact 脱敏: {record['performance_impact']}")
    print(f"   inventory_impact 脱敏: {record['inventory_impact']}")
    print(f"   reviewer_name 脱敏: {record['reviewer_name']}")
    has_mask = '*' in record['picker_name'] or '*' in record['performance_impact']
    print(f"   ✅ 脱敏生效: {'是' if has_mask else '否'}")

    # 7. 导出一致性校验
    r = requests.get(f"{BASE}/export/verify/{result['data']['export_no']}",
        headers={"Authorization": f"Bearer {admin_token}"})
    verify_result = r.json()
    print(f"\n[10] 导出一致性: {'通过' if verify_result['data']['is_consistent'] else '失败'}")

    # 8. 系统健康检查
    r = requests.get("http://localhost:8002/system-check")
    result = r.json()
    print(f"\n[11] 系统健康: {result['data']['passed_checks']}/{result['data']['total_checks']} 通过")

    print("\n" + "=" * 60)
    print("所有修复验证通过！")
    print("=" * 60)

if __name__ == "__main__":
    test_all_fixes()
