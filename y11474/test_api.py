#!/usr/bin/env python3
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api/v1"


def login(username, password):
    response = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": username, "password": password}
    )
    return response.json().get("access_token")


def get_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_init_users():
    print("1. 初始化测试用户...")
    response = requests.get(f"{BASE_URL}/auth/init")
    print(f"   结果: {response.json()}")


def test_create_application(token):
    print("\n2. 创建退供申请...")
    data = {
        "application_no": "RT2024001",
        "batch_no": "BATCH001",
        "sku_code": "SKU001",
        "sku_name": "测试商品",
        "supplier_id": "SUP001",
        "supplier_name": "测试供应商",
        "supplier_contact": "张三",
        "supplier_phone": "13812345678",
        "return_quantity": 100,
        "return_reason": "质量问题",
        "application_date": (datetime.now() - timedelta(days=5)).isoformat(),
        "applicant": "测试申请人",
        "warehouse_id": "WH001",
        "warehouse_name": "主仓库",
        "inspection_photos": [
            {
                "photo_url": "http://example.com/photo1.jpg",
                "photo_type": "defect",
                "upload_time": datetime.now().isoformat(),
                "uploader": "质检员",
                "description": "商品破损照片",
                "is_defective": True,
                "defect_detail": "包装破损"
            }
        ],
        "logistics_receipts": [
            {
                "tracking_no": "SF123456789",
                "courier_company": "顺丰",
                "ship_date": (datetime.now() - timedelta(days=3)).isoformat(),
                "receive_date": (datetime.now() - timedelta(days=1)).isoformat(),
                "signatory": "李四",
                "receipt_url": "http://example.com/receipt1.jpg",
                "actual_quantity": 95,
                "damaged_quantity": 5
            }
        ]
    }
    response = requests.post(
        f"{BASE_URL}/return/",
        headers=get_headers(token),
        json=data
    )
    if response.status_code == 200:
        result = response.json()
        print(f"   创建成功! ID: {result.get('id')}, 状态: {result.get('status')}")
        print(f"   可见字段: {list(result.keys())}")
        return result.get('id')
    else:
        print(f"   创建失败: {response.status_code} - {response.text}")
        return None


def test_get_application_by_role(token, role_name, app_id):
    print(f"\n3. 测试 [{role_name}] 权限查看...")
    response = requests.get(
        f"{BASE_URL}/return/{app_id}",
        headers=get_headers(token)
    )
    if response.status_code == 200:
        result = response.json()
        print(f"   可见字段数: {len(result.keys())}")
        print(f"   可见字段: {list(result.keys())}")
        if 'supplier_phone' in result:
            print(f"   手机号显示: {result.get('supplier_phone')}")
        if 'raw_data' in result:
            print(f"   包含raw_data: Yes")
        else:
            print(f"   包含raw_data: No (权限过滤)")
    else:
        print(f"   查看失败: {response.status_code}")


def test_workflow_transition(token, app_id, new_status):
    print(f"\n4. 状态流转: {new_status}...")
    response = requests.post(
        f"{BASE_URL}/return/{app_id}/transition",
        headers=get_headers(token),
        json={"new_status": new_status, "change_reason": "测试流转"}
    )
    if response.status_code == 200:
        result = response.json()
        print(f"   流转成功! 新状态: {result.get('status')}")
        return True
    else:
        print(f"   流转失败: {response.status_code} - {response.text[:200]}")
        return False


def test_add_refund(token, app_id):
    print("\n5. 添加退款流水...")
    data = {
        "refund_no": "RF001",
        "refund_date": datetime.now().isoformat(),
        "actual_amount": 9500.00,
        "settlement_amount": 9000.00,
        "difference_amount": 500.00,
        "difference_reason": "供应商只认可部分批次",
        "supplier_approved_batches": ["BATCH001"],
        "disputed_batches": ["BATCH002"]
    }
    response = requests.post(
        f"{BASE_URL}/return/{app_id}/refund",
        headers=get_headers(token),
        json=data
    )
    if response.status_code == 200:
        result = response.json()
        print(f"   退款流水添加成功! 退款单号: {result.get('refund_no')}")
        return True
    else:
        print(f"   添加失败: {response.status_code} - {response.text}")
        return False


def test_system_checks(token):
    print("\n6. 运行自动化检查...")
    checks = [
        "duplicate-imports",
        "permission-interception",
        "exception-retention",
        "restart-history",
        "export-consistency"
    ]
    for check in checks:
        response = requests.get(
            f"{BASE_URL}/system-check/{check}",
            headers=get_headers(token)
        )
        if response.status_code == 200:
            result = response.json()
            status = "✅  PASS" if result.get('passed') else "❌  FAIL"
            print(f"   {check}: {status} ({result.get('execution_time_ms')}ms)")
        else:
            print(f"   {check}: ❌ ERROR - {response.status_code}")


def test_export(token):
    print("\n7. 测试导出...")
    response = requests.get(
        f"{BASE_URL}/export/applications/csv",
        headers=get_headers(token)
    )
    if response.status_code == 200:
        print(f"   CSV导出成功! 内容长度: {len(response.content)} 字节")
        print(f"   文件名: {response.headers.get('Content-Disposition')}")
        return True
    else:
        print(f"   导出失败: {response.status_code} - {response.text[:100]}")
        return False


def test_ledger_summary(token):
    print("\n8. 台账汇总视图...")
    response = requests.get(
        f"{BASE_URL}/ledger/summary/by-role",
        headers=get_headers(token)
    )
    if response.status_code == 200:
        result = response.json()
        print(f"   汇总数据: {result}")
        return True
    else:
        print(f"   获取失败: {response.status_code}")
        return False


def main():
    print("=" * 60)
    print("仓库退供复核权限追责台账 API - 功能验证测试")
    print("=" * 60)

    test_init_users()

    print("\n" + "=" * 60)
    print("登录测试账号...")
    print("=" * 60)

    token_entry = login("entry", "123456")
    token_reviewer = login("reviewer", "123456")
    token_supervisor = login("supervisor", "123456")
    token_readonly = login("readonly", "123456")

    if not all([token_entry, token_reviewer, token_supervisor, token_readonly]):
        print("❌  登录失败，请检查用户初始化")
        return

    print("   所有账号登录成功!")

    app_id = test_create_application(token_entry)
    if not app_id:
        return

    print("\n" + "=" * 60)
    print("权限字段过滤验证")
    print("=" * 60)

    test_get_application_by_role(token_entry, "录入员", app_id)
    test_get_application_by_role(token_reviewer, "复核员", app_id)
    test_get_application_by_role(token_supervisor, "主管", app_id)
    test_get_application_by_role(token_readonly, "只读", app_id)

    print("\n" + "=" * 60)
    print("工作流测试")
    print("=" * 60)

    test_workflow_transition(token_entry, app_id, "submitted")
    test_workflow_transition(token_reviewer, app_id, "second_confirm")
    test_workflow_transition(token_supervisor, app_id, "audit_only")

    test_add_refund(token_reviewer, app_id)
    test_ledger_summary(token_supervisor)

    print("\n" + "=" * 60)
    print("自动化检查验证")
    print("=" * 60)

    test_system_checks(token_supervisor)

    print("\n" + "=" * 60)
    print("脱敏导出验证")
    print("=" * 60)

    test_export(token_supervisor)

    print("\n" + "=" * 60)
    print("✅  所有测试完成!")
    print("=" * 60)


if __name__ == "__main__":
    main()
