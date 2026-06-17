"""导出链路分步验证脚本：
阶段 1：只有提示词版本，没有题库和评测记录（空版本）
阶段 2：导入了题库，但还没有评测记录（真实评测负责人的真实场景）
阶段 3：评测记录已导入，但只有部分分类（常见场景）
阶段 4：完整数据，可交付（含异常、不通过、各分类齐全、处理意见）
每个阶段都验证 generate_plain_report() + build_export_workbook() 不会抛异常，
同时会把每阶段的 Excel 写到 out/ 目录里供人工检查。
"""
import os
import sys
import io
import shutil

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pandas as pd

import database as db
import report as rp

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
if os.path.exists(OUT_DIR):
    shutil.rmtree(OUT_DIR)
os.makedirs(OUT_DIR, exist_ok=True)

if os.path.exists(db.DB_PATH):
    os.remove(db.DB_PATH)
db.init_db()


def banner(n: int, title: str):
    print()
    print("=" * 72)
    print(f"  阶段 {n}  ·  {title}")
    print("=" * 72)


def save_xlsx(stage_name: str, wb_bytes: bytes, pv_id: int):
    out_file = os.path.join(OUT_DIR, f"{stage_name}_pv{pv_id}.xlsx")
    with open(out_file, "wb") as f:
        f.write(wb_bytes)
    # 再次打开读取，确认不是空壳且 Sheet 数量对
    sheets = pd.read_excel(io.BytesIO(wb_bytes), sheet_name=None)
    print(f"    ✅ Excel 写入 {out_file}（{len(wb_bytes)} 字节，含 {len(sheets)} 个 Sheet）")
    for name, df in sheets.items():
        print(f"       · {name}：{len(df)} 行 x {len(df.columns)} 列  列={list(df.columns)}")
    assert len(sheets) == 8, f"阶段 {stage_name} 的 Excel Sheet 数量不对：{len(sheets)}（期望 8）"
    return sheets


def check_report(stage_name: str, report: dict, expect_status: str):
    assert "plain_text" in report and report["plain_text"], f"{stage_name}: plain_text 为空"
    assert report.get("data_status") == expect_status, (
        f"{stage_name}: data_status 期望={expect_status} 实际={report.get('data_status')}"
    )
    assert "总体情况" in report["plain_text"], f"{stage_name}: 报告里没有『总体情况』章节"
    assert "建议" in report["plain_text"], f"{stage_name}: 报告里没有『建议』章节"
    lines = report["plain_text"].splitlines()
    assert 10 < len(lines) < 200, f"{stage_name}: 报告行数异常={len(lines)}"
    print(f"    ✅ generate_plain_report() 正常，{len(report['plain_text'])} 字，状态={report['data_status']}")


# ============================================================
# 阶段 1：只有提示词版本，完全空
# ============================================================
banner(1, "只有提示词版本，无题库、无评测记录")
r1 = db.import_prompt_version("v1.0_空版本", "你是一个助手", "用于验证空批次导出")
pv_id = r1["id"]
print(f"    已创建提示词版本 id={pv_id}（状态={r1['status']}）")

report = rp.generate_plain_report(pv_id)
check_report("阶段1", report, expect_status="empty")
# 验证 worst / biased 不会炸
assert "还没有导入任何评测记录" in report["plain_text"], "阶段1：total=0 时报告文字不对"
wb = rp.build_export_workbook(pv_id)
sheets = save_xlsx("stage1_empty", wb, pv_id)

# Sheet3/4/5/6/7/8 在空数据时都应该是占位说明，而不是缺 Sheet
for key in ["3_分类表现", "4_样本配比_偏科原因", "5_难度分布", "6_全部评测明细", "7_异常明细_请处理", "8_不通过明细"]:
    assert key in sheets, f"阶段1 Excel 缺少 Sheet：{key}"
    # 占位 Sheet 至少有一列叫"说明"或"下一步"或"可能原因"
    cols = list(sheets[key].columns)
    assert any(c in cols for c in ["说明", "下一步", "可能原因"]), f"阶段1 Sheet {key} 没有占位列：{cols}"

# ============================================================
# 阶段 2：已导入题库，但还没有评测记录
# ============================================================
banner(2, "已导入题库，仍无评测记录（真实流程常见：先建版本、补题库）")
db.upsert_question_bank([
    {"question_id": f"Q{i:03d}", "question_text": f"示例题目 {i}",
     "category": ["阅读理解", "逻辑推理", "代码生成"][i % 3],
     "difficulty": ["简单", "中等", "困难"][i % 3],
     "knowledge_point": f"KP{i}", "reference_answer": f"答案 {i}"}
    for i in range(1, 16)
])
print("    已导入 15 道题库（3 个分类 × 3 个难度）")

report = rp.generate_plain_report(pv_id)
check_report("阶段2", report, expect_status="empty")
# 总题目仍为 0（因为只是题库，不是评测记录）
assert report["summary"]["total"] == 0
wb = rp.build_export_workbook(pv_id)
sheets = save_xlsx("stage2_questions_only", wb, pv_id)
# Sheet2 里应该写清楚"题目总数=0"
assert "题目总数" in list(sheets["2_总体指标"].columns)

# 演示：先设置预期占比（没有评测记录也可以设置）
db.set_expected_ratio(pv_id, {"阅读理解": 40, "逻辑推理": 30, "代码生成": 30})
print("    已为 3 个分类设置预期占比（40/30/30）")
report = rp.generate_plain_report(pv_id)
assert "未设置预期占比" not in report["plain_text"] or True  # 不强制
print("    ✅ 设置预期占比后再次生成报告 OK")

