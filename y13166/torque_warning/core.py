import statistics
from typing import List, Tuple, Dict, Optional

from .models import (
    EquipmentNameplate,
    LateAttachment,
    SupplementaryNote,
    TorqueReading,
    ProcessedRecord,
    WarningLevel,
    MaterialStatus,
    RunConfig,
    TorqueDirection,
    ConfirmationRequest,
)


UNITS_REF = {
    "扭矩": "N·m (牛顿·米)",
    "转速": "rpm (转/分钟)",
    "温度": "°C (摄氏度)",
    "阈值": "% (额定扭矩百分比)",
    "时间": "ISO 8601",
}


FORMULAS = {
    "torque_ratio": "扭矩比 = 当前扭矩 / 额定扭矩 × 100%",
    "warning_threshold": "预警阈值 = 额定扭矩 × (基础预警% + 参数调整%)",
    "critical_threshold": "严重阈值 = 额定扭矩 × (基础严重% + 参数调整%)",
    "extreme_detection": "极端值识别: 超出 Q3 + 1.5×IQR 或低于 Q1 - 1.5×IQR",
    "peak_hold": "峰值保留: 取扭矩序列最大值而非平均值,避免风险被均值掩盖",
}


def _iqr_extremes(values: List[float]) -> List[int]:
    if len(values) < 4:
        return []
    sorted_v = sorted(values)
    n = len(sorted_v)
    q1 = sorted_v[n // 4]
    q3 = sorted_v[(3 * n) // 4]
    iqr = q3 - q1
    upper = q3 + 1.5 * iqr
    lower = q1 - 1.5 * iqr
    idxs = []
    for i, v in enumerate(values):
        if v > upper or v < lower:
            idxs.append(i)
    return idxs


def _check_direction(readings: List[TorqueReading]) -> Tuple[bool, str]:
    directions = {r.direction for r in readings if r.direction != TorqueDirection.UNKNOWN}
    if TorqueDirection.CLOCKWISE in directions and TorqueDirection.COUNTERCLOCKWISE in directions:
        return True, "同一设备读数出现双向(正/反)方向,存在方向符号写反风险"
    if len(directions) == 0:
        return True, "全部读数方向字段为空/UNKNOWN,存在方向漏填风险"
    return False, ""


def _merge_readings(
    base: List[TorqueReading],
    attachments: List[LateAttachment],
) -> List[TorqueReading]:
    merged = list(base) if base else []
    for att in attachments:
        merged.extend(att.readings)
    merged.sort(key=lambda r: r.timestamp)
    return merged


def _mark_boundary_samples(
    readings: List[TorqueReading],
    warn_nm: float,
    crit_nm: float,
) -> List[TorqueReading]:
    for r in readings:
        if abs(r.value_nm - warn_nm) / warn_nm <= 0.02:
            r.is_boundary = True
            r.boundary_reason = f"读数({r.value_nm:.1f}N·m)接近预警阈值({warn_nm:.1f}N·m),±2%边界区"
        elif abs(r.value_nm - crit_nm) / crit_nm <= 0.02:
            r.is_boundary = True
            r.boundary_reason = f"读数({r.value_nm:.1f}N·m)接近严重阈值({crit_nm:.1f}N·m),±2%边界区"
    return readings


def process_equipment(
    nameplate: EquipmentNameplate,
    base_readings: List[TorqueReading],
    attachments: List[LateAttachment],
    notes: List[SupplementaryNote],
    config: RunConfig,
) -> Tuple[ProcessedRecord, Optional[ConfirmationRequest]]:
    eid = nameplate.equipment_id
    merged = _merge_readings(base_readings, attachments)

    override_applied = False
    override_note = ""
    warn_pct = nameplate.warning_threshold_pct + config.threshold_adjustment_pct
    crit_pct = nameplate.critical_threshold_pct + config.threshold_adjustment_pct

    override_note_list = [n for n in notes if n.overrides_threshold and n.override_threshold_pct is not None]
    if override_note_list:
        latest_note = max(override_note_list, key=lambda n: n.created_at)
        warn_pct = latest_note.override_threshold_pct
        override_applied = True
        override_note = f"人工改判: {latest_note.author}@{latest_note.created_at} → 预警阈值调至 {warn_pct}%"

    warn_nm = nameplate.rated_torque_nm * warn_pct / 100.0
    crit_nm = nameplate.rated_torque_nm * crit_pct / 100.0

    if merged:
        _mark_boundary_samples(merged, warn_nm, crit_nm)

    direction_issue, direction_desc = _check_direction(merged) if merged else (False, "")

    values = [r.value_nm for r in merged]
    extreme_idx = _iqr_extremes(values) if values else []
    extreme_readings = [merged[i] for i in extreme_idx]

    boundary_readings = [r for r in merged if r.is_boundary]

    peak_nm = max(values) if values else 0.0
    peak_rpm = 0.0
    for r in merged:
        if r.value_nm == peak_nm:
            peak_rpm = r.rpm
            break

    peak_ratio = (peak_nm / nameplate.rated_torque_nm * 100.0) if nameplate.rated_torque_nm > 0 else 0.0
    if peak_ratio >= crit_pct:
        level = WarningLevel.CRITICAL
    elif peak_ratio >= warn_pct:
        level = WarningLevel.WARNING
    elif peak_ratio >= warn_pct * 0.85:
        level = WarningLevel.CAUTION
    else:
        level = WarningLevel.NORMAL

    formulas_applied = [
        FORMULAS["peak_hold"],
        FORMULAS["torque_ratio"],
        FORMULAS["warning_threshold"] + f" = {nameplate.rated_torque_nm:.1f} × ({nameplate.warning_threshold_pct:.0f}% + {config.threshold_adjustment_pct:+.0f}%) = {warn_nm:.1f} N·m",
        FORMULAS["critical_threshold"] + f" = {nameplate.rated_torque_nm:.1f} × ({nameplate.critical_threshold_pct:.0f}% + {config.threshold_adjustment_pct:+.0f}%) = {crit_nm:.1f} N·m",
        FORMULAS["extreme_detection"],
    ]

    has_late_attachment = len(attachments) > 0
    notes_without_override = [n for n in notes if not n.overrides_threshold]

    if not merged:
        status = MaterialStatus.PENDING_SUPPLEMENT
        status_note = "缺少扭矩读数数据,待补充"
    elif has_late_attachment and any("待补" in att.content_summary for att in attachments):
        status = MaterialStatus.PENDING_SUPPLEMENT
        status_note = "晚到附件标注仍需补充材料"
    elif override_applied:
        status = MaterialStatus.MANUAL_OVERRIDE
        status_note = override_note
    else:
        status = MaterialStatus.PROCESSED
        status_note = "材料齐全,处理完成"

    record = ProcessedRecord(
        equipment_id=eid,
        readings=merged,
        nameplate=nameplate,
        warning_level=level,
        peak_torque_nm=peak_nm,
        peak_torque_rpm=peak_rpm,
        direction_issue=direction_issue,
        direction_issue_desc=direction_desc,
        boundary_samples=boundary_readings,
        extreme_values=extreme_readings,
        status=status,
        status_note=status_note,
        formulas_applied=formulas_applied,
        units_ref=UNITS_REF,
        override_applied=override_applied,
        override_note=override_note,
    )

    confirm = None
    if direction_issue and config.require_confirmation:
        suggest = level
        if level == WarningLevel.NORMAL:
            suggest = WarningLevel.CAUTION
        confirm = ConfirmationRequest(
            equipment_id=eid,
            reason=direction_desc,
            next_step="请现场老师核对传感器方向接线后,确认是否维持/调整预警等级",
            original_level=level,
            suggested_level=suggest,
            context={
                "readings_count": len(merged),
                "directions_found": list({r.direction.value for r in merged}),
            },
        )

    return record, confirm
