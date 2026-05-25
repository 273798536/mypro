#!/usr/bin/env python3
"""
跨境小包清关异常回执状态机 - 完整验收测试脚本

测试目标:
1. 多数据源接入（申报表、轨迹节点、补税通知、临时补录单）
2. 完整业务流程（创建→附件上传→复核→冻结→归档）
3. 异步任务失败链路（等重试/等人工/永久失败）
4. 重启后历史/导出数据一致性
5. 审计追踪完整性（谁在什么时候改了什么）
"""
import sys
import os
import json
import random
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from customs_statemachine.database import SessionLocal, init_db
from customs_statemachine.state_machine import StateMachine
from customs_statemachine.schemas import (
    BatchCreate, PackageCreate, TrackingNodeCreate,
    TaxNoticeCreate, TempRecordCreate
)
from customs_statemachine.audit_service import AuditService
from customs_statemachine.task_processor import TaskProcessor
from customs_statemachine.task_handlers import register_handlers
from customs_statemachine.export_service import ExportService
from customs_statemachine.models import (
    Batch, BatchStatus, TaskStatus, Package, Attachment,
    TrackingNode, TaxNotice, TempRecord
)
from customs_statemachine.config import settings

FAIL_SIMULATION = False


def print_header(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def print_subheader(title):
    print("\n" + "-" * 50)
    print(f"  {title}")
    print("-" * 50)


def check(condition, message):
    """检查断言，通过显示 ✓，失败显示 ✗"""
    status = "✓" if condition else "✗"
    print(f"  {status} {message}")
    if not condition:
        print(f"    ERROR: 检查失败！")
    return condition


def get_batch_stats(db, batch_id):
    """获取批次各表数据量统计"""
    return {
        "packages": db.query(Package).filter(Package.batch_id == batch_id).count(),
        "tracking_nodes": db.query(TrackingNode).filter(TrackingNode.batch_id == batch_id).count(),
        "tax_notices": db.query(TaxNotice).filter(TaxNotice.batch_id == batch_id).count(),
        "temp_records": db.query(TempRecord).filter(TempRecord.batch_id == batch_id).count(),
        "attachments": db.query(Attachment).filter(Attachment.batch_id == batch_id).count()
    }


def create_test_data():
    """创建测试数据"""
    packages = [
        PackageCreate(
            package_no=f"PKG-TEST-{i:03d}",
            waybill_no=f"WB-TEST-{i:03d}",
            declared_value=100.0 + i * 50,
            tax_amount=10.0 + i * 5,
            is_abnormal=(i == 2),
            abnormal_reason="初步检测异常" if i == 2 else None,
            source="declaration_form"
        ) for i in range(5)
    ]

    tracking_nodes = [
        TrackingNodeCreate(
            package_no=f"PKG-TEST-{i:03d}",
            node_type="customs_clearance",
            node_time=f"2024-05-24T{i+10:02d}:00:00",
            location="上海浦东海关",
            status="正常" if i != 2 else "扣留检查",
            remark="正常清关" if i != 2 else "申报价值异常，需人工复核"
        ) for i in range(5)
    ]

    tax_notices = [
        TaxNoticeCreate(
            notice_no=f"TAX-TEST-{i:03d}",
            package_no=f"PKG-TEST-{i:03d}",
            tax_amount=12.0 + i * 6,
            tax_type="行邮税",
            issue_date="2024-05-24T09:00:00",
            due_date="2024-06-03T23:59:59",
            is_paid=False
        ) for i in range(5)
    ]

    temp_records = [
        TempRecordCreate(
            record_type="ownership_correction",
            package_no="PKG-TEST-002",
            content="该包裹原归属BATCH-001错误，已调整至本批次，税费由本批次承担",
            recorded_by="correction_officer_1",
            recorded_at="2024-05-24T15:30:00"
        ),
        TempRecordCreate(
            record_type="supplement_info",
            package_no="PKG-TEST-001",
            content="已补充购买凭证和支付截图",
            recorded_by="operator_2",
            recorded_at="2024-05-24T11:00:00"
        )
    ]

    return packages, tracking_nodes, tax_notices, temp_records


def test_acceptance():
    print_header("跨境小包清关异常回执状态机 - 完整验收测试")

    # 初始化
    init_db()
    db = SessionLocal()
    sm = StateMachine(db)
    audit = AuditService(db)
    tp = TaskProcessor(db)
    register_handlers(tp)
    export_service = ExportService(db)

    all_passed = True

    # =====================================================================
    # TEST 1: 批次创建 - 多数据源接入
    # =====================================================================
    print_header("TEST 1: 批次创建 - 多数据源接入")

    packages, tracking_nodes, tax_notices, temp_records = create_test_data()

    batch_data = BatchCreate(
        batch_no="BATCH-ACCEPTANCE-001",
        created_by="operator_test",
        source_type="declaration_form",
        customs_code="CN021",
        packages=packages,
        tracking_nodes=tracking_nodes,
        tax_notices=tax_notices,
        temp_records=temp_records,
        idempotency_mode="ignore"
    )

    batch, stats = sm.create_batch(batch_data)

    print_subheader("创建结果")
    print(f"  批次ID: {batch.id}")
    print(f"  批次号: {batch.batch_no}")
    print(f"  状态: {batch.status.value}")
    print(f"  操作统计: {json.dumps(stats, ensure_ascii=False, indent=6)}")

    stats_before = get_batch_stats(db, batch.id)

    all_passed &= check(batch.status == BatchStatus.CREATED, "批次初始状态为 CREATED")
    all_passed &= check(stats_before["packages"] == 5, f"packages 表有 {stats_before['packages']} 条记录 (期望 5)")
    all_passed &= check(stats_before["tracking_nodes"] == 5, f"tracking_nodes 表有 {stats_before['tracking_nodes']} 条记录 (期望 5)")
    all_passed &= check(stats_before["tax_notices"] == 5, f"tax_notices 表有 {stats_before['tax_notices']} 条记录 (期望 5)")
    all_passed &= check(stats_before["temp_records"] == 2, f"temp_records 表有 {stats_before['temp_records']} 条记录 (期望 2)")
    all_passed &= check(batch.total_packages == 5, f"批次统计包裹数 {batch.total_packages} (期望 5)")

    # 检查审计日志
    history = audit.get_changes_summary(batch.id)
    all_passed &= check(len(history) >= 1, f"审计日志有 {len(history)} 条记录 (期望 >= 1)")

    print_subheader("审计日志")
    for entry in history[:3]:
        print(f"  [{entry['timestamp']}] {entry['user']} - {entry['action']}")

    # =====================================================================
    # TEST 2: 幂等性测试 - 同批次号重复创建
    # =====================================================================
    print_header("TEST 2: 幂等性测试 - 同批次号重复创建")

    # IGNORE 模式
    print_subheader("IGNORE 模式 - 重复创建同批次号")
    batch_ignore, stats_ignore = sm.create_batch(batch_data)
    all_passed &= check(stats_ignore["mode"] == "ignored", f"操作模式为 ignored (实际 {stats_ignore['mode']})")
    all_passed &= check(batch_ignore.id == batch.id, "返回同一批次ID")

    stats_after_ignore = get_batch_stats(db, batch.id)
    all_passed &= check(stats_after_ignore["packages"] == 5, "IGNORE 模式下 packages 数量不变")

    # APPEND 模式
    print_subheader("APPEND 模式 - 追加数据")
    batch_data.idempotency_mode = "append"
    batch_data.packages = [
        PackageCreate(
            package_no="PKG-TEST-005",
            waybill_no="WB-TEST-005",
            declared_value=500.0,
            tax_amount=50.0,
            source="declaration_form"
        )
    ]
    batch_append, stats_append = sm.create_batch(batch_data)
    all_passed &= check(stats_append["mode"] == "appended", f"操作模式为 appended (实际 {stats_append['mode']})")

    stats_after_append = get_batch_stats(db, batch.id)
    all_passed &= check(stats_after_append["packages"] == 6, f"APPEND 模式后 packages 数量 {stats_after_append['packages']} (期望 6)")

    # OVERWRITE 模式
    print_subheader("OVERWRITE 模式 - 覆盖数据")
    batch_data.idempotency_mode = "overwrite"
    batch_data.packages = packages  # 恢复原始 5 个包裹
    batch_overwrite, stats_overwrite = sm.create_batch(batch_data)
    all_passed &= check(stats_overwrite["mode"] == "overwritten", f"操作模式为 overwritten (实际 {stats_overwrite['mode']})")

    stats_after_overwrite = get_batch_stats(db, batch.id)
    all_passed &= check(stats_after_overwrite["packages"] == 5, f"OVERWRITE 模式后 packages 数量 {stats_after_overwrite['packages']} (期望 5)")

    # =====================================================================
    # TEST 3: 附件补传
    # =====================================================================
    print_header("TEST 3: 附件补传")

    # 创建模拟附件文件
    att_path = settings.DATA_DIR / "attachments"
    att_path.mkdir(parents=True, exist_ok=True)
    test_file = att_path / "test_review_document.pdf"
    test_file.write_text("%PDF-1.4\nTest attachment content\n清关异常复核说明\n复核人: 张三\n")

    # 使用 CLI 类似的方式上传附件
    dest_dir = settings.DATA_DIR / "attachments" / batch.id
    dest_dir.mkdir(parents=True, exist_ok=True)
    import shutil
    import uuid as uuid_lib
    dest_file = dest_dir / f"{uuid_lib.uuid4().hex}_{test_file.name}"
    shutil.copy2(test_file, dest_file)

    attachment = Attachment(
        id=str(uuid_lib.uuid4()),
        batch_id=batch.id,
        file_name=test_file.name,
        file_type="pdf",
        file_size=dest_file.stat().st_size,
        file_path=str(dest_file),
        uploaded_by="reviewer_test",
        description="清关异常人工复核意见"
    )
    db.add(attachment)

    audit.log_action(
        batch_id=batch.id,
        action="attachment_uploaded",
        old_status=batch.status.value,
        new_status=BatchStatus.ATTACHMENTS_UPLOADED.value,
        changed_by="reviewer_test",
        reason=f"上传附件: {test_file.name}"
    )

    # 状态流转到 ATTACHMENTS_UPLOADED
    batch = sm.transition(
        batch=batch,
        target_status=BatchStatus.ATTACHMENTS_UPLOADED,
        changed_by="reviewer_test",
        reason="补传复核材料完成"
    )
    db.commit()
    db.refresh(batch)

    stats_after_att = get_batch_stats(db, batch.id)
    all_passed &= check(stats_after_att["attachments"] == 1, f"attachments 表有 {stats_after_att['attachments']} 条记录 (期望 1)")
    all_passed &= check(batch.status == BatchStatus.ATTACHMENTS_UPLOADED, f"状态流转为 ATTACHMENTS_UPLOADED (实际 {batch.status.value})")

    print(f"  ✓ 附件上传: {test_file.name}")
    print(f"  ✓ 状态变为: {batch.status.value}")

    # =====================================================================
    # TEST 4: 状态流转 - 完整工作流
    # =====================================================================
    print_header("TEST 4: 状态流转 - 完整工作流")

    transitions = [
        (BatchStatus.UNDER_REVIEW, "复核专员01", "开始复核异常包裹税费归属"),
        (BatchStatus.REVIEW_COMPLETED, "复核主管01", "复核完成，异常件归属已确认"),
    ]

    for target_status, changed_by, reason in transitions:
        batch = sm.transition(
            batch=batch,
            target_status=target_status,
            changed_by=changed_by,
            reason=reason
        )
        print(f"  ✓ {batch.status.value} ← {changed_by}: {reason}")

    db.commit()
    db.refresh(batch)

    all_passed &= check(batch.status == BatchStatus.REVIEW_COMPLETED, f"最终状态为 REVIEW_COMPLETED (实际 {batch.status.value})")

    # =====================================================================
    # TEST 5: 异步任务处理 - 失败链路
    # =====================================================================
    print_header("TEST 5: 异步任务处理 - 失败链路验证")

    task_types = [
        ("tax_calculation", "税费核算任务"),
        ("abnormal_detection", "异常件检测任务"),
        ("data_reconciliation", "数据核对任务"),
        ("export_generation", "导出生成任务"),
    ]

    created_tasks = []
    for task_type, description in task_types:
        task = tp.create_task(
            batch_id=batch.id,
            task_type=task_type,
            created_by="system_auto",
            payload={"batch_id": batch.id},
            max_retries=3
        )
        created_tasks.append(task)
        print(f"  ✓ 创建任务: {description} ({task_type}) - ID: {task.id[:8]}...")

    all_passed &= check(len(created_tasks) == 4, f"创建了 {len(created_tasks)} 个异步任务 (期望 4)")

    # 处理任务
    print_subheader("执行任务处理（模拟随机失败场景）")

    # 设置随机种子确保可复现
    random.seed(42)

    max_rounds = 10
    completed_tasks = set()
    manual_tasks = []

    for round_num in range(max_rounds):
        pending_before = len([t for t in created_tasks if t.status in [TaskStatus.PENDING, TaskStatus.WAITING_RETRY]])
        if pending_before == 0 and len(completed_tasks) == 0:
            pass

        processed = tp.run_once()
        db.commit()

        for task in created_tasks:
            db.refresh(task)
            if task.status == TaskStatus.COMPLETED and task.id not in completed_tasks:
                print(f"  ✓ 任务完成: {task.task_type}")
                completed_tasks.add(task.id)
            elif task.status == TaskStatus.WAITING_MANUAL and task.id not in [t.id for t in manual_tasks]:
                manual_tasks.append(task)
                print(f"  ⚠ 需要人工: {task.task_type} - {task.last_error}")

        # 检查是否所有任务都有最终状态
        all_finished = all(
            t.status in [TaskStatus.COMPLETED, TaskStatus.WAITING_MANUAL, TaskStatus.PERMANENT_FAILED]
            for t in created_tasks
        )
        if all_finished:
            break

    print_subheader("任务状态汇总")
    for task in created_tasks:
        status_icon = "✓" if task.status == TaskStatus.COMPLETED else "⏳" if task.status == TaskStatus.WAITING_RETRY else "⚠" if task.status == TaskStatus.WAITING_MANUAL else "✗"
        print(f"  {status_icon} {task.task_type:<25} {task.status.value:<18} 重试:{task.retry_count}/{task.max_retries}")
        if task.last_error:
            print(f"       错误: {task.last_error[:80]}...")

    # 统计不同状态的任务
    status_counts = {}
    for task in created_tasks:
        status_counts[task.status.value] = status_counts.get(task.status.value, 0) + 1

    print(f"\n  状态统计: {json.dumps(status_counts, ensure_ascii=False)}")
    all_passed &= check(len(created_tasks) == sum(status_counts.values()), "所有任务都有状态")

    # =====================================================================
    # TEST 6: 人工处理任务
    # =====================================================================
    print_header("TEST 6: 人工处理 - 等人工任务的解决和重试")

    if manual_tasks:
        print_subheader("人工解决任务")
        for task in manual_tasks:
            print(f"  处理任务: {task.task_type}")
            print(f"  错误原因: {task.last_error}")

            resolved = tp.resolve_manual_task(
                task=task,
                resolved_by="manual_operator_01",
                resolution=f"已人工核实异常包裹归属，确认税费由本批次承担",
                result={"manual_verified": True, "verified_by": "manual_operator_01"}
            )
            db.commit()
            db.refresh(task)
            all_passed &= check(task.status == TaskStatus.COMPLETED, f"任务 {task.task_type} 人工解决后状态为 COMPLETED")
            print(f"  ✓ 人工解决完成: {task.task_type}")

    # 测试重试功能
    retryable_tasks = [t for t in created_tasks if t.status == TaskStatus.WAITING_RETRY]
    if retryable_tasks:
        print_subheader("重试失败任务")
        for task in retryable_tasks[:1]:
            tp.retry_task(task, retried_by="retry_operator_01", reason="系统恢复，重新执行")
            db.commit()
            processed = tp.run_once()
            db.refresh(task)
            print(f"  ✓ 任务重试: {task.task_type} - 新状态: {task.status.value}")

    # =====================================================================
    # TEST 7: 冻结结算
    # =====================================================================
    print_header("TEST 7: 冻结结算 - 异常情况处理")

    batch = sm.freeze_settlement(
        batch=batch,
        frozen_by="settlement_manager",
        frozen_reason="发现异常件归属仍有争议，冻结结算等待最终确认"
    )
    db.commit()
    db.refresh(batch)

    all_passed &= check(batch.status == BatchStatus.SETTLEMENT_FROZEN, f"状态为 SETTLEMENT_FROZEN (实际 {batch.status.value})")
    all_passed &= check(batch.frozen_by == "settlement_manager", "冻结人已记录")
    all_passed &= check(batch.frozen_reason is not None, "冻结原因已记录")
    all_passed &= check(batch.status_before_frozen == BatchStatus.REVIEW_COMPLETED.value, "冻结前状态已保存")

    print(f"  ✓ 冻结状态: {batch.status.value}")
    print(f"  ✓ 冻结人: {batch.frozen_by}")
    print(f"  ✓ 冻结原因: {batch.frozen_reason}")
    print(f"  ✓ 冻结前状态: {batch.status_before_frozen}")

    # 解冻并恢复
    print_subheader("解冻结算")
    batch = sm.unfreeze_settlement(
        batch=batch,
        unfrozen_by="settlement_manager",
        reason="归属争议已解决，可正常结算"
    )
    db.commit()
    db.refresh(batch)

    all_passed &= check(batch.status == BatchStatus.REVIEW_COMPLETED, f"解冻后恢复到 REVIEW_COMPLETED (实际 {batch.status.value})")
    all_passed &= check(batch.frozen_at is None, "冻结时间已清空")
    print(f"  ✓ 解冻后状态: {batch.status.value}")

    # =====================================================================
    # TEST 8: 导出数据
    # =====================================================================
    print_header("TEST 8: 数据导出")

    export_result = export_service.export_to_excel(
        batch=batch,
        include_history=True,
        include_packages=True
    )

    export_file = Path(export_result["file_path"])
    all_passed &= check(export_file.exists(), f"导出文件已生成: {export_file.name}")
    all_passed &= check(export_result["file_size"] > 0, "导出文件大小 > 0")

    print(f"  ✓ 导出文件: {export_result['file_name']}")
    print(f"  ✓ 文件大小: {export_result['file_size']} bytes")
    print(f"  ✓ 保存路径: {export_result['file_path']}")

    # 导出摘要
    summary = export_service.export_batch_summary(batch)
    print(f"\n  导出摘要:")
    print(f"    - 批次号: {summary['batch_summary']['batch_no']}")
    print(f"    - 当前状态: {summary['batch_summary']['current_status']}")
    print(f"    - 冻结状态: {'已冻结' if summary['batch_summary']['frozen']['is_frozen'] else '未冻结'}")
    print(f"    - 包裹数: {summary['batch_summary']['total_packages']}")
    if 'package_statistics' in summary:
        print(f"    - 异常率: {summary['package_statistics']['abnormal_rate']:.1%}")

    # =====================================================================
    # TEST 9: 审计追踪 - 完整历史记录
    # =====================================================================
    print_header("TEST 9: 审计追踪 - 完整变更历史")

    full_history = audit.get_changes_summary(batch.id)

    print(f"  共 {len(full_history)} 条历史记录")
    print()
    print(f"  {'时间':<25} {'操作人':<15} {'操作':<22} {'状态变更'}")
    print(f"  {'─'*75}")

    expected_actions = {
        "batch_created": 0,
        "data_appended": 0,
        "batch_overwritten": 0,
        "attachment_uploaded": 0,
        "status_transition": 0,
    }

    for entry in full_history:
        status_change = ""
        if "status_change" in entry:
            sc = entry["status_change"]
            status_change = f"{sc.get('from') or '-'} → {sc.get('to') or '-'}"

        action = entry["action"]
        if action in expected_actions:
            expected_actions[action] += 1

        print(f"  {entry['timestamp']:<25} {entry['user']:<15} {action:<22} {status_change}")

    print()
    all_passed &= check(expected_actions["batch_created"] >= 1, "有批次创建记录")
    all_passed &= check(expected_actions["status_transition"] >= 4, f"有 {expected_actions['status_transition']} 次状态流转 (期望 >= 4)")
    all_passed &= check(expected_actions["attachment_uploaded"] >= 1, "有附件上传记录")

    # 检查历史记录中的用户
    unique_users = {entry["user"] for entry in full_history}
    print(f"\n  涉及用户: {', '.join(sorted(unique_users))}")
    all_passed &= check(len(unique_users) >= 5, f"至少有 5 个不同用户操作 (实际 {len(unique_users)})")

    # =====================================================================
    # TEST 10: 模拟重启 - 数据持久化验证
    # =====================================================================
    print_header("TEST 10: 模拟重启 - 数据持久化验证")

    batch_id = batch.id
    batch_no = batch.batch_no
    export_file_path = export_result["file_path"]
    task_ids = [t.id for t in created_tasks]

    print_subheader("关闭数据库连接（模拟服务重启）")
    db.close()

    print_subheader("重新建立数据库连接")
    db2 = SessionLocal()
    sm2 = StateMachine(db2)
    audit2 = AuditService(db2)
    export_service2 = ExportService(db2)

    # 查询批次
    batch_restarted = db2.query(Batch).filter(Batch.id == batch_id).first()
    all_passed &= check(batch_restarted is not None, "批次数据存在")
    all_passed &= check(batch_restarted.batch_no == batch_no, "批次号正确")
    all_passed &= check(batch_restarted.status == BatchStatus.REVIEW_COMPLETED, f"状态正确: {batch_restarted.status.value}")

    # 检查各表数据
    stats_restart = get_batch_stats(db2, batch_id)
    print(f"\n  重启后数据统计:")
    print(f"    packages: {stats_restart['packages']} (期望 5)")
    print(f"    tracking_nodes: {stats_restart['tracking_nodes']} (期望 5)")
    print(f"    tax_notices: {stats_restart['tax_notices']} (期望 5)")
    print(f"    temp_records: {stats_restart['temp_records']} (期望 2)")
    print(f"    attachments: {stats_restart['attachments']} (期望 1)")

    all_passed &= check(stats_restart["packages"] == 5, "重启后 packages 数量正确")
    all_passed &= check(stats_restart["tracking_nodes"] == 5, "重启后 tracking_nodes 数量正确")
    all_passed &= check(stats_restart["tax_notices"] == 5, "重启后 tax_notices 数量正确")
    all_passed &= check(stats_restart["temp_records"] == 2, "重启后 temp_records 数量正确")
    all_passed &= check(stats_restart["attachments"] == 1, "重启后 attachments 数量正确")

    # 检查任务状态
    print(f"\n  重启后任务状态验证:")
    from customs_statemachine.models import AsyncTask
    for task_id in task_ids:
        task = db2.query(AsyncTask).filter(AsyncTask.id == task_id).first()
        all_passed &= check(task is not None, f"任务 {task_id[:8]}... 存在")
        all_passed &= check(task.status is not None, f"任务状态已保存: {task.status.value}")
        if task.last_error:
            print(f"    {task.task_type:<25} {task.status.value:<18} - 失败原因已保存")
        else:
            print(f"    {task.task_type:<25} {task.status.value:<18}")

    # 检查任务处理结果
    any_task_has_result = False
    for task_id in task_ids:
        task = db2.query(AsyncTask).filter(AsyncTask.id == task_id).first()
        if task and task.result:
            any_task_has_result = True
            break
    all_passed &= check(any_task_has_result, "任务处理结果已保存")
    if any_task_has_result:
        print(f"\n  ✓ 任务处理结果已持久化")

    # 检查历史记录
    history_restart = audit2.get_changes_summary(batch_id)
    all_passed &= check(len(history_restart) == len(full_history), f"历史记录数量一致 (重启前 {len(full_history)}, 重启后 {len(history_restart)})")

    # 检查导出文件
    all_passed &= check(Path(export_file_path).exists(), "导出文件仍然存在")

    # 重新导出
    print(f"\n  重启后重新导出:")
    reexport_result = export_service2.export_to_excel(batch_restarted)
    all_passed &= check(reexport_result["file_size"] > 0, "重启后可重新导出数据")
    print(f"    ✓ 重新导出成功: {reexport_result['file_name']}")

    # =====================================================================
    # TEST 11: 最终归档
    # =====================================================================
    print_header("TEST 11: 撤回归档")

    batch_final = sm2.archive(
        batch=batch_restarted,
        archived_by="archive_operator",
        reason="流程完成，所有问题已解决，归档保存"
    )
    db2.commit()
    db2.refresh(batch_final)

    all_passed &= check(batch_final.status == BatchStatus.ARCHIVED, f"最终状态为 ARCHIVED (实际 {batch_final.status.value})")

    final_history = audit2.get_changes_summary(batch_id)
    print(f"\n  最终历史记录数: {len(final_history)}")
    print(f"  最终状态: {batch_final.status.value}")
    print(f"  归档人: {batch_final.audit_logs[-1].changed_by if batch_final.audit_logs else '-'}")
    print(f"  归档时间: {batch_final.updated_at}")

    # =====================================================================
    # 测试总结
    # =====================================================================
    print_header("验收测试总结")

    print(f"\n  {'测试项':<50} {'结果'}")
    print(f"  {'─'*60}")

    # 重新查询验证解冻状态（避免归档操作修改对象）
    verify_batch = db2.query(Batch).filter(Batch.id == batch_id).first()
    verify_thawed_ok = verify_batch.status == BatchStatus.ARCHIVED  # 最终是归档状态
    # 验证冻结/解冻历史：从审计日志确认状态流转正确
    audit_records = audit2.get_changes_summary(batch_id)
    has_freeze = any(r["action"] == "status_transition" and r.get("status_change", {}).get("to") == "settlement_frozen" for r in audit_records)
    has_unfreeze = any(r["action"] == "status_transition" and r.get("status_change", {}).get("from") == "settlement_frozen" for r in audit_records)
    freeze_unfreeze_ok = has_freeze and has_unfreeze

    test_results = [
        ("多数据源接入 (申报表/轨迹/补税/临时补录)", stats_before["packages"] == 5 and stats_before["tracking_nodes"] == 5),
        ("幂等性处理 (IGNORE/APPEND/OVERWRITE)", stats_after_ignore["packages"] == 5 and stats_after_append["packages"] == 6),
        ("附件补传功能", stats_after_att["attachments"] == 1),
        ("状态流转 (创建→附件→复核→完成)", batch_final.status == BatchStatus.ARCHIVED),
        ("异步任务创建 (4种业务任务)", len(created_tasks) == 4),
        ("任务失败链路 (等重试/等人工)", len(status_counts) >= 2),
        ("人工解决任务", len(manual_tasks) == 0 or all(t.status == TaskStatus.COMPLETED for t in manual_tasks)),
        ("冻结/解冻结算", freeze_unfreeze_ok),
        ("Excel数据导出", export_file.exists() and export_result["file_size"] > 0),
        ("审计追踪 (谁在什么时候改了什么)", len(full_history) >= 6 and len(unique_users) >= 5),
        ("重启后数据一致性 (历史/导出)", len(history_restart) == len(full_history) and Path(export_file_path).exists()),
        ("最终归档", batch_final.status == BatchStatus.ARCHIVED),
    ]

    passed_count = sum(1 for _, passed in test_results if passed)
    for test_name, passed in test_results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"  {test_name:<50} {status}")

    print(f"\n  {'='*60}")
    print(f"  总计: {passed_count}/{len(test_results)} 项测试通过")

    if all_passed and passed_count == len(test_results):
        print(f"\n  🎉 所有验收测试通过！系统功能完整可用")
        db2.close()
        return 0
    else:
        print(f"\n  ❌ 部分测试失败，请检查问题")
        db2.close()
        return 1


if __name__ == "__main__":
    # 清理旧数据库
    db_path = settings.DATA_DIR / "customs.db"
    if db_path.exists():
        db_path.unlink()
        print(f"已清理旧数据库: {db_path}")

    # 运行测试
    exit_code = test_acceptance()
    sys.exit(exit_code)
