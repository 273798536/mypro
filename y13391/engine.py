from __future__ import annotations

import csv
import io
import math
from pathlib import Path
from typing import Any

from models import (
    BadDataPointer,
    DataQuality,
    FeatureRecord,
    FeatureSource,
    SkewedSample,
    VersionSnapshot,
)

LATE_KEYWORDS = {"迟到", "延迟", "缺失", "未到位", "pending", "late", "missing"}


def _parse_numeric(value: Any) -> float | None:
    if value is None or (isinstance(value, str) and value.strip() == ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _detect_quality(value: Any, boundary_low: float | None, boundary_high: float | None) -> DataQuality:
    if value is None or (isinstance(value, str) and value.strip() == ""):
        return DataQuality.MISSING
    num = _parse_numeric(value)
    if num is None:
        return DataQuality.INVALID
    if boundary_low is not None and num < boundary_low:
        return DataQuality.OUTLIER
    if boundary_high is not None and num > boundary_high:
        return DataQuality.OUTLIER
    return DataQuality.CLEAN


def _detect_late(value: Any, raw_text: str = "") -> str:
    if isinstance(value, str) and any(kw in value.lower() for kw in LATE_KEYWORDS):
        return value
    if raw_text and any(kw in raw_text.lower() for kw in LATE_KEYWORDS):
        return raw_text
    return ""


def load_feature_csv(
    filepath: str | Path,
    source_task: str = "",
    boundary_overrides: dict[str, tuple[float | None, float | None]] | None = None,
    formula_overrides: dict[str, str] | None = None,
    unit_overrides: dict[str, str] | None = None,
    screenshot_notes: dict[str, str] | None = None,
) -> list[FeatureRecord]:
    boundary_overrides = boundary_overrides or {}
    formula_overrides = formula_overrides or {}
    unit_overrides = unit_overrides or {}
    screenshot_notes = screenshot_notes or {}

    path = Path(filepath)
    records: list[FeatureRecord] = []

    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row_idx, row in enumerate(reader, start=2):
            feature_name = row.get("feature_name", row.get("特征名", "")).strip()
            if not feature_name:
                continue

            raw_value = row.get("value", row.get("值", ""))
            unit = row.get("unit", row.get("单位", unit_overrides.get(feature_name, "")))
            formula = row.get("formula", row.get("公式", formula_overrides.get(feature_name, "")))
            bl_raw = row.get("boundary_low", row.get("下界", ""))
            bh_raw = row.get("boundary_high", row.get("上界", ""))

            bl = _parse_numeric(bl_raw) if bl_raw else boundary_overrides.get(feature_name, (None, None))[0]
            bh = _parse_numeric(bh_raw) if bh_raw else boundary_overrides.get(feature_name, (None, None))[1]

            quality = _detect_quality(raw_value, bl, bh)
            late_reason = _detect_late(raw_value, row.get("status", row.get("状态", "")))

            if late_reason:
                quality = DataQuality.LATE

            source = FeatureSource(
                original_row=row_idx,
                original_file=str(filepath),
                raw_value=raw_value,
                column_name=list(row.keys())[0] if row else "",
                source_task=source_task,
            )

            record = FeatureRecord(
                feature_name=feature_name,
                value=raw_value,
                unit=unit.strip() if isinstance(unit, str) else unit,
                formula=formula.strip() if isinstance(formula, str) else formula,
                boundary_low=bl,
                boundary_high=bh,
                quality=quality,
                source=source,
                late_reason=late_reason,
                screenshot_note=screenshot_notes.get(feature_name, ""),
            )
            records.append(record)

    return records


def build_snapshot(
    version: str,
    client_name: str,
    snapshot_time: str,
    feature_sources: list[tuple[str, str]],
    boundary_overrides: dict[str, tuple[float | None, float | None]] | None = None,
    formula_overrides: dict[str, str] | None = None,
    unit_overrides: dict[str, str] | None = None,
    screenshot_notes: dict[str, str] | None = None,
) -> VersionSnapshot:
    all_features: list[FeatureRecord] = []
    for filepath, task_name in feature_sources:
        features = load_feature_csv(
            filepath,
            source_task=task_name,
            boundary_overrides=boundary_overrides,
            formula_overrides=formula_overrides,
            unit_overrides=unit_overrides,
            screenshot_notes=screenshot_notes,
        )
        all_features.extend(features)

    snapshot = VersionSnapshot(
        version=version,
        client_name=client_name,
        snapshot_time=snapshot_time,
        features=all_features,
    )

    _find_skewed_samples(snapshot)
    _find_bad_data_pointers(snapshot)

    return snapshot


def _find_skewed_samples(snapshot: VersionSnapshot) -> None:
    for feat in snapshot.features:
        if feat.quality == DataQuality.CLEAN:
            continue
        if feat.source is None:
            continue
        num_val = _parse_numeric(feat.source.raw_value)
        if num_val is None:
            continue

        expected_range = ""
        if feat.boundary_low is not None and feat.boundary_high is not None:
            expected_range = f"[{feat.boundary_low}, {feat.boundary_high}]"
        elif feat.boundary_low is not None:
            expected_range = f"[{feat.boundary_low}, +∞)"
        elif feat.boundary_high is not None:
            expected_range = f"(-∞, {feat.boundary_high}]"

        if not expected_range:
            continue

        distance = 0.0
        if feat.boundary_low is not None and num_val < feat.boundary_low:
            distance = feat.boundary_low - num_val
        elif feat.boundary_high is not None and num_val > feat.boundary_high:
            distance = num_val - feat.boundary_high

        magnitude = max(abs(feat.boundary_low or 0), abs(feat.boundary_high or 1))
        contribution_score = distance / magnitude if magnitude > 0 else distance

        sample = SkewedSample(
            sample_id=f"row_{feat.source.original_row}",
            feature_name=feat.feature_name,
            sample_value=feat.source.raw_value,
            expected_range=expected_range,
            contribution_score=round(contribution_score, 4),
            source=feat.source,
        )
        snapshot.skewed_samples.append(sample)

    snapshot.skewed_samples.sort(key=lambda s: s.contribution_score, reverse=True)


def _find_bad_data_pointers(snapshot: VersionSnapshot) -> None:
    for feat in snapshot.features:
        if feat.quality == DataQuality.CLEAN:
            continue
        if feat.source is None:
            continue

        issue_map = {
            DataQuality.MISSING: "值为空/缺失",
            DataQuality.OUTLIER: "越界",
            DataQuality.LATE: f"特征迟到: {feat.late_reason}",
            DataQuality.INVALID: "值非数值且非空",
        }

        pointer = BadDataPointer(
            original_row=feat.source.original_row,
            original_file=feat.source.original_file,
            column_name=feat.source.column_name,
            raw_value=feat.source.raw_value,
            issue=issue_map.get(feat.quality, "未知问题"),
            feature_name=feat.feature_name,
        )
        snapshot.bad_data_pointers.append(pointer)


def merge_snapshots(snapshots: list[VersionSnapshot]) -> VersionSnapshot:
    if not snapshots:
        raise ValueError("至少需要一个快照")
    primary = snapshots[0]
    for other in snapshots[1:]:
        primary.features.extend(other.features)
        primary.skewed_samples.extend(other.skewed_samples)
        primary.bad_data_pointers.extend(other.bad_data_pointers)

    primary.skewed_samples.sort(key=lambda s: s.contribution_score, reverse=True)
    return primary
