"""力度曲线清洗核心逻辑"""

import statistics
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Tuple, Optional
from collections import defaultdict

from .midi_parser import Note, ParsedMidi


@dataclass
class VelocityAnomaly:
    """力度异常"""
    anomaly_id: str
    note_id: int
    type: str
    severity: str
    description: str
    original_velocity: int
    suggested_velocity: Optional[int]
    pitch: int
    start_time: float
    measure: int
    beat_position: float
    track: int
    channel: int
    context: Dict = field(default_factory=dict)
    is_manually_corrected: bool = False
    corrected_velocity: Optional[int] = None
    correction_reason: Optional[str] = None


@dataclass
class VelocityStatistics:
    """力度统计数据"""
    mean: float
    median: float
    std_dev: float
    min: int
    max: int
    q1: float
    q3: float
    iqr: float
    count: int
    distribution: Dict[int, int]
    is_manually_modified: bool = False
    modified_fields: List[str] = field(default_factory=list)


@dataclass
class CleanedVelocityData:
    """清洗后的力度数据"""
    statistics: VelocityStatistics
    anomalies: List[VelocityAnomaly]
    cleaned_notes: List[Note]
    bad_rows: List[Dict]
    track_statistics: Dict[int, VelocityStatistics]


class VelocityCleaner:
    """力度曲线清洗器"""

    def __init__(
        self,
        std_dev_threshold: float = 2.5,
        iqr_threshold: float = 1.5,
        min_velocity: int = 1,
        max_velocity: int = 127,
        sudden_change_threshold: int = 40,
        outlier_window_size: int = 5
    ):
        self.std_dev_threshold = std_dev_threshold
        self.iqr_threshold = iqr_threshold
        self.min_velocity = min_velocity
        self.max_velocity = max_velocity
        self.sudden_change_threshold = sudden_change_threshold
        self.outlier_window_size = outlier_window_size

    def clean(self, parsed_midi: ParsedMidi) -> CleanedVelocityData:
        """执行完整的力度清洗流程"""
        notes = parsed_midi.notes
        bad_rows = list(parsed_midi.bad_rows)

        if not notes:
            return CleanedVelocityData(
                statistics=self._create_empty_stats(),
                anomalies=[],
                cleaned_notes=[],
                bad_rows=bad_rows,
                track_statistics={}
            )

        anomalies: List[VelocityAnomaly] = []
        anomaly_id_counter = 0

        global_stats = self._calculate_statistics([n.velocity for n in notes])

        track_notes = defaultdict(list)
        for note in notes:
            track_notes[note.track].append(note)

        track_stats = {}
        for track_idx, t_notes in track_notes.items():
            track_stats[track_idx] = self._calculate_statistics([n.velocity for n in t_notes])

        for note in notes:
            note_anomalies = self._detect_note_anomalies(
                note, notes, global_stats, track_stats[note.track], anomaly_id_counter
            )
            anomalies.extend(note_anomalies)
            anomaly_id_counter += len(note_anomalies)

        sudden_changes = self._detect_sudden_changes(notes, anomaly_id_counter)
        anomalies.extend(sudden_changes)
        anomaly_id_counter += len(sudden_changes)

        local_outliers = self._detect_local_outliers(notes, anomaly_id_counter)
        anomalies.extend(local_outliers)

        for note in notes:
            if note.original_velocity is not None:
                global_stats.is_manually_modified = True
                if "velocity" not in global_stats.modified_fields:
                    global_stats.modified_fields.append("velocity")

        cleaned_notes = self._apply_corrections(notes, anomalies)

        return CleanedVelocityData(
            statistics=global_stats,
            anomalies=anomalies,
            cleaned_notes=cleaned_notes,
            bad_rows=bad_rows,
            track_statistics=track_stats
        )

    def _calculate_statistics(self, velocities: List[int]) -> VelocityStatistics:
        """计算力度统计数据"""
        if not velocities:
            return self._create_empty_stats()

        sorted_velocities = sorted(velocities)
        n = len(sorted_velocities)

        mean = statistics.mean(velocities)
        median = statistics.median(velocities)
        std_dev = statistics.stdev(velocities) if n > 1 else 0.0

        q1_idx = int(n * 0.25)
        q3_idx = int(n * 0.75)
        q1 = sorted_velocities[q1_idx]
        q3 = sorted_velocities[q3_idx]
        iqr = q3 - q1

        distribution: Dict[int, int] = defaultdict(int)
        for v in velocities:
            distribution[v] += 1

        return VelocityStatistics(
            mean=round(mean, 2),
            median=median,
            std_dev=round(std_dev, 2),
            min=min(velocities),
            max=max(velocities),
            q1=q1,
            q3=q3,
            iqr=iqr,
            count=n,
            distribution=dict(distribution)
        )

    def _create_empty_stats(self) -> VelocityStatistics:
        """创建空的统计数据"""
        return VelocityStatistics(
            mean=0.0,
            median=0.0,
            std_dev=0.0,
            min=0,
            max=0,
            q1=0.0,
            q3=0.0,
            iqr=0.0,
            count=0,
            distribution={}
        )

    def _detect_note_anomalies(
        self,
        note: Note,
        all_notes: List[Note],
        global_stats: VelocityStatistics,
        track_stats: VelocityStatistics,
        start_id: int
    ) -> List[VelocityAnomaly]:
        """检测单个音符的力度异常"""
        anomalies = []
        velocity = note.velocity
        anomaly_id = start_id

        if velocity < self.min_velocity or velocity > self.max_velocity:
            suggested = max(self.min_velocity, min(self.max_velocity, velocity))
            anomalies.append(VelocityAnomaly(
                anomaly_id=f"VEL-{anomaly_id:06d}",
                note_id=note.note_id,
                type="out_of_range",
                severity="high",
                description=f"力度值{velocity}超出有效范围[{self.min_velocity}, {self.max_velocity}]",
                original_velocity=velocity,
                suggested_velocity=suggested,
                pitch=note.pitch,
                start_time=note.start_time,
                measure=note.measure,
                beat_position=note.beat_position,
                track=note.track,
                channel=note.channel,
                context={"valid_range": [self.min_velocity, self.max_velocity]}
            ))
            anomaly_id += 1

        if track_stats.std_dev > 0:
            z_score = abs(velocity - track_stats.mean) / track_stats.std_dev
            if z_score > self.std_dev_threshold:
                direction = "偏高" if velocity > track_stats.mean else "偏低"
                anomalies.append(VelocityAnomaly(
                    anomaly_id=f"VEL-{anomaly_id:06d}",
                    note_id=note.note_id,
                    type="z_score_outlier",
                    severity="medium",
                    description=f"力度{velocity}在轨道内{direction}，Z-score={z_score:.2f}（阈值{self.std_dev_threshold}）",
                    original_velocity=velocity,
                    suggested_velocity=int(track_stats.mean),
                    pitch=note.pitch,
                    start_time=note.start_time,
                    measure=note.measure,
                    beat_position=note.beat_position,
                    track=note.track,
                    channel=note.channel,
                    context={
                        "z_score": round(z_score, 2),
                        "track_mean": track_stats.mean,
                        "track_std_dev": track_stats.std_dev,
                        "threshold": self.std_dev_threshold
                    }
                ))
                anomaly_id += 1

        lower_bound = track_stats.q1 - self.iqr_threshold * track_stats.iqr
        upper_bound = track_stats.q3 + self.iqr_threshold * track_stats.iqr
        if velocity < lower_bound or velocity > upper_bound:
            direction = "偏高" if velocity > upper_bound else "偏低"
            anomalies.append(VelocityAnomaly(
                anomaly_id=f"VEL-{anomaly_id:06d}",
                note_id=note.note_id,
                type="iqr_outlier",
                severity="medium",
                description=f"力度{velocity}在轨道内{direction}，超出IQR范围[{lower_bound:.1f}, {upper_bound:.1f}]",
                original_velocity=velocity,
                suggested_velocity=int(track_stats.median),
                pitch=note.pitch,
                start_time=note.start_time,
                measure=note.measure,
                beat_position=note.beat_position,
                track=note.track,
                channel=note.channel,
                context={
                    "iqr": track_stats.iqr,
                    "q1": track_stats.q1,
                    "q3": track_stats.q3,
                    "lower_bound": round(lower_bound, 2),
                    "upper_bound": round(upper_bound, 2)
                }
            ))
            anomaly_id += 1

        return anomalies

    def _detect_sudden_changes(
        self,
        notes: List[Note],
        start_id: int
    ) -> List[VelocityAnomaly]:
        """检测力度突变"""
        anomalies = []
        anomaly_id = start_id

        sorted_notes = sorted(notes, key=lambda n: n.start_time)

        for i in range(1, len(sorted_notes)):
            prev_note = sorted_notes[i - 1]
            curr_note = sorted_notes[i]

            if prev_note.track != curr_note.track:
                continue

            velocity_diff = abs(curr_note.velocity - prev_note.velocity)
            if velocity_diff > self.sudden_change_threshold:
                direction = "突增" if curr_note.velocity > prev_note.velocity else "突降"
                anomalies.append(VelocityAnomaly(
                    anomaly_id=f"VEL-{anomaly_id:06d}",
                    note_id=curr_note.note_id,
                    type="sudden_change",
                    severity="medium",
                    description=f"力度{direction}{velocity_diff}，从{prev_note.velocity}变为{curr_note.velocity}（阈值{self.sudden_change_threshold}）",
                    original_velocity=curr_note.velocity,
                    suggested_velocity=(prev_note.velocity + curr_note.velocity) // 2,
                    pitch=curr_note.pitch,
                    start_time=curr_note.start_time,
                    measure=curr_note.measure,
                    beat_position=curr_note.beat_position,
                    track=curr_note.track,
                    channel=curr_note.channel,
                    context={
                        "previous_velocity": prev_note.velocity,
                        "current_velocity": curr_note.velocity,
                        "difference": velocity_diff,
                        "threshold": self.sudden_change_threshold,
                        "previous_note_id": prev_note.note_id
                    }
                ))
                anomaly_id += 1

        return anomalies

    def _detect_local_outliers(
        self,
        notes: List[Note],
        start_id: int
    ) -> List[VelocityAnomaly]:
        """检测局部异常值（滑动窗口）"""
        anomalies = []
        anomaly_id = start_id

        track_notes = defaultdict(list)
        for note in notes:
            track_notes[note.track].append(note)

        for track_idx, t_notes in track_notes.items():
            sorted_notes = sorted(t_notes, key=lambda n: n.start_time)
            window = self.outlier_window_size

            for i, note in enumerate(sorted_notes):
                start = max(0, i - window // 2)
                end = min(len(sorted_notes), i + window // 2 + 1)
                window_notes = sorted_notes[start:end]

                if len(window_notes) < 3:
                    continue

                window_velocities = [n.velocity for n in window_notes]
                window_mean = statistics.mean(window_velocities)
                window_stdev = statistics.stdev(window_velocities) if len(window_velocities) > 1 else 0

                if window_stdev == 0:
                    continue

                local_z = abs(note.velocity - window_mean) / window_stdev
                if local_z > self.std_dev_threshold * 1.2:
                    direction = "偏高" if note.velocity > window_mean else "偏低"
                    anomalies.append(VelocityAnomaly(
                        anomaly_id=f"VEL-{anomaly_id:06d}",
                        note_id=note.note_id,
                        type="local_outlier",
                        severity="low",
                        description=f"局部力度{direction}，值{note.velocity}，窗口均值{window_mean:.1f}，局部Z-score={local_z:.2f}",
                        original_velocity=note.velocity,
                        suggested_velocity=int(window_mean),
                        pitch=note.pitch,
                        start_time=note.start_time,
                        measure=note.measure,
                        beat_position=note.beat_position,
                        track=note.track,
                        channel=note.channel,
                        context={
                            "local_mean": round(window_mean, 2),
                            "local_std_dev": round(window_stdev, 2),
                            "local_z_score": round(local_z, 2),
                            "window_size": len(window_notes),
                            "window_start": start,
                            "window_end": end
                        }
                    ))
                    anomaly_id += 1

        return anomalies

    def _apply_corrections(
        self,
        notes: List[Note],
        anomalies: List[VelocityAnomaly]
    ) -> List[Note]:
        """应用建议的修正（仅对未手动修正的异常）"""
        corrected_notes = []

        note_anomalies = defaultdict(list)
        for anomaly in anomalies:
            note_anomalies[anomaly.note_id].append(anomaly)

        for note in notes:
            if note.is_manually_corrected:
                corrected_notes.append(note)
                continue

            note_anomaly_list = note_anomalies.get(note.note_id, [])
            if not note_anomaly_list:
                corrected_notes.append(note)
                continue

            highest_severity = None
            suggested_velocity = None
            severity_order = {"high": 3, "medium": 2, "low": 1}

            for anomaly in note_anomaly_list:
                if anomaly.is_manually_corrected:
                    continue
                if (highest_severity is None or
                        severity_order.get(anomaly.severity, 0) > severity_order.get(highest_severity, 0)):
                    highest_severity = anomaly.severity
                    suggested_velocity = anomaly.suggested_velocity

            if suggested_velocity is not None and suggested_velocity != note.velocity:
                corrected_note = Note(
                    note_id=note.note_id,
                    pitch=note.pitch,
                    velocity=suggested_velocity,
                    start_time=note.start_time,
                    end_time=note.end_time,
                    duration=note.duration,
                    track=note.track,
                    channel=note.channel,
                    measure=note.measure,
                    beat_position=note.beat_position,
                    is_manually_corrected=False,
                    original_velocity=note.velocity,
                    correction_reason=f"自动修正: {note_anomaly_list[0].type}"
                )
                corrected_notes.append(corrected_note)
            else:
                corrected_notes.append(note)

        return corrected_notes

    def get_velocity_spikes(self, cleaned_data: CleanedVelocityData) -> List[VelocityAnomaly]:
        """获取所有力度爆点异常（单独列出）"""
        spike_types = {"out_of_range", "sudden_change", "local_outlier"}
        return [a for a in cleaned_data.anomalies if a.type in spike_types]

    def get_statistical_outliers(self, cleaned_data: CleanedVelocityData) -> List[VelocityAnomaly]:
        """获取统计异常（单独列出）"""
        stat_types = {"z_score_outlier", "iqr_outlier"}
        return [a for a in cleaned_data.anomalies if a.type in stat_types]

    def get_bad_rows_separate(self, cleaned_data: CleanedVelocityData) -> Dict[str, List[Dict]]:
        """将坏行按类型分开列出"""
        categorized: Dict[str, List[Dict]] = defaultdict(list)
        for bad_row in cleaned_data.bad_rows:
            row_type = bad_row.get("type", "unknown")
            categorized[row_type].append(bad_row)
        return dict(categorized)

    def to_dict(self, cleaned_data: CleanedVelocityData) -> Dict:
        """转换为字典格式"""
        return {
            "statistics": {
                **asdict(cleaned_data.statistics),
                "distribution": cleaned_data.statistics.distribution
            },
            "anomalies": [asdict(a) for a in cleaned_data.anomalies],
            "cleaned_notes": [asdict(n) for n in cleaned_data.cleaned_notes],
            "bad_rows": cleaned_data.bad_rows,
            "track_statistics": {
                str(track_idx): {
                    **asdict(stats),
                    "distribution": stats.distribution
                }
                for track_idx, stats in cleaned_data.track_statistics.items()
            }
        }
