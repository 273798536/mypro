from __future__ import annotations

import uuid
from typing import Any

import numpy as np

from .material_importer import summarize_material_impact
from .models import (
    BoundarySample,
    Material,
    ParamVersion,
    SitePhoto,
    WarningLevel,
    WarningResult,
)


def _classify_level(value: float, threshold: float) -> WarningLevel:
    ratio = value / threshold if threshold > 0 else 0
    if ratio >= 1.2:
        return WarningLevel.DANGER
    if ratio >= 1.0:
        return WarningLevel.WARNING
    if ratio >= 0.85:
        return WarningLevel.CAUTION
    return WarningLevel.SAFE


def compute_warning(
    photos: list[SitePhoto],
    materials: list[Material],
    params: ParamVersion,
    exclude_flagged_gaps: bool = True,
) -> WarningResult:
    if exclude_flagged_gaps:
        effective_photos = [p for p in photos if not p.has_sampling_gap]
    else:
        effective_photos = list(photos)

    if not effective_photos:
        raise ValueError("没有可用于计算的有效采样照片")

    intensities = np.array([p.speckle_intensity for p in effective_photos], dtype=float)
    average_intensity = float(np.mean(intensities))
    max_intensity = float(np.max(intensities))
    threshold_value = average_intensity * params.threshold_coefficient

    boundary_samples: list[BoundarySample] = []
    for p in effective_photos:
        distance = p.speckle_intensity - threshold_value
        is_crossing = abs(distance) <= threshold_value * 0.08
        note = ""
        if is_crossing:
            if distance >= 0:
                note = f"样本超出阈值 {abs(distance):.2f}{params.intensity_unit}，处于预警临界线上方"
            else:
                note = f"样本低于阈值 {abs(distance):.2f}{params.intensity_unit}，处于预警临界线下方"
        elif p.speckle_intensity == max_intensity:
            note = "本组最高散斑强度样本，决定了预警级别的上限"
        boundary_samples.append(BoundarySample(
            photo_id=p.photo_id,
            position_label=p.position_label,
            speckle_intensity=p.speckle_intensity,
            distance_to_threshold=distance,
            is_crossing=is_crossing,
            note=note,
        ))

    impact = summarize_material_impact(materials)
    contributing: list[dict[str, Any]] = []
    for bucket_name, items in impact.items():
        for item in items:
            item["影响分类"] = bucket_name
            contributing.append(item)

    return WarningResult(
        result_id=f"WR-{uuid.uuid4().hex[:8]}",
        param_version_tag=params.version_tag,
        warning_level=_classify_level(max_intensity, threshold_value),
        threshold_value=round(threshold_value, 4),
        average_intensity=round(average_intensity, 4),
        max_intensity=round(max_intensity, 4),
        formula_used=params.formula_text(),
        intensity_unit=params.intensity_unit,
        boundary_samples=sorted(
            boundary_samples,
            key=lambda b: (not b.is_crossing, -abs(b.distance_to_threshold)),
        ),
        contributing_materials=contributing,
    )


def compare_results(
    previous: WarningResult,
    current: WarningResult,
    previous_params: ParamVersion,
    current_params: ParamVersion,
) -> dict[str, Any]:
    diffs: dict[str, Any] = {
        "参数变化": [],
        "数值变化": {},
        "级别变化": f"{previous.warning_level.value} -> {current.warning_level.value}",
        "变化原因": [],
    }

    if previous_params.threshold_coefficient != current_params.threshold_coefficient:
        diffs["参数变化"].append(
            f"阈值系数: {previous_params.threshold_coefficient} -> {current_params.threshold_coefficient}"
        )
    if previous_params.min_sample_count != current_params.min_sample_count:
        diffs["参数变化"].append(
            f"最小样本数: {previous_params.min_sample_count} -> {current_params.min_sample_count}"
        )
    if previous_params.max_gap_ratio != current_params.max_gap_ratio:
        diffs["参数变化"].append(
            f"最大缺口占比: {previous_params.max_gap_ratio} -> {current_params.max_gap_ratio}"
        )

    diffs["数值变化"] = {
        "阈值": (previous.threshold_value, current.threshold_value),
        "平均强度": (previous.average_intensity, current.average_intensity),
        "最大强度": (previous.max_intensity, current.max_intensity),
    }

    if current.threshold_value != previous.threshold_value:
        diffs["变化原因"].append(
            f"阈值由 {previous.threshold_value:.2f} 调整为 {current.threshold_value:.2f}"
            f"（系数 {previous_params.threshold_coefficient} -> {current_params.threshold_coefficient}）"
        )

    prev_crossing = {b.photo_id for b in previous.boundary_samples if b.is_crossing}
    curr_crossing = {b.photo_id for b in current.boundary_samples if b.is_crossing}
    added = curr_crossing - prev_crossing
    removed = prev_crossing - curr_crossing
    if added:
        diffs["变化原因"].append(f"新增跨越阈值的边界样本: {', '.join(sorted(added))}")
    if removed:
        diffs["变化原因"].append(f"退出跨越阈值的边界样本: {', '.join(sorted(removed))}")

    if current.warning_level != previous.warning_level:
        diffs["变化原因"].append(
            f"预警级别由「{previous.warning_level.value}」变更为「{current.warning_level.value}」"
        )

    if not diffs["变化原因"]:
        diffs["变化原因"].append("结果未发生实质变化")

    return diffs
