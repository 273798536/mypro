from __future__ import annotations

from typing import Optional, Tuple, List

from .models import (
    BatchReport,
    RetestSuggestion,
    RetestReason,
    ConcentrationData,
    ConclusionStatus,
    ConsistencyStatus,
)


def normalize_concentration(
    report: BatchReport,
    target_unit: str = "mg/mL",
    expected_range: Optional[Tuple[float, float]] = None,
) -> Tuple[Optional[ConcentrationData], List[str], List[str]]:
    """
    将批次报告中的浓度换算为标准单位，并检查是否在预期范围内。

    Args:
        report: 批次报告
        target_unit: 目标单位，默认 mg/mL
        expected_range: (下限, 上限)，单位与 target_unit 一致

    Returns:
        (换算后浓度数据, 问题列表, 警告列表)
    """
    issues: List[str] = []
    warnings: List[str] = []

    if report.concentration is None:
        issues.append("批次报告缺少浓度检测数据")
        return None, issues, warnings

    try:
        normalized = report.concentration.to(target_unit)
    except ValueError as e:
        issues.append(f"浓度换算失败: {e}")
        return None, issues, warnings

    if expected_range is not None:
        lo, hi = expected_range
        if normalized.value < lo or normalized.value > hi:
            issues.append(
                f"浓度 {normalized.value:.4f} {target_unit} 超出预期范围 "
                f"[{lo}, {hi}] {target_unit}"
            )

    return normalized, issues, warnings


def _temp_check(report: BatchReport, reasons: List[RetestReason], issues: List[str]) -> None:
    """检查温控数据是否在范围内."""
    tp = report.temperature_profile
    if tp is None:
        issues.append("缺少温控曲线数据，无法判断反应温度是否合格")
        reasons.append(RetestReason.TEMP_OUT_OF_RANGE)
        return

    if not tp.points:
        issues.append("温控曲线为空，无采样数据")
        reasons.append(RetestReason.TEMP_OUT_OF_RANGE)
        return

    oor = tp.out_of_range_points()
    if oor:
        worst = max(oor, key=lambda p: abs(p.temperature_c - tp.target_temp_c))
        issues.append(
            f"共 {len(oor)} 个采样点温度超范围，最严重偏离: "
            f"{worst.temperature_c:.1f}°C (目标 {tp.target_temp_c:.1f}°C, "
            f"时间点 {worst.elapsed_min:.0f}min)"
        )
        reasons.append(RetestReason.TEMP_OUT_OF_RANGE)


def _concentration_check(
    report: BatchReport,
    reasons: List[RetestReason],
    issues: List[str],
    expected_range: Optional[Tuple[float, float]],
) -> None:
    """检查浓度是否异常."""
    if report.concentration is None:
        reasons.append(RetestReason.CONCENTRATION_ANOMALY)
        return
    try:
        norm = report.concentration.to("mg/mL")
    except ValueError:
        reasons.append(RetestReason.CONCENTRATION_ANOMALY)
        issues.append("浓度数据单位换算失败")
        return
    if expected_range is not None:
        lo, hi = expected_range
        if norm.value < lo or norm.value > hi:
            reasons.append(RetestReason.CONCENTRATION_ANOMALY)


def _consistency_check(
    report: BatchReport,
    reasons: List[RetestReason],
    issues: List[str],
) -> ConsistencyStatus:
    """
    检查反应条件与结论是否一致。
    核心逻辑：结论说"通过"但温控/浓度有问题 → 不一致。
    """
    cond_pass = True
    tp = report.temperature_profile
    if tp is not None and tp.points:
        cond_pass = tp.all_within_range()

    if report.conclusion.passed and not cond_pass:
        reasons.append(RetestReason.CONDITION_CONCLUSION_MISMATCH)
        issues.append(
            "结论标记为通过，但温控数据存在超范围点，"
            "建议药化研究员确认结论是否需要更新"
        )
        return ConsistencyStatus.INCONSISTENT

    return ConsistencyStatus.CONSISTENT


def generate_retest_suggestion(
    report: BatchReport,
    expected_concentration_range: Optional[Tuple[float, float]] = None,
    previous_report: Optional[BatchReport] = None,
) -> RetestSuggestion:
    """
    综合温控、浓度、溯源、一致性等因素，输出复测建议。

    Args:
        report: 当前批次报告
        expected_concentration_range: 预期浓度范围 (mg/mL)
        previous_report: 上一版本报告（用于检测变更）

    Returns:
        复测建议对象
    """
    reasons: List[RetestReason] = []
    issues: List[str] = []

    _temp_check(report, reasons, issues)
    _concentration_check(report, reasons, issues, expected_concentration_range)
    _consistency_check(report, reasons, issues)

    if not report.weighing_record_ids:
        reasons.append(RetestReason.MISSING_WEIGHING_RECORD)
        issues.append("批次报告未关联任何称量单")

    if previous_report is not None:
        if _material_changed(previous_report, report):
            reasons.append(RetestReason.SOURCE_MATERIAL_CHANGED)
            issues.append("来源材料或称量单相对上一版报告已变更，结论需复核")

    reasons = list(dict.fromkeys(reasons))

    if not reasons:
        return RetestSuggestion(
            need_retest=False,
            reasons=[],
            description="温控、浓度、溯源均符合要求，结论与条件一致。",
            priority="low",
        )

    desc_parts = []
    if RetestReason.TEMP_OUT_OF_RANGE in reasons:
        desc_parts.append("温控数据存在异常")
    if RetestReason.CONCENTRATION_ANOMALY in reasons:
        desc_parts.append("浓度数据异常或缺失")
    if RetestReason.MISSING_WEIGHING_RECORD in reasons:
        desc_parts.append("称量单不完整")
    if RetestReason.CONDITION_CONCLUSION_MISMATCH in reasons:
        desc_parts.append("反应条件与结论不一致")
    if RetestReason.SOURCE_MATERIAL_CHANGED in reasons:
        desc_parts.append("来源材料发生变更")

    priority = "high" if len(reasons) >= 2 else "normal"

    return RetestSuggestion(
        need_retest=True,
        reasons=reasons,
        description="；".join(desc_parts) + "，建议药化研究员复核并决定是否复测。"
        + (" 具体问题: " + "；".join(issues) if issues else ""),
        priority=priority,
    )


def _material_changed(prev: BatchReport, curr: BatchReport) -> bool:
    """判断来源材料或称量单是否发生变更."""
    if set(prev.source_material_ids) != set(curr.source_material_ids):
        return True
    if set(prev.weighing_record_ids) != set(curr.weighing_record_ids):
        return True
    return False


def determine_conclusion_status(
    retest: RetestSuggestion,
    consistency: ConsistencyStatus,
    missing_inputs: List[str],
) -> ConclusionStatus:
    """
    根据复测建议、一致性、缺失输入，判定质检主管拿到的结果属于
    "可直接用" 还是 "需找药化研究员复核"。
    """
    if missing_inputs:
        return ConclusionStatus.NEEDS_REVIEW
    if retest.need_retest:
        return ConclusionStatus.NEEDS_REVIEW
    if consistency != ConsistencyStatus.CONSISTENT:
        return ConclusionStatus.NEEDS_REVIEW
    return ConclusionStatus.DIRECT_USE
