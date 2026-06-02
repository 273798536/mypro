"""小节错位检测模块"""

import statistics
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Tuple, Optional
from collections import defaultdict

from .midi_parser import ParsedMidi, Note, TimeSignature, TempoChange


@dataclass
class MeasureMisalignment:
    """小节错位异常"""
    anomaly_id: str
    type: str
    severity: str
    description: str
    measure: int
    beat_position: float
    expected_beat: float
    deviation: float
    deviation_percent: float
    track: int
    channel: int
    note_id: Optional[int] = None
    pitch: Optional[int] = None
    start_time: Optional[float] = None
    affected_notes_count: int = 0
    context: Dict = field(default_factory=dict)


@dataclass
class MeasureStatistics:
    """小节统计数据"""
    total_measures: int
    aligned_measures: int
    misaligned_measures: int
    average_deviation: float
    max_deviation: float
    deviation_distribution: Dict[str, int]
    track_alignments: Dict[int, "TrackAlignment"]


@dataclass
class TrackAlignment:
    """轨道对齐数据"""
    track_id: int
    track_name: str
    total_notes: int
    aligned_notes: int
    misaligned_notes: int
    average_deviation: float
    systematic_offset: float
    offset_confidence: float


@dataclass
class AlignmentResult:
    """对齐分析结果"""
    statistics: MeasureStatistics
    misalignments: List[MeasureMisalignment]
    track_alignments: Dict[int, TrackAlignment]


