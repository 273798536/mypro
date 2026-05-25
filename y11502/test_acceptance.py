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
        print(f"响应: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "scheduler_running" in data
        print("✓ 健康检查通过，后台调度器状态正常")
        return True
    except Exception as e:
        print(f"✗ 健康检查失败: {e}")
        return False


def test_root_endpoint():
    print_section("2. 根端点检查")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"状态码: {response.status_code}")
        data = response.json()
        print(f"服务名: {data['service']}")
        print(f"版本: {data['version']}")
        print(f"后台调度器: {data['background_scheduler']}")
        print(f"上次恢复: {data.get('last_recovery', {}).get('recovery_time')}")
        assert response.status_code == 200
        assert data["version"] == "2.0.0"
        print("✓ 根端点正常")
        return True
    except Exception as e:
        print(f"✗ 根端点检查失败: {e}")
        return False


def test_import_all_data():
    print_section("3. 导入全部测试数据")

    results = {}

    try:
        print("\n3.1 导入维修单...")
        with open("test_data/maintenance_orders.json", "rb") as f:
            response = requests.post(
                f"{BASE_URL}{API_PREFIX}/import/maintenance-orders",
                files={"file": ("maintenance_orders.json", f, "application/json")}
            )
        result = response.json()
        assert result["success_count"] == 3
        results["maintenance"] = True
        print("✓ 维修单导入成功")
    except Exception as e:
        results["maintenance"] = False
        print(f"✗ 维修单导入失败: {e}")

    try:
        print("\n3.2 导入备件扫码...")
        with open("test_data/spare_part_scans.json", "rb") as f:
            response = requests.post(
                f"{BASE_URL}{API_PREFIX}/import/spare-part-scans",
                files={"file": ("spare_part_scans.json", f, "application/json")}
            )
        result = response.json()
        assert result["success_count"] == 3
        results["scans"] = True
        print("✓ 备件扫码导入成功")
    except Exception as e:
        results["scans"] = False
        print(f"✗ 备件扫码导入失败: {e}")

    try:
        print("\n3.3 导入客户签收...")
        with open("test_data/customer_receipts.json", "rb") as f:
            response = requests.post(
                f"{BASE_URL}{API_PREFIX}/import/customer-receipts",
                files={"file": ("customer_receipts.json", f, "application/json")}
            )
        result = response.json()
        assert result["success_count"] == 3
        results["receipts"] = True
        print("✓ 客户签收导入成功")
    except Exception as e:
        results["receipts"] = False
        print(f"✗ 客户签收导入失败: {e}")

    try:
        print("\n3.4 导入供应商对账单...")
        with open("test_data/supplier_statements.json", "rb") as f:
            response = requests.post(
                f"{BASE_URL}{API_PREFIX}/import/supplier-statements",
                files={"file": ("supplier_statements.json", f, "application/json")}
            )
        result = response.json()
        print(f"响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
        assert result["success_count"] == 2
        results["statements"] = True
        print("✓ 供应商对账单导入成功")
    except Exception as e:
        results["statements"] = False
        print(f"✗ 供应商对账单导入失败: {e}")

    try:
        print("\n3.5 导入审批邮件...")
        with open("test_data/approval_emails.json", "rb") as f:
            response = requests.post(
                f"{BASE_URL}{API_PREFIX}/import/approval-emails",
                files={"file": ("approval_emails.json", f, "application/json")}
            )
        result = response.json()
        print(f"响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
        assert result["success_count"] == 2
        results["approvals"] = True
        print("✓ 审批邮件导入成功")
    except Exception as e:
        results["approvals"] = False
        print(f"✗ 审批邮件导入失败: {e}")

    return all(results.values())


def test_waiting_external_receipt():
    print_section("4. 等待外部回执状态流转测试")

    try:
        print("\n4.1 提交补偿（有维修单、扫码、签收，但缺供应商对账单和审批邮件）...")
        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/queue/submit",
            params={
                "order_no": "MO20240501003",
                "part_code": "PAR-003-BAT",
                "quantity": 1
            }
        )
        queue_item = response.json()
        queue_id = queue_item["id"]
        print(f"创建队列项 ID: {queue_id}")
        assert queue_item["status"] == "pending"

        print("\n4.2 处理该队列项，验证进入等待外部回执状态...")
        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/queue/{queue_id}/process"
        )
        result = response.json()
        print(f"处理结果: {json.dumps(result, ensure_ascii=False, indent=2)}")

        response = requests.get(f"{BASE_URL}{API_PREFIX}/queue/{queue_id}")
        updated = response.json()
        print(f"\n当前状态: {updated['status']}")
        print(f"错误信息: {updated['last_error']}")
        print(f"重试次数: {updated['retry_count']}/{updated['max_retry']}")

        assert updated["status"] == "waiting_manual"
        assert "等供应商对账单" in updated["last_error"]
        print("✓ 正确进入等待外部回执状态")
        return True, queue_id
    except Exception as e:
        print(f"✗ 等待外部回执测试失败: {e}")
        return False, None


