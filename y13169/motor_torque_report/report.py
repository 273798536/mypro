from __future__ import annotations

from typing import Optional

from .models import (
    Anomaly,
    AnomalyType,
    FilterCriteria,
    JudgmentEntry,
    RecalcImpact,
    ReportBundle,
    StatisticResult,
    convert_torque,
)
from .anomaly import run_all_anomaly_checks
from .audit import AuditTrail
from .engine import apply_filter, build_detail_table, compute_statistics
from .parser import normalize_unit


def classify_actionable_items(
    anomalies: list[Anomaly],
    records_count: int,
) -> tuple[list[str], list[str]]:
    supplement_needed: list[str] = []
    release_allowed: list[str] = []

    for a in anomalies:
        if a.anomaly_type == AnomalyType.DIRECTION_REVERSED and not a.confirmed:
            supplement_needed.append(
                f"🔴 {a.record_id}: {a.description} → {a.suggested_action}"
            )
        elif a.anomaly_type == AnomalyType.UNIT_MAGNITUDE_SHIFT and not a.confirmed:
            supplement_needed.append(
                f"🔴 {a.record_id}: {a.description} → {a.suggested_action}"
            )
        elif a.anomaly_type == AnomalyType.LATE_ATTACHMENT:
            supplement_needed.append(
                f"🟡 {a.record_id}: {a.description} → {a.suggested_action}"
            )
        elif a.anomaly_type == AnomalyType.MISSING_ATTACHMENT:
            supplement_needed.append(
                f"🟡 {a.record_id}: {a.description} → {a.suggested_action}"
            )

    if not supplement_needed:
        release_allowed.append(f"✅ 全部 {records_count} 条记录可放行")

    return supplement_needed, release_allowed


