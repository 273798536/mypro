#!/usr/bin/env python3
"""城市照明抢修异常回执状态机 - 使用示例

这个示例展示了从创建批次到导出汇总的完整流程：
1. 创建批次（同一路段的多个工单合并管理）
2. 上传巡检照片等附件
3. 提交审核
4. 复核改判
5. 冻结（发现问题时）
6. 解冻并修正
7. 结算归档
8. 导出汇总报表
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, Base, engine
from app.schemas import (
    BatchCreate, WorkOrderCreate, BatchFreeze, BatchReview, BatchCancel,
    AttachmentCreate,
)
from app.services import batch_service, attachment_service, export_service
from app.enums import AttachmentType, DuplicateStrategy

Base.metadata.create_all(bind=engine)


def demo_full_workflow():
    print("=" * 60)
    print("城市照明抢修异常回执状态机 - 完整流程演示")
    print("=" * 60)

    db = SessionLocal()

    try:
        print("\n1. 创建批次（合并管理同一路段的零散工单）")
        print("-" * 40)
        
        work_orders = [
            WorkOrderCreate(
                order_no="WO20260524001",
                road_section="中山路",
                pole_number="ZL-001",
                fault_description="灯泡不亮",
                is_abnormal=False,
                shift="早班",
                operator="张三",
                report_time="2026-05-24T08:30:00",
            ),
            WorkOrderCreate(
                order_no="WO20260524002",
                road_section="中山路",
                pole_number="ZL-005",
                fault_description="反复熄灯，已报修3次",
                is_abnormal=True,
                abnormal_reason="同一路段同一灯杆反复故障",
                shift="中班",
                operator="李四",
                report_time="2026-05-24T14:20:00",
            ),
            WorkOrderCreate(
                order_no="WO20260524003",
                road_section="中山路",
                pole_number="ZL-001",
                fault_description="再次报修，灯泡仍不亮",
                is_abnormal=True,
                abnormal_reason="重复工单，同一路段同一问题",
                shift="晚班",
                operator="王五",
                report_time="2026-05-24T20:15:00",
            ),
        ]

        batch_data = BatchCreate(
            batch_no="BATCH-20260524-001",
            name="中山路5月24日抢修异常汇总",
            description="中山路多灯杆反复故障，疑似备件批次问题",
            road_section="中山路",
            shift="全天",
            operator="系统管理员",
            spare_part_batch="SP-2026-05A",
            work_orders=work_orders,
        )

        batch = batch_service.create_batch(db, batch_data, created_by="系统管理员")
        print(f"批次创建成功: {batch.batch_no}")
        print(f"批次ID: {batch.id}")
        print(f"总工单数: {batch.total_work_orders}")
        print(f"异常工单数: {batch.abnormal_count}")

        batch_id = batch.id

        print("\n2. 模拟重复导入测试（忽略、覆盖、追加策略）")
        print("-" * 40)
        
        duplicate_wo = WorkOrderCreate(
            order_no="WO20260524001",
            road_section="中山路",
            pole_number="ZL-001",
            fault_description="更新的故障描述",
        )
        
        results, added, skipped = batch_service.add_work_orders(
            db, batch_id, [duplicate_wo], DuplicateStrategy.IGNORE
        )
        print(f"IGNORE策略: 新增 {added}, 跳过 {skipped}")

        results, added, skipped = batch_service.add_work_orders(
            db, batch_id, [duplicate_wo], DuplicateStrategy.OVERWRITE
        )
        print(f"OVERWRITE策略: 新增/覆盖 {added}, 跳过 {skipped}")

        print("\n3. 上传附件（巡检照片、报修记录等）")
        print("-" * 40)
        
        attachments = [
            ("巡检照片_中山路ZL001.jpg", AttachmentType.INSPECTION_PHOTO, "现场巡检照片"),
            ("报修热线记录_20260524.xlsx", AttachmentType.REPAIR_HOTLINE, "报修热线记录"),
            ("备件批次信息_SP-2026-05A.pdf", AttachmentType.SPARE_PART, "备件批次质检报告"),
            ("手工改价表_5月.xlsx", AttachmentType.PRICE_ADJUSTMENT, "手工改价表"),
        ]

        for filename, file_type, desc in attachments:
            attachment_data = AttachmentCreate(
                file_name=filename,
                file_path=f"/tmp/{filename}",
                file_size=1024,
                file_type=file_type,
                description=desc,
                uploaded_by="系统管理员",
            )
            att = attachment_service.create_attachment(db, attachment_data, batch_id=batch_id)
            print(f"上传附件: {att.file_name} ({att.file_type})")

        print("\n4. 提交审核")
        print("-" * 40)
        batch = batch_service.submit_for_review(db, batch_id, submitted_by="操作员A")
        print(f"批次状态: {batch.status}")

        print("\n5. 复核改判")
        print("-" * 40)
        review_data = BatchReview(
            review_result="approved",
            review_comment="经复核，确认为同批次备件质量问题，同意异常处理",
            reviewed_by="审核员B",
        )
        batch = batch_service.review_batch(db, batch_id, review_data)
        print(f"批次状态: {batch.status}")
        print(f"复核意见: {review_data.review_comment}")

        print("\n6. 发现新问题，冻结批次")
        print("-" * 40)
        freeze_data = BatchFreeze(
            freeze_reason="发现手工改价表与系统记录不符，需重新核实",
            frozen_by="市政负责人C",
        )
        batch = batch_service.freeze_batch(db, batch_id, freeze_data)
        print(f"批次状态: {batch.status}")
        print(f"冻结前状态: {batch.status_before_freeze}")
        print(f"冻结原因: {batch.freeze_reason}")
        print(f"冻结人: {batch.frozen_by}")

        print("\n7. 查看变更历史轨迹")
        print("-" * 40)
        from app.services.change_log_service import get_change_logs_by_batch
        logs = get_change_logs_by_batch(db, batch_id)
        for log in logs:
            print(f"[{log.created_at.strftime('%H:%M:%S')}] {log.changed_by or '系统'}: {log.change_type}")
            if log.change_reason:
                print(f"    原因: {log.change_reason}")

        print("\n8. 解冻并修正后重新提交")
        print("-" * 40)
        batch = batch_service.unfreeze_batch(db, batch_id, unfrozen_by="市政负责人C")
        print(f"批次已解冻，状态恢复为: {batch.status}")

        print("\n9. 结算批次")
        print("-" * 40)
        batch = batch_service.settle_batch(db, batch_id, settled_by="财务D")
        print(f"批次状态: {batch.status}")

        print("\n10. 归档批次")
        print("-" * 40)
        batch = batch_service.archive_batch(db, batch_id, archived_by="档案管理员E")
        print(f"批次状态: {batch.status}")

        print("\n11. 导出汇总报表")
        print("-" * 40)
        filepath = export_service.export_batch_summary(
            db,
            batch_ids=[batch_id],
            include_frozen=True,
            include_change_logs=True,
            format="xlsx",
        )
        print(f"导出文件: {filepath}")

        print("\n12. 查看统计信息")
        print("-" * 40)
        stats = export_service.get_statistics(db)
        print(f"总批次数: {stats['total_batches']}")
        print(f"总工单数: {stats['total_work_orders']}")
        print(f"异常工单数: {stats['abnormal_count']}")
        print(f"异常率: {stats['abnormal_rate'] * 100:.1f}%")
        print(f"冻结批次数: {stats['frozen_count']}")

        print("\n" + "=" * 60)
        print("演示完成！")
        print("=" * 60)
        print("\n关键特性总结:")
        print("✅ 同一路段零散工单合并管理")
        print("✅ 完整的变更历史轨迹（谁在什么时候改过什么）")
        print("✅ 重复数据处理策略（忽略/覆盖/追加）")
        print("✅ 冻结前后状态记录")
        print("✅ 人工操作理由记录")
        print("✅ 多格式导出汇总（含冻结状态、变更日志）")
        print("✅ 异步任务失败分级处理（等重试/等人工/永久失败）")

    finally:
        db.close()


if __name__ == "__main__":
    demo_full_workflow()
