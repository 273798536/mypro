from __future__ import annotations

import math
from typing import Any

from .formulas import BOUNDARIES
from .models import (
    BadDataRef,
    DataQuality,
    RoomData,
    SamplingGap,
)


def _check_boundary(field_name: str, value: float) -> tuple[bool, str]:
    if field_name not in BOUNDARIES:
        return True, ""
    b = BOUNDARIES[field_name]
    v_min, v_max = b["min"], b["max"]
    if math.isnan(value) or math.isinf(value):
        return False, f"值 {value} 无效（NaN/Inf），边界 [{v_min}, {v_max}]"
    if value < v_min or value > v_max:
        return False, f"值 {value:.4f} 超出边界 [{v_min}, {v_max}]"
    return True, ""


def validate_room(room: RoomData) -> list[BadDataRef]:
    bad_refs: list[BadDataRef] = []

    ok, reason = _check_boundary("volume_m3", room.volume_m3)
    if not ok:
        b = BOUNDARIES["volume_m3"]
        bad_refs.append(BadDataRef(
            room_id=room.room_id,
            field_name="volume_m3",
            field_value=room.volume_m3,
            boundary_min=b["min"],
            boundary_max=b["max"],
            source=room.provenance.source.value,
            source_file=room.provenance.source_file,
            original_row=room.original_row,
            reason=reason,
        ))
        room.quality = DataQuality.BAD
        room.quality_reason = reason

    ok, reason = _check_boundary("measured_t60_s", room.measured_t60_s)
    if not ok:
        b = BOUNDARIES["measured_t60_s"]
        bad_refs.append(BadDataRef(
            room_id=room.room_id,
            field_name="measured_t60_s",
            field_value=room.measured_t60_s,
            boundary_min=b["min"],
            boundary_max=b["max"],
            source=room.provenance.source.value,
            source_file=room.provenance.source_file,
            original_row=room.original_row,
            reason=reason,
        ))
        if room.quality != DataQuality.BAD:
            room.quality = DataQuality.SUSPECT
            room.quality_reason = reason

    for surf in room.surfaces:
        ok, reason = _check_boundary("area_m2", surf.area_m2)
        if not ok:
            b = BOUNDARIES["area_m2"]
            bad_refs.append(BadDataRef(
                room_id=room.room_id,
                field_name=f"surfaces.{surf.material_name}.area_m2",
                field_value=surf.area_m2,
                boundary_min=b["min"],
                boundary_max=b["max"],
                source=surf.provenance.source.value,
                source_file=surf.provenance.source_file,
                original_row=surf.original_row,
                reason=reason,
            ))
            surf.quality = DataQuality.BAD
            surf.quality_reason = reason

        ok, reason = _check_boundary("absorption_coeff", surf.absorption_coeff)
        if not ok:
            b = BOUNDARIES["absorption_coeff"]
            bad_refs.append(BadDataRef(
                room_id=room.room_id,
                field_name=f"surfaces.{surf.material_name}.absorption_coeff",
                field_value=surf.absorption_coeff,
                boundary_min=b["min"],
                boundary_max=b["max"],
                source=surf.provenance.source.value,
                source_file=surf.provenance.source_file,
                original_row=surf.original_row,
                reason=reason,
            ))
            surf.quality = DataQuality.BAD
            surf.quality_reason = reason

    if room.volume_m3 > 0:
        total_a = sum(s.absorption_area for s in room.surfaces if s.quality != DataQuality.BAD)
        if total_a <= 0:
            room.quality = DataQuality.BAD
            room.quality_reason = "有效总吸声量为零或负值，无法计算混响时间"

    return bad_refs


def detect_sampling_gaps(rooms: list[RoomData]) -> list[SamplingGap]:
    gaps: list[SamplingGap] = []

    room_ids_seen: set[str] = set()
    for room in rooms:
        if room.room_id in room_ids_seen:
            gaps.append(SamplingGap(
                room_id=room.room_id,
                gap_type="duplicate_room",
                description=f"房间 {room.room_id} 存在重复记录",
                affected_fields=["room_id"],
                severity="warning",
            ))
        room_ids_seen.add(room.room_id)

        missing_fields: list[str] = []
        if room.volume_m3 == 0:
            missing_fields.append("volume_m3")
        if room.measured_t60_s == 0:
            missing_fields.append("measured_t60_s")

        if missing_fields:
            gaps.append(SamplingGap(
                room_id=room.room_id,
                gap_type="missing_field",
                description=f"房间 {room.room_id} 关键字段为零或缺失: {', '.join(missing_fields)}",
                affected_fields=missing_fields,
                severity="error",
            ))

        if not room.surfaces:
            gaps.append(SamplingGap(
                room_id=room.room_id,
                gap_type="no_surfaces",
                description=f"房间 {room.room_id} 无表面数据",
                affected_fields=["surfaces"],
                severity="error",
            ))

        bad_surface_count = sum(1 for s in room.surfaces if s.quality == DataQuality.BAD)
        if bad_surface_count > 0 and bad_surface_count == len(room.surfaces):
            gaps.append(SamplingGap(
                room_id=room.room_id,
                gap_type="all_surfaces_bad",
                description=f"房间 {room.room_id} 所有 {bad_surface_count} 面数据均标记为坏数据",
                affected_fields=["surfaces"],
                severity="error",
            ))

    return gaps


def validate_all(rooms: list[RoomData]) -> tuple[list[BadDataRef], list[SamplingGap]]:
    all_bad_refs: list[BadDataRef] = []
    for room in rooms:
        bad_refs = validate_room(room)
        all_bad_refs.extend(bad_refs)

    gaps = detect_sampling_gaps(rooms)

    return all_bad_refs, gaps