def generate_report(bundle: ReportBundle) -> str:
    lines: list[str] = []

    lines.append(f"# {bundle.config.title}")
    lines.append("")
    lines.append(f"> 生成时间: {bundle.generated_at}  ")
    lines.append(f"> 操作人: {bundle.config.operator or '(未指定)'}  ")
    lines.append("")

    lines.append("## 筛选条件")
    lines.append("")
    c = bundle.filter_criteria
    filter_items = []
    if c.motor_ids:
        filter_items.append(f"- 电机编号: {', '.join(c.motor_ids)}")
    if c.directions:
        filter_items.append(f"- 方向: {', '.join(d.value for d in c.directions)}")
    if c.date_from:
        filter_items.append(f"- 起始日期: {c.date_from}")
    if c.date_to:
        filter_items.append(f"- 截止日期: {c.date_to}")
    if c.torque_min is not None:
        filter_items.append(f"- 扭矩下限: {c.torque_min} {bundle.config.output_unit}")
    if c.torque_max is not None:
        filter_items.append(f"- 扭矩上限: {c.torque_max} {bundle.config.output_unit}")
    filter_items.append(f"- 含晚到附件: {'是' if c.include_late_attachments else '否'}")
    filter_items.append(f"- 排除异常记录: {'是' if c.exclude_anomalies else '否'}")
    lines.extend(filter_items)
    lines.append("")

    lines.append("## 统计数字")
    lines.append("")
    if bundle.statistics:
        lines.append("| 方向 | 数量 | 均值 | 标准差 | 最小值 | 最大值 | 单位 |")
        lines.append("|------|------|------|--------|--------|--------|------|")
        for s in bundle.statistics:
            lines.append(
                f"| {s.direction.value} | {s.count} | {s.mean:.4f} | {s.std:.4f} "
                f"| {s.min_val:.4f} | {s.max_val:.4f} | {s.unit} |"
            )
        lines.append("")

        for s in bundle.statistics:
            if s.boundary_low_ids or s.boundary_high_ids:
                lines.append(f"**{s.direction.value} 方向边界样本**: ")
                if s.boundary_low_ids:
                    lines.append(f"- 低于均值-1.5σ: {', '.join(s.boundary_low_ids)}")
                if s.boundary_high_ids:
                    lines.append(f"- 高于均值+1.5σ: {', '.join(s.boundary_high_ids)}")
                lines.append("")
    else:
        lines.append("_无统计数据_")
        lines.append("")

    lines.append("## 明细表")
    lines.append("")
    if bundle.detail_rows:
        headers = ["record_id", "motor_id", "test_date", "direction",
                   "torque_raw", "torque_unit", f"torque_{bundle.config.output_unit}",
                   "is_late_attachment", "operator"]
        lines.append("| " + " | ".join(headers) + " |")
        lines.append("| " + " | ".join(["---"] * len(headers)) + " |")
        for row in bundle.detail_rows:
            vals = [str(row.get(h, "")) for h in headers]
            lines.append("| " + " | ".join(vals) + " |")
        lines.append("")
    else:
        lines.append("_无明细记录_")
        lines.append("")

    if bundle.config.include_anomaly_details and bundle.anomalies:
        lines.append("## ⚠️ 待确认异常")
        lines.append("")
        lines.append("> 以下异常未确认前不应直接纳入最终统计，请逐条确认原因和影响范围。")
        lines.append("")
        for i, a in enumerate(bundle.anomalies, 1):
            status = "✅已确认" if a.confirmed else "❌待确认"
            lines.append(f"### 异常 {i}: {a.anomaly_type.value} [{status}]")
            lines.append(f"- **记录**: {a.record_id}")
            lines.append(f"- **严重性**: {a.severity}")
            lines.append(f"- **描述**: {a.description}")
            lines.append(f"- **影响范围**: {', '.join(a.impact_scope) if a.impact_scope else '仅当前记录'}")
            lines.append(f"- **建议操作**: {a.suggested_action}")
            if a.resolution:
                lines.append(f"- **处理结果**: {a.resolution}")
            lines.append("")

    if bundle.config.include_recalc_impact and bundle.recalc_impacts:
        lines.append("## 参数调档影响分析")
        lines.append("")
        lines.append("> 以下展示参数变更如何通过公式和单位换算影响最终结果。")
        lines.append("")
        for imp in bundle.recalc_impacts:
            lines.append(f"### 参数: {imp.parameter_name}")
            lines.append(f"- **变更**: {imp.old_value} → {imp.new_value}")
            lines.append(f"- **公式/换算**: {imp.formula}")
            lines.append(f"- **结果变化**: {imp.result_before:.4f} → {imp.result_after:.4f} ({imp.delta_percent:+.2f}%)")
            lines.append(f"- **受影响边界样本**: {', '.join(imp.boundary_records_affected) if imp.boundary_records_affected else '无'}")
            lines.append(f"- **说明**: {imp.explanation}")
            lines.append("")

    if bundle.config.include_audit_trail and bundle.audit_trail:
        lines.append("## 判断历史记录")
        lines.append("")
        lines.append("> 以下记录了操作人的临时判断和修改，确保下一班可以看到决策过程而非仅最终结果。")
        lines.append("")
        lines.append("| 时间 | 操作人 | 动作 | 目标记录 | 异常类型 | 原因 | 旧值 | 新值 | 公式 |")
        lines.append("|------|--------|------|----------|----------|------|------|------|------|")
        for e in bundle.audit_trail:
            anomaly_str = e.anomaly_type.value if e.anomaly_type else "-"
            old_str = str(e.previous_value) if e.previous_value is not None else "-"
            new_str = str(e.new_value) if e.new_value is not None else "-"
            formula_str = e.formula_used or "-"
            reason_str = e.reason.replace("|", "｜")
            lines.append(
                f"| {e.timestamp} | {e.operator} | {e.action.value} | {e.target_record_id} "
                f"| {anomaly_str} | {reason_str} | {old_str} | {new_str} | {formula_str} |"
            )
        lines.append("")

    if bundle.config.include_actionable_summary:
        lines.append("## 📋 可操作清单")
        lines.append("")
        if bundle.supplement_needed:
            lines.append("### 需要补料/确认")
            lines.append("")
            for item in bundle.supplement_needed:
                lines.append(f"- {item}")
            lines.append("")
        if bundle.release_allowed:
            lines.append("### 可以放行")
            lines.append("")
            for item in bundle.release_allowed:
                lines.append(f"- {item}")
            lines.append("")

    return "\n".join(lines)