class MeasureAlignChecker:
    """小节对齐检查器"""

    def __init__(
        self,
        deviation_threshold: float = 0.1,
        severe_deviation_threshold: float = 0.3,
        systematic_offset_threshold: float = 0.15,
        snap_points: Optional[List[float]] = None
    ):
        self.deviation_threshold = deviation_threshold
        self.severe_deviation_threshold = severe_deviation_threshold
        self.systematic_offset_threshold = systematic_offset_threshold
        self.snap_points = snap_points or [0.0, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5]

    def check_alignment(self, parsed_midi: ParsedMidi) -> AlignmentResult:
        """检查小节对齐情况"""
        notes = parsed_midi.notes
        if not notes:
            return self._create_empty_result()

        time_sigs = parsed_midi.metadata.time_signatures
        tempo_changes = parsed_midi.metadata.tempo_changes
        track_names = parsed_midi.metadata.track_names

        misalignments: List[MeasureMisalignment] = []
        anomaly_id_counter = 0

        track_notes = defaultdict(list)
        for note in notes:
            track_notes[note.track].append(note)

        track_alignments: Dict[int, TrackAlignment] = {}
        all_deviations = []

        for track_idx, t_notes in track_notes.items():
            track_alignment, track_misalignments, track_deviations = self._analyze_track_alignment(
                track_idx,
                t_notes,
                time_sigs,
                tempo_changes,
                track_names[track_idx] if track_idx < len(track_names) else f"Track {track_idx}",
                anomaly_id_counter
            )
            track_alignments[track_idx] = track_alignment
            misalignments.extend(track_misalignments)
            all_deviations.extend(track_deviations)
            anomaly_id_counter += len(track_misalignments)

        systematic_misalignments = self._detect_systematic_misalignments(
            track_alignments,
            time_sigs,
            anomaly_id_counter
        )
        misalignments.extend(systematic_misalignments)

        total_measures = max((n.measure for n in notes), default=0)
        misaligned_measure_set = set(m.measure for m in misalignments)

        stats = MeasureStatistics(
            total_measures=total_measures,
            aligned_measures=total_measures - len(misaligned_measure_set),
            misaligned_measures=len(misaligned_measure_set),
            average_deviation=statistics.mean(all_deviations) if all_deviations else 0.0,
            max_deviation=max(all_deviations) if all_deviations else 0.0,
            deviation_distribution=self._categorize_deviations(all_deviations),
            track_alignments=track_alignments
        )

        return AlignmentResult(
            statistics=stats,
            misalignments=misalignments,
            track_alignments=track_alignments
        )

    def _analyze_track_alignment(
        self,
        track_idx: int,
        notes: List[Note],
        time_sigs: List[TimeSignature],
        tempo_changes: List[TempoChange],
        track_name: str,
        start_id: int
    ) -> Tuple[TrackAlignment, List[MeasureMisalignment], List[float]]:
        """分析单个轨道的对齐情况"""
        misalignments: List[MeasureMisalignment] = []
        deviations: List[float] = []
        anomaly_id = start_id

        aligned_count = 0
        misaligned_count = 0

        for note in notes:
            expected_beat, deviation = self._calculate_expected_beat(
                note.beat_position,
                self._get_time_sig_for_time(note.start_time, time_sigs)
            )
            deviations.append(deviation)

            if deviation > self.deviation_threshold:
                misaligned_count += 1
                severity = "high" if deviation > self.severe_deviation_threshold else "medium"
                time_sig = self._get_time_sig_for_time(note.start_time, time_sigs)
                beats_per_measure = time_sig.numerator if time_sig else 4
                deviation_percent = (deviation / beats_per_measure) * 100

                misalignments.append(MeasureMisalignment(
                    anomaly_id=f"ALN-{anomaly_id:06d}",
                    type="individual_note",
                    severity=severity,
                    description=f"音符节拍错位，实际位置{note.beat_position:.2f}，期望位置{expected_beat:.2f}，偏差{deviation:.3f}拍（{deviation_percent:.1f}%）",
                    measure=note.measure,
                    beat_position=note.beat_position,
                    expected_beat=expected_beat,
                    deviation=round(deviation, 4),
                    deviation_percent=round(deviation_percent, 2),
                    track=track_idx,
                    channel=note.channel,
                    note_id=note.note_id,
                    pitch=note.pitch,
                    start_time=note.start_time,
                    affected_notes_count=1,
                    context={
                        "time_signature": f"{time_sig.numerator}/{time_sig.denominator}" if time_sig else "4/4",
                        "snap_point": expected_beat
                    }
                ))
                anomaly_id += 1
            else:
                aligned_count += 1

        avg_deviation = statistics.mean(deviations) if deviations else 0.0
        systematic_offset = self._calculate_systematic_offset(deviations)
        offset_confidence = self._calculate_offset_confidence(deviations, systematic_offset)

        track_alignment = TrackAlignment(
            track_id=track_idx,
            track_name=track_name,
            total_notes=len(notes),
            aligned_notes=aligned_count,
            misaligned_notes=misaligned_count,
            average_deviation=round(avg_deviation, 4),
            systematic_offset=round(systematic_offset, 4),
            offset_confidence=round(offset_confidence, 2)
        )

        return track_alignment, misalignments, deviations

    def _calculate_expected_beat(
        self,
        beat_position: float,
        time_sig: Optional[TimeSignature]
    ) -> Tuple[float, float]:
        """计算期望的节拍位置和偏差"""
        beats_per_measure = time_sig.numerator if time_sig else 4

        snap_points = []
        for beat in range(beats_per_measure):
            for frac in [0.0, 0.25, 0.5, 0.75]:
                sp = beat + frac
                if sp < beats_per_measure:
                    snap_points.append(sp)

        if not snap_points:
            snap_points = [float(i) for i in range(beats_per_measure)]

        closest_snap = min(snap_points, key=lambda x: abs(x - beat_position))
        deviation = abs(beat_position - closest_snap)

        return closest_snap, deviation

    def _get_time_sig_for_time(
        self,
        time: float,
        time_sigs: List[TimeSignature]
    ) -> Optional[TimeSignature]:
        """获取指定时间点的拍号"""
        if not time_sigs:
            return None

        current_sig = time_sigs[0]
        for ts in time_sigs:
            if ts.time <= time:
                current_sig = ts
            else:
                break
        return current_sig

    def _calculate_systematic_offset(self, deviations: List[float]) -> float:
        """计算系统性偏移"""
        if not deviations:
            return 0.0

        signed_deviations = []
        for dev in deviations:
            if dev > self.deviation_threshold:
                signed_deviations.append(dev if dev > 0.5 else -dev)

        if not signed_deviations:
            return 0.0

        return statistics.mean(signed_deviations)

    def _calculate_offset_confidence(
        self,
        deviations: List[float],
        offset: float
    ) -> float:
        """计算偏移置信度"""
        if not deviations or offset == 0:
            return 0.0

        deviant_count = sum(1 for d in deviations if d > self.deviation_threshold)
        if deviant_count == 0:
            return 0.0

        consistent_count = sum(
            1 for d in deviations
            if d > self.deviation_threshold and abs(d - abs(offset)) < 0.1
        )

        return consistent_count / deviant_count

    def _detect_systematic_misalignments(
        self,
        track_alignments: Dict[int, TrackAlignment],
        time_sigs: List[TimeSignature],
        start_id: int
    ) -> List[MeasureMisalignment]:
        """检测系统性错位（整轨偏移）"""
        misalignments: List[MeasureMisalignment] = []
        anomaly_id = start_id

        for track_idx, alignment in track_alignments.items():
            if (abs(alignment.systematic_offset) > self.systematic_offset_threshold and
                    alignment.offset_confidence > 0.6):

                direction = "提前" if alignment.systematic_offset < 0 else "滞后"
                severity = "high" if alignment.offset_confidence > 0.8 else "medium"

                time_sig = time_sigs[0] if time_sigs else None
                beats_per_measure = time_sig.numerator if time_sig else 4
                deviation_percent = (abs(alignment.systematic_offset) / beats_per_measure) * 100

                misalignments.append(MeasureMisalignment(
                    anomaly_id=f"ALN-{anomaly_id:06d}",
                    type="systematic_offset",
                    severity=severity,
                    description=f"轨道[{alignment.track_name}]存在系统性{direction}，平均偏移{abs(alignment.systematic_offset):.3f}拍，置信度{alignment.offset_confidence:.0%}",
                    measure=0,
                    beat_position=0.0,
                    expected_beat=0.0,
                    deviation=round(abs(alignment.systematic_offset), 4),
                    deviation_percent=round(deviation_percent, 2),
                    track=track_idx,
                    channel=0,
                    note_id=None,
                    pitch=None,
                    start_time=None,
                    affected_notes_count=alignment.misaligned_notes,
                    context={
                        "track_name": alignment.track_name,
                        "systematic_offset": alignment.systematic_offset,
                        "offset_confidence": alignment.offset_confidence,
                        "direction": direction,
                        "affected_notes": alignment.misaligned_notes
                    }
                ))
                anomaly_id += 1

        return misalignments

    def _categorize_deviations(self, deviations: List[float]) -> Dict[str, int]:
        """将偏差分类统计"""
        categories = {
            "aligned (<0.05)": 0,
            "minor (0.05-0.1)": 0,
            "moderate (0.1-0.2)": 0,
            "significant (0.2-0.3)": 0,
            "severe (>0.3)": 0
        }

        for dev in deviations:
            if dev < 0.05:
                categories["aligned (<0.05)"] += 1
            elif dev < 0.1:
                categories["minor (0.05-0.1)"] += 1
            elif dev < 0.2:
                categories["moderate (0.1-0.2)"] += 1
            elif dev < 0.3:
                categories["significant (0.2-0.3)"] += 1
            else:
                categories["severe (>0.3)"] += 1

        return categories

    def _create_empty_result(self) -> AlignmentResult:
        """创建空的结果"""
        return AlignmentResult(
            statistics=MeasureStatistics(
                total_measures=0,
                aligned_measures=0,
                misaligned_measures=0,
                average_deviation=0.0,
                max_deviation=0.0,
                deviation_distribution={},
                track_alignments={}
            ),
            misalignments=[],
            track_alignments={}
        )

    def get_measure_misalignments(self, result: AlignmentResult) -> List[MeasureMisalignment]:
        """获取小节错位异常（单独列出）"""
        return [m for m in result.misalignments if m.type == "individual_note"]

    def get_systematic_misalignments(self, result: AlignmentResult) -> List[MeasureMisalignment]:
        """获取系统性错位异常（单独列出）"""
        return [m for m in result.misalignments if m.type == "systematic_offset"]

    def to_dict(self, result: AlignmentResult) -> Dict:
        """转换为字典格式"""
        return {
            "statistics": {
                **asdict(result.statistics),
                "track_alignments": {
                    str(k): asdict(v)
                    for k, v in result.statistics.track_alignments.items()
                }
            },
            "misalignments": [asdict(m) for m in result.misalignments],
            "track_alignments": {
                str(k): asdict(v)
                for k, v in result.track_alignments.items()
            }
        }
