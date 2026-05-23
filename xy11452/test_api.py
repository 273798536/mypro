import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1/return-compensation"


def test_full_flow():
    print("=" * 60)
    print("测试完整流程：提交 -> 处理 -> 完成")
    print("=" * 60)

    idempotency_key = f"test-batch-{int(datetime.now().timestamp())}"

    submit_data = {
        "idempotency_key": idempotency_key,
        "batch_no": "BATCH2024001",
        "conflict_strategy": "append",
        "outbound_order": {
            "order_no": "OUT2024001",
            "customer_id": "CUST001",
            "customer_name": "测试客户",
            "total_amount": 10000,
            "deposit_amount": 5000,
            "items": [
                {"item_code": "DEV001", "item_name": "设备A", "quantity": 1},
                {"item_code": "DEV002", "item_name": "设备B", "quantity": 1}
            ]
        },
        "return_photos": [
            {
                "photo_id": "PHOTO001",
                "photo_url": "http://example.com/photo1.jpg",
                "photo_type": "return_evidence",
                "uploader": "张三"
            }
        ],
        "maintenance_estimate": {
            "estimate_no": "EST2024001",
            "estimated_amount": 3000,
            "parts_cost": 2000,
            "labor_cost": 1000,
            "damage_description": "屏幕破损",
            "estimator": "李四"
        },
        "scan_details": [
            {
                "scan_batch_no": "SCAN001",
                "item_code": "DEV001",
                "item_name": "设备A",
                "scanner": "王五",
                "is_damaged": True,
                "damage_note": "外观划痕"
            }
        ],
        "deposit_reviews": [
            {
                "review_no": "REV2024001",
                "batch_return_no": "RET001",
                "deduction_amount": 3000,
                "deduction_reason": "设备损坏",
                "reviewer": "赵六",
                "evidence_chain_complete": True,
                "review_status": "approved"
            }
        ],
        "operator": "测试用户"
    }

    response = requests.post(f"{BASE_URL}/submit", json=submit_data)
    print(f"提交响应: {response.status_code}")
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))

    queue_id = response.json()["data"]["queue_id"]

    response = requests.post(f"{BASE_URL}/{queue_id}/process")
    print(f"\n处理响应: {response.status_code}")
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))

    response = requests.get(f"{BASE_URL}/{queue_id}")
    print(f"\n详情响应: {response.status_code}")
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))

    return queue_id


def test_duplicate_submit():
    print("\n" + "=" * 60)
    print("测试重复提交（幂等性）")
    print("=" * 60)

    idempotency_key = f"test-duplicate-{int(datetime.now().timestamp())}"

    submit_data = {
        "idempotency_key": idempotency_key,
        "batch_no": "BATCH2024002",
        "conflict_strategy": "append",
        "outbound_order": {
            "order_no": "OUT2024002",
            "customer_id": "CUST002",
            "customer_name": "客户2",
            "deposit_amount": 3000
        },
        "operator": "测试用户"
    }

    response = requests.post(f"{BASE_URL}/submit", json=submit_data)
    print(f"第一次提交: {response.status_code}, is_new={response.json()['data']['is_new']}")

    submit_data["conflict_strategy"] = "ignore"
    response = requests.post(f"{BASE_URL}/submit", json=submit_data)
    print(f"重复提交(忽略策略): {response.status_code}, is_new={response.json()['data']['is_new']}")


def test_freeze_unfreeze():
    print("\n" + "=" * 60)
    print("测试冻结/解冻")
    print("=" * 60)

    idempotency_key = f"test-freeze-{int(datetime.now().timestamp())}"

    submit_data = {
        "idempotency_key": idempotency_key,
        "batch_no": "BATCH2024003",
        "conflict_strategy": "append",
        "outbound_order": {
            "order_no": "OUT2024003",
            "customer_id": "CUST003",
            "deposit_amount": 4000
        },
        "operator": "测试用户"
    }

    response = requests.post(f"{BASE_URL}/submit", json=submit_data)
    queue_id = response.json()["data"]["queue_id"]

    freeze_data = {
        "reason": "导出前冻结",
        "operator": "管理员"
    }
    response = requests.post(f"{BASE_URL}/{queue_id}/freeze", json=freeze_data)
    print(f"冻结响应: {response.status_code}")
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))

    response = requests.post(f"{BASE_URL}/{queue_id}/process")
    print(f"冻结后尝试处理: {response.status_code}")
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))

    response = requests.post(f"{BASE_URL}/{queue_id}/unfreeze?operator=管理员")
    print(f"\n解冻响应: {response.status_code}")
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))


