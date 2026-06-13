import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from motor_torque_report.models import (
    BASE_UNIT, AnomalyType, Direction, ExperimentalRecord,
    FilterCriteria, JudgmentAction,
)
from motor_torque_report.parser import (
    convert_torque, detect_unit_magnitude_shift,
    normalize_unit, parse_record,
)
from motor_torque_report.anomaly import (
    detect_direction_reversed, detect_late_attachment_anomalies,
    run_all_anomaly_checks,
)
from motor_torque_report.engine import (
    apply_filter, build_detail_table, compute_statistics,
)
from motor_torque_report.audit import AuditTrail
from motor_torque_report.recalc import recalc_with_parameter_change
from motor_torque_report.exporter import MotorTorqueReportExporter
from motor_torque_report.report import classify_actionable_items, generate_report


SAMPLE_RECORDS = [
    {"record_id": "REC-001", "motor_id": "M-100", "test_date": "2025-06-01",
     "direction": "CW", "torque_raw": 2.5, "torque_unit": "N·m",
     "rpm": 3000, "temperature": 25.0, "attachment_file": "rec001.csv",
     "is_late_attachment": False, "operator": "小宋"},
    {"record_id": "REC-002", "motor_id": "M-100", "test_date": "2025-06-01",
     "direction": "CCW", "torque_raw": -2.3, "torque_unit": "N·m",
     "rpm": 3000, "temperature": 25.0, "attachment_file": "rec002.csv",
     "is_late_attachment": False, "operator": "小宋"},
    {"record_id": "REC-003", "motor_id": "M-100", "test_date": "2025-06-02",
     "direction": "CCW", "torque_raw": 2.1, "torque_unit": "N·m",
     "rpm": 3000, "temperature": 26.0, "attachment_file": None,
     "is_late_attachment": False, "operator": "小宋"},
    {"record_id": "REC-004", "motor_id": "M-101", "test_date": "2025-06-02",
     "direction": "CW", "torque_raw": 1.8, "torque_unit": "mN·m",
     "rpm": 5000, "temperature": 24.0, "attachment_file": "rec004_late.csv",
     "is_late_attachment": True, "operator": "小李"},
    {"record_id": "REC-005", "motor_id": "M-101", "test_date": "2025-06-03",
     "direction": "CW", "torque_raw": 2.6, "torque_unit": "N·m",
     "rpm": 5000, "temperature": 24.0, "attachment_file": "rec005.csv",
     "is_late_attachment": False, "operator": "小李"},
    {"record_id": "REC-006", "motor_id": "M-102", "test_date": "2025-06-03",
     "direction": "CW", "torque_raw": 3.0, "torque_unit": "N·m",
     "rpm": 4000, "temperature": 23.0, "attachment_file": "rec006.csv",
     "is_late_attachment": False, "operator": "小宋"},
    {"record_id": "REC-007", "motor_id": "M-102", "test_date": "2025-06-04",
     "direction": "CCW", "torque_raw": -2.8, "torque_unit": "N·m",
     "rpm": 4000, "temperature": 23.0, "attachment_file": "rec007.csv",
     "is_late_attachment": False, "operator": "小宋"},
]


