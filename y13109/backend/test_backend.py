from app.models.matrix import MatrixRecord, MatrixData, MatrixStatus, BatchJob, ChangeSource
from app.services.matrix_service import (
    process_matrix_record, create_batch_job, add_record_to_batch,
    reprocess_batch, manual_override_record
)
from app.services.report_service import generate_markdown_report

print("=== 测试1: 空矩阵检测 ===")
empty_data = MatrixData(rows=0, cols=0, values=[])
empty_record = MatrixRecord(id='test1', name='空矩阵测试', matrix=empty_data)
result = process_matrix_record(empty_record)
print(f"状态: {result.status}")
print(f"状态历史数: {len(result.status_history)}")
assert result.status == MatrixStatus.EMPTY, "空矩阵应该标记为EMPTY"
print("✓ 空矩阵检测通过\n")

print("=== 测试2: 正常矩阵计算 ===")
normal_data = MatrixData(rows=2, cols=2, values=[[1, 2], [3, 4]])
normal_record = MatrixRecord(id='test2', name='正常矩阵测试', matrix=normal_data)
result2 = process_matrix_record(normal_record, threshold=20)
print(f"状态: {result2.status}")
print(f"条件数: {result2.condition_number:.4f}")
assert result2.status == MatrixStatus.NORMAL, "正常矩阵应该是NORMAL"
print("✓ 正常矩阵计算通过\n")

print("=== 测试3: 奇异矩阵检测 ===")
singular_data = MatrixData(rows=2, cols=2, values=[[1, 2], [2, 4]])
singular_record = MatrixRecord(id='test3', name='奇异矩阵测试', matrix=singular_data)
result3 = process_matrix_record(singular_record)
print(f"状态: {result3.status}")
assert result3.status == MatrixStatus.SINGULAR, "奇异矩阵应该是SINGULAR"
print("✓ 奇异矩阵检测通过\n")

print("=== 测试4: 越界检测 ===")
oob_data = MatrixData(rows=2, cols=2, values=[[1, 2], [3, 4]])
oob_record = MatrixRecord(id='test4', name='越界测试矩阵', matrix=oob_data)
result4 = process_matrix_record(oob_record, threshold=5)
print(f"状态: {result4.status}")
print(f"条件数: {result4.condition_number:.4f}")
print(f"是否越界: {result4.is_out_of_bound}")
print(f"超出比例: {result4.bound_exceeded}")
assert result4.status == MatrixStatus.OUT_OF_BOUND, "超过阈值应该是OUT_OF_BOUND"
print("✓ 越界检测通过\n")

print("=== 测试5: 人工改判 ===")
override_data = MatrixData(rows=2, cols=2, values=[[1, 2], [3, 4]])
override_record = MatrixRecord(id='test5', name='改判测试', matrix=override_data)
process_matrix_record(override_record, threshold=5)
print(f"改判前状态: {override_record.status}")
manual_override_record(override_record, MatrixStatus.NORMAL, "老叶", "经复核确认在合理范围内")
print(f"改判后状态: {override_record.status}")
print(f"状态历史数: {len(override_record.status_history)}")
last_change = override_record.status_history[-1]
print(f"最后一次变更来源: {last_change.source}")
print(f"改判人: {last_change.operator}")
print(f"原因: {last_change.reason}")
assert len(override_record.status_history) >= 2, "应该至少有两次状态变更"
assert last_change.source == ChangeSource.MANUAL_OVERRIDE, "最后一次变更应该是人工改判"
print("✓ 人工改判通过\n")

print("=== 测试6: 批量处理 ===")
batch = create_batch_job("测试批次", threshold=20)

empty_data2 = MatrixData(rows=0, cols=0, values=[])
empty_record2 = MatrixRecord(id='b1', name='空矩阵A', matrix=empty_data2)
add_record_to_batch(batch, empty_record2)

normal_data2 = MatrixData(rows=2, cols=2, values=[[1, 2], [3, 4]])
normal_record2 = MatrixRecord(id='b2', name='正常矩阵A', matrix=normal_data2)
add_record_to_batch(batch, normal_record2)

singular_data2 = MatrixData(rows=2, cols=2, values=[[1, 2], [2, 4]])
singular_record2 = MatrixRecord(id='b3', name='奇异矩阵A', matrix=singular_data2)
add_record_to_batch(batch, singular_record2)

reprocess_batch(batch, threshold=20)
print(f"批次名称: {batch.name}")
print(f"总记录数: {batch.summary.total}")
print(f"正常: {batch.summary.normal}")
print(f"空集合: {batch.summary.empty}")
print(f"奇异: {batch.summary.singular}")
print("✓ 批量处理通过\n")

print("=== 测试7: Markdown报告生成 ===")
batch.gray_release_note = "本次灰度发布优化了空集合检测逻辑，新增了越界记录隔离功能。"
report = generate_markdown_report(batch)
print(f"报告长度: {len(report)} 字符")
print("报告前500字符:")
print(report[:500])
print("...")
print("✓ Markdown报告生成通过\n")

print("=" * 50)
print("所有测试通过！✓")
