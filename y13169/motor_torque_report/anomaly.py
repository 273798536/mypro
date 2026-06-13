from __future__ import annotations

from typing import Optional

from .models import (
    Anomaly,
    AnomalyType,
    Direction,
    ExperimentalRecord,
)


def detect_direction_reversed(
    records: list[ExperimentalRecord],
    torque_positive_means_cw: bool = True,
) -> list[Anomaly]:
    anomalies: list[Anomaly] = []
    for r in records:
        if torque_positive_means_cw:
            expected = Direction.CW if r.torque_raw >= 0 else Direction.CCW
        else:
            expected = Direction.CCW if r.torque_raw >= 0 else Direction.CW

        if r.direction != expected and r.torque_raw != 0:
            anomalies.append(Anomaly(
                anomaly_type=AnomalyType.DIRECTION_REVERSED,
                record_id=r.record_id,
                description=(
                    f"记录 {r.record_id} (电机 {r.motor_id}): 扭矩值 {r.torque_raw} {r.torque_unit} "
                    f"为{'正' if r.torque_raw > 0 else '负'}值，"
                    f"但方向标记为 {r.direction.value}，"
                    f"预期应为 {expected.value}"
                ),
                impact_scope=[r.record_id],
                severity="high",
                suggested_action=(
                    f"确认记录 {r.record_id} 的方向是否写反；"
                    f"如确认写反，修正后需重新计算该电机 {r.motor_id} 的统计指标"
                ),
            ))
    return anomalies


def detect_unit_magnitude_anomalies(
    records: list[ExperimentalRecord],
) -> list[Anomaly]:
    from .parser import detect_unit_magnitude_shift

    shifts = detect_unit_magnitude_shift(records)
    anomalies: list[Anomaly] = []
    for s in shifts:
        anomalies.append(Anomaly(
            anomaly_type=AnomalyType.UNIT_MAGNITUDE_SHIFT,
            record_id=s["affected_records"][0] if s["affected_records"] else "",
            description=s["description"],
            impact_scope=s["affected_records"],
            severity="high",
            suggested_action=(
                f"核查电机 {s['motor_id']} 的 {s['unit_a']} 和 {s['unit_b']} 记录"
                f"是否因单位混写导致数量级错误"
            ),
        ))
    return anomalies


def detect_late_attachment_anomalies(
    records: list[ExperimentalRecord],
) -> list[Anomaly]:
    anomalies: list[Anomaly] = []
    for r in records:
        if r.is_late_attachment:
            anomalies.append(Anomaly(
                anomaly_type=AnomalyType.LATE_ATTACHMENT,
                record_id=r.record_id,
                description=(
                    f"记录 {r.record_id} (电机 {r.motor_id}) 为晚到附件数据，"
                    f"附件: {r.attachment_file or '未指定'}"
                ),
                impact_scope=[r.record_id],
                severity="medium",
                suggested_action=(
                    f"确认晚到附件 {r.attachment_file or ''} 内容是否与已有数据一致，"
                    f"再决定是否纳入统计"
                ),
            ))
        elif r.attachment_file is None and not r.is_late_attachment:
            pass

    missing = [r for r in records if r.attachment_file is None and not r.is_late_attachment]
    for r in missing:
        anomalies.append(Anomaly(
            anomaly_type=AnomalyType.MISSING_ATTACHMENT,
            record_id=r.record_id,
            description=f"记录 {r.record_id} (电机 {r.motor_id}) 缺少附件",
            impact_scope=[r.record_id],
            severity="low",
            suggested_action=f"补充记录 {r.record_id} 的实验附件",
        ))

    return anomalies


def run_all_anomaly_checks(
    records: list[ExperimentalRecord],
    torque_positive_means_cw: bool = True,
) -> list[Anomaly]:
    all_anomalies: list[Anomaly] = []
    all_anomalies.extend(detect_direction_reversed(records, torque_positive_means_cw))
    all_anomalies.extend(detect_unit_magnitude_anomalies(records))
    all_anomalies.extend(detect_late_attachment_anomalies(records))
    return all_anomalies
