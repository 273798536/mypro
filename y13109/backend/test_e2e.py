"""端到端测试：验证CSV上传解析 -> 批量计算 -> 人工改判 -> 报告导出整条链路"""
import sys
sys.path.insert(0, '.')

from app.services.file_service import parse_file, parse_csv
from app.services.matrix_service import (
    create_batch_job, add_record_to_batch, reprocess_batch,
    manual_override_record, is_manually_overridden, calculate_batch_summary
)
from app.services.report_service import generate_markdown_report
from app.models.matrix import MatrixStatus, MatrixRecord, MatrixData

passed = 0
failed = 0


def check(desc, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  ✓ {desc}")
    else:
        failed += 1
        print(f"  ✗ {desc}  {detail}")


print("=" * 70)
print("端到端测试：矩阵条件数批量验算 - 导出链路")
print("=" * 70)

# =====================================================================
print("\n=== 测试1: CSV文件解析（修复 ParserError 问题） ===")
try:
    with open('../sample_data/sample_matrices.csv', 'rb') as f:
        content = f.read()
    records = parse_file(content, 'sample_matrices.csv')
    check(f"成功解析，无 ParserError", True)
    check(f"解析到 5 个矩阵", len(records) == 5, f"实际: {len(records)}")

    names = [r.name for r in records]
    check(f"包含矩阵A/B/C/D/E", set(names) == {'矩阵A', '矩阵B', '矩阵C', '矩阵D', '矩阵E'},
          f"实际: {names}")

    matrix_c = [r for r in records if r.name == '矩阵C'][0]
    check(f"矩阵C正确识别为空集合 (0x0)",
          matrix_c.matrix.rows == 0 and matrix_c.matrix.cols == 0,
          f"实际: {matrix_c.matrix.rows}x{matrix_c.matrix.cols}")

    matrix_a = [r for r in records if r.name == '矩阵A'][0]
    check(f"矩阵A正确解析为 3x3",
          matrix_a.matrix.rows == 3 and matrix_a.matrix.cols == 3,
          f"实际: {matrix_a.matrix.rows}x{matrix_a.matrix.cols}")
    check(f"矩阵A数值正确 [[1,2,3],[4,5,6],[7,8,10]]",
          matrix_a.matrix.values == [[1.0,2.0,3.0],[4.0,5.0,6.0],[7.0,8.0,10.0]])
except Exception as e:
    check(f"CSV解析抛出异常: {type(e).__name__}: {e}", False)

# =====================================================================
print("\n=== 测试2: 批量计算 + 状态分类 ===")
batch = create_batch_job("端到端测试批次", threshold=20)
for r in records:
    add_record_to_batch(batch, r)
reprocess_batch(batch, threshold=20)

check(f"summary.total == 5", batch.summary.total == 5, f"实际: {batch.summary.total}")
check(f"summary.empty == 1 (矩阵C)", batch.summary.empty == 1, f"实际: {batch.summary.empty}")
check(f"summary.singular >= 1 (矩阵D)", batch.summary.singular >= 1, f"实际: {batch.summary.singular}")
check(f"summary.normal + summary.out_of_bound >= 2",
      batch.summary.normal + batch.summary.out_of_bound >= 2,
      f"normal: {batch.summary.normal}, out_of_bound: {batch.summary.out_of_bound}")

for r in batch.records:
    check(f"{r.name}: 状态历史至少1条", len(r.status_history) >= 1,
          f"实际: {len(r.status_history)}")

# =====================================================================
print("\n=== 测试3: 人工改判（改判为 normal，状态不是 overridden） ===")
oob_records = [r for r in batch.records if r.status == MatrixStatus.OUT_OF_BOUND]
if not oob_records:
    normal_records = [r for r in batch.records if r.status == MatrixStatus.NORMAL]
    oob_records = normal_records  # fallback

test_record = oob_records[0]
old_status = test_record.status
print(f"  选择 {test_record.name}，原状态: {old_status}")
print(f"  改判前 is_manually_overridden: {is_manually_overridden(test_record)}")

manual_override_record(test_record, MatrixStatus.NORMAL, "老叶",
                       "经复核，该矩阵在业务场景下属于正常范围")

check(f"改判后当前状态是 normal（不是 overridden）",
      test_record.status == MatrixStatus.NORMAL, f"实际: {test_record.status}")
check(f"is_manually_overridden == True（按历史来源判断）",
      is_manually_overridden(test_record) == True,
      f"实际: {is_manually_overridden(test_record)}")
check(f"状态历史 >= 2 条", len(test_record.status_history) >= 2,
      f"实际: {len(test_record.status_history)}")

last_change = test_record.status_history[-1]
check(f"最后一条变更来源是 manual_override",
      last_change.source.value == 'manual_override', f"实际: {last_change.source}")
check(f"改判人是 '老叶'", last_change.operator == "老叶", f"实际: {last_change.operator}")
check(f"改判原因正确", last_change.reason and "业务场景" in last_change.reason,
      f"实际: {last_change.reason}")

# 改判为 out_of_bound 的场景
normal_records = [r for r in batch.records
                  if r.status == MatrixStatus.NORMAL and not is_manually_overridden(r)]
if normal_records:
    test_record2 = normal_records[0]
    print(f"\n  选择 {test_record2.name}，原状态: {test_record2.status}")
    manual_override_record(test_record2, MatrixStatus.OUT_OF_BOUND, "排班同事",
                           "该矩阵涉及外推场景，需重点关注")

    check(f"改判后状态是 out_of_bound", test_record2.status == MatrixStatus.OUT_OF_BOUND)
    check(f"is_manually_overridden == True", is_manually_overridden(test_record2) == True)

# =====================================================================
print("\n=== 测试4: summary.overridden 按历史来源统计 ===")
batch.summary = calculate_batch_summary(batch.records)
overridden_count = sum(1 for r in batch.records if is_manually_overridden(r))
check(f"summary.overridden == {overridden_count}（按历史统计）",
      batch.summary.overridden == overridden_count,
      f"实际 summary.overridden: {batch.summary.overridden}, 应有: {overridden_count}")

# =====================================================================
print("\n=== 测试5: Markdown报告中出现人工改判章节（核心修复点） ===")
report = generate_markdown_report(batch)

check(f"报告包含 '## 七、人工改判记录' 章节",
      "## 七、人工改判记录" in report,
      "（报告没有该章节意味着改判后无法在报告中体现）")

check(f"报告人工改判计数 > 0",
      overridden_count > 0 and f"人工改判：**{overridden_count}**" in report,
      f"report中应有人工改判计数。overridden_count={overridden_count}")

check(f"报告中出现 '老叶'", "老叶" in report)
check(f"报告中出现 '排班同事'", "排班同事" in report)

# 检查报告说明
check(f"报告人工改判章节有说明：与当前状态无关",
      "按状态变更历史中的来源判断，与当前状态无关" in report)

# =====================================================================
print("\n=== 测试6: 跳变分析（修复真实API调用下jump_analysis为None的问题） ===")
print("  第一次计算（阈值20）：")
batch2 = create_batch_job("跳变分析测试批次", threshold=20)
for r in records:
    r_clone = MatrixRecord(
        id=r.id,
        name=r.name,
        matrix=MatrixData(rows=r.matrix.rows, cols=r.matrix.cols, values=r.matrix.values)
    )
    add_record_to_batch(batch2, r_clone)

reprocess_batch(batch2, threshold=20)
rec1 = batch2.records[0]
check(f"第1次计算后 jump_analysis 不为 None", rec1.jump_analysis is not None)
if rec1.jump_analysis:
    check(f"第1次计算 has_jump=False（无历史数据）", 
          rec1.jump_analysis.has_jump == False,
          f"实际: {rec1.jump_analysis.has_jump}")
    check(f"第1次计算描述正确", 
          "首次计算" in rec1.jump_analysis.description or 
          "无历史数据" in rec1.jump_analysis.description)

print("\n  第二次计算（阈值改成5，勾选'阈值调整'）：")
prev_cond = rec1.condition_number
reprocess_batch(batch2, threshold=5, threshold_changed=True)
rec1 = batch2.records[0]
check(f"第2次计算后 jump_analysis 不为 None", rec1.jump_analysis is not None)
if rec1.jump_analysis:
    check(f"第2次计算 has_jump=True（有历史数据+勾选阈值调整）", 
          rec1.jump_analysis.has_jump == True,
          f"实际: {rec1.jump_analysis.has_jump}")
    check(f"跳变原因是 threshold", 
          rec1.jump_analysis.reason.value == 'threshold',
          f"实际: {rec1.jump_analysis.reason}")
    check(f"previous_condition 正确（保存了上次的数值）", 
          rec1.jump_analysis.previous_condition == prev_cond,
          f"prev={rec1.jump_analysis.previous_condition}, 应={prev_cond}")
    check(f"描述包含'阈值调整'", 
          "阈值调整" in rec1.jump_analysis.description)

print("\n  第三次计算（阈值改成10，勾选'单位变更'）：")
reprocess_batch(batch2, threshold=10, unit_changed=True)
rec1 = batch2.records[0]
if rec1.jump_analysis:
    check(f"勾选单位变更时 reason=unit", 
          rec1.jump_analysis.reason.value == 'unit',
          f"实际: {rec1.jump_analysis.reason}")

print("\n  第四次计算（阈值改成10，勾选'晚到附件'）：")
reprocess_batch(batch2, threshold=10, has_late_attachment=True)
rec1 = batch2.records[0]
if rec1.jump_analysis:
    check(f"勾选晚到附件时 reason=late_attachment", 
          rec1.jump_analysis.reason.value == 'late_attachment',
          f"实际: {rec1.jump_analysis.reason}")

print("\n  第五次计算（不勾选任何选项）：")
reprocess_batch(batch2, threshold=10)
rec1 = batch2.records[0]
if rec1.jump_analysis:
    check(f"不勾选任何选项时 has_jump=False", 
          rec1.jump_analysis.has_jump == False,
          f"实际: {rec1.jump_analysis.has_jump}")
    check(f"描述说明未勾选原因", 
          "未勾选跳变原因" in rec1.jump_analysis.description)

print("\n  生成报告，检查跳变章节：")
report2 = generate_markdown_report(batch2)
check(f"报告包含 '## 八、结果跳变分析' 章节",
      "## 八、结果跳变分析" in report2)

# =====================================================================
print("\n=== 测试7: 报告中其他章节完整 ===")
check(f"报告包含 '## 一、整体结论'", "## 一、整体结论" in report)
check(f"报告包含 '## 三、正常结果'", "## 三、正常结果" in report)
check(f"报告包含 '## 四、外推越界记录'", "## 四、外推越界记录" in report)
check(f"报告包含 '## 五、空集合记录'", "## 五、空集合记录" in report)
check(f"报告包含 '## 九、状态变更溯源'", "## 九、状态变更溯源" in report)

# =====================================================================
print("\n=== 测试7: 异常错误消息是否友好 ===")
try:
    parse_file(b"hello,world\nthis is invalid", "bad_file.txt")
    check("不支持的文件拡张子应该报友好错误", False)
except ValueError as e:
    check("不支持格式错误消息友好",
          "不支持的文件格式" in str(e) and "CSV" in str(e) and "Excel" in str(e),
          f"实际: {e}")

try:
    records = parse_csv(b"", "really_empty.csv")
    check("真正空的CSV应该报友好错误", False, f"意外解析出 {len(records)} 条记录")
except ValueError as e:
    check("空CSV错误消息友好",
          "解析失败" in str(e) and "文件格式" in str(e),
          f"实际: {e}")

try:
    records = parse_csv(b",,,,\n,,,\n", "only_commas.csv")
    check("只有分隔符的CSV -> 解析为空矩阵 或 报错",
          (len(records) == 0) or (all(r.matrix.rows == 0 for r in records)),
          f"实际: {len(records)} 条")
except ValueError:
    check("只有分隔符的CSV -> 报错也合理", True)

# =====================================================================
print("\n" + "=" * 70)
print(f"测试结果: {passed} 通过, {failed} 失败")
print("=" * 70)

if failed > 0:
    print("\n⚠️  有失败项，请检查上面的输出")
    sys.exit(1)
else:
    print("\n✅ 所有端到端测试通过！")
    # 打印报告前1500字符方便预览
    print("\n--- Markdown报告预览（前1500字） ---")
    print(report[:1500])
    print("...")
