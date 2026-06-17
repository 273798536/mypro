from __future__ import annotations

import math
from typing import Any, Optional

from .models import (
    BASE_UNIT,
    Direction,
    ExperimentalRecord,
    FilterCriteria,
    StatisticResult,
)
from .parser import convert_torque


def apply_filter(
    records: list[ExperimentalRecord],
    criteria: FilterCriteria,
) -> list[ExperimentalRecord]:
    result: list[ExperimentalRecord] = []
    for r in records:
        if criteria.motor_ids and r.motor_id not in criteria.motor_ids:
            continue
        if criteria.directions and r.direction not in criteria.directions:
            continue
        if criteria.date_from and r.test_date < criteria.date_from:
            continue
        if criteria.date_to and r.test_date > criteria.date_to:
            continue

        base_val = r.torque_in_base_unit()
        if criteria.torque_min is not None and base_val < criteria.torque_min:
            continue
        if criteria.torque_max is not None and base_val > criteria.torque_max:
            continue

        if not criteria.include_late_attachments and r.is_late_attachment:
            continue

        result.append(r)
    return result


def compute_statistics(
    records: list[ExperimentalRecord],
    output_unit: str = BASE_UNIT,
    boundary_sigma: float = 1.5,
) -> list[StatisticResult]:
    from collections import defaultdict

    grouped: dict[Direction, list[ExperimentalRecord]] = defaultdict(list)
    for r in records:
        grouped[r.direction].append(r)

    stats: list[StatisticResult] = []
    for direction in [Direction.CW, Direction.CCW]:
        recs = grouped.get(direction, [])
        if not recs:
            continue

        values = [convert_torque(r.torque_raw, r.torque_unit, output_unit) for r in recs]
        n = len(values)
        mean = sum(values) / n
        variance = sum((v - mean) ** 2 for v in values) / n if n > 1 else 0.0
        std = math.sqrt(variance)

        low_threshold = mean - boundary_sigma * std
        high_threshold = mean + boundary_sigma * std

        boundary_low_ids = [recs[i].record_id for i, v in enumerate(values) if v < low_threshold]
        boundary_high_ids = [recs[i].record_id for i, v in enumerate(values) if v > high_threshold]

        stats.append(StatisticResult(
            direction=direction,
            count=n,
            mean=round(mean, 6),
            std=round(std, 6),
            min_val=round(min(values), 6),
            max_val=round(max(values), 6),
            unit=output_unit,
            boundary_low_ids=boundary_low_ids,
            boundary_high_ids=boundary_high_ids,
        ))

    return stats


def build_detail_table(
    records: list[ExperimentalRecord],
    output_unit: str = BASE_UNIT,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for r in records:
        converted = convert_torque(r.torque_raw, r.torque_unit, output_unit)
        rows.append({
            "record_id": r.record_id,
            "motor_id": r.motor_id,
            "test_date": r.test_date,
            "direction": r.direction.value,
            "torque_raw": r.torque_raw,
            "torque_unit": r.torque_unit,
            f"torque_{output_unit}": round(converted, 6),
            "rpm": r.rpm,
            "temperature": r.temperature,
            "is_late_attachment": r.is_late_attachment,
            "attachment_file": r.attachment_file,
            "operator": r.operator,
            "notes": r.notes,
        })
    return rows