def test_manual_decision():
    print("\n" + "=" * 60)
    print("测试人工决策")
    print("=" * 60)

    idempotency_key = f"test-manual-{int(datetime.now().timestamp())}"

    submit_data = {
        "idempotency_key": idempotency_key,
        "batch_no": "BATCH2024004",
        "conflict_strategy": "append",
        "outbound_order": {
            "order_no": "OUT2024004",
            "customer_id": "CUST004",
            "deposit_amount": 2000
        },
        "operator": "测试用户"
    }

    response = requests.post(f"{BASE_URL}/submit", json=submit_data)
    queue_id = response.json()["data"]["queue_id"]

    manual_data = {
        "decision": "同意减免",
        "note": "客户投诉，特殊处理",
        "operator": "主管",
        "compensation_amount": 500,
        "actual_deduction": 1000
    }
    response = requests.post(f"{BASE_URL}/{queue_id}/manual-decision", json=manual_data)
    print(f"人工决策响应: {response.status_code}")
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))


def test_cancel_and_close():
    print("\n" + "=" * 60)
    print("测试撤回和关闭")
    print("=" * 60)

    idempotency_key = f"test-cancel-{int(datetime.now().timestamp())}"

    submit_data = {
        "idempotency_key": idempotency_key,
        "batch_no": "BATCH2024005",
        "conflict_strategy": "append",
        "outbound_order": {
            "order_no": "OUT2024005",
            "customer_id": "CUST005",
            "deposit_amount": 6000
        },
        "operator": "测试用户"
    }

    response = requests.post(f"{BASE_URL}/submit", json=submit_data)
    queue_id = response.json()["data"]["queue_id"]

    cancel_data = {
        "operator": "测试用户",
        "cancel_reason": "数据有误"
    }
    response = requests.post(f"{BASE_URL}/{queue_id}/cancel", json=cancel_data)
    print(f"撤回响应: {response.status_code}")
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))

    close_data = {
        "operator": "管理员",
        "close_note": "流程结束"
    }
    response = requests.post(f"{BASE_URL}/{queue_id}/close", json=close_data)
    print(f"\n关闭响应: {response.status_code}")
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))


def test_finance_summary():
    print("\n" + "=" * 60)
    print("测试财务汇总")
    print("=" * 60)

    response = requests.get(f"{BASE_URL}/finance/summary")
    print(f"财务汇总: {response.status_code}")
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))


def test_list_and_export():
    print("\n" + "=" * 60)
    print("测试列表查询和导出")
    print("=" * 60)

    response = requests.get(f"{BASE_URL}?page=1&page_size=10")
    print(f"列表查询: {response.status_code}")
    print(f"总计: {response.json()['total']} 条")
    print(f"当前页: {len(response.json()['items'])} 条")

    response = requests.get(f"{BASE_URL}/export/queues")
    print(f"\n导出队列: {response.status_code}")
    print(f"文件大小: {len(response.content)} bytes")

    response = requests.get(f"{BASE_URL}/export/finance-report")
    print(f"导出财务报表: {response.status_code}")
    print(f"文件大小: {len(response.content)} bytes")


if __name__ == "__main__":
    try:
        test_full_flow()
        test_duplicate_submit()
        test_freeze_unfreeze()
        test_manual_decision()
        test_cancel_and_close()
        test_finance_summary()
        test_list_and_export()

        print("\n" + "=" * 60)
        print("所有测试完成!")
        print("=" * 60)
    except requests.exceptions.ConnectionError:
        print("错误: 无法连接到服务器，请先启动服务: python main.py")
    except Exception as e:
        print(f"测试失败: {e}")
        import traceback
        traceback.print_exc()