def main():
    passed = 0
    failed = 0

    def check(name, condition):
        nonlocal passed, failed
        if condition:
            passed += 1
            print(f"  ✅ {name}")
        else:
            failed += 1
            print(f"  ❌ {name}")

    print("=" * 60)
    print("电机扭矩报告导出 — 功能验证")
    print("=" * 60)

    print("\n1. 单位换算")
    check("N·m → N·m", abs(convert_torque(1.0, "N·m", "N·m") - 1.0) < 1e-9)
    check("mN·m → N·m", abs(convert_torque(1000.0, "mN·m", "N·m") - 1.0) < 1e-4)
    check("kN·m → N·m", abs(convert_torque(1.0, "kN·m", "N·m") - 1000.0) < 1e-4)
    check("kgf·cm → N·m", abs(convert_torque(1.0, "kgf·cm", "N·m") - 0.0980665) < 1e-5)

    print("\n2. 方向解析")
    check("CW 变体", Direction.from_str("CW") == Direction.CW and Direction.from_str("正转") == Direction.CW)
    check("CCW 变体", Direction.from_str("逆时针") == Direction.CCW)
    check("opposite", Direction.CW.opposite() == Direction.CCW)

    print("\n3. 记录解析与基单位转换")
    rec_late = parse_record(SAMPLE_RECORDS[3])
    check("晚到附件标记", rec_late.is_late_attachment is True)
    check("mN·m 基单位", abs(rec_late.torque_in_base_unit() - 0.001 * 1.8) < 1e-8)

    print("\n4. 异常检测")
    records = [parse_record(r) for r in SAMPLE_RECORDS]
    anomalies = run_all_anomaly_checks(records)
    anomaly_types = {a.anomaly_type for a in anomalies}
    check("方向写反检测", AnomalyType.DIRECTION_REVERSED in anomaly_types)
    check("晚到附件检测", AnomalyType.LATE_ATTACHMENT in anomaly_types)
    check("单位数量级偏移检测", AnomalyType.UNIT_MAGNITUDE_SHIFT in anomaly_types)
    dir_anom = [a for a in anomalies if a.anomaly_type == AnomalyType.DIRECTION_REVERSED]
    check("方向异常包含待确认原因", any("REC-003" in a.impact_scope[0] for a in dir_anom if a.impact_scope))

    print("\n5. 筛选与统计（同一数据源）")
    criteria = FilterCriteria(motor_ids=["M-100"])
    filtered = apply_filter(records, criteria)
    check("筛选 M-100", all(r.motor_id == "M-100" for r in filtered))
    stats = compute_statistics(records, output_unit=BASE_UNIT)
    check("统计有结果", len(stats) > 0 and stats[0].count > 0)
    detail = build_detail_table(filtered, output_unit=BASE_UNIT)
    check("明细行数一致", len(detail) == len(filtered))

    print("\n6. 方向修正 + 审计轨迹")
    audit = AuditTrail()
    audit.record_direction_fix("小宋", "REC-003", "CCW", "CW", "确认方向写反")
    audit.record_release("小宋", "REC-004", "晚到数据经确认可放行")
    entries = audit.entries
    check("审计条目数", len(entries) == 2)
    check("修正方向记录", entries[0].action == JudgmentAction.CORRECT_DIRECTION)
    check("放行记录", entries[1].action == JudgmentAction.OVERRIDE_RELEASE)
    check("按记录查询", len(audit.entries_for_record("REC-003")) == 1)

    print("\n7. 参数调档复算")
    _, impacts, _, stats_after, judgment = recalc_with_parameter_change(
        records=records,
        parameter_name="boundary_sigma",
        old_value=1.5,
        new_value=2.0,
        operator="小宋",
        output_unit=BASE_UNIT,
    )
    check("影响分析有结果", len(impacts) > 0)
    check("影响含公式描述", any("boundary_sigma" in imp.formula for imp in impacts))
    check("影响含边界样本", any(imp.boundary_records_affected is not None for imp in impacts))
    check("复算审计记录", judgment.operator == "小宋")

    print("\n8. 完整导出流程（含晚到附件 + 方向写反 + 单位混写）")
    exporter = MotorTorqueReportExporter(operator="小宋", output_unit=BASE_UNIT)
    exporter.load_records(SAMPLE_RECORDS)
    exporter.check_anomalies()
    exporter.fix_direction("REC-003", reason="经复核确认方向写反")
    exporter.release_record("REC-004", reason="晚到附件数据经确认与实验一致，可放行")
    exporter.request_supplement("REC-003", reason="缺少附件，需补充原始数据文件")
    exporter.recalculate("boundary_sigma", 1.5, 2.0)

    md = exporter.export_markdown()
    check("报告含标题", "电机扭矩报告" in md)
    check("报告含筛选条件", "筛选条件" in md)
    check("报告含统计数字", "统计数字" in md)
    check("报告含明细表", "明细表" in md)
    check("报告含待确认异常", "待确认异常" in md)
    check("报告含方向写反", "方向符号写反" in md)
    check("报告含判断历史", "判断历史记录" in md)
    check("报告含操作人", "小宋" in md)
    check("报告含参数调档影响", "参数调档影响分析" in md)
    check("报告含可操作清单", "可操作清单" in md)
    check("报告含补料建议", "需要补料" in md or "补料" in md)
    check("报告非技术说明风格", "技术说明" not in md)

    print("\n9. 分类可操作项")
    supplement, release = classify_actionable_items(anomalies, len(records))
    check("有补料项", len(supplement) > 0)
    check("补料项含记录号", any("REC-" in s for s in supplement))

    print("\n" + "=" * 60)
    print(f"验证完成: {passed} 通过, {failed} 失败")
    print("=" * 60)

    if failed > 0:
        sys.exit(1)

    print("\n" + "=" * 60)
    print("生成的 Markdown 报告示例（前 80 行）:")
    print("=" * 60)
    lines = md.split("\n")
    for line in lines[:80]:
        print(line)
    if len(lines) > 80:
        print(f"\n... (共 {len(lines)} 行)")

    return 0


if __name__ == "__main__":
    main()
