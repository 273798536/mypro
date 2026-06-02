from __future__ import annotations

import statistics
from collections import defaultdict
from typing import Optional

from models import (
    AnomalySource,
    DataSource,
    EquipmentInfo,
    FlagType,
    InspectionFlag,
    MaintenanceRecord,
    SampleReviewEntry,
    VibrationSample,
)


class Inspector:
    def __init__(
        self,
        vibration: list[VibrationSample],
        maintenance: list[MaintenanceRecord],
        equipment: list[EquipmentInfo],
    ):
        self.vibration = vibration
        self.maintenance = maintenance
        self.equipment = equipment
        self.flags: list[InspectionFlag] = []
        self._equip_map: dict[str, EquipmentInfo] = {
            e.equipment_id: e for e in equipment
        }

    def run(self) -> list[InspectionFlag]:
        self._check_missing_samples()
        self._check_anomaly_spikes()
        self._check_model_backfill()
        return self.flags

    def get_sample_review(
        self,
        predictions_affected_by_model_backfill: Optional[dict[str, bool]] = None,
    ) -> list[SampleReviewEntry]:
        affected_map = predictions_affected_by_model_backfill or {}
        entries: list[SampleReviewEntry] = []
        for s in self.vibration:
            entries.append(
                SampleReviewEntry(
                    equipment_id=s.equipment_id,
                    sample_timestamp=s.timestamp,
                    original_value=None if s.is_missing_sample else s.value,
                    imputed_value=s.value if s.is_missing_sample else None,
                    was_missing=s.is_missing_sample,
                    anomaly_spike=s.is_anomaly_spike,
                    anomaly_source=s.anomaly_source,
                    affected_by_model_backfill=affected_map.get(
                        s.equipment_id, False,
                    ),
                ),
            )
        return entries

    def _check_missing_samples(self) -> None:
        by_equip: dict[str, list[VibrationSample]] = defaultdict(list)
        for s in self.vibration:
            by_equip[s.equipment_id].append(s)

        for eid, samples in by_equip.items():
            samples_sorted = sorted(samples, key=lambda x: x.timestamp)
            missing = [s for s in samples_sorted if s.is_missing_sample]
            if not missing:
                continue
            for ms in missing:
                source = AnomalySource.ORIGINAL
                if ms.source == DataSource.BACKFILL:
                    source = AnomalySource.BACKFILL
                self.flags.append(
                    InspectionFlag(
                        equipment_id=eid,
                        flag_type=FlagType.MISSING_SAMPLE,
                        source=source,
                        message=(
                            f"缺采样(来源:{'补录' if source == AnomalySource.BACKFILL else '原始材料'}), "
                            f"时刻={ms.timestamp.isoformat()}"
                        ),
                        sample_timestamp=ms.timestamp,
                    ),
                )

            gaps = self._detect_time_gaps(samples_sorted)
            for gap_start, gap_end in gaps:
                self.flags.append(
                    InspectionFlag(
                        equipment_id=eid,
                        flag_type=FlagType.MISSING_SAMPLE,
                        source=AnomalySource.ORIGINAL,
                        message=(
                            f"时间间隔异常: {gap_start.isoformat()} -> "
                            f"{gap_end.isoformat()}"
                        ),
                        sample_timestamp=gap_start,
                    ),
                )

    def _check_anomaly_spikes(self) -> None:
        by_equip: dict[str, list[VibrationSample]] = defaultdict(list)
        for s in self.vibration:
            by_equip[s.equipment_id].append(s)

        for eid, samples in by_equip.items():
            valid = [s for s in samples if not s.is_missing_sample]
            if len(valid) < 3:
                continue
            values = [s.value for s in valid]
            mean = statistics.mean(values)
            std = statistics.stdev(values)
            if std == 0:
                continue
            threshold = mean + 3 * std

            for s in samples:
                is_spike = s.value > threshold or s.is_anomaly_spike
                if is_spike:
                    source = s.anomaly_source
                    if source is None:
                        source = (
                            AnomalySource.BACKFILL
                            if s.source == DataSource.BACKFILL
                            else AnomalySource.ORIGINAL
                        )
                    self.flags.append(
                        InspectionFlag(
                            equipment_id=eid,
                            flag_type=FlagType.ANOMALY_SPIKE,
                            source=source,
                            message=(
                                f"异常尖峰(来源:{'补录' if source == AnomalySource.BACKFILL else '原始材料'}), "
                                f"值={s.value:.2f}, 阈值={threshold:.2f}"
                            ),
                            sample_timestamp=s.timestamp,
                        ),
                    )

    def _check_model_backfill(self) -> None:
        for eq in self.equipment:
            if not eq.model_backfilled:
                continue
            self.flags.append(
                InspectionFlag(
                    equipment_id=eq.equipment_id,
                    flag_type=FlagType.MODEL_BACKFILL,
                    source=AnomalySource.BACKFILL,
                    message=(
                        f"设备型号为补录(型号={eq.model}), "
                        f"补录时间={eq.model_backfill_time.isoformat() if eq.model_backfill_time else '未知'}, "
                        f"影响范围: 该设备所有振动采样与预测明细"
                    ),
                ),
            )

    @staticmethod
    def _detect_time_gaps(
        samples: list[VibrationSample],
    ) -> list[tuple]:
        if len(samples) < 2:
            return []
        intervals: list[float] = []
        for i in range(1, len(samples)):
            delta = (samples[i].timestamp - samples[i - 1].timestamp).total_seconds()
            intervals.append(delta)
        if not intervals:
            return []
        mean_interval = statistics.mean(intervals)
        std_interval = statistics.stdev(intervals) if len(intervals) > 1 else 0
        threshold = mean_interval + 3 * std_interval if std_interval > 0 else mean_interval * 3
        if threshold <= 0:
            return []

        gaps: list[tuple] = []
        for i in range(1, len(samples)):
            delta = (samples[i].timestamp - samples[i - 1].timestamp).total_seconds()
            if delta > threshold:
                gaps.append((samples[i - 1].timestamp, samples[i].timestamp))
        return gaps


def mark_model_backfill_impact(
    equipment: list[EquipmentInfo],
    vibration: list[VibrationSample],
    maintenance: list[MaintenanceRecord],
) -> dict[str, bool]:
    backfilled_ids = {e.equipment_id for e in equipment if e.model_backfilled}
    affected: dict[str, bool] = {}
    for s in vibration:
        if s.equipment_id in backfilled_ids:
            affected[s.equipment_id] = True
    for m in maintenance:
        if m.equipment_id in backfilled_ids:
            affected[m.equipment_id] = True
    return affected
