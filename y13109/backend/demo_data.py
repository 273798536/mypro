"""生成演示数据脚本，用于快速体验系统功能"""
import sys
sys.path.insert(0, '.')

from app.models.matrix import MatrixRecord, MatrixData, MatrixStatus, ChangeSource, BatchJob
from app.services.matrix_service import (
    create_batch_job, add_record_to_batch, reprocess_batch,
    manual_override_record, process_matrix_record
)
from app.services.report_service import generate_markdown_report
import json
from datetime import datetime


def create_demo_batch():
    batch = create_batch_job("6月第二周矩阵条件数验算", threshold=20)
    batch.gray_release_note = "本次灰度发布优化了空集合检测逻辑，新增了越界记录隔离功能，所有状态变更均可溯源。"

    matrices = [
        ("产品销量矩阵", [[1, 2, 3], [4, 5, 6], [7, 8, 10]], "data_6月.csv"),
        ("单位矩阵A", [[1, 0, 0], [0, 1, 0], [0, 0, 1]], "data_6月.csv"),
        ("空集合测试", [], "data_6月.csv"),
        ("奇异矩阵B", [[1, 2], [2, 4]], "data_6月.csv"),
        ("排班矩阵C", [[2, 1], [1, 2]], "data_6月.csv"),
        ("库存矩阵D", [[3, 1, 2], [1, 3, 1], [2, 1, 3]], "data_6月.csv"),
        ("晚到附件矩阵", [[5, 2], [2, 5]], "晚到_补充数据.csv"),
        ("空集合-待补充", [[]], "data_6月.csv"),
    ]

    for name, values, source in matrices:
        if not values or (len(values) == 1 and len(values[0]) == 0):
            matrix_data = MatrixData(rows=0, cols=0, values=[])
        else:
            matrix_data = MatrixData(
                rows=len(values),
                cols=len(values[0]),
                values=values
            )

        record = MatrixRecord(
            id=f"demo_{name}",
            name=name,
            matrix=matrix_data,
            source_file=source
        )
        add_record_to_batch(batch, record)

    reprocess_batch(batch, threshold=20)

    for record in batch.records:
        if record.name == "奇异矩阵B":
            manual_override_record(record, MatrixStatus.OUT_OF_BOUND, "老叶", "经复核，该矩阵虽奇异但需标记关注")
            break

    for record in batch.records:
        if record.name == "晚到附件矩阵":
            if record.jump_analysis:
                record.jump_analysis.has_jump = True
                from app.models.matrix import JumpReason
                record.jump_analysis.reason = JumpReason.LATE_ATTACHMENT
                record.jump_analysis.description = "晚到附件导致结果跳变"
                record.jump_analysis.previous_condition = 3.0
                record.jump_analysis.change_ratio = 0.8
            break

    batch.summary.total = len(batch.records)

    return batch


if __name__ == "__main__":
    batch = create_demo_batch()

    print("=" * 60)
    print("演示批次创建成功！")
    print(f"批次名称：{batch.name}")
    print(f"总记录数：{batch.summary.total}")
    print(f"正常：{batch.summary.normal}")
    print(f"空集合：{batch.summary.empty}")
    print(f"奇异：{batch.summary.singular}")
    print(f"越界：{batch.summary.out_of_bound}")
    print(f"人工改判：{batch.summary.overridden}")
    print("=" * 60)

    print("\nMarkdown报告预览（前800字）：")
    print("-" * 60)
    report = generate_markdown_report(batch)
    print(report[:800])
    print("...")
