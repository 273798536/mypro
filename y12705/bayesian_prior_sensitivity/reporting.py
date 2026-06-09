"""报告模块 - 结果摘要和投委会视图"""

from __future__ import annotations

import json
from typing import Any

from .models import (
    BatchReport,
    CaseBundle,
    CaseStatus,
    CommitteeDecision,
    DataAvailability,
    SensitivityResult,
)


def _status_label(s: CaseStatus) -> str:
    mapping = {
        CaseStatus.PENDING: "待确认",
        CaseStatus.APPROVED: "已通过",
        CaseStatus.REJECTED: "已拒绝",
        CaseStatus.NEEDS_RECOLLECTION: "需重采",
        CaseStatus.TEMPORARY_HOLD: "暂缓",
    }
    return mapping.get(s, s.value)


def _availability_label(a: DataAvailability) -> str:
    mapping = {
        DataAvailability.USABLE: "可用",
        DataAvailability.PENDING: "暂缓",
        DataAvailability.NEEDS_RECOLLECTION: "需重采",
    }
    return mapping.get(a, a.value)


def _committee_label(c: CommitteeDecision) -> str:
    mapping = {
        CommitteeDecision.DIRECT_USE: "直接使用",
        CommitteeDecision.NEEDS_REVIEW: "需算法复核",
    }
    return mapping.get(c, c.value)


def format_summary_text(report: BatchReport) -> str:
    """文本格式的批量处理摘要"""
    lines = []
    lines.append("=" * 60)
    lines.append("  贝叶斯先验敏感性 - 批量处理摘要")
    lines.append("=" * 60)
    lines.append(f"  边界样例总数:    {report.total_cases}")
    lines.append(f"  约束校验通过:    {report.constraint_pass_count}")
    lines.append(f"  约束校验失败:    {report.constraint_fail_count}")
    lines.append("-" * 60)
    lines.append("  数据可用状态:")
    lines.append(f"    可用 (usable):        {report.usable_count}")
    lines.append(f"    暂缓 (pending):       {report.pending_count}")
    lines.append(f"    需重采 (recollect):   {report.needs_recollection_count}")
    if report.constraint_violations:
        lines.append("-" * 60)
        lines.append("  约束违规详情:")
        for case_id, viols in report.constraint_violations.items():
            lines.append(f"    [{case_id}]")
            for v in viols:
                lines.append(f"      - {v}")
    lines.append("=" * 60)
    return "\n".join(lines)


def format_committee_view(report: BatchReport) -> str:
    """投委会视图 - 一眼分清直接使用和需复核"""
    direct: list[SensitivityResult] = []
    need_review: list[SensitivityResult] = []
    for r in report.cases:
        if r.committee_decision == CommitteeDecision.DIRECT_USE:
            direct.append(r)
        else:
            need_review.append(r)

    lines = []
    lines.append("=" * 72)
    lines.append("  投委会视图 - 边界样例决策结果")
    lines.append("=" * 72)
    lines.append(f"  总计: {report.total_cases}  |  直接使用: {len(direct)}  |  需复核: {len(need_review)}")
    lines.append("")

    lines.append("▼ 直接使用 (可直接纳入分析)")
    lines.append("-" * 72)
    if direct:
        header = f"  {'样例ID':<18} {'先验':<10} {'后验均值':<10} {'鲁棒性':<8} {'状态':<8}"
        lines.append(header)
        for r in direct:
            prior_str = f"α={r.prior_params.alpha:.1f},β={r.prior_params.beta:.1f}"
            robust = "✓" if r.is_robust else "✗"
            lines.append(
                f"  {r.case_id:<18} {prior_str:<10} {r.posterior_mean:<10.3f} {robust:<8} {_status_label(r.status):<8}"
            )
    else:
        lines.append("  （无）")

    lines.append("")
    lines.append("▼ 需算法工程师复核")
    lines.append("-" * 72)
    if need_review:
        header = f"  {'样例ID':<18} {'可用状态':<10} {'鲁棒性':<8} {'委员会':<10} {'原因':<20}"
        lines.append(header)
        for r in need_review:
            reasons = []
            if r.data_availability != DataAvailability.USABLE:
                reasons.append(_availability_label(r.data_availability))
            if not r.is_robust:
                reasons.append("不鲁棒")
            if r.status != CaseStatus.APPROVED:
                reasons.append(_status_label(r.status))
            reason_text = "、".join(reasons) if reasons else "-"
            robust = "✓" if r.is_robust else "✗"
            lines.append(
                f"  {r.case_id:<18} {_availability_label(r.data_availability):<10} {robust:<8} {_committee_label(r.committee_decision):<10} {reason_text:<20}"
            )
    else:
        lines.append("  （无）")
    lines.append("=" * 72)
    return "\n".join(lines)


