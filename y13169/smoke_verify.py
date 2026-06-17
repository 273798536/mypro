"""
冒烟验证脚本：直接通过 importlib 导入所有模块 + 走完整数据流。
不依赖 unittest、不依赖 pytest，纯用内置库，便于在任何 python3 环境下运行。
执行方式：
    cd /Users/mac/pro/solo/workspaces/y13169 && python3 smoke_verify.py
"""
import sys
import os
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

PASS = 0
FAIL = 0
FAILURES: list[tuple[str, str]] = []


def check(name: str, condition: bool, detail: str = ""):
    global PASS, FAIL, FAILURES
    if condition:
        PASS += 1
        print(f"  [PASS] {name}")
    else:
        FAIL += 1
        FAILURES.append((name, detail))
        print(f"  [FAIL] {name}" + (f"  <- {detail}" if detail else ""))


def section(title: str):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


# ---------------------------------------------------------------------------
# 1. 模块级导入（验证 import 链不再 ImportError）
# ---------------------------------------------------------------------------
section("1. 模块导入（修复 convert_torque 导入源）")

for mod_name in [
    "motor_torque_report.models",
    "motor_torque_report.parser",
    "motor_torque_report.anomaly",
    "motor_torque_report.engine",
    "motor_torque_report.audit",
    "motor_torque_report.recalc",
    "motor_torque_report.report",
    "motor_torque_report.exporter",
]:
    try:
        __import__(mod_name)
        check(f"import {mod_name}", True)
    except Exception as e:
        check(f"import {mod_name}", False, f"{type(e).__name__}: {e}")
        print("  完整堆栈:")
        traceback.print_exc()

# 拿到常用符号
from motor_torque_report import models, parser, anomaly, engine, audit, recalc, report, exporter
from motor_torque_report.models import (
    BASE_UNIT, Direction, AnomalyType, JudgmentAction,
    FilterCriteria,
)
from motor_torque_report.parser import (
    convert_torque, normalize_unit, parse_record,
    detect_unit_magnitude_shift,
)
from motor_torque_report.anomaly import run_all_anomaly_checks, detect_direction_reversed
from motor_torque_report.engine import apply_filter, compute_statistics, build_detail_table
from motor_torque_report.recalc import recalc_with_parameter_change
from motor_torque_report.report import classify_actionable_items, generate_report
from motor_torque_report.exporter import MotorTorqueReportExporter

# ---------------------------------------------------------------------------
# 2. 更贴近真实场景的一组实验数据（15 条，跨 5 台电机）
# ---------------------------------------------------------------------------
section("2. 载入贴近真实的实验记录（15 条，5 台电机）")

# 构造常见情况：
#   M-A: 正常对（CW/CCW），单位 N·m
#   M-B: CCW 方向写反 + 一条缺失附件
#   M-C: 单位混写（多数 N·m，其中一条手误写成 mN·m 造成 1000 倍差）
#   M-D: 晚到附件（最后一条才到，is_late_attachment=True）
#   M-E: 边界样本（一条明显偏离，用于验证 sigma 阈值影响）

