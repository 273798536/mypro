"""误差归因核心算法。

核心关注点：
1. 极端值检测 - 避免极端值被平均后风险不明显
2. 风险等级评估 - 按严重程度分级
3. 误差归因分类 - 初步判断误差来源
4. 保留数字来源线索 - 每一步计算都有迹可循
"""

import math
from typing import List, Dict, Any, Tuple, Optional
from collections import defaultdict

from .models import (
    DeflectionRecord,
    AttributionCategory,
    RiskLevel,
    ProcessStatus,
    AttributionSummary,
)
from .field_mapper import safe_float


def _calc_iqr_bounds(values: List[float]) -> Tuple[float, float, float, float, float]:
    """计算IQR上下界。

    Returns:
        (q1, median, q3, lower_bound, upper_bound)
    """
    if not values:
        return 0, 0, 0, 0, 0
    sorted_vals = sorted(values)
    n = len(sorted_vals)

    def _percentile(p: float) -> float:
        k = (n - 1) * p
        f = int(k)
        c = k - f
        if f + 1 < n:
            return sorted_vals[f] + c * (sorted_vals[f + 1] - sorted_vals[f])
        return sorted_vals[f]

    q1 = _percentile(0.25)
    median = _percentile(0.5)
    q3 = _percentile(0.75)
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    return q1, median, q3, lower_bound, upper_bound


def _calc_zscore(value: float, mean: float, std: float) -> Optional[float]:
    """计算Z-score。"""
    if std == 0:
        return None
    return (value - mean) / std


def compute_deflection_stats(records: List[DeflectionRecord]) -> Dict[str, Any]:
    """计算挠度统计量，用于极端值检测。

    排除采样缺口后计算统计量，避免缺口影响基准。
    """
    valid_records = [r for r in records if not r.is_sampling_gap and r.deflection_ratio is not None]
    if not valid_records:
        return {
            "count": 0,
            "mean": 0,
            "std": 0,
            "q1": 0,
            "median": 0,
            "q3": 0,
            "lower_bound": 0,
            "upper_bound": 0,
            "min": 0,
            "max": 0,
        }

    values = [r.deflection_ratio for r in valid_records if r.deflection_ratio is not None]

    n = len(values)
    mean = sum(values) / n
    variance = sum((v - mean) ** 2 for v in values) / n if n > 0 else 0
    std = math.sqrt(variance)

    q1, median, q3, lower_bound, upper_bound = _calc_iqr_bounds(values)

    return {
        "count": n,
        "mean": mean,
        "std": std,
        "q1": q1,
        "median": median,
        "q3": q3,
        "lower_bound": lower_bound,
        "upper_bound": upper_bound,
        "min": min(values),
        "max": max(values),
    }


def detect_extreme_values(
    records: List[DeflectionRecord],
    stats: Dict[str, Any],
    iqr_k: float = 1.5,
    z_threshold: float = 2.0,
) -> List[DeflectionRecord]:
    """检测极端值。

    同时使用IQR法和Z-score法，任一满足即标记为极端值。
    重点：极端值是风险点，不能被平均掉。
    """
    if stats["count"] < 3:
        return records

    upper = stats["upper_bound"]
    lower = stats["lower_bound"]
    mean = stats["mean"]
    std = stats["std"]

    for record in records:
        if record.is_sampling_gap:
            continue
        if record.deflection_ratio is None:
            continue

        val = record.deflection_ratio
        reasons = []

        if val > upper or val < lower:
            direction = "偏高" if val > upper else "偏低"
            reasons.append(f"IQR法{direction}(上界{upper:.4f}, 下界{lower:.4f})")

        z = _calc_zscore(val, mean, std)
        if z is not None and abs(z) > z_threshold:
            direction = "偏高" if z > 0 else "偏低"
            reasons.append(f"Z-score{direction}(z={z:.2f}, 阈值±{z_threshold})")

        if reasons:
            record.is_extreme = True
            record.extreme_reason = "; ".join(reasons)
            record.status = ProcessStatus.NEED_EVIDENCE
            if not record.status_note:
                record.status_note = "极端值需复核"
        else:
            record.is_extreme = False
            record.extreme_reason = ""

    return records


def assess_risk_level(record: DeflectionRecord, stats: Dict[str, Any]) -> RiskLevel:
    """评估单条记录的风险等级。"""
    if record.is_sampling_gap:
        return RiskLevel.MEDIUM

    if record.deflection_ratio is None:
        return RiskLevel.LOW

    ratio = record.deflection_ratio
    z = _calc_zscore(ratio, stats["mean"], stats["std"]) if stats.get("std") else None

    if record.is_extreme and z is not None and abs(z) > 3:
        return RiskLevel.EXTREME
    if record.is_extreme:
        return RiskLevel.HIGH
    if z is not None and abs(z) > 1.5:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW


def _attribute_by_material(record: DeflectionRecord) -> Tuple[bool, str]:
    """材料因素归因。"""
    material = str(record.material_name).lower()
    keywords = {
        "混凝土": "混凝土强度偏差",
        "concrete": "混凝土强度偏差",
        "钢筋": "钢筋性能偏差",
        "steel": "钢筋性能偏差",
        "预应力": "预应力损失",
        "prestressed": "预应力损失",
    }
    for kw, detail in keywords.items():
        if kw in material:
            return True, detail
    return False, ""


