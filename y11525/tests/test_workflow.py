#!/usr/bin/env python3
"""测试完整工作流程"""
import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from customs_statemachine.database import SessionLocal, init_db
from customs_statemachine.state_machine import StateMachine
from customs_statemachine.schemas import BatchCreate, PackageCreate
from customs_statemachine.audit_service import AuditService
from customs_statemachine.export_service import ExportService


def test_full_workflow():
    init_db()
    db = SessionLocal()
    sm = StateMachine(db)
    audit = AuditService(db)
    export = ExportService(db)

    print("=" * 60)
    print("1. 创建批次")
    print("=" * 60)

    batch_data = BatchCreate(
        batch_no="TEST-WORKFLOW-001",
        created_by="operator_1",
        source_type="declaration_form",
        customs_code="CN021",
        packages=[
            PackageCreate(
                package_no="PKG001",
                waybill_no="WB001",
                declared_value=100.0,
                tax_amount=10.0,
                is_abnormal=False,
                source="declaration_form"
            ),
            PackageCreate(
                package_no="PKG002",
                waybill_no="WB002",
                declared_value=200.0,
                tax_amount=20.0,
                is_abnormal=True,
                abnormal_reason="税费归属错位",
                source="tax_notice"
            )
        ]
    )

    batch, stats = sm.create_batch(batch_data)
    print(f"批次ID: {batch.id}")
    print(f"批次号: {batch.batch_no}")
    print(f"状态: {batch.status.value}")
    print(f"包裹数: {batch.total_packages}")
    print(f"税费总额: {batch.total_tax_amount}")
    print(f"操作统计: {stats}")

    print("\n" + "=" * 60)
    print("2. 状态流转: created -> under_review")
    print("=" * 60)

    batch = sm.transition(
        batch=batch,
        target_status=batch.status.UNDER_REVIEW,
        changed_by="reviewer_1",
        reason="开始复核异常件"
    )
    print(f"新状态: {batch.status.value}")

    print("\n" + "=" * 60)
    print("3. 冻结结算")
    print("=" * 60)

    batch = sm.freeze_settlement(
        batch=batch,
        frozen_by="manager_1",
        frozen_reason="异常件需人工确认归属后再结算"
    )
    print(f"冻结状态: {batch.status.value}")
    print(f"冻结人: {batch.frozen_by}")
    print(f"冻结原因: {batch.frozen_reason}")
    print(f"冻结前状态: {batch.status_before_frozen}")

    print("\n" + "=" * 60)
    print("4. 查看历史记录")
    print("=" * 60)

    history = audit.get_changes_summary(batch.id)
    for entry in history:
        print(f"[{entry['timestamp']}] {entry['user']} - {entry['action']}")
        if entry.get('reason'):
            print(f"  原因: {entry['reason']}")
        if 'status_change' in entry:
            sc = entry['status_change']
            print(f"  状态变更: {sc.get('from')} -> {sc.get('to')}")

    print("\n" + "=" * 60)
    print("5. 解冻并完成复核")
    print("=" * 60)

    batch = sm.unfreeze_settlement(
        batch=batch,
        unfrozen_by="manager_1",
        reason="异常件归属已确认，可继续处理"
    )
    print(f"解冻后状态: {batch.status.value}")

    batch = sm.transition(
        batch=batch,
        target_status=batch.status.REVIEW_COMPLETED,
        changed_by="reviewer_1",
        reason="复核完成"
    )
    print(f"复核完成: {batch.status.value}")

    print("\n" + "=" * 60)
    print("6. 导出数据")
    print("=" * 60)

    result = export.export_to_excel(batch)
    print(f"导出文件: {result['file_path']}")
    print(f"文件大小: {result['file_size']} bytes")

    print("\n" + "=" * 60)
    print("7. 归档批次")
    print("=" * 60)

    batch = sm.archive(
        batch=batch,
        archived_by="operator_1",
        reason="流程完成，归档保存"
    )
    print(f"归档状态: {batch.status.value}")

    print("\n" + "=" * 60)
    print("测试完成！所有功能正常工作")
    print("=" * 60)

    db.close()


if __name__ == "__main__":
    test_full_workflow()