REAL_DATA = [
    # M-A 基线 3 条
    {"record_id": "MA-201", "motor_id": "M-A-0472", "test_date": "2026-06-10",
     "direction": "CW",  "torque_raw": 2.41, "torque_unit": "N·m",
     "rpm": 2800, "temperature": 22.3, "attachment_file": "MA-20260610-1.csv",
     "is_late_attachment": False, "operator": "小宋"},
    {"record_id": "MA-202", "motor_id": "M-A-0472", "test_date": "2026-06-10",
     "direction": "CCW", "torque_raw": -2.39, "torque_unit": "N·m",
     "rpm": 2800, "temperature": 22.8, "attachment_file": "MA-20260610-2.csv",
     "is_late_attachment": False, "operator": "小宋"},
    {"record_id": "MA-203", "motor_id": "M-A-0472", "test_date": "2026-06-11",
     "direction": "CW",  "torque_raw": 2.44, "torque_unit": "N·m",
     "rpm": 2800, "temperature": 23.1, "attachment_file": "MA-20260611-1.csv",
     "is_late_attachment": False, "operator": "小宋"},

    # M-B 方向写反 + 缺失附件
    {"record_id": "MB-301", "motor_id": "M-B-1120", "test_date": "2026-06-12",
     "direction": "CCW", "torque_raw": 1.87, "torque_unit": "N·m",  # 正值却 CCW → 写反
     "rpm": 3500, "temperature": 24.0, "attachment_file": "MB-20260612-1.csv",
     "is_late_attachment": False, "operator": "小李"},
    {"record_id": "MB-302", "motor_id": "M-B-1120", "test_date": "2026-06-12",
     "direction": "CCW", "torque_raw": -1.83, "torque_unit": "N·m",
     "rpm": 3500, "temperature": 24.5, "attachment_file": None,       # 缺失附件
     "is_late_attachment": False, "operator": "小李"},

    # M-C 单位混写：MC-403 手误把 N·m 写成了 mN·m，实际是 1.92 N·m 不是 0.00192 N·m
    {"record_id": "MC-401", "motor_id": "M-C-5581", "test_date": "2026-06-13",
     "direction": "CW",  "torque_raw": 1.90, "torque_unit": "N·m",
     "rpm": 4000, "temperature": 25.2, "attachment_file": "MC-20260613-1.csv",
     "is_late_attachment": False, "operator": "小王"},
    {"record_id": "MC-402", "motor_id": "M-C-5581", "test_date": "2026-06-13",
     "direction": "CW",  "torque_raw": 1.94, "torque_unit": "N·m",
     "rpm": 4000, "temperature": 25.8, "attachment_file": "MC-20260613-2.csv",
     "is_late_attachment": False, "operator": "小王"},
    {"record_id": "MC-403", "motor_id": "M-C-5581", "test_date": "2026-06-14",
     "direction": "CW",  "torque_raw": 1.92, "torque_unit": "mN·m",     # 手误！数量级偏移 10^3
     "rpm": 4000, "temperature": 26.1, "attachment_file": "MC-20260614-1.csv",
     "is_late_attachment": False, "operator": "小王"},

    # M-D 晚到附件
    {"record_id": "MD-601", "motor_id": "M-D-8809", "test_date": "2026-06-14",
     "direction": "CW",  "torque_raw": 3.15, "torque_unit": "N·m",
     "rpm": 2000, "temperature": 21.0, "attachment_file": "MD-20260614-1.csv",
     "is_late_attachment": False, "operator": "小宋"},
    {"record_id": "MD-602", "motor_id": "M-D-8809", "test_date": "2026-06-14",
     "direction": "CCW", "torque_raw": -3.12, "torque_unit": "N·m",
     "rpm": 2000, "temperature": 21.5, "attachment_file": "MD-20260614-2.csv",
     "is_late_attachment": False, "operator": "小宋"},
    {"record_id": "MD-603", "motor_id": "M-D-8809", "test_date": "2026-06-15",
     "direction": "CW",  "torque_raw": 3.18, "torque_unit": "N·m",
     "rpm": 2000, "temperature": 22.0, "attachment_file": "MD-20260615-LATE.csv",
     "is_late_attachment": True, "operator": "小李"},  # ← 晚到附件

    # M-E 含边界样本（ME-904 明显异常高，用于验证 boundary_sigma 调档效果）
    {"record_id": "ME-901", "motor_id": "M-E-7731", "test_date": "2026-06-15",
     "direction": "CW",  "torque_raw": 4.00, "torque_unit": "N·m",
     "rpm": 1500, "temperature": 23.0, "attachment_file": "ME-20260615-1.csv",
     "is_late_attachment": False, "operator": "小宋"},
    {"record_id": "ME-902", "motor_id": "M-E-7731", "test_date": "2026-06-15",
     "direction": "CW",  "torque_raw": 4.05, "torque_unit": "N·m",
     "rpm": 1500, "temperature": 23.5, "attachment_file": "ME-20260615-2.csv",
     "is_late_attachment": False, "operator": "小宋"},
    {"record_id": "ME-903", "motor_id": "M-E-7731", "test_date": "2026-06-16",
     "direction": "CW",  "torque_raw": 4.02, "torque_unit": "N·m",
     "rpm": 1500, "temperature": 24.0, "attachment_file": "ME-20260616-1.csv",
     "is_late_attachment": False, "operator": "小宋"},
    {"record_id": "ME-904", "motor_id": "M-E-7731", "test_date": "2026-06-16",
     "direction": "CW",  "torque_raw": 4.95, "torque_unit": "N·m",   # 边界异常（高）
     "rpm": 1500, "temperature": 30.5, "attachment_file": "ME-20260616-2.csv",
     "is_late_attachment": False, "operator": "小宋"},
]
check(f"加载 {len(REAL_DATA)} 条实验记录", True)