def _attribute_by_construction(record: DeflectionRecord) -> Tuple[bool, str]:
    """施工因素归因。"""
    team = str(record.construction_team).lower()
    raw_str = str(record.raw_data).lower()

    clues = []
    if "养护" in raw_str or "curing" in raw_str:
        clues.append("养护条件")
    if "模板" in raw_str or "formwork" in raw_str:
        clues.append("模板变形")
    if "加载" in raw_str or "load" in raw_str:
        clues.append("加载方式")

    if team and "三" in team:
        clues.append("施工班组差异")

    if clues:
        return True, "、".join(clues)
    return False, ""


def _attribute_by_measurement(record: DeflectionRecord) -> Tuple[bool, str]:
    """测量因素归因。"""
    raw_str = str(record.raw_data).lower()
    clues = []

    if "仪器" in raw_str or "instrument" in raw_str:
        clues.append("仪器精度")
    if "环境" in raw_str or "温度" in raw_str or "temperature" in raw_str:
        clues.append("温湿度影响")
    if "人为" in raw_str or "人工" in raw_str:
        clues.append("人为读数误差")

    if record.is_sampling_gap:
        clues.append("数据质量存疑")

    if clues:
        return True, "、".join(clues)
    return False, ""


def attribute_error(record: DeflectionRecord, stats: Dict[str, Any]) -> Tuple[AttributionCategory, str]:
    """对单条记录进行误差归因。

    采用规则匹配的方式，优先匹配高权重因素。
    返回 (归因分类, 详细说明)。
    """
    if record.is_sampling_gap:
        return AttributionCategory.MEASUREMENT, "采样缺口，数据质量待确认"

    if record.deflection_ratio is None:
        return AttributionCategory.UNKNOWN, "挠度数据缺失"

    matched, detail = _attribute_by_material(record)
    if matched and record.is_extreme:
        return AttributionCategory.MATERIAL, detail

    matched, detail = _attribute_by_construction(record)
    if matched:
        return AttributionCategory.CONSTRUCTION, detail

    matched, detail = _attribute_by_measurement(record)
    if matched:
        return AttributionCategory.MEASUREMENT, detail

    if record.is_extreme:
        return AttributionCategory.UNKNOWN, "极端值，待进一步分析"

    return AttributionCategory.UNKNOWN, "正常范围"


def run_attribution(
    records: List[DeflectionRecord],
    iqr_k: float = 1.5,
    z_threshold: float = 2.0,
) -> Tuple[List[DeflectionRecord], Dict[str, Any]]:
    """运行完整的归因分析流程。

    Returns:
        (处理后的记录列表, 统计信息字典)
    """
    stats = compute_deflection_stats(records)

    records = detect_extreme_values(records, stats, iqr_k, z_threshold)

    for record in records:
        record.risk_level = assess_risk_level(record, stats)
        category, detail = attribute_error(record, stats)
        record.attribution = category
        record.attribution_detail = detail
        if record.status == ProcessStatus.PENDING and not record.is_sampling_gap:
            if record.is_extreme:
                record.status = ProcessStatus.NEED_EVIDENCE
            else:
                record.status = ProcessStatus.PROCESSED

    return records, stats


def build_summary(
    records: List[DeflectionRecord],
    stats: Dict[str, Any],
) -> AttributionSummary:
    """构建汇总信息。"""
    summary = AttributionSummary()
    summary.total_records = len(records)

    status_counts: Dict[str, int] = defaultdict(int)
    for r in records:
        status_counts[r.status.value] += 1
    summary.processed_count = status_counts.get(ProcessStatus.PROCESSED.value, 0)
    summary.pending_count = status_counts.get(ProcessStatus.PENDING.value, 0)
    summary.need_evidence_count = status_counts.get(ProcessStatus.NEED_EVIDENCE.value, 0)
    summary.error_count = status_counts.get(ProcessStatus.ERROR.value, 0)

    summary.extreme_count = sum(1 for r in records if r.is_extreme)
    summary.sampling_gap_count = sum(1 for r in records if r.is_sampling_gap)

    by_category: Dict[str, int] = defaultdict(int)
    for r in records:
        by_category[r.attribution.value] += 1
    summary.by_category = dict(by_category)

    by_risk: Dict[str, int] = defaultdict(int)
    for r in records:
        by_risk[r.risk_level.value] += 1
    summary.by_risk = dict(by_risk)

    valid_ratios = [r.deflection_ratio for r in records if r.deflection_ratio is not None]
    if valid_ratios:
        summary.avg_deflection_ratio = sum(valid_ratios) / len(valid_ratios)
        summary.max_deflection_ratio = max(valid_ratios)

    evidence_todo = []
    for r in records:
        if r.status == ProcessStatus.NEED_EVIDENCE:
            if r.is_sampling_gap:
                evidence_todo.append(f"{r.beam_id}-{r.measure_point}: 采样缺口补测")
            elif r.is_extreme:
                evidence_todo.append(f"{r.beam_id}-{r.measure_point}: 极端值复核{r.extreme_reason}")
            else:
                evidence_todo.append(f"{r.beam_id}-{r.measure_point}: {r.status_note}")
    summary.evidence_todo = evidence_todo

    return summary