def format_single_result(
    bundle: CaseBundle,
    result: SensitivityResult | None,
    include_trace: bool = False,
) -> str:
    """单个边界样例的详细结果"""
    from .core import trace_conclusion

    case = bundle.case
    lines = []
    lines.append("=" * 60)
    lines.append(f"  边界样例: {case.case_id}")
    lines.append("=" * 60)
    lines.append(f"  描述:       {case.description}")
    lines.append(f"  当前状态:   {_status_label(case.status)} (版本 v{case.version})")
    lines.append(f"  结论:       {case.conclusion or '(无)'}")
    lines.append(f"  边界标志:   {'是' if case.boundary_flag else '否'}")
    lines.append("")
    lines.append(f"  先验参数:   {case.prior_params.distribution}  α={case.prior_params.alpha}  β={case.prior_params.beta}")
    if case.prior_params.description:
        lines.append(f"              {case.prior_params.description}")
    lines.append("")
    lines.append(f"  评分记录:   {len(bundle.scoring_records)} 条")
    for s in bundle.scoring_records:
        lines.append(f"    - {s.scorer}: {s.score}  ({s.notes or '无备注'})")
    lines.append(f"  来源材料:   {len(bundle.source_materials)} 条")
    for m in bundle.source_materials:
        lines.append(f"    - [{m.material_type}] {m.location or '未标注位置'}")
    lines.append(f"  错题/答题:  {len(bundle.student_answers)} 条")
    wrong = sum(1 for a in bundle.student_answers if not a.is_correct)
    lines.append(f"              其中错题 {wrong} 条")
    if result:
        lines.append("")
        lines.append("  --- 先验敏感性分析结果 ---")
        lines.append(f"  后验均值:   {result.posterior_mean:.4f}")
        lines.append(f"  后验标准差: {result.posterior_std:.4f}")
        lines.append(f"  鲁棒性指数: {result.robustness_index:.4f}  {'(✓ 鲁棒)' if result.is_robust else '(✗ 敏感)'}")
        lines.append(f"  数据可用:   {_availability_label(result.data_availability)}")
        lines.append(f"  投委会:     {_committee_label(result.committee_decision)}")
    if include_trace:
        trace = trace_conclusion(bundle)
        lines.append("")
        lines.append("  --- 结论追溯 (拉回来源材料) ---")
        if trace["sources"]:
            lines.append("  来源材料:")
            for s in trace["sources"]:
                lines.append(f"    [{s['material_type']}] {s['location']}")
                lines.append(f"      摘要: {s['content_excerpt']}")
        if trace["scoring_evidence"]:
            lines.append("  评分依据:")
            for e in trace["scoring_evidence"]:
                lines.append(f"    {e['scorer']}: {e['score']} - {e['notes']}")
        if trace["sensitivity_evidence"]:
            se = trace["sensitivity_evidence"]
            lines.append("  敏感性依据:")
            lines.append(f"    后验均值={se['posterior_mean']:.4f}, 鲁棒={'是' if se['is_robust'] else '否'}")
    lines.append("=" * 60)
    return "\n".join(lines)


def format_result_json(report: BatchReport) -> str:
    """JSON 格式的报告"""
    data: dict[str, Any] = {
        "summary": {
            "total_cases": report.total_cases,
            "constraint_pass": report.constraint_pass_count,
            "constraint_fail": report.constraint_fail_count,
            "usable": report.usable_count,
            "pending": report.pending_count,
            "needs_recollection": report.needs_recollection_count,
        },
        "constraint_violations": report.constraint_violations,
        "cases": [],
    }
    for r in report.cases:
        data["cases"].append({
            "case_id": r.case_id,
            "status": r.status.value,
            "posterior_mean": r.posterior_mean,
            "posterior_std": r.posterior_std,
            "robustness_index": r.robustness_index,
            "is_robust": r.is_robust,
            "data_availability": r.data_availability.value,
            "committee_decision": r.committee_decision.value,
            "boundary_flag": r.boundary_flag,
        })
    return json.dumps(data, ensure_ascii=False, indent=2)
