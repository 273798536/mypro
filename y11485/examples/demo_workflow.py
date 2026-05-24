#!/usr/bin/env python3
"""
演示脚本：展示质检返工异常回执状态机的完整工作流
从创建抽检表、返工单，到创建批次、提交复核、冻结结算、导出汇总
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from qfsm.database import SessionLocal, init_db
from qfsm.services import BatchService, SourceDataService, ExportService
from qfsm.schemas import (
    QualityBatchCreate,
    ReviewRequest,
    FreezeRequest,
    ArchiveRequest,
)
from qfsm.models import BatchStatus, DuplicateStrategy


def demo_workflow():
    print("=" * 60)
    print("质检返工异常回执状态机 - 完整工作流演示")
    print("=" * 60)

    init_db()
    db = SessionLocal()

    try:
        source_service = SourceDataService(db)
        batch_service = BatchService(db)
        export_service = ExportService(db)

        print("\n【步骤 1】创建源数据（抽检表、返工单、机台班次）")
        print("-" * 60)

        insp1 = source_service.create_inspection({
            "batch_no": "BATCH20240501001",
            "product_code": "PROD001",
            "product_name": "精密零件A",
            "total_quantity": 1000,
            "defective_quantity": 50,
            "pass_rate": 0.95,
            "defect_type": "尺寸偏差",
            "machine_id": "MACHINE01",
            "shift_id": "SHIFT-MORNING",
            "inspector": "张三",
            "created_by": "system",
        })
        print(f"✓ 创建抽检表: ID={insp1.id}, 批次号={insp1.batch_no}, 良率={insp1.pass_rate}")

        rw1 = source_service.create_rework({
            "rework_no": "RW20240501001",
            "batch_no": "BATCH20240501001",
            "product_code": "PROD001",
            "rework_quantity": 50,
            "reworked_quantity": 50,
            "passed_quantity": 45,
            "rework_pass_rate": 0.90,
            "machine_id": "MACHINE01",
            "shift_id": "SHIFT-AFTERNOON",
            "is_secondary_rework": False,
            "created_by": "system",
        })
        print(f"✓ 创建返工单: ID={rw1.id}, 返工号={rw1.rework_no}, 返工良率={rw1.rework_pass_rate}")

        rw2 = source_service.create_rework({
            "rework_no": "RW20240501002",
            "batch_no": "BATCH20240501001",
            "product_code": "PROD001",
            "rework_quantity": 5,
            "reworked_quantity": 5,
            "passed_quantity": 3,
            "rework_pass_rate": 0.60,
            "machine_id": "MACHINE01",
            "shift_id": "SHIFT-NIGHT",
            "is_secondary_rework": True,
            "parent_rework_id": rw1.id,
            "created_by": "system",
        })
        print(f"✓ 创建二次返工单: ID={rw2.id}, 返工号={rw2.rework_no}, 返工良率={rw2.rework_pass_rate}")

        shift1 = source_service.create_machine_shift({
            "shift_code": "SHIFT-MORNING",
            "machine_id": "MACHINE01",
            "shift_type": "白班",
            "shift_leader": "李组长",
            "operator": "王师傅",
            "production_quantity": 1000,
            "defective_quantity": 50,
            "shift_pass_rate": 0.95,
            "created_by": "system",
        })
        print(f"✓ 创建机台班次: ID={shift1.id}, 班次={shift1.shift_code}")

        print("\n【步骤 2】创建质检批次，关联源数据")
        print("-" * 60)

        batch_data = QualityBatchCreate(
            batch_no="BATCH20240501001",
            product_code="PROD001",
            product_name="精密零件A",
            remark="这是一个演示批次",
            created_by="生产经理",
            duplicate_strategy=DuplicateStrategy.IGNORE,
            inspection_ids=[insp1.id],
            rework_ids=[rw1.id, rw2.id],
            machine_shift_ids=[shift1.id],
        )

        batch = batch_service.create_batch(batch_data)
        print(f"✓ 创建批次: batch_id={batch.batch_id}")
        print(f"  - 批次号: {batch.batch_no}")
        print(f"  - 状态: {batch.status.value}")
        print(f"  - 返工次数: {batch.rework_count}")
        print(f"  - 初始良率: {batch.initial_pass_rate}")
        print(f"  - 最终良率: {batch.final_pass_rate}")
        print(f"  - 最低良率: {batch.worst_pass_rate}")
        print(f"  - 责任班次: {batch.responsible_shift}")
        print(f"  - 责任机台: {batch.responsible_machine}")

        print("\n【步骤 3】提交复核")
        print("-" * 60)

        batch = batch_service.submit_for_review(batch.batch_id, "质检主管")
        print(f"✓ 提交复核: 状态={batch.status.value}")

        print("\n【步骤 4】复核改判（通过）")
        print("-" * 60)

        review_data = ReviewRequest(
            review_opinion="数据完整，返工流程合规，同意通过",
            reviewer="质检经理",
            is_approved=True,
            remark="注意后续批次需要加强首件检验",
        )
        batch = batch_service.review_batch(batch.batch_id, review_data)
        print(f"✓ 复核通过: 状态={batch.status.value}")
        print(f"  - 复核人: {batch.reviewer}")
        print(f"  - 复核意见: {batch.review_opinion}")

        print("\n【步骤 5】冻结结算（发现异常后冻结）")
        print("-" * 60)

        freeze_data = FreezeRequest(
            freeze_reason="发现二次返工后良率异常偏低，需要进一步调查责任归属",
            frozen_by="生产经理",
        )
        batch = batch_service.freeze_batch(batch.batch_id, freeze_data)
        print(f"✓ 冻结批次: 状态={batch.status.value}")
        print(f"  - 冻结前状态: {batch.status_before_freeze}")
        print(f"  - 冻结原因: {batch.freeze_reason}")
        print(f"  - 冻结人: {batch.frozen_by}")

        print("\n【步骤 6】查看操作历史和差异")
        print("-" * 60)

        histories = batch_service.get_history_with_diff(batch.batch_id)
        print(f"✓ 操作历史记录: 共 {len(histories)} 条")
        for h in histories:
            print(f"\n  [{h.created_at.strftime('%H:%M:%S')}] {h.action} - {h.operator}")
            if h.differences:
                for d in h.differences:
                    print(f"    - {d.field}: {d.old_value} → {d.new_value}")

        print("\n【步骤 7】导出汇总数据")
        print("-" * 60)

        result = export_service.export_batches(
            batch_ids=[batch.batch_id],
        )
        print(f"✓ 导出成功:")
        print(f"  - 文件路径: {result['file_path']}")
        print(f"  - 文件名: {result['file_name']}")
        print(f"  - 文件大小: {result['file_size']} bytes")
        print(f"  - 记录数量: {result['record_count']}")

        print("\n【步骤 8】撤回归档")
        print("-" * 60)

        unfreeze_data = {
            "unfreeze_reason": "调查完毕，责任已明确",
            "operator": "生产经理",
        }
        from qfsm.schemas import UnfreezeRequest
        batch = batch_service.unfreeze_batch(batch.batch_id, UnfreezeRequest(**unfreeze_data))
        print(f"✓ 解冻批次: 状态={batch.status.value}")

        archive_data = ArchiveRequest(
            archive_reason="批次处理完成，归档备查",
            archived_by="系统管理员",
        )
        batch = batch_service.archive_batch(batch.batch_id, archive_data)
        print(f"✓ 归档批次: 状态={batch.status.value}")

        print("\n" + "=" * 60)
        print("工作流演示完成！")
        print("=" * 60)
        print("\n总结:")
        print("  1. 成功创建抽检表、返工单、机台班次等源数据")
        print("  2. 成功创建质检批次并自动计算良率和责任归属")
        print("  3. 成功执行提交复核 → 复核通过 → 冻结 → 解冻 → 归档的完整状态流转")
        print("  4. 每一步操作都记录了历史和前后差异")
        print("  5. 成功导出汇总数据到 Excel 文件")
        print("\n重点展示:")
        print("  - 同一缺陷反复返工后的良率追踪（初始/最终/最高/最低）")
        print("  - 责任班次和机台的关联记录")
        print("  - 冻结前后状态快照，作为结算依据")
        print("  - 完整的操作审计日志")

    finally:
        db.close()


if __name__ == "__main__":
    demo_workflow()
