#!/usr/bin/env python3
"""
跨境小包清关权限追责台账系统 - 完整流程示例脚本

演示从创建记录、提交、驳回、修改、二次确认、冻结到导出的完整流程。
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from ledger.database import SessionLocal, init_db
from ledger.models import (
    RecordType, RecordStatus, Role, ChangeReason
)
from ledger.services import (
    RecordService, ImportService, ExportService, AuditService
)


def print_header(title):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def main():
    init_db()
    db = SessionLocal()

    record_service = RecordService(db)
    audit_service = AuditService(db)
    export_service = ExportService(db)

    try:
        print_header("1. 创建申报表记录")
        record = record_service.create_record(
            record_type=RecordType.DECLARATION,
            tracking_no="SF123456789CN",
            package_no="PKG-2024-001",
            created_by="zhangsan",
            created_by_role=Role.DATA_ENTRY,
            hs_code="85171210",
            goods_description="智能手机",
            quantity=1,
            declared_value=2999,
            tax_amount=180,
            is_exception=False,
        )
        print(f"✓ 创建记录: {record.record_no}")
        print(f"  状态: {record.status.value}")
        print(f"  版本: v{record.version}")

        print_header("2. 提交审核")
        record = record_service.submit_record(
            record_id=record.id,
            submitted_by="zhangsan",
            submitted_by_role=Role.DATA_ENTRY,
            note="请审核该报关单",
        )
        print(f"✓ 已提交审核")
        print(f"  状态: {record.status.value}")
        print(f"  版本: v{record.version}")

        print_header("3. 审核驳回（发现税费计算错误）")
        record = record_service.reject_record(
            record_id=record.id,
            rejected_by="lisi",
            rejected_by_role=Role.REVIEWER,
            rejection_reason="税费计算有误，应为210元，请核实",
        )
        print(f"✓ 已驳回")
        print(f"  状态: {record.status.value}")
        print(f"  版本: v{record.version}")

        print_header("4. 修改后重新提交")
        record = record_service.update_record(
            record_id=record.id,
            updated_by="zhangsan",
            updated_by_role=Role.DATA_ENTRY,
            change_reason=ChangeReason.TAX_RECALCULATION,
            change_reason_note="根据审核意见调整税费",
            tax_amount=210,
        )
        print(f"✓ 已更新记录")
        print(f"  状态: {record.status.value}")
        print(f"  版本: v{record.version}")

        record = record_service.submit_record(
            record_id=record.id,
            submitted_by="zhangsan",
            submitted_by_role=Role.DATA_ENTRY,
            note="已调整税费，请重新审核",
        )
        print(f"✓ 已重新提交")
        print(f"  状态: {record.status.value}")

        print_header("5. 二次确认")
        record = record_service.confirm_record(
            record_id=record.id,
            confirmed_by="wangwu",
            confirmed_by_role=Role.MANAGER,
            note="数据核实无误",
        )
        print(f"✓ 已确认")
        print(f"  状态: {record.status.value}")
        print(f"  最终处理人: {record.final_handler}")
        print(f"  版本: v{record.version}")

        print_header("6. 查看变更历史")
        history = audit_service.get_record_history(record.id)
        print(f"共 {len(history)} 条变更记录:")
        for h in history:
            h_dict = h.to_dict()
            print(f"\n  [{h_dict['action_time']}]")
            print(f"    操作: {h_dict['action']} by {h_dict['action_by']}")
            print(f"    版本: {h_dict['version_before']} -> {h_dict['version_after']}")
            if h_dict['action_note']:
                print(f"    备注: {h_dict['action_note']}")
            for diff in h_dict['diffs']:
                print(f"    - {diff['field_name']}: {diff['old_value']} -> {diff['new_value']}")

        print_header("7. 版本对比（v2 vs v7）")
        diff_result = audit_service.compare_versions(record.id, 2, 7)
        print(f"变更字段数: {len(diff_result['diffs'])}")
        for diff in diff_result['diffs']:
            print(f"  - {diff['field_name']}: {diff['old_value']} -> {diff['new_value']}")

        print_header("8. 冻结记录（导出前）")
        record = record_service.freeze_record(
            record_id=record.id,
            frozen_by="wangwu",
            frozen_by_role=Role.MANAGER,
            reason="月度台账导出",
        )
        print(f"✓ 已冻结")
        print(f"  状态: {record.status.value}")
        print(f"  冻结状态: {record.is_frozen}")

        print_header("9. 导出数据")
        export_data = export_service.export_records(
            record_ids=[record.id],
            include_history=True,
            desensitize=False,
        )
        print(f"✓ 导出 {len(export_data)} 条记录")
        for rec in export_data:
            print(f"  - {rec['record_no']}: {rec['status']}")
            if rec.get('change_history'):
                print(f"    变更历史: {len(rec['change_history'])} 条")

        print_header("10. 生成异常报表")
        exception_report = export_service.generate_exception_report()
        print(f"异常总数: {exception_report['total_exceptions']}")
        for owner, count in exception_report['exception_by_owner'].items():
            print(f"  {owner}: {count}")

        print_header("11. 经理仪表盘")
        dashboard = export_service.generate_manager_dashboard()
        print(f"记录总数: {dashboard['total_records']}")
        print(f"总申报价值: {dashboard['total_declared_value']:,}")
        print(f"总税费: {dashboard['total_tax_amount']:,}")
        print("\n按状态统计:")
        for status, count in dashboard['status_summary'].items():
            print(f"  {status}: {count}")

        print("\n" + "=" * 60)
        print("  演示完成!")
        print("=" * 60)

    except Exception as e:
        print(f"\n✗ 错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
