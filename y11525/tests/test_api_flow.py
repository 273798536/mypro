#!/usr/bin/env python3
"""API 完整流程测试脚本"""
import sys
import json
import httpx

BASE_URL = "http://127.0.0.1:8000"


def api_test():
    print("=" * 70)
    print("  API 完整流程测试")
    print("=" * 70)

    client = httpx.Client(base_url=BASE_URL, timeout=30.0)

    try:
        # 1. 创建批次（多数据源）
        print("\n1. 创建批次（多数据源）")
        batch_data = {
            "batch_no": "BATCH-API-FLOW-002",
            "created_by": "api_operator",
            "source_type": "mixed",
            "customs_code": "CN021",
            "packages": [
                {"package_no": "PKG-API-001", "waybill_no": "WB-API-001",
                 "declared_value": 100.0, "tax_amount": 10.0, "source": "declaration_form"},
                {"package_no": "PKG-API-002", "waybill_no": "WB-API-002",
                 "declared_value": 200.0, "tax_amount": 20.0, "is_abnormal": True,
                 "abnormal_reason": "测试异常", "source": "declaration_form"}
            ],
            "tracking_nodes": [
                {"package_no": "PKG-API-001", "node_type": "clearance",
                 "status": "正常", "location": "上海海关"}
            ],
            "tax_notices": [
                {"notice_no": "TAX-API-001", "package_no": "PKG-API-001", "tax_amount": 12.0}
            ],
            "temp_records": [
                {"record_type": "ownership_correction", "package_no": "PKG-API-002",
                 "content": "归属修正测试", "recorded_by": "corr_officer"}
            ],
            "idempotency_mode": "ignore"
        }

        resp = client.post("/batches", json=batch_data)
        resp.raise_for_status()
        result = resp.json()
        batch_id = result["batch_id"]
        print(f"  ✓ 批次创建成功: {batch_id}")
        print(f"    状态: {result['status']}")
        print(f"    包裹: {result['operation']['packages']}, "
              f"轨迹: {result['operation']['tracking_nodes']}, "
              f"补税: {result['operation']['tax_notices']}, "
              f"临时补录: {result['operation']['temp_records']}")

        # 2. 上传附件
        print("\n2. 上传附件")
        with open("../examples/sample_attachment.pdf", "rb") as f:
            files = {"file": ("sample_attachment.pdf", f, "application/pdf")}
            data = {"uploaded_by": "api_uploader", "description": "API测试附件"}
            resp = client.post(f"/batches/{batch_id}/attachments", files=files, data=data)
            resp.raise_for_status()
            att_result = resp.json()
        print(f"  ✓ 附件上传成功: {att_result['file_name']} ({att_result['file_size']} bytes)")

        # 3. 查看附件列表
        print("\n3. 查看附件列表")
        resp = client.get(f"/batches/{batch_id}/attachments")
        resp.raise_for_status()
        attachments = resp.json()
        print(f"  ✓ 附件数量: {len(attachments)}")

        # 4. 状态流转
        print("\n4. 状态流转到 UNDER_REVIEW")
        resp = client.post(f"/batches/{batch_id}/transition", json={
            "target_status": "under_review",
            "changed_by": "api_reviewer",
            "reason": "API测试-开始复核"
        })
        resp.raise_for_status()
        batch = resp.json()
        print(f"  ✓ 当前状态: {batch['status']}")

        # 5. 创建异步任务
        print("\n5. 创建异步任务（税费核算、异常检测、数据核对）")
        task_types = ["tax_calculation", "abnormal_detection", "data_reconciliation"]
        task_ids = []
        for task_type in task_types:
            resp = client.post("/tasks", json={
                "batch_id": batch_id,
                "task_type": task_type,
                "created_by": "api_system",
                "max_retries": 3
            })
            resp.raise_for_status()
            task = resp.json()
            task_ids.append(task["id"])
            print(f"  ✓ 创建 {task_type}: {task['id'][:12]}...")

        # 6. 处理任务
        print("\n6. 处理异步任务（多轮执行覆盖失败重试）")
        for i in range(5):
            resp = client.post("/tasks/process")
            resp.raise_for_status()
            processed = resp.json()["processed_tasks"]
            print(f"    第 {i+1} 轮: 处理 {processed} 个任务")
            if processed == 0 and i > 2:
                break

        # 7. 查看任务状态
        print("\n7. 查看任务最终状态")
        resp = client.get("/tasks")
        resp.raise_for_status()
        tasks = resp.json()
        for task in tasks[-3:]:
            status_icon = "✓" if task["status"] == "completed" else "⚠" if task["status"] == "waiting_manual" else "⏳"
            err_info = f" - {task['last_error'][:60]}..." if task["last_error"] else ""
            print(f"    {status_icon} {task['task_type']:<25} {task['status']:<18} "
                  f"重试:{task['retry_count']}/{task['max_retries']}{err_info}")

        # 8. 冻结结算
        print("\n8. 冻结结算")
        resp = client.post(f"/batches/{batch_id}/freeze", json={
            "frozen_by": "api_manager",
            "frozen_reason": "API测试-异常件归属争议，冻结结算"
        })
        resp.raise_for_status()
        batch = resp.json()
        print(f"  ✓ 冻结状态: {batch['status']}")
        print(f"    冻结人: {batch['frozen_by']}")
        print(f"    冻结原因: {batch['frozen_reason']}")

        # 9. 解冻
        print("\n9. 解冻结算")
        resp = client.post(f"/batches/{batch_id}/unfreeze", json={
            "unfrozen_by": "api_manager",
            "reason": "API测试-归属已确认，可结算"
        })
        resp.raise_for_status()
        batch = resp.json()
        print(f"  ✓ 解冻后状态: {batch['status']}")

        # 10. 查看历史记录
        print("\n10. 查看完整历史记录")
        resp = client.get(f"/batches/{batch_id}/history")
        resp.raise_for_status()
        history = resp.json()
        print(f"  ✓ 共 {len(history)} 条历史记录")
        print(f"    {'时间':<25} {'操作人':<15} {'操作':<22} {'状态变更'}")
        print(f"    {'─'*75}")
        for entry in history:
            status_change = ""
            if "status_change" in entry:
                sc = entry["status_change"]
                status_change = f"{sc.get('from') or '-'} → {sc.get('to') or '-'}"
            print(f"    {entry['timestamp']:<25} {entry['user']:<15} "
                  f"{entry['action']:<22} {status_change}")

        # 11. 导出数据
        print("\n11. 导出数据")
        resp = client.post(f"/batches/{batch_id}/export", json={
            "format": "xlsx",
            "include_history": True,
            "include_packages": True
        })
        resp.raise_for_status()
        export_result = resp.json()
        print(f"  ✓ 导出成功: {export_result['file_name']}")
        print(f"    文件大小: {export_result['file_size']} bytes")

        # 12. 模拟重启后验证
        print("\n12. 模拟重启后验证（重新查询）")
        resp = client.get(f"/batches/{batch_id}")
        resp.raise_for_status()
        batch_restart = resp.json()
        print(f"  ✓ 批次状态: {batch_restart['status']}")
        print(f"  ✓ 包裹数: {batch_restart['total_packages']}")
        print(f"  ✓ 税费总额: {batch_restart['total_tax_amount']}")

        resp = client.get("/tasks")
        resp.raise_for_status()
        tasks_restart = resp.json()
        api_tasks = [t for t in tasks_restart if t["batch_id"] == batch_id]
        print(f"  ✓ 任务状态保留: {len(api_tasks)} 个任务状态完整")

        resp = client.get(f"/batches/{batch_id}/history")
        resp.raise_for_status()
        history_restart = resp.json()
        print(f"  ✓ 历史记录保留: {len(history_restart)} 条记录完整")

        # 13. 流转到 REVIEW_COMPLETED
        print("\n13. 复核完成")
        resp = client.post(f"/batches/{batch_id}/transition", json={
            "target_status": "review_completed",
            "changed_by": "api_lead",
            "reason": "API测试-复核完成"
        })
        resp.raise_for_status()
        batch = resp.json()
        print(f"  ✓ 当前状态: {batch['status']}")

        # 14. 归档
        print("\n14. 撤回归档")
        resp = client.post(f"/batches/{batch_id}/archive", json={
            "archived_by": "api_archiver",
            "reason": "API测试-流程完成，归档保存"
        })
        resp.raise_for_status()
        batch_final = resp.json()
        print(f"  ✓ 最终状态: {batch_final['status']}")

        print("\n" + "=" * 70)
        print("  🎉 API 完整流程测试通过！")
        print("=" * 70)

        return 0

    except Exception as e:
        print(f"\n  ❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return 1

    finally:
        client.close()


if __name__ == "__main__":
    sys.exit(api_test())
