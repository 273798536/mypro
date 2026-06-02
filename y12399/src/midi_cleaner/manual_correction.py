"""手动修正模块"""

import json
import copy
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from collections import defaultdict

from .midi_parser import Note, ParsedMidi
from .velocity_cleaner import (
    VelocityCleaner, CleanedVelocityData,
    VelocityAnomaly
)
from .data_store import (
    JsonDataStore, CorrectionRecord, CorrectionHistory,
    CleaningSession, FileRelationship
)


@dataclass
class CorrectionDiff:
    """修正差异对比"""
    note_id: int
    old_velocity: int
    new_velocity: int
    velocity_change: int
    change_percent: float
    is_anomaly: bool
    anomaly_type: Optional[str]
    measure: int
    beat_position: float
    pitch: int


@dataclass
class ComparisonResult:
    """新旧结果对比"""
    total_corrections: int
    total_velocity_change: int
    average_change: float
    original_stats_diff: Dict[str, float]
    cleaned_stats_diff: Dict[str, float]
    diffs: List[CorrectionDiff]


class ManualCorrector:
    """手动修正器"""

    def __init__(self, data_store: JsonDataStore):
        self.data_store = data_store

    def apply_correction(
        self,
        parsed_midi: ParsedMidi,
        cleaned_data: CleanedVelocityData,
        note_id: int,
        new_velocity: int,
        reason: str,
        corrected_by: str,
        anomaly_id: Optional[str] = None,
        context: Optional[Dict] = None
    ) -> Tuple[ParsedMidi, CleanedVelocityData, CorrectionRecord]:
        """应用单个修正"""
        if new_velocity < 0 or new_velocity > 127:
            raise ValueError(f"力度值必须在0-127之间，当前值: {new_velocity}")

        old_velocity = None
        target_note = None
        target_anomaly = None

        for note in parsed_midi.notes:
            if note.note_id == note_id:
                old_velocity = note.velocity
                target_note = note
                break

        if target_note is None:
            raise ValueError(f"未找到音符ID: {note_id}")

        for anomaly in cleaned_data.anomalies:
            if anomaly.note_id == note_id:
                target_anomaly = anomaly
                break

        correction_id = f"COR_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"

        correction = CorrectionRecord(
            correction_id=correction_id,
            note_id=note_id,
            anomaly_id=anomaly_id,
            old_velocity=old_velocity,
            new_velocity=new_velocity,
            reason=reason,
            corrected_by=corrected_by,
            corrected_at=datetime.now().isoformat(),
            context=context or {}
        )

        new_parsed = self._update_parsed_midi(parsed_midi, note_id, new_velocity, reason)
        new_cleaned = self._update_cleaned_data(
            cleaned_data, note_id, new_velocity, correction_id, reason, anomaly_id)

        file_hash = parsed_midi.metadata.file_hash
        self.data_store.add_correction(file_hash, correction)

        return new_parsed, new_cleaned, correction

    def batch_correct(
        self,
        parsed_midi: ParsedMidi,
        cleaned_data: CleanedVelocityData,
        corrections: List[Dict],
        corrected_by: str
    ) -> Tuple[ParsedMidi, CleanedVelocityData, List[CorrectionRecord]]:
        """批量应用修正"""
        records = []
        current_parsed = parsed_midi
        current_cleaned = cleaned_data

        for corr in corrections:
            current_parsed, current_cleaned, record = self.apply_correction(
                current_parsed,
                current_cleaned,
                note_id=corr['note_id'],
                new_velocity=corr['new_velocity'],
                reason=corr.get('reason', '批量修正'),
                corrected_by=corrected_by,
                anomaly_id=corr.get('anomaly_id'),
                context=corr.get('context')
            )
            records.append(record)

        return current_parsed, current_cleaned, records

    def _update_parsed_midi(
        self,
        parsed_midi: ParsedMidi,
        note_id: int,
        new_velocity: int,
        reason: str
    ) -> ParsedMidi:
        """更新ParsedMidi中的音符"""
        new_notes = []
        for note in parsed_midi.notes:
            if note.note_id == note_id:
                new_note = Note(
                    note_id=note.note_id,
                    pitch=note.pitch,
                    velocity=new_velocity,
                    start_time=note.start_time,
                    end_time=note.end_time,
                    duration=note.duration,
                    track=note.track,
                    channel=note.channel,
                    measure=note.measure,
                    beat_position=note.beat_position,
                    is_manually_corrected=True,
                    original_velocity=note.original_velocity if note.original_velocity is not None else note.velocity,
                    correction_reason=reason
                )
                new_notes.append(new_note)
            else:
                new_notes.append(note)

        new_parsed = ParsedMidi(
            metadata=parsed_midi.metadata,
            notes=new_notes,
            bad_rows=list(parsed_midi.bad_rows)
        )

        return new_parsed

    def _update_cleaned_data(
        self,
        cleaned_data: CleanedVelocityData,
        note_id: int,
        new_velocity: int,
        correction_id: str,
        reason: str,
        anomaly_id: Optional[str]
    ) -> CleanedVelocityData:
        """更新CleanedVelocityData"""
        new_notes = []
        for note in cleaned_data.cleaned_notes:
            if note.note_id == note_id:
                new_note = Note(
                    note_id=note.note_id,
                    pitch=note.pitch,
                    velocity=new_velocity,
                    start_time=note.start_time,
                    end_time=note.end_time,
                    duration=note.duration,
                    track=note.track,
                    channel=note.channel,
                    measure=note.measure,
                    beat_position=note.beat_position,
                    is_manually_corrected=True,
                    original_velocity=note.original_velocity if note.original_velocity is not None else note.velocity,
                    correction_reason=reason
                )
                new_notes.append(new_note)
            else:
                new_notes.append(note)

        new_anomalies = []
        for anomaly in cleaned_data.anomalies:
            if anomaly.note_id == note_id:
                new_anomaly = VelocityAnomaly(
                    anomaly_id=anomaly.anomaly_id,
                    note_id=anomaly.note_id,
                    type=anomaly.type,
                    severity=anomaly.severity,
                    description=anomaly.description,
                    original_velocity=anomaly.original_velocity,
                    suggested_velocity=anomaly.suggested_velocity,
                    pitch=anomaly.pitch,
                    start_time=anomaly.start_time,
                    measure=anomaly.measure,
                    beat_position=anomaly.beat_position,
                    track=anomaly.track,
                    channel=anomaly.channel,
                    context=anomaly.context,
                    is_manually_corrected=True,
                    corrected_velocity=new_velocity,
                    correction_reason=reason
                )
                new_anomalies.append(new_anomaly)
            else:
                new_anomalies.append(anomaly)

        new_stats = copy.deepcopy(cleaned_data.statistics)
        new_stats.is_manually_modified = True
        if "velocity" not in new_stats.modified_fields:
            new_stats.modified_fields.append("velocity")

        velocities = [n.velocity for n in new_notes]
        if velocities:
            import statistics
            new_stats.mean = round(statistics.mean(velocities), 2)
            new_stats.median = statistics.median(velocities)
            if len(velocities) > 1:
                new_stats.std_dev = round(statistics.stdev(velocities), 2)
            new_stats.min = min(velocities)
            new_stats.max = max(velocities)

            sorted_v = sorted(velocities)
            n = len(sorted_v)
            new_stats.q1 = sorted_v[int(n * 0.25)]
            new_stats.q3 = sorted_v[int(n * 0.75)]
            new_stats.iqr = new_stats.q3 - new_stats.q1

            from collections import defaultdict
            dist = defaultdict(int)
            for v in velocities:
                dist[v] += 1
            new_stats.distribution = dict(dist)

        return CleanedVelocityData(
            statistics=new_stats,
            anomalies=new_anomalies,
            cleaned_notes=new_notes,
            bad_rows=list(cleaned_data.bad_rows),
            track_statistics=dict(cleaned_data.track_statistics)
        )

    def compare_versions(
        self,
        original_cleaned: CleanedVelocityData,
        modified_cleaned: CleanedVelocityData,
        correction_history: Optional[CorrectionHistory] = None
    ) -> ComparisonResult:
        """对比新旧结果"""
        diffs: List[CorrectionDiff] = []

        original_notes = {n.note_id: n for n in original_cleaned.cleaned_notes}
        modified_notes = {n.note_id: n for n in modified_cleaned.cleaned_notes}

        anomaly_map = defaultdict(list)
        for anomaly in original_cleaned.anomalies:
            anomaly_map[anomaly.note_id].append(anomaly)

        total_change = 0
        corrected_count = 0

        for note_id, orig_note in original_notes.items():
            mod_note = modified_notes.get(note_id)
            if mod_note and orig_note.velocity != mod_note.velocity:
                velocity_change = mod_note.velocity - orig_note.velocity
                change_percent = (velocity_change / orig_note.velocity * 100) if orig_note.velocity != 0 else 0

                anomalies = anomaly_map.get(note_id, [])
                is_anomaly = len(anomalies) > 0
                anomaly_type = anomalies[0].type if anomalies else None

                diffs.append(CorrectionDiff(
                    note_id=note_id,
                    old_velocity=orig_note.velocity,
                    new_velocity=mod_note.velocity,
                    velocity_change=velocity_change,
                    change_percent=round(change_percent, 2),
                    is_anomaly=is_anomaly,
                    anomaly_type=anomaly_type,
                    measure=orig_note.measure,
                    beat_position=orig_note.beat_position,
                    pitch=orig_note.pitch
                ))

                total_change += velocity_change
                corrected_count += 1

        orig_stats = original_cleaned.statistics
        mod_stats = modified_cleaned.statistics

        original_stats_diff = {
            "mean_diff": round(mod_stats.mean - orig_stats.mean, 2),
            "median_diff": mod_stats.median - orig_stats.median,
            "std_dev_diff": round(mod_stats.std_dev - orig_stats.std_dev, 2),
            "min_diff": mod_stats.min - orig_stats.min,
            "max_diff": mod_stats.max - orig_stats.max
        }

        cleaned_stats_diff = {}

        return ComparisonResult(
            total_corrections=corrected_count,
            total_velocity_change=total_change,
            average_change=round(total_change / corrected_count, 2) if corrected_count > 0 else 0,
            original_stats_diff=original_stats_diff,
            cleaned_stats_diff=cleaned_stats_diff,
            diffs=diffs
        )

    def generate_side_by_side_html(
        self,
        comparison: ComparisonResult,
        original_curve: Dict,
        modified_curve: Dict,
        session_id: str
    ) -> str:
        """生成并排对比的HTML数据（用于Web界面）"""
        import json

        html_data = {
            "session_id": session_id,
            "generated_at": datetime.now().isoformat(),
            "comparison": {
                "total_corrections": comparison.total_corrections,
                "total_velocity_change": comparison.total_velocity_change,
                "average_change": comparison.average_change,
                "original_stats_diff": comparison.original_stats_diff,
                "diffs": [asdict(d) for d in comparison.diffs]
            },
            "original_curve": original_curve,
            "modified_curve": modified_curve
        }

        return json.dumps(html_data, ensure_ascii=False, indent=2)

    def generate_comparison_markdown(
        self,
        comparison: ComparisonResult,
        session_id: str
    ) -> str:
        """生成对比报告的Markdown格式"""
        lines = []

        lines.append(f"# 力度曲线修正对比报告")
        lines.append("")
        lines.append(f"**会话ID**: {session_id}")
        lines.append(f"**生成时间**: {datetime.now().isoformat()}")
        lines.append("")

        lines.append("## 修正概览")
        lines.append("")
        lines.append(f"- **总修正数**: {comparison.total_corrections} 个")
        lines.append(f"- **力度总变化量**: {comparison.total_velocity_change:+}")
        lines.append(f"- **平均变化量**: {comparison.average_change:+}")
        lines.append("")

        lines.append("## 统计数据变化")
        lines.append("")
        lines.append("| 统计项 | 变化量 |")
        lines.append("|--------|--------|")
        for stat_name, diff in comparison.original_stats_diff.items():
            lines.append(f"| {stat_name} | {diff:+} |")
        lines.append("")

        lines.append("## 修正明细")
        lines.append("")
        lines.append("| 音符ID | 小节 | 拍位 | 音高 | 原力度 | 新力度 | 变化 | 变化% | 是否异常 | 异常类型 |")
        lines.append("|--------|------|------|------|--------|--------|------|-------|----------|----------|")

        for diff in comparison.diffs:
            lines.append(
                f"| {diff.note_id} | {diff.measure} | {diff.beat_position} | {diff.pitch} | {diff.old_velocity} | {diff.new_velocity} | {diff.velocity_change:+} | {diff.change_percent:+}% | {'是' if diff.is_anomaly else '否'} | {diff.anomaly_type or '-'} |"
            )

        return "\n".join(lines)

    def reset_corrections(
        self,
        parsed_midi: ParsedMidi,
        cleaned_data: CleanedVelocityData,
        note_ids: Optional[List[int]] = None
    ) -> Tuple[ParsedMidi, CleanedVelocityData]:
        """重置修正（恢复原始值）"""
        if note_ids is None:
            note_ids = [n.note_id for n in parsed_midi.notes if n.is_manually_corrected]

        new_notes = []
        for note in parsed_midi.notes:
            if note.note_id in note_ids and note.original_velocity is not None:
                new_note = Note(
                    note_id=note.note_id,
                    pitch=note.pitch,
                    velocity=note.original_velocity,
                    start_time=note.start_time,
                    end_time=note.end_time,
                    duration=note.duration,
                    track=note.track,
                    channel=note.channel,
                    measure=note.measure,
                    beat_position=note.beat_position,
                    is_manually_corrected=False,
                    original_velocity=None,
                    correction_reason=None
                )
                new_notes.append(new_note)
            else:
                new_notes.append(note)

        new_parsed = ParsedMidi(
            metadata=parsed_midi.metadata,
            notes=new_notes,
            bad_rows=list(parsed_midi.bad_rows)
        )

        new_cleaned_notes = []
        for note in cleaned_data.cleaned_notes:
            if note.note_id in note_ids and note.original_velocity is not None:
                new_note = Note(
                    note_id=note.note_id,
                    pitch=note.pitch,
                    velocity=note.original_velocity,
                    start_time=note.start_time,
                    end_time=note.end_time,
                    duration=note.duration,
                    track=note.track,
                    channel=note.channel,
                    measure=note.measure,
                    beat_position=note.beat_position,
                    is_manually_corrected=False,
                    original_velocity=None,
                    correction_reason=None
                )
                new_cleaned_notes.append(new_note)
            else:
                new_cleaned_notes.append(note)

        new_anomalies = []
        for anomaly in cleaned_data.anomalies:
            if anomaly.note_id in note_ids:
                new_anomaly = VelocityAnomaly(
                    anomaly_id=anomaly.anomaly_id,
                    note_id=anomaly.note_id,
                    type=anomaly.type,
                    severity=anomaly.severity,
                    description=anomaly.description,
                    original_velocity=anomaly.original_velocity,
                    suggested_velocity=anomaly.suggested_velocity,
                    pitch=anomaly.pitch,
                    start_time=anomaly.start_time,
                    measure=anomaly.measure,
                    beat_position=anomaly.beat_position,
                    track=anomaly.track,
                    channel=anomaly.channel,
                    context=anomaly.context,
                    is_manually_corrected=False,
                    corrected_velocity=None,
                    correction_reason=None
                )
                new_anomalies.append(new_anomaly)
            else:
                new_anomalies.append(anomaly)

        new_cleaned = CleanedVelocityData(
            statistics=cleaned_data.statistics,
            anomalies=new_anomalies,
            cleaned_notes=new_cleaned_notes,
            bad_rows=list(cleaned_data.bad_rows),
            track_statistics=dict(cleaned_data.track_statistics)
        )

        return new_parsed, new_cleaned