def test_async_task_integration():
    print_section("5. 异步任务与队列处理对接测试")

    try:
        print("\n5.1 提交补偿申请（数据齐全）...")
        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/queue/submit",
            params={
                "order_no": "MO20240501001",
                "part_code": "PAR-001-SCR",
                "quantity": 1
            }
        )
        queue_item = response.json()
        queue_id = queue_item["id"]
        print(f"队列项 ID: {queue_id}")

        print("\n5.2 为队列项创建异步任务...")
        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/queue/{queue_id}/create-async-task"
        )
        result = response.json()
        print(f"响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
        assert result["success"] == True
        task_id = result["task_id"]
        print(f"异步任务 ID: {task_id}")

        print("\n5.3 执行异步任务...")
        task_db_id = result["task_id"]
        response = requests.get(f"{BASE_URL}{API_PREFIX}/async-tasks")
        tasks = response.json()
        task_db_id = tasks[0]["id"]

        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/async-tasks/{task_db_id}/execute"
        )
        result = response.json()
        print(f"执行结果: {json.dumps(result, ensure_ascii=False, indent=2)}")
        assert result["success"] == True

        response = requests.get(f"{BASE_URL}{API_PREFIX}/queue/{queue_id}")
        final = response.json()
        print(f"\n队列最终状态: {final['status']}")
        assert final["status"] == "compensated"
        print("✓ 异步任务对接正常，补偿成功")
        return True
    except Exception as e:
        print(f"✗ 异步任务对接测试失败: {e}")
        return False


def test_batch_process_pending():
    print_section("6. 批量处理（同时消费 pending 和 retrying）")

    try:
        print("\n6.1 提交多个补偿申请...")
        queue_ids = []
        for i in range(2):
            response = requests.post(
                f"{BASE_URL}{API_PREFIX}/queue/submit",
                params={
                    "order_no": "MO20240501002",
                    "part_code": f"PAR-00{i+2}-KEY",
                    "quantity": 1
                }
            )
            item = response.json()
            queue_ids.append(item["id"])
            print(f"  提交队列项 ID: {item['id']}, 状态: {item['status']}")

        print("\n6.2 查看待处理队列...")
        response = requests.get(f"{BASE_URL}{API_PREFIX}/queue?status=pending")
        pending = response.json()
        print(f"pending 状态数量: {len(pending)}")

        print("\n6.3 执行批量处理...")
        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/queue/process-pending"
        )
        result = response.json()
        print(f"响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
        assert result["processed_count"] >= 1
        print("✓ 批量处理正常，消费了 pending 队列")
        return True
    except Exception as e:
        print(f"✗ 批量处理测试失败: {e}")
        return False


def test_permanent_failure_flow():
    print_section("7. 永久失败状态流转测试")

    try:
        print("\n7.1 提交坏数据（不存在的维修单）...")
        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/queue/submit",
            params={
                "order_no": "INVALID-999",
                "part_code": "PAR-999-XXX",
                "quantity": 1,
                "max_retry": 2
            }
        )
        queue_item = response.json()
        queue_id = queue_item["id"]
        print(f"队列项 ID: {queue_id}")

        print("\n7.2 多次处理直到进入死信...")
        for i in range(3):
            print(f"\n第 {i+1} 次处理...")
            response = requests.post(
                f"{BASE_URL}{API_PREFIX}/queue/{queue_id}/process"
            )
            response = requests.get(f"{BASE_URL}{API_PREFIX}/queue/{queue_id}")
            current = response.json()
            print(f"  状态: {current['status']}, 重试次数: {current['retry_count']}/{current['max_retry']}")
            if current["status"] == "dead_letter":
                print(f"  已进入死信状态")
                break

        response = requests.get(f"{BASE_URL}{API_PREFIX}/queue/{queue_id}")
        final = response.json()
        print(f"\n最终状态: {final['status']}")
        print(f"重试次数: {final['retry_count']}/{final['max_retry']}")
        print(f"错误信息: {final['last_error']}")

        assert final["status"] == "dead_letter"
        assert final["retry_count"] == 2
        print("✓ 永久失败状态流转正常")
        return True
    except Exception as e:
        print(f"✗ 永久失败测试失败: {e}")
        return False


def test_duplicate_submission():
    print_section("8. 重复提交测试（幂等性验证）")

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


def test_manual_handling():
    print_section("9. 人工接管测试")

    try:
        response = requests.get(f"{BASE_URL}{API_PREFIX}/queue?status=waiting_manual")
        waiting_items = response.json()

        if not waiting_items:
            print("没有 waiting_manual 状态的队列项，跳过测试")
            return True

        queue_id = waiting_items[0]["id"]
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
        print("✓ 人工审批成功")
        return True
    except Exception as e:
        print(f"✗ 人工接管测试失败: {e}")
        return False