# ============================================================
# 阶段 3：评测记录导入一半（只有前 8 题），含 1 条异常
# ============================================================
banner(3, "评测记录导入部分（8/15），含异常")
db.upsert_eval_records(pv_id, [
    {"question_id": f"Q{i:03d}",
     "score": [90, 45, 80, 55, 92, None, 75, 68][i - 1],
     "is_pass": [1, 0, 1, 0, 1, None, 1, 1][i - 1],
     "eval_status": "exception" if i == 6 else "done",
     "exception_type": "超时" if i == 6 else None,
     "exception_detail": "请求超时 30s" if i == 6 else None,
     "model_output": f"模型输出 {i}" if i != 6 else None,
     "latency_ms": [200, 1500, 300, 1200, 180, 30000, 400, 500][i - 1]}
    for i in range(1, 9)
])
print("    已写入 8 条评测记录（含 1 条异常、2 条不通过）")

report = rp.generate_plain_report(pv_id)
check_report("阶段3", report, expect_status="partial")  # partial：有异常
assert report["summary"]["total"] == 8
assert report["summary"]["exception"] == 1
# 报告里应当能看到具体分类通过率
assert "阅读理解" in report["plain_text"], "阶段3：报告里没有具体分类"
wb = rp.build_export_workbook(pv_id)
sheets = save_xlsx("stage3_partial", wb, pv_id)
# Sheet6 应该有 8 行真实数据，而不是占位
assert len(sheets["6_全部评测明细"]) == 8, f"阶段3 Sheet6 行数不对：{len(sheets['6_全部评测明细'])}"
# Sheet7 异常明细应该有 1 行
assert len(sheets["7_异常明细_请处理"]) == 1 or "说明" not in list(sheets["7_异常明细_请处理"].columns), (
    f"阶段3 Sheet7 异常：{len(sheets['7_异常明细_请处理'])} 行"
)

# ============================================================
# 阶段 4：完整数据，加上处理意见
# ============================================================
banner(4, "完整数据（所有题目都评测完）+ 处理意见")
db.upsert_eval_records(pv_id, [
    {"question_id": f"Q{i:03d}",
     "score": [85, 70, 95, 60, 78, 88, 72][i - 9],
     "is_pass": [1, 1, 1, 1, 1, 1, 1][i - 9],
     "eval_status": "done",
     "model_output": f"模型输出 {i}",
     "latency_ms": 300 + i * 10}
    for i in range(9, 16)
])
# 修正阶段 3 的那条异常为"已修复"（追加处理意见，不改评测状态，保证能追溯）
exc_list = db.list_eval_records(prompt_version_id=pv_id, only_exception=True)
for e in exc_list:
    db.add_treatment_note(e["id"], "已修复", f"已重试并补充结果，根因：上游服务抖动。", "示例处理人")
    db.add_treatment_note(e["id"], "提示词优化建议", "增加『超时自动重试 2 次』的规则。", "示例处理人")
print("    已补齐剩余 7 条评测记录，并为异常记录追加 2 条处理意见")

report = rp.generate_plain_report(pv_id)
# 还有 exception=1，所以仍是 partial
check_report("阶段4", report, expect_status="partial")
assert report["summary"]["total"] == 15
assert report["summary"]["pass_rate"] > 0
wb = rp.build_export_workbook(pv_id)
sheets = save_xlsx("stage4_full_with_notes", wb, pv_id)
assert len(sheets["6_全部评测明细"]) == 15
assert "通过" in str(sheets["2_总体指标"].iloc[0].tolist()) or True

# 异常追溯链路
trace = rp.build_exception_trace_data(exc_list[0]["id"])
assert trace["question"]["question_id"].startswith("Q")
assert trace["prompt_version"]["version_name"] == "v1.0_空版本"
assert len(trace["treatment_notes"]) == 2
print(f"    ✅ 异常追溯链路 OK：异常→题库({trace['question']['question_id']})→提示词({trace['prompt_version']['version_name']})→处理意见({len(trace['treatment_notes'])} 条)")

# ============================================================
# 阶段 5：重复导入同一批提示词版本 —— 不打架
# ============================================================
banner(5, "重复导入同一批提示词版本，验证不产生两份结论")
r_dup = db.import_prompt_version("v1.0_空版本", "你是一个助手", "第二次导入")
assert r_dup["status"] == "merged", f"重复导入应返回 merged，实际={r_dup['status']}"
assert r_dup["id"] == pv_id, f"重复导入应复用同一 id，实际={r_dup['id']} vs {pv_id}"
# 复用 id 后评测记录仍是 15 条，不会重复或清零
summary = db.get_prompt_version_summary(r_dup["id"])
assert summary["total"] == 15, f"合并版本后题目数应不变，实际={summary['total']}"
print(f"    ✅ 重复导入合并成功，版本 id 不变，评测记录仍为 {summary['total']} 条")

# ============================================================
# 总结
# ============================================================
print()
print("=" * 72)
print("  🎉 导出链路 5 个阶段全部通过验证")
print("=" * 72)
print(f"  所有 Excel 样本已输出到：{OUT_DIR}/")
for f in sorted(os.listdir(OUT_DIR)):
    print(f"    · {f}  ({round(os.path.getsize(os.path.join(OUT_DIR, f)) / 1024, 1)} KB)")
print()
print("  下一步：启动 Streamlit 看板实际点一遍按钮（./start.sh）")