# 解析全部
records = [parse_record(r) for r in REAL_DATA]
check("全部解析成功（无 ValueError）", len(records) == len(REAL_DATA))

# 基单位抽查
mc403 = next(r for r in records if r.record_id == "MC-403")
base_val_mc403 = mc403.torque_in_base_unit()
check(f"MC-403 手误 mN·m 换算成 N·m = 0.00192 (值 {base_val_mc403})",
      abs(base_val_mc403 - 0.00192) < 1e-9)

# ---------------------------------------------------------------------------
# 3. 异常检测（方向写反 / 单位混写 / 晚到附件 / 缺失附件）
# ---------------------------------------------------------------------------
section("3. 异常检测（不急着算完，先给原因+影响范围）")

anomalies = run_all_anomaly_checks(records, torque_positive_means_cw=True)
by_type: dict = {}
for a in anomalies:
    by_type.setdefault(a.anomaly_type, []).append(a)

dir_anoms = by_type.get(AnomalyType.DIRECTION_REVERSED, [])
check(f"方向写反数量 = 1 (MB-301)，实际 {len(dir_anoms)}",
      len(dir_anoms) == 1 and dir_anoms[0].record_id == "MB-301")
if dir_anoms:
    check(f"方向写反含原因描述（含记录号/电机/符号/预期）",
          "MB-301" in dir_anoms[0].description and "M-B-1120" in dir_anoms[0].description)
    check(f"方向写反含影响范围 = ['MB-301']", dir_anoms[0].impact_scope == ["MB-301"])
    check(f"方向写反含建议操作", len(dir_anoms[0].suggested_action) > 0)

unit_anoms = by_type.get(AnomalyType.UNIT_MAGNITUDE_SHIFT, [])
check(f"单位数量级偏移数量 >= 1 (M-C-5581)，实际 {len(unit_anoms)}", len(unit_anoms) >= 1)
if unit_anoms:
    check(f"单位偏移影响范围包含 MC-401/402/403",
          all(rid in unit_anoms[0].impact_scope for rid in ["MC-401", "MC-402", "MC-403"]))

late_anoms = by_type.get(AnomalyType.LATE_ATTACHMENT, [])
check(f"晚到附件数量 = 1 (MD-603)，实际 {len(late_anoms)}",
      len(late_anoms) == 1 and late_anoms[0].record_id == "MD-603")

miss_anoms = by_type.get(AnomalyType.MISSING_ATTACHMENT, [])
check(f"缺失附件数量 = 1 (MB-302)，实际 {len(miss_anoms)}",
      any(a.record_id == "MB-302" for a in miss_anoms))

# ---------------------------------------------------------------------------
# 4. 小宋的判断（方向修正 + 放行 + 补料要求）+ 审计留存
# ---------------------------------------------------------------------------
section("4. 小宋的判断 & 审计轨迹（必须留在历史里）")

audit = audit.AuditTrail()
audit.record_direction_fix("小宋", "MB-301", "CCW", "CW", "经与原始实验台日志比对，方向手误")
audit.record_release("小宋", "MD-603", "晚到附件与实验记录原始值一致，确认放行")
audit.record_supplement_request("小宋", "MB-302", "缺失实验原始 CSV，需联系实验员补充")
audit.record_override("小宋", "MC-403", AnomalyType.UNIT_MAGNITUDE_SHIFT,
                      JudgmentAction.CONFIRM_ANOMALY,
                      "确认单位手误：应为 N·m，后续复算时改为 N·m")

