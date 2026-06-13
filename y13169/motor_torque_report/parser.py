from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional

from .models import (
    BASE_UNIT,
    Direction,
    ExperimentalRecord,
    MAGNITUDE_ORDER,
    UNIT_TO_BASE,
)


def normalize_unit(raw_unit: str) -> str:
    aliases: dict[str, str] = {
        "N·m": "N·m", "Nm": "N·m", "N.m": "N·m", "n·m": "N·m", "nm": "N·m",
        "mN·m": "mN·m", "mNm": "mN·m", "mn·m": "mN·m", "mnm": "mN·m",
        "kN·m": "kN·m", "kNm": "kN·m", "kn·m": "kN·m", "knm": "kN·m",
        "kgf·cm": "kgf·cm", "kgfcm": "kgf·cm",
        "gf·cm": "gf·cm", "gfcm": "gf·cm",
        "ozf·in": "ozf·in", "ozfin": "ozf·in",
        "lbf·ft": "lbf·ft", "lbfft": "lbf·ft",
        "lbf·in": "lbf·in", "lbfin": "lbf·in",
    }
    normalized = aliases.get(raw_unit.strip())
    if normalized is None:
        raise ValueError(f"无法识别的扭矩单位: {raw_unit!r}")
    return normalized


def convert_torque(value: float, from_unit: str, to_unit: str = BASE_UNIT) -> float:
    from_normalized = normalize_unit(from_unit)
    to_normalized = normalize_unit(to_unit)
    base_value = value * UNIT_TO_BASE[from_normalized]
    return base_value / UNIT_TO_BASE[to_normalized]


def detect_unit_magnitude_shift(
    records: list[ExperimentalRecord],
    motor_id: Optional[str] = None,
) -> list[dict]:
    from collections import defaultdict

    grouped: dict[str, list[ExperimentalRecord]] = defaultdict(list)
    for r in records:
        key = r.motor_id if motor_id is None else (r.motor_id if r.motor_id == motor_id else None)
        if key is not None:
            grouped[key].append(r)

    shifts: list[dict] = []
    for mid, recs in grouped.items():
        if len(recs) < 2:
            continue
        units_seen: dict[str, list[str]] = defaultdict(list)
        for r in recs:
            normalized = normalize_unit(r.torque_unit)
            units_seen[normalized].append(r.record_id)

        if len(units_seen) > 1:
            sorted_units = sorted(units_seen.keys(), key=lambda u: MAGNITUDE_ORDER.index(u) if u in MAGNITUDE_ORDER else 99)
            for i in range(len(sorted_units) - 1):
                idx_a = MAGNITUDE_ORDER.index(sorted_units[i]) if sorted_units[i] in MAGNITUDE_ORDER else 99
                idx_b = MAGNITUDE_ORDER.index(sorted_units[i + 1]) if sorted_units[i + 1] in MAGNITUDE_ORDER else 99
                gap = abs(idx_b - idx_a)
                if gap >= 2:
                    shifts.append({
                        "motor_id": mid,
                        "unit_a": sorted_units[i],
                        "unit_b": sorted_units[i + 1],
                        "gap_in_magnitude": gap,
                        "affected_records": units_seen[sorted_units[i]] + units_seen[sorted_units[i + 1]],
                        "description": (
                            f"电机 {mid} 的扭矩记录中存在单位数量级跳跃: "
                            f"{sorted_units[i]} 与 {sorted_units[i + 1]} 相差 {gap} 个数量级"
                        ),
                    })
    return shifts


def parse_record(raw: dict[str, Any]) -> ExperimentalRecord:
    direction = Direction.from_str(str(raw["direction"]))
    torque_unit = normalize_unit(str(raw.get("torque_unit", "N·m")))

    record = ExperimentalRecord(
        record_id=str(raw["record_id"]),
        motor_id=str(raw["motor_id"]),
        test_date=str(raw.get("test_date", "")),
        direction=direction,
        torque_raw=float(raw["torque_raw"]),
        torque_unit=torque_unit,
        rpm=raw.get("rpm"),
        temperature=raw.get("temperature"),
        attachment_file=raw.get("attachment_file"),
        is_late_attachment=bool(raw.get("is_late_attachment", False)),
        operator=raw.get("operator"),
        notes=raw.get("notes"),
    )
    return record


def parse_records_from_list(records: list[dict[str, Any]]) -> list[ExperimentalRecord]:
    return [parse_record(r) for r in records]


def load_records_from_json(path: str | Path) -> list[ExperimentalRecord]:
    p = Path(path)
    with p.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, list):
        return parse_records_from_list(data)
    if isinstance(data, dict) and "records" in data:
        return parse_records_from_list(data["records"])
    raise ValueError(f"JSON 格式不正确: {path}")