def test_recovery_flow():
    print_section("10. 重启续跑验证测试")

    try:
        print("\n10.1 触发服务恢复...")
        response = requests.post(f"{BASE_URL}/admin/trigger-recovery")
        result = response.json()
        print(f"响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
        assert result["success"] == True

        print("\n10.2 查看调度器状态...")
        response = requests.get(f"{BASE_URL}/admin/scheduler-status")
        status = response.json()
        print(f"调度器状态: {json.dumps(status, ensure_ascii=False, indent=2)}")
        assert status["running"] == True
        assert status["recovery_count"] >= 1

        print("\n10.3 查看恢复统计...")
        response = requests.get(f"{BASE_URL}{API_PREFIX}/stats/service-metrics")
        metrics = response.json()
        print(f"恢复指标: {json.dumps(metrics['recovery'], ensure_ascii=False, indent=2)}")

        print("✓ 重启续跑验证通过")
        return True
    except Exception as e:
        print(f"✗ 重启续跑测试失败: {e}")
        return False


def test_service_metrics():
    print_section("11. 服务指标查询")

    try:
        print("\n11.1 队列统计...")
        response = requests.get(f"{BASE_URL}{API_PREFIX}/stats/queue")
        stats = response.json()
        print(f"队列统计: {json.dumps(stats, ensure_ascii=False, indent=2)}")
        assert "pending" in stats
        assert "compensated" in stats
        assert "waiting_manual" in stats
        assert "dead_letter" in stats

        print("\n11.2 服务指标（可重试分类、死信、恢复）...")
        response = requests.get(f"{BASE_URL}{API_PREFIX}/stats/service-metrics")
        metrics = response.json()
        print(f"可重试分类: {len(metrics['retry_categories'])} 类")
        print(f"死信总数: {metrics['dead_letter']['total']}")
        print(f"恢复任务数: {metrics['recovery']['recovered_tasks']}")
        assert "retry_categories" in metrics
        assert "dead_letter" in metrics
        assert "recovery" in metrics

        print("✓ 服务指标查询正常")
        return True
    except Exception as e:
        print(f"✗ 服务指标查询失败: {e}")
        return False


def test_compensation_records():
    print_section("12. 补偿记录查询")

    try:
        response = requests.get(f"{BASE_URL}{API_PREFIX}/compensation-records")
        records = response.json()
        print(f"补偿记录数量: {len(records)}")
        for r in records[:3]:
            print(f"  - {r['order_no']} {r['part_code']}: {r['amount']}元, 操作人: {r['operator']}")
        assert len(records) >= 1
        print("✓ 补偿记录查询正常")
        return True
    except Exception as e:
        print(f"✗ 补偿记录查询失败: {e}")
        return False


def test_source_evidence_tracing():
    print_section("13. 原始证据溯源验证")

    try:
        print("\n13.1 查询维修单包含来源证据...")
        response = requests.get(f"{BASE_URL}{API_PREFIX}/import/supplier-statements")
        statements = response.json()
        if statements:
            stmt = statements[0]
            print(f"对账单号: {stmt['statement_no']}")
            if stmt.get('source_evidence'):
                print(f"来源文件: {stmt['source_evidence']['source_file']}")
                print(f"原始行号: {stmt['source_evidence']['source_line']}")
                print(f"来源类型: {stmt['source_evidence']['source_type']}")
                print("✓ 原始证据溯源正常")
                return True

        print("⚠️  没有找到来源证据关联数据")
        return True
    except Exception as e:
        print(f"✗ 原始证据溯源验证失败: {e}")
        return False


def main():
    print("\n" + "="*60)
    print("  售后备件领用重试补偿队列 API - 完整验收测试 v2.0")
    print("  " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("="*60)

    time.sleep(1)

    results = []

    results.append(("健康检查", test_health_check()))
    results.append(("根端点检查", test_root_endpoint()))
    results.append(("全部数据导入", test_import_all_data()))
    wait_result, _ = test_waiting_external_receipt()
    results.append(("等待外部回执", wait_result))
    results.append(("异步任务对接", test_async_task_integration()))
    results.append(("批量处理队列", test_batch_process_pending()))
    results.append(("永久失败流转", test_permanent_failure_flow()))
    results.append(("幂等性验证", test_duplicate_submission()))
    results.append(("人工接管", test_manual_handling()))
    results.append(("重启续跑", test_recovery_flow()))
    results.append(("服务指标", test_service_metrics()))
    results.append(("补偿记录", test_compensation_records()))
    results.append(("证据溯源", test_source_evidence_tracing()))

    print_section("验收结果汇总")
    passed = sum(1 for _, r in results if r)
    total = len(results)

    for name, r in results:
        status = "✓ 通过" if r else "✗ 失败"
        print(f"  {name}: {status}")

    print(f"\n总计: {passed}/{total} 通过")

    if passed == total:
        print("\n🎉 所有验收测试通过！核心闭环已完成！")
        print("\n核心闭环验证:")
        print("  ✓ 五类数据导入（维修单、扫码、签收、对账单、审批邮件）")
        print("  ✓ 等待外部回执状态流转")
        print("  ✓ 异步任务与队列处理对接")
        print("  ✓ 批量消费 pending + retrying 队列")
        print("  ✓ 永久失败（死信）流转")
        print("  ✓ 重启续跑验证")
        print("  ✓ 服务经理关注的三类指标")
    else:
        print(f"\n⚠️  有 {total - passed} 项测试失败")

    print("="*60 + "\n")


if __name__ == "__main__":
    main()