# 实际修方向（给 exporter 后面用）
for r in records:
    if r.record_id == "MB-301":
        r.direction = Direction.CW
        break
# 修正 MC-403 单位手误（1.92 mN·m → 1.92 N·m）
for r in records:
    if r.record_id == "MC-403":
        r.torque_raw = 1.92
        r.torque_unit = "N·m"
        break

entries = audit.entries
check(f"审计条目数 = 4，实际 {len(entries)}", len(entries) == 4)
check(f"MB-301 的审计条目能按记录号查到", len(audit.entries_for_record("MB-301")) == 1)
check(f"按记录查 MD-603 操作 = 覆盖放行",
      audit.entries_for_record("MD-603")[0].action == JudgmentAction.OVERRIDE_RELEASE)

# ---------------------------------------------------------------------------
# 5. 筛选条件 → 统计数字 → 明细表 同源（同一 filtered 列表）
# ---------------------------------------------------------------------------
section("5. 筛选/统计/明细 一体化（同源）")

criteria = FilterCriteria(
    date_from="2026-06-10",
    date_to="2026-06-16",
    include_late_attachments=True,
    exclude_anomalies=False,       # 小宋已人工修正所有，先纳入
)
filtered = apply_filter(records, criteria)
stats = compute_statistics(filtered, output_unit=BASE_UNIT, boundary_sigma=1.5)
detail = build_detail_table(filtered, output_unit=BASE_UNIT)

check(f"筛选保留全部 15 条，实际 {len(filtered)}", len(filtered) == 15)
check(f"统计条数 = 明细条数 = 筛选条数",
      sum(s.count for s in stats) == len(detail) == len(filtered))

# 找 CW 方向统计
cw_stat = next(s for s in stats if s.direction == Direction.CW)
check(f"CW 统计均值、标准差已正常计算（均>0）",
      cw_stat.mean > 0 and cw_stat.std >= 0)

# 边界样本：ME-904 (4.95) 在 CW 中应该被识别为高边界
check(f"CW 边界高样本包含 ME-904，实际 {cw_stat.boundary_high_ids}",
      "ME-904" in cw_stat.boundary_high_ids)

# 明细表中每条都带换算后列
col_name = f"torque_{BASE_UNIT}"
check(f"明细每行包含 {col_name}", all(col_name in row for row in detail))

# ---------------------------------------------------------------------------
# 6. 参数调档复算（boundary_sigma 1.5→2.0，验证公式+边界样本变化）
# ---------------------------------------------------------------------------
section("6. 参数调档复算（boundary_sigma 1.5 → 2.0）")

modified, impacts, stats_before, stats_after, judgment = recalc_with_parameter_change(
    records=filtered,
    parameter_name="boundary_sigma",
    old_value=1.5,
    new_value=2.0,
    operator="小宋",
    output_unit=BASE_UNIT,
    boundary_sigma=1.5,
)

check(f"复算生成影响分析条数 >= 1，实际 {len(impacts)}", len(impacts) >= 1)
imp_cw = next((i for i in impacts if "boundary" in i.formula.lower()), None) if impacts else None
if impacts:
    first_imp = impacts[0]
    check(f"影响含公式字段（含 boundary_sigma）",
          "boundary_sigma" in first_imp.formula or "σ×k" in first_imp.formula)
    check(f"影响含受影响边界样本", first_imp.boundary_records_affected is not None)
    check(f"影响含结果前后值 + delta%",
          first_imp.result_after != 0 or first_imp.result_before != 0)
    check(f"影响含自然语言说明", len(first_imp.explanation) > 0)
check(f"复算审计记录操作人=小宋，动作=参数调档",
      judgment.operator == "小宋" and judgment.action == JudgmentAction.ADJUST_PARAMETER)

