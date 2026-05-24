#!/usr/bin/env python3
import json
import requests
import time
from datetime import datetime

BASE_URL = "http://localhost:8000"
API_PREFIX = "/api/v1"


def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def test_health_check():
    print_section("1. 健康检查")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        assert response.status_code == 200
        print("✓ 健康检查通过")
        return True
    except Exception as e:
        print(f"✗ 健康检查失败: {e}")
        return False


def test_import_data():
    print_section("2. 导入测试数据")

    success_count = 0
    total_count = 0

    try:
        print("\n2.1 导入维修单...")
        with open("test_data/maintenance_orders.json", "rb") as f:
            response = requests.post(
                f"{BASE_URL}{API_PREFIX}/import/maintenance-orders",
                files={"file": ("maintenance_orders.json", f, "application/json")}
            )
        result = response.json()
        print(f"响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
        assert response.status_code == 200
        assert result["success_count"] == 3
        success_count += 1
        total_count += 3
        print("✓ 维修单导入成功")
    except Exception as e:
        print(f"✗ 维修单导入失败: {e}")

    try:
        print("\n2.2 导入备件扫码...")
        with open("test_data/spare_part_scans.json", "rb") as f:
            response = requests.post(
                f"{BASE_URL}{API_PREFIX}/import/spare-part-scans",
                files={"file": ("spare_part_scans.json", f, "application/json")}
            )
        result = response.json()
        print(f"响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
        assert response.status_code == 200
        assert result["success_count"] == 3
        success_count += 1
        total_count += 3
        print("✓ 备件扫码导入成功")
    except Exception as e:
        print(f"✗ 备件扫码导入失败: {e}")

    try:
        print("\n2.3 导入客户签收...")
        with open("test_data/customer_receipts.json", "rb") as f:
            response = requests.post(
                f"{BASE_URL}{API_PREFIX}/import/customer-receipts",
                files={"file": ("customer_receipts.json", f, "application/json")}
            )
        result = response.json()
        print(f"响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
        assert response.status_code == 200
        assert result["success_count"] == 3
        success_count += 1
        total_count += 3
        print("✓ 客户签收导入成功")
    except Exception as e:
        print(f"✗ 客户签收导入失败: {e}")

    return success_count == 3


def test_submit_compensation():
    print_section("3. 提交补偿申请（正常链路）")

    test_cases = [
        ("MO20240501001", "PAR-001-SCR", 1),
        ("MO20240501002", "PAR-002-KEY", 1),
    ]

    queue_ids = []

    for order_no, part_code, quantity in test_cases:
        try:
            print(f"\n提交: {order_no} - {part_code} x {quantity}")
            response = requests.post(
                f"{BASE_URL}{API_PREFIX}/queue/submit",
                params={
                    "order_no": order_no,
                    "part_code": part_code,
                    "quantity": quantity
                }
            )
            result = response.json()
            print(f"响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
            assert response.status_code == 200
            assert result["order_no"] == order_no
            assert result["status"] == "pending"
            queue_ids.append(result["id"])
            print(f"✓ 提交成功，队列ID: {result['id']}")
        except Exception as e:
            print(f"✗ 提交失败: {e}")

    return queue_ids


def test_duplicate_submission():
    print_section("4. 重复提交测试（幂等性验证）")

    order_no, part_code, quantity = "MO20240501001", "PAR-001-SCR", 1

    try:
        print(f"\n第一次提交: {order_no} - {part_code} x {quantity}")
        response1 = requests.post(
            f"{BASE_URL}{API_PREFIX}/queue/submit",
            params={
                "order_no": order_no,
                "part_code": part_code,
                "quantity": quantity
            }
        )
        result1 = response1.json()
        id1 = result1["id"]
        idempotent_key1 = result1["idempotent_key"]
        print(f"第一次 ID: {id1}, 幂等键: {idempotent_key1}")

        print(f"\n第二次提交（相同数据）...")
        response2 = requests.post(
            f"{BASE_URL}{API_PREFIX}/queue/submit",
            params={
                "order_no": order_no,
                "part_code": part_code,
                "quantity": quantity
            }
        )
        result2 = response2.json()
        id2 = result2["id"]
        idempotent_key2 = result2["idempotent_key"]
        print(f"第二次 ID: {id2}, 幂等键: {idempotent_key2}")

        assert id1 == id2, "重复提交应该返回相同的队列ID"
        assert idempotent_key1 == idempotent_key2, "幂等键应该相同"
        print("✓ 幂等性验证通过：重复提交返回同一条记录")
        return True
    except Exception as e:
        print(f"✗ 幂等性验证失败: {e}")
        return False


def test_process_queue():
    print_section("5. 处理队列（补偿入账）")

    try:
        response = requests.get(f"{BASE_URL}{API_PREFIX}/queue?status=pending")
        pending_items = response.json()
        print(f"待处理数量: {len(pending_items)}")

        if pending_items:
            queue_id = pending_items[0]["id"]
            print(f"\n处理队列项 ID: {queue_id}")
            response = requests.post(
                f"{BASE_URL}{API_PREFIX}/queue/{queue_id}/process"
            )
            result = response.json()
            print(f"响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
            assert result["success"] == True

            response = requests.get(f"{BASE_URL}{API_PREFIX}/queue/{queue_id}")
            updated = response.json()
            print(f"\n处理后状态: {updated['status']}")
            assert updated["status"] == "compensated"
            print("✓ 补偿处理成功，状态已更新为 compensated")
            return True
    except Exception as e:
        print(f"✗ 队列处理失败: {e}")
        return False


def test_bad_data():
    print_section("6. 坏数据测试")

    try:
        print("\n6.1 提交不存在的维修单...")
        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/queue/submit",
            params={
                "order_no": "INVALID-001",
                "part_code": "PAR-001-SCR",
                "quantity": 1
            }
        )
        result = response.json()
        queue_id = result["id"]
        print(f"创建队列项 ID: {queue_id}")

        print("\n6.2 处理坏数据（应该失败并重试）...")
        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/queue/{queue_id}/process"
        )
        result = response.json()
        print(f"处理结果: {json.dumps(result, ensure_ascii=False, indent=2)}")

        response = requests.get(f"{BASE_URL}{API_PREFIX}/queue/{queue_id}")
        updated = response.json()
        print(f"\n当前状态: {updated['status']}")
        print(f"重试次数: {updated['retry_count']}/{updated['max_retry']}")
        print(f"错误信息: {updated['last_error']}")

        assert updated["status"] == "retrying"
        assert updated["retry_count"] == 1
        print("✓ 坏数据正确进入重试状态")
        return True
    except Exception as e:
        print(f"✗ 坏数据测试失败: {e}")
        return False


def test_manual_handling():
    print_section("7. 人工接管测试")

    try:
        response = requests.get(f"{BASE_URL}{API_PREFIX}/queue?status=retrying")
        retrying_items = response.json()

        if retrying_items:
            queue_id = retrying_items[0]["id"]
            print(f"\n人工处理队列项 ID: {queue_id}")

            response = requests.post(
                f"{BASE_URL}{API_PREFIX}/queue/{queue_id}/manual",
                json={
                    "handler": "服务经理",
                    "note": "经核查，情况属实，予以特殊补偿",
                    "action": "approve"
                }
            )
            result = response.json()
            print(f"响应: {json.dumps(result, ensure_ascii=False, indent=2)}")

            assert result["status"] == "compensated"
            assert result["manual_handler"] == "服务经理"
            assert result["manual_note"] == "经核查，情况属实，予以特殊补偿"
            print("✓ 人工审批成功")
            return True
    except Exception as e:
        print(f"✗ 人工接管测试失败: {e}")
        return False


def test_service_metrics():
    print_section("8. 服务指标查询")

    try:
        print("\n8.1 队列统计...")
        response = requests.get(f"{BASE_URL}{API_PREFIX}/stats/queue")
        stats = response.json()
        print(f"队列统计: {json.dumps(stats, ensure_ascii=False, indent=2)}")
        assert "pending" in stats
        assert "compensated" in stats

        print("\n8.2 服务指标（可重试分类、死信、恢复）...")
        response = requests.get(f"{BASE_URL}{API_PREFIX}/stats/service-metrics")
        metrics = response.json()
        print(f"服务指标: {json.dumps(metrics, ensure_ascii=False, indent=2)}")
        assert "retry_categories" in metrics
        assert "dead_letter" in metrics
        assert "recovery" in metrics

        print("✓ 服务指标查询正常")
        return True
    except Exception as e:
        print(f"✗ 服务指标查询失败: {e}")
        return False


def test_compensation_records():
    print_section("9. 补偿记录查询")

    try:
        response = requests.get(f"{BASE_URL}{API_PREFIX}/compensation-records")
        records = response.json()
        print(f"补偿记录数量: {len(records)}")
        for r in records:
            print(f"  - {r['order_no']} {r['part_code']}: {r['amount']}元, 操作人: {r['operator']}")
        print("✓ 补偿记录查询正常")
        return True
    except Exception as e:
        print(f"✗ 补偿记录查询失败: {e}")
        return False


def main():
    print("\n" + "="*60)
    print("  售后备件领用重试补偿队列 API - 验收测试")
    print("  " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("="*60)

    time.sleep(2)

    results = []

    results.append(("健康检查", test_health_check()))
    results.append(("数据导入", test_import_data()))
    results.append(("提交补偿", len(test_submit_compensation()) > 0))
    results.append(("幂等性验证", test_duplicate_submission()))
    results.append(("队列处理", test_process_queue()))
    results.append(("坏数据处理", test_bad_data()))
    results.append(("人工接管", test_manual_handling()))
    results.append(("服务指标", test_service_metrics()))
    results.append(("补偿记录", test_compensation_records()))

    print_section("验收结果汇总")
    passed = sum(1 for _, r in results if r)
    total = len(results)

    for name, r in results:
        status = "✓ 通过" if r else "✗ 失败"
        print(f"  {name}: {status}")

    print(f"\n总计: {passed}/{total} 通过")

    if passed == total:
        print("\n🎉 所有验收测试通过！")
    else:
        print(f"\n⚠️  有 {total - passed} 项测试失败")

    print("="*60 + "\n")


if __name__ == "__main__":
    main()
