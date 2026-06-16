from __future__ import annotations

from typing import List, Tuple, Dict

from .models import NoisePoint


class AnomalyDetector:
    def __init__(
        self,
        over_limit_threshold: float = 0.0,
        sudden_change_db: float = 5.0,
        zero_impact_range: bool = True,
    ):
        self.over_limit_threshold = over_limit_threshold
        self.sudden_change_db = sudden_change_db
        self.zero_impact_range = zero_impact_range

    def detect(self, points: List[NoisePoint]) -> List[NoisePoint]:
        for p in points:
            p.anomalies = []
            if p.status.value == "已被取代":
                continue
            self._check_over_limit(p)
            self._check_impact_range(p)
            self._check_coordinates(p)
            self._check_evidence(p)
        self._check_sudden_changes(points)
        return points

    def _check_over_limit(self, point: NoisePoint) -> None:
        if point.noise_level > point.standard_limit + self.over_limit_threshold:
            diff = round(point.noise_level - point.standard_limit, 1)
            point.anomalies.append(f"容量超限{diff}dB")

    def _check_impact_range(self, point: NoisePoint) -> None:
        if self.zero_impact_range and point.impact_range <= 0:
            point.anomalies.append("影响范围为0")
        elif point.noise_level > point.standard_limit and point.impact_range < 10:
            point.anomalies.append("超限但影响范围异常小")

    def _check_coordinates(self, point: NoisePoint) -> None:
        if point.gis_x == 0 or point.gis_y == 0:
            point.anomalies.append("GIS坐标缺失")

    def _check_evidence(self, point: NoisePoint) -> None:
        if point.is_over_limit() and not point.evidence_notes.strip():
            point.anomalies.append("超限无证据说明")

    def _check_sudden_changes(self, points: List[NoisePoint]) -> None:
        point_groups: Dict[str, List[NoisePoint]] = {}
        for p in points:
            if p.status.value == "已被取代":
                continue
            if p.point_id not in point_groups:
                point_groups[p.point_id] = []
            point_groups[p.point_id].append(p)

        for point_id, group in point_groups.items():
            if len(group) < 2:
                continue
            sorted_group = sorted(group, key=lambda x: x.version)
            for i in range(1, len(sorted_group)):
                prev = sorted_group[i - 1]
                curr = sorted_group[i]
                diff = abs(curr.noise_level - prev.noise_level)
                if diff >= self.sudden_change_db:
                    note = f"数据突变v{prev.version}→v{curr.version} {prev.noise_level}→{curr.noise_level}dB(±{diff}dB)"
                    curr.anomalies.append(note)

    def get_anomaly_summary(self, points: List[NoisePoint]) -> List[Tuple[str, List[NoisePoint]]]:
        anomaly_map: Dict[str, List[NoisePoint]] = {}
        active_points = [p for p in points if p.status.value != "已被取代"]
        for p in active_points:
            for anomaly in p.anomalies:
                if anomaly not in anomaly_map:
                    anomaly_map[anomaly] = []
                anomaly_map[anomaly].append(p)
        return sorted(anomaly_map.items(), key=lambda x: len(x[1]), reverse=True)

    def trace_anomaly_source(self, point: NoisePoint) -> str:
        return (
            f"[{point.name}] 异常: {', '.join(point.anomalies)}\n"
            f"  ↳ 来源: {point.source.source_file}:{point.source.source_row}\n"
            f"  ↳ 备注: {point.source.source_note or '(无)'}\n"
            f"  ↳ 影响范围: {point.impact_range}m | 噪声值: {point.noise_level}dB / 限值: {point.standard_limit}dB\n"
            f"  ↳ 证据: {point.evidence_notes or '(无)'}\n"
            f"  ↳ 状态: {point.status.value} | 版本: v{point.version}\n"
            f"  ↳ 坐标: ({point.gis_x}, {point.gis_y})"
        )