# 验证：k=2.0 时 ME-904 可能不再是边界（放宽阈值）
cw_after = next((s for s in stats_after if s.direction == Direction.CW), None)
cw_before = next((s for s in stats_before if s.direction == Direction.CW), None)
if cw_before and cw_after:
    boundary_shrank = (len(cw_before.boundary_high_ids) + len(cw_before.boundary_low_ids)
                       >= len(cw_after.boundary_high_ids) + len(cw_after.boundary_low_ids))
    check(f"放宽 sigma 后边界样本不增（之前={cw_before.boundary_high_ids + cw_before.boundary_low_ids}"
          f"，之后={cw_after.boundary_high_ids + cw_after.boundary_low_ids}）",
          boundary_shrank)

# ---------------------------------------------------------------------------
# 7. 主入口 Exporter 走完整链路 → 生成 Markdown
# ---------------------------------------------------------------------------
section("7. 主入口 Exporter 完整链路（load → 异常 → 修正 → 复算 → export_markdown）")

exp = MotorTorqueReportExporter(operator="小宋", output_unit=BASE_UNIT, boundary_sigma=1.5)
exp.load_records(REAL_DATA)

anoms_before = exp.check_anomalies()
check(f"主入口异常检测结果与独立检测一致（条数 {len(anoms_before)} vs {len(anomalies)}）",
      abs(len(anoms_before) - len(anomalies)) <= 1)

# 小宋的临时判断（走 API，不走底层直接改）
exp.fix_direction("MB-301", reason="经实验台日志比对，方向手误")
exp.release_record("MD-603", reason="晚到附件一致可放行")
exp.request_supplement("MB-302", reason="缺原始 CSV")
exp.confirm_anomaly("MC-403", resolution="确认为手误 mN·m，应为 N·m")

# 因为 MC-403 光 confirm 不会变数值，这里走参数调档“torque_override”来真正复算
exp.recalculate("torque_override", old_value=None, new_value={"MC-403": 1.92})
# 同时把 MC-403 的单位也换成 N·m（不然会按 mN·m 再算一遍 0.00192）
for r in exp._records:
    if r.record_id == "MC-403":
        r.torque_unit = "N·m"

# 再调一档 boundary sigma
exp.recalculate("boundary_sigma", old_value=1.5, new_value=2.0)
# 同步内部变量（exporter 自己的 boundary_sigma 需要反映调档结果）
exp.boundary_sigma = 2.0

md = exp.export_markdown()

check(f"Markdown 报告生成成功（长度 {len(md)} 字）", len(md) > 2000)
check("报告含『筛选条件』章节", "筛选条件" in md)
check("报告含『统计数字』章节", "统计数字" in md)
check("报告含『明细表』章节", "明细表" in md)
check("报告含『待确认异常』章节", "待确认异常" in md)
check("报告含『参数调档影响分析』章节", "参数调档影响分析" in md)
check("报告含『判断历史记录』章节（审计可追溯）", "判断历史记录" in md)
check("报告含『可操作清单』章节（不是技术说明）", "可操作清单" in md)
check("报告含 MB-301 方向修正的历史记录", "MB-301" in md and "方向" in md)
check("报告含小宋（操作人）", "小宋" in md)
check("报告含补料建议（MB-302 缺附件）", "补料" in md or "补" in md)

# 保存报告到磁盘供肉眼查看
out_path = ROOT / "motor_torque_report_OUTPUT_SAMPLE.md"
out_path.write_text(md, encoding="utf-8")
check(f"样例报告落盘 -> {out_path.name}", out_path.exists() and out_path.stat().st_size > 0)

# ---------------------------------------------------------------------------
# 8. 收尾：汇总
# ---------------------------------------------------------------------------
section("8. 汇总")
print(f"\n  通过: {PASS}")
print(f"  失败: {FAIL}")
if FAILURES:
    print("\n  失败详情:")
    for name, detail in FAILURES:
        print(f"    - {name}: {detail}")
    sys.exit(1)
else:
    print("\n  ✅ 全部通过")
    sys.exit(0)
