from __future__ import annotations

import math
from copy import deepcopy
from datetime import datetime
from typing import Any, Optional

from .models import (
    BASE_UNIT,
    Anomaly,
    AnomalyType,
    ExperimentalRecord,
    JudgmentAction,
    JudgmentEntry,
    RecalcImpact,
    StatisticResult,
    convert_torque,
)
from .engine import compute_statistics
from .parser import normalize_unit


def recalc_with_parameter_change(
    records: list[ExperimentalRecord],
    parameter_name: str,
    old_value: Any,
    new_value: Any,
    operator: str = "",
    output_unit: str = BASE_UNIT,
    boundary_sigma: float = 1.5,
) -> tuple[list[ExperimentalRecord], list[RecalcImpact], list[StatisticResult], list[StatisticResult], JudgmentEntry]:

    modified = deepcopy(records)

    stats_before = compute_statistics(records, output_unit=output_unit, boundary_sigma=boundary_sigma)

    if parameter_name == "torque_unit":
        target_unit = normalize_unit(str(new_value))
        for r in modified:
            r.torque_raw = convert_torque(r.torque_raw, r.torque_unit, target_unit)
            r.torque_unit = target_unit

    elif parameter_name == "boundary_sigma":
        boundary_sigma = float(new_value)

    elif parameter_name == "direction_correction":
        record_ids_to_fix = new_value if isinstance(new_value, list) else [new_value]
        for r in modified:
            if r.record_id in record_ids_to_fix:
                r.direction = r.direction.opposite()

    elif parameter_name == "torque_override":
        if isinstance(new_value, dict):
            for rid, val in new_value.items():
                for r in modified:
                    if r.record_id == rid:
                        r.torque_raw = float(val)

    stats_after = compute_statistics(modified, output_unit=output_unit, boundary_sigma=boundary_sigma)

    impacts: list[RecalcImpact] = []
    for sb, sa in zip(stats_before, stats_after):
        if sb.direction != sa.direction:
            continue
        delta = abs(sa.mean - sb.mean) / abs(sb.mean) * 100 if sb.mean != 0 else 0.0

        formula = _describe_formula(parameter_name, old_value, new_value, output_unit)
        boundary_changed = sb.boundary_low_ids != sa.boundary_low_ids or sb.boundary_high_ids != sa.boundary_high_ids
        affected_ids = list(set(
            sb.boundary_low_ids + sb.boundary_high_ids +
            sa.boundary_low_ids + sa.boundary_high_ids
        ))

        explanation_parts = []
        if delta > 0:
            explanation_parts.append(
                f"均值由 {sb.mean:.4f} 变为 {sa.mean:.4f} (变化 {delta:+.2f}%)"
            )
        if boundary_changed:
            explanation_parts.append(
                f"边界样本由 {sb.boundary_low_ids + sb.boundary_high_ids} 变为 {sa.boundary_low_ids + sa.boundary_high_ids}"
            )
        if sb.std != sa.std:
            explanation_parts.append(
                f"标准差由 {sb.std:.4f} 变为 {sa.std:.4f}"
            )

        impacts.append(RecalcImpact(
            parameter_name=parameter_name,
            old_value=old_value,
            new_value=new_value,
            formula=formula,
            boundary_records_affected=affected_ids,
            result_before=sb.mean,
            result_after=sa.mean,
            delta_percent=round(delta, 4),
            explanation="；".join(explanation_parts) if explanation_parts else "参数变更未导致统计结果显著变化",
        ))

    judgment = JudgmentEntry(
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        operator=operator,
        action=JudgmentAction.ADJUST_PARAMETER,
        target_record_id="*",
        anomaly_type=None,
        reason=f"参数调档: {parameter_name} 从 {old_value} 变为 {new_value}",
        previous_value=old_value,
        new_value=new_value,
        parameter_name=parameter_name,
        formula_used=_describe_formula(parameter_name, old_value, new_value, output_unit),
    )

    return modified, impacts, stats_before, stats_after, judgment


def _describe_formula(parameter_name: str, old_value: Any, new_value: Any, output_unit: str) -> str:
    if parameter_name == "torque_unit":
        return f"单位换算: {old_value} → {new_value}, 换算因子 = {convert_torque(1.0, str(old_value), str(new_value))}"
    elif parameter_name == "boundary_sigma":
        return f"边界判定: mean ± σ×k, k: {old_value} → {new_value}"
    elif parameter_name == "direction_correction":
        return f"方向修正: 受影响记录 {new_value}, CW ↔ CCW 互换"
    elif parameter_name == "torque_override":
        return f"扭矩覆盖: {new_value}"
    return f"{parameter_name}: {old_value} → {new_value}"
