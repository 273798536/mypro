"""报告生成模块"""

import os
import json
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any
from datetime import datetime
from collections import defaultdict

from .midi_parser import ParsedMidi, MidiMetadata
from .velocity_cleaner import (
    VelocityCleaner, CleanedVelocityData,
    VelocityAnomaly, VelocityStatistics
)
from .measure_align import MeasureAlignChecker, AlignmentResult, MeasureMisalignment
from .version_tracker import VersionTracker, VersionCheckResult, VersionMismatch, VersionConflict
from .data_store import FileRelationship, CorrectionHistory, CorrectionRecord


@dataclass
class ReportSection:
    """报告章节"""
    title: str
    type: str
    severity_counts: Dict[str, int]
    total_count: int
    items: List[Dict]


@dataclass
class GenerationReport:
    """生成的报告"""
    report_id: str
    generated_at: str
    session_id: str
    midi_info: Dict
    source_info: Dict
    relationship_info: Dict
    summary: Dict
    sections: List[ReportSection]
    bad_rows: Dict[str, List[Dict]]
    correction_info: Dict
    modification_info: Dict


class ReportGenerator:
    """报告生成器"""

    def __init__(self):
        self.velocity_cleaner = VelocityCleaner()
        self.align_checker = MeasureAlignChecker()
        self.version_tracker = VersionTracker()

    def generate_report(
        self,
        parsed_midi: ParsedMidi,
        cleaned_data: CleanedVelocityData,
        alignment_result: AlignmentResult,
        version_result: Optional[VersionCheckResult],
        session_id: str,
        relationship: FileRelationship,
        correction_history: Optional[CorrectionHistory] = None,
        include_details: bool = True
    ) -> GenerationReport:
        """生成完整报告"""
        now = datetime.now().isoformat()
        report_id = f"RPT_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        midi_info = self._extract_midi_info(parsed_midi.metadata)
        source_info = self._extract_source_info(parsed_midi.metadata)
        relationship_info = self._extract_relationship_info(relationship)

        velocity_spikes = self.velocity_cleaner.get_velocity_spikes(cleaned_data)
        statistical_outliers = self.velocity_cleaner.get_statistical_outliers(cleaned_data)
        bad_rows_categorized = self.velocity_cleaner.get_bad_rows_separate(cleaned_data)

        measure_misalignments = self.align_checker.get_measure_misalignments(alignment_result)
        systematic_misalignments = self.align_checker.get_systematic_misalignments(alignment_result)

        sections: List[ReportSection] = []

        sections.append(self._create_velocity_spikes_section(velocity_spikes, include_details))
        sections.append(self._create_statistical_outliers_section(statistical_outliers, include_details))
        sections.append(self._create_measure_misalignment_section(measure_misalignments, include_details))
        sections.append(self._create_systematic_misalignment_section(systematic_misalignments, include_details))

        if version_result:
            version_mismatches = self.version_tracker.get_version_mismatches(version_result)
            version_conflicts = self.version_tracker.get_version_conflicts(version_result)
            sections.append(self._create_version_mismatch_section(version_mismatches, include_details))
            sections.append(self._create_version_conflict_section(version_conflicts, include_details))

        summary = self._generate_summary(
            parsed_midi, cleaned_data, alignment_result, version_result,
            velocity_spikes, statistical_outliers,
            measure_misalignments, systematic_misalignments,
            bad_rows_categorized, correction_history
        )

        correction_info = self._extract_correction_info(correction_history)
        modification_info = self._extract_modification_info(cleaned_data.statistics, correction_history)

        return GenerationReport(
            report_id=report_id,
            generated_at=now,
            session_id=session_id,
            midi_info=midi_info,
            source_info=source_info,
            relationship_info=relationship_info,
            summary=summary,
            sections=sections,
            bad_rows=bad_rows_categorized,
            correction_info=correction_info,
            modification_info=modification_info
        )

    def _extract_midi_info(self, metadata: MidiMetadata) -> Dict:
        """提取MIDI文件信息"""
        return {
            "file_name": metadata.file_name,
            "file_path": metadata.file_path,
            "file_hash": metadata.file_hash,
            "file_size": metadata.file_size,
            "created_at": metadata.created_at,
            "parsed_at": metadata.parsed_at,
            "total_duration": round(metadata.total_duration, 2),
            "ticks_per_beat": metadata.ticks_per_beat,
            "track_count": len(metadata.track_names),
            "track_names": metadata.track_names,
            "time_signatures": [
                f"{ts.numerator}/{ts.denominator} (at {ts.time:.2f}s)"
                for ts in metadata.time_signatures
            ],
            "tempo_changes": [
                f"{tc.bpm:.0f} BPM (at {tc.time:.2f}s)"
                for tc in metadata.tempo_changes
            ]
        }

    def _extract_source_info(self, metadata: MidiMetadata) -> Dict:
        """提取来源版本信息"""
        return {
            "source_version": metadata.source_version,
            "track_version": metadata.track_version,
            "source_file": metadata.file_path,
            "file_origin": os.path.dirname(metadata.file_path)
        }

    def _extract_relationship_info(self, relationship: FileRelationship) -> Dict:
        """提取文件对应关系信息"""
        return {
            "midi_file": relationship.midi_file,
            "midi_hash": relationship.midi_hash,
            "cleaned_data_file": relationship.cleaned_data_file,
            "velocity_curve_file": relationship.velocity_curve_file,
            "report_json_file": relationship.report_json_file,
            "report_markdown_file": relationship.report_markdown_file,
            "correction_history_file": relationship.correction_history_file,
            "created_at": relationship.created_at,
            "updated_at": relationship.updated_at
        }

    def _create_velocity_spikes_section(
        self,
        anomalies: List[VelocityAnomaly],
        include_details: bool
    ) -> ReportSection:
        """创建力度爆点章节"""
        severity_counts = defaultdict(int)
        for a in anomalies:
            severity_counts[a.severity] += 1

        items = []
        if include_details:
            for a in anomalies:
                items.append({
                    "anomaly_id": a.anomaly_id,
                    "note_id": a.note_id,
                    "type": a.type,
                    "severity": a.severity,
                    "description": a.description,
                    "original_velocity": a.original_velocity,
                    "suggested_velocity": a.suggested_velocity,
                    "corrected_velocity": a.corrected_velocity,
                    "is_manually_corrected": a.is_manually_corrected,
                    "pitch": a.pitch,
                    "measure": a.measure,
                    "beat_position": a.beat_position,
                    "start_time": round(a.start_time, 3),
                    "track": a.track,
                    "channel": a.channel,
                    "context": a.context
                })

        return ReportSection(
            title="力度爆点异常",
            type="velocity_spikes",
            severity_counts=dict(severity_counts),
            total_count=len(anomalies),
            items=items
        )

    def _create_statistical_outliers_section(
        self,
        anomalies: List[VelocityAnomaly],
        include_details: bool
    ) -> ReportSection:
        """创建统计异常章节"""
        severity_counts = defaultdict(int)
        for a in anomalies:
            severity_counts[a.severity] += 1

        items = []
        if include_details:
            for a in anomalies:
                items.append({
                    "anomaly_id": a.anomaly_id,
                    "note_id": a.note_id,
                    "type": a.type,
                    "severity": a.severity,
                    "description": a.description,
                    "original_velocity": a.original_velocity,
                    "suggested_velocity": a.suggested_velocity,
                    "corrected_velocity": a.corrected_velocity,
                    "is_manually_corrected": a.is_manually_corrected,
                    "pitch": a.pitch,
                    "measure": a.measure,
                    "beat_position": a.beat_position,
                    "start_time": round(a.start_time, 3),
                    "track": a.track,
                    "channel": a.channel,
                    "context": a.context
                })

        return ReportSection(
            title="力度统计异常",
            type="statistical_outliers",
            severity_counts=dict(severity_counts),
            total_count=len(anomalies),
            items=items
        )

    def _create_measure_misalignment_section(
        self,
        misalignments: List[MeasureMisalignment],
        include_details: bool
    ) -> ReportSection:
        """创建小节错位章节"""
        severity_counts = defaultdict(int)
        for m in misalignments:
            severity_counts[m.severity] += 1

        items = []
        if include_details:
            for m in misalignments:
                items.append({
                    "anomaly_id": m.anomaly_id,
                    "type": m.type,
                    "severity": m.severity,
                    "description": m.description,
                    "measure": m.measure,
                    "beat_position": round(m.beat_position, 3),
                    "expected_beat": round(m.expected_beat, 3),
                    "deviation": round(m.deviation, 4),
                    "deviation_percent": round(m.deviation_percent, 2),
                    "note_id": m.note_id,
                    "pitch": m.pitch,
                    "start_time": round(m.start_time, 3) if m.start_time else None,
                    "track": m.track,
                    "channel": m.channel,
                    "affected_notes_count": m.affected_notes_count,
                    "context": m.context
                })

        return ReportSection(
            title="小节错位异常",
            type="measure_misalignments",
            severity_counts=dict(severity_counts),
            total_count=len(misalignments),
            items=items
        )

    def _create_systematic_misalignment_section(
        self,
        misalignments: List[MeasureMisalignment],
        include_details: bool
    ) -> ReportSection:
        """创建系统性错位章节"""
        severity_counts = defaultdict(int)
        for m in misalignments:
            severity_counts[m.severity] += 1

        items = []
        if include_details:
            for m in misalignments:
                items.append({
                    "anomaly_id": m.anomaly_id,
                    "type": m.type,
                    "severity": m.severity,
                    "description": m.description,
                    "deviation": round(m.deviation, 4),
                    "deviation_percent": round(m.deviation_percent, 2),
                    "track": m.track,
                    "affected_notes_count": m.affected_notes_count,
                    "context": m.context
                })

        return ReportSection(
            title="系统性轨道错位",
            type="systematic_misalignments",
            severity_counts=dict(severity_counts),
            total_count=len(misalignments),
            items=items
        )

    def _create_version_mismatch_section(
        self,
        mismatches: List[VersionMismatch],
        include_details: bool
    ) -> ReportSection:
        """创建版本不匹配章节"""
        severity_counts = defaultdict(int)
        for m in mismatches:
            severity_counts[m.severity] += 1

        items = []
        if include_details:
            for m in mismatches:
                items.append({
                    "anomaly_id": m.anomaly_id,
                    "type": m.type,
                    "severity": m.severity,
                    "description": m.description,
                    "expected_version": m.expected_version,
                    "actual_version": m.actual_version,
                    "file_name": m.file_name,
                    "file_path": m.file_path,
                    "file_hash": m.file_hash,
                    "context": m.context
                })

        return ReportSection(
            title="版本不匹配",
            type="version_mismatches",
            severity_counts=dict(severity_counts),
            total_count=len(mismatches),
            items=items
        )

    def _create_version_conflict_section(
        self,
        conflicts: List[VersionConflict],
        include_details: bool
    ) -> ReportSection:
        """创建版本混用章节"""
        severity_counts = defaultdict(int)
        for c in conflicts:
            severity_counts[c.severity] += 1

        items = []
        if include_details:
            for c in conflicts:
                items.append({
                    "conflict_id": c.conflict_id,
                    "type": c.type,
                    "severity": c.severity,
                    "description": c.description,
                    "field_name": c.field_name,
                    "source_values": c.source_values,
                    "affected_files": c.affected_files,
                    "context": c.context
                })

        return ReportSection(
            title="版本混用检测",
            type="version_conflicts",
            severity_counts=dict(severity_counts),
            total_count=len(conflicts),
            items=items
        )

    def _generate_summary(
        self,
        parsed_midi: ParsedMidi,
        cleaned_data: CleanedVelocityData,
        alignment_result: AlignmentResult,
        version_result: Optional[VersionCheckResult],
        velocity_spikes: List,
        statistical_outliers: List,
        measure_misalignments: List,
        systematic_misalignments: List,
        bad_rows: Dict[str, List],
        correction_history: Optional[CorrectionHistory]
    ) -> Dict:
        """生成摘要"""
        stats = cleaned_data.statistics
        total_notes = len(cleaned_data.cleaned_notes)
        total_bad_rows = sum(len(rows) for rows in bad_rows.values())

        severity_counts = defaultdict(int)
        for anomaly in cleaned_data.anomalies:
            severity_counts[anomaly.severity] += 1
        for misalignment in alignment_result.misalignments:
            severity_counts[misalignment.severity] += 1
        if version_result:
            for mismatch in version_result.mismatches:
                severity_counts[mismatch.severity] += 1
            for conflict in version_result.conflicts:
                severity_counts[conflict.severity] += 1

        has_manual_corrections = correction_history is not None and len(correction_history.corrections) > 0

        return {
            "total_notes": total_notes,
            "total_bad_rows": total_bad_rows,
            "bad_rows_by_type": {k: len(v) for k, v in bad_rows.items()},
            "velocity_statistics": {
                "mean": stats.mean,
                "median": stats.median,
                "std_dev": stats.std_dev,
                "min": stats.min,
                "max": stats.max,
                "is_manually_modified": stats.is_manually_modified,
                "modified_fields": stats.modified_fields
            },
            "alignment_statistics": {
                "total_measures": alignment_result.statistics.total_measures,
                "aligned_measures": alignment_result.statistics.aligned_measures,
                "misaligned_measures": alignment_result.statistics.misaligned_measures,
                "average_deviation": round(alignment_result.statistics.average_deviation, 4),
                "max_deviation": round(alignment_result.statistics.max_deviation, 4)
            },
            "anomaly_counts": {
                "velocity_spikes": len(velocity_spikes),
                "statistical_outliers": len(statistical_outliers),
                "measure_misalignments": len(measure_misalignments),
                "systematic_misalignments": len(systematic_misalignments),
                "version_mismatches": len(version_result.mismatches) if version_result else 0,
                "version_conflicts": len(version_result.conflicts) if version_result else 0
            },
            "severity_distribution": dict(severity_counts),
            "has_manual_corrections": has_manual_corrections,
            "correction_count": len(correction_history.corrections) if correction_history else 0,
            "overall_risk_level": self._calculate_risk_level(
                severity_counts, total_bad_rows, total_notes
            )
        }

    def _calculate_risk_level(
        self,
        severity_counts: Dict[str, int],
        total_bad_rows: int,
        total_notes: int
    ) -> str:
        """计算风险等级"""
        high_count = severity_counts.get("high", 0)
        medium_count = severity_counts.get("medium", 0)
        low_count = severity_counts.get("low", 0)

        if high_count > 5 or (total_bad_rows > 0 and total_notes > 0 and total_bad_rows / total_notes > 0.1):
            return "high"
        elif high_count > 0 or medium_count > 3:
            return "medium"
        elif medium_count > 0 or low_count > 5:
            return "low"
        else:
            return "none"

    def _extract_correction_info(
        self,
        correction_history: Optional[CorrectionHistory]
    ) -> Dict:
        """提取修正信息"""
        if not correction_history:
            return {
                "has_corrections": False,
                "total_corrections": 0,
                "corrections": []
            }

        return {
            "has_corrections": True,
            "file_hash": correction_history.file_hash,
            "total_corrections": len(correction_history.corrections),
            "created_at": correction_history.created_at,
            "updated_at": correction_history.updated_at,
            "corrections": [
                {
                    "correction_id": c.correction_id,
                    "note_id": c.note_id,
                    "anomaly_id": c.anomaly_id,
                    "old_velocity": c.old_velocity,
                    "new_velocity": c.new_velocity,
                    "velocity_change": c.new_velocity - c.old_velocity,
                    "reason": c.reason,
                    "corrected_by": c.corrected_by,
                    "corrected_at": c.corrected_at,
                    "context": c.context
                }
                for c in correction_history.corrections
            ]
        }

    def _extract_modification_info(
        self,
        statistics: VelocityStatistics,
        correction_history: Optional[CorrectionHistory]
    ) -> Dict:
        """提取人工修改影响信息"""
        if not statistics.is_manually_modified:
            return {
                "is_modified": False,
                "impact_on_statistics": None,
                "modified_fields": []
            }

        impact = {}
        if correction_history and correction_history.corrections:
            old_values = [c.old_velocity for c in correction_history.corrections]
            new_values = [c.new_velocity for c in correction_history.corrections]

            impact = {
                "original_mean": round(sum(old_values) / len(old_values), 2),
                "corrected_mean": round(sum(new_values) / len(new_values), 2),
                "mean_change": round((sum(new_values) / len(new_values)) - (sum(old_values) / len(old_values)), 2),
                "total_change": sum(new_values) - sum(old_values),
                "max_increase": max(n - o for n, o in zip(new_values, old_values)),
                "max_decrease": min(n - o for n, o in zip(new_values, old_values)),
                "affected_note_count": len(correction_history.corrections)
            }

        return {
            "is_modified": True,
            "modified_fields": statistics.modified_fields,
            "impact_on_statistics": impact
        }

    def to_json(self, report: GenerationReport) -> Dict:
        """转换为JSON格式"""
        return {
            "report_id": report.report_id,
            "generated_at": report.generated_at,
            "session_id": report.session_id,
            "midi_info": report.midi_info,
            "source_info": report.source_info,
            "relationship_info": report.relationship_info,
            "summary": report.summary,
            "sections": [
                {
                    "title": s.title,
                    "type": s.type,
                    "severity_counts": s.severity_counts,
                    "total_count": s.total_count,
                    "items": s.items
                }
                for s in report.sections
            ],
            "bad_rows": report.bad_rows,
            "correction_info": report.correction_info,
            "modification_info": report.modification_info
        }

    def to_markdown(self, report: GenerationReport) -> str:
        """转换为Markdown格式"""
        md_lines = []

        md_lines.append(f"# MIDI力度曲线清洗报告")
        md_lines.append("")
        md_lines.append(f"**报告ID**: {report.report_id}")
        md_lines.append(f"**生成时间**: {report.generated_at}")
        md_lines.append(f"**会话ID**: {report.session_id}")
        md_lines.append("")

        md_lines.append("## 一、MIDI文件信息")
        md_lines.append("")
        md_lines.append(f"- **文件名**: {report.midi_info['file_name']}")
        md_lines.append(f"- **文件路径**: {report.midi_info['file_path']}")
        md_lines.append(f"- **文件哈希**: `{report.midi_info['file_hash']}`")
        md_lines.append(f"- **文件大小**: {report.midi_info['file_size']} 字节")
        md_lines.append(f"- **创建时间**: {report.midi_info['created_at']}")
        md_lines.append(f"- **解析时间**: {report.midi_info['parsed_at']}")
        md_lines.append(f"- **总时长**: {report.midi_info['total_duration']} 秒")
        md_lines.append(f"- **节拍分辨率**: {report.midi_info['ticks_per_beat']} ticks/beat")
        md_lines.append(f"- **轨道数**: {report.midi_info['track_count']}")
        md_lines.append("")
        md_lines.append("### 轨道列表")
        md_lines.append("")
        for i, name in enumerate(report.midi_info['track_names']):
            md_lines.append(f"- 轨道 {i}: {name}")
        md_lines.append("")
        md_lines.append("### 拍号变化")
        md_lines.append("")
        for ts in report.midi_info['time_signatures']:
            md_lines.append(f"- {ts}")
        md_lines.append("")
        md_lines.append("### 速度变化")
        md_lines.append("")
        for tc in report.midi_info['tempo_changes']:
            md_lines.append(f"- {tc}")
        md_lines.append("")

        md_lines.append("## 二、来源版本信息")
        md_lines.append("")
        md_lines.append(f"- **来源版本**: `{report.source_info['source_version']}`")
        md_lines.append(f"- **轨道版本**: `{report.source_info['track_version']}`")
        md_lines.append(f"- **来源文件**: {report.source_info['source_file']}")
        md_lines.append(f"- **文件来源目录**: {report.source_info['file_origin']}")
        md_lines.append("")

        md_lines.append("## 三、文件对应关系")
        md_lines.append("")
        md_lines.append(f"- **MIDI原始文件**: {report.relationship_info['midi_file']}")
        md_lines.append(f"- **MIDI文件哈希**: `{report.relationship_info['midi_hash']}`")
        md_lines.append(f"- **清洗后数据文件**: {report.relationship_info['cleaned_data_file']}")
        md_lines.append(f"- **力度曲线数据文件**: {report.relationship_info['velocity_curve_file']}")
        md_lines.append(f"- **报告(JSON)**: {report.relationship_info['report_json_file']}")
        md_lines.append(f"- **报告(Markdown)**: {report.relationship_info['report_markdown_file']}")
        md_lines.append(f"- **修正历史文件**: {report.relationship_info['correction_history_file']}")
        md_lines.append(f"- **关系创建时间**: {report.relationship_info['created_at']}")
        md_lines.append(f"- **关系更新时间**: {report.relationship_info['updated_at']}")
        md_lines.append("")

        md_lines.append("## 四、总览摘要")
        md_lines.append("")
        summary = report.summary
        md_lines.append(f"- **总音符数**: {summary['total_notes']}")
        md_lines.append(f"- **坏行总数**: {summary['total_bad_rows']}")
        if summary['total_bad_rows'] > 0:
            md_lines.append("  - 坏行类型分布:")
            for bad_type, count in summary['bad_rows_by_type'].items():
                md_lines.append(f"    - {bad_type}: {count} 条")
        md_lines.append(f"- **整体风险等级**: **{summary['overall_risk_level'].upper()}**")
        md_lines.append("")

        md_lines.append("### 力度统计")
        md_lines.append("")
        vs = summary['velocity_statistics']
        md_lines.append(f"- **均值**: {vs['mean']}")
        md_lines.append(f"- **中位数**: {vs['median']}")
        md_lines.append(f"- **标准差**: {vs['std_dev']}")
        md_lines.append(f"- **最小值**: {vs['min']}")
        md_lines.append(f"- **最大值**: {vs['max']}")
        md_lines.append(f"- **是否人工修改**: {'是' if vs['is_manually_modified'] else '否'}")
        if vs['is_manually_modified']:
            md_lines.append(f"- **修改字段**: {', '.join(vs['modified_fields'])}")
        md_lines.append("")

        md_lines.append("### 对齐统计")
        md_lines.append("")
        als = summary['alignment_statistics']
        md_lines.append(f"- **总小节数**: {als['total_measures']}")
        md_lines.append(f"- **对齐小节数**: {als['aligned_measures']}")
        md_lines.append(f"- **错位小节数**: {als['misaligned_measures']}")
        md_lines.append(f"- **平均偏差**: {als['average_deviation']} 拍")
        md_lines.append(f"- **最大偏差**: {als['max_deviation']} 拍")
        md_lines.append("")

        md_lines.append("### 异常分布")
        md_lines.append("")
        ac = summary['anomaly_counts']
        md_lines.append(f"- 力度爆点: {ac['velocity_spikes']} 个")
        md_lines.append(f"- 统计异常: {ac['statistical_outliers']} 个")
        md_lines.append(f"- 小节错位: {ac['measure_misalignments']} 个")
        md_lines.append(f"- 系统性错位: {ac['systematic_misalignments']} 个")
        md_lines.append(f"- 版本不匹配: {ac['version_mismatches']} 个")
        md_lines.append(f"- 版本混用: {ac['version_conflicts']} 个")
        md_lines.append("")

        md_lines.append("### 严重程度分布")
        md_lines.append("")
        for severity, count in summary['severity_distribution'].items():
            md_lines.append(f"- **{severity.upper()}**: {count} 个")
        md_lines.append("")

        md_lines.append("### 人工修正信息")
        md_lines.append("")
        md_lines.append(f"- **是否有修正**: {'是' if summary['has_manual_corrections'] else '否'}")
        md_lines.append(f"- **修正次数**: {summary['correction_count']} 次")
        md_lines.append("")

        if report.modification_info['is_modified']:
            md_lines.append("### 人工修改影响")
            md_lines.append("")
            mi = report.modification_info
            md_lines.append(f"- **修改字段**: {', '.join(mi['modified_fields'])}")
            if mi['impact_on_statistics']:
                imp = mi['impact_on_statistics']
                md_lines.append(f"- **修正前均值**: {imp['original_mean']}")
                md_lines.append(f"- **修正后均值**: {imp['corrected_mean']}")
                md_lines.append(f"- **均值变化**: {imp['mean_change']:+}")
                md_lines.append(f"- **总变化量**: {imp['total_change']:+}")
                md_lines.append(f"- **最大增量**: {imp['max_increase']:+}")
                md_lines.append(f"- **最大减量**: {imp['max_decrease']:+}")
                md_lines.append(f"- **影响音符数**: {imp['affected_note_count']}")
            md_lines.append("")

        for section in report.sections:
            if section.total_count == 0:
                continue

            md_lines.append(f"## {section.title}")
            md_lines.append("")
            md_lines.append(f"**总数**: {section.total_count} 个")
            if section.severity_counts:
                md_lines.append("**严重程度分布**:")
                for sev, count in section.severity_counts.items():
                    md_lines.append(f"- {sev.upper()}: {count} 个")
            md_lines.append("")

            if section.items:
                md_lines.append("### 明细列表")
                md_lines.append("")
                for i, item in enumerate(section.items, 1):
                    md_lines.append(f"#### {i}. {item.get('anomaly_id', item.get('conflict_id', 'N/A'))}")
                    md_lines.append("")
                    md_lines.append(f"- **类型**: {item['type']}")
                    md_lines.append(f"- **严重程度**: {item['severity'].upper()}")
                    md_lines.append(f"- **描述**: {item['description']}")

                    if 'measure' in item and item['measure']:
                        md_lines.append(f"- **小节**: 第 {item['measure']} 小节")
                    if 'beat_position' in item:
                        md_lines.append(f"- **拍位**: {item['beat_position']}")
                    if 'expected_beat' in item:
                        md_lines.append(f"- **期望拍位**: {item['expected_beat']}")
                    if 'deviation' in item:
                        md_lines.append(f"- **偏差**: {item['deviation']} 拍 ({item.get('deviation_percent', 0)}%)")

                    if 'original_velocity' in item:
                        md_lines.append(f"- **原始力度**: {item['original_velocity']}")
                    if 'suggested_velocity' in item and item['suggested_velocity'] is not None:
                        md_lines.append(f"- **建议力度**: {item['suggested_velocity']}")
                    if 'corrected_velocity' in item and item['corrected_velocity'] is not None:
                        md_lines.append(f"- **修正后力度**: {item['corrected_velocity']}")
                    if 'is_manually_corrected' in item:
                        md_lines.append(f"- **是否人工修正**: {'是' if item['is_manually_corrected'] else '否'}")

                    if 'pitch' in item and item['pitch'] is not None:
                        md_lines.append(f"- **音高**: {item['pitch']}")
                    if 'track' in item:
                        md_lines.append(f"- **轨道**: {item['track']}")
                    if 'channel' in item:
                        md_lines.append(f"- **通道**: {item['channel']}")
                    if 'start_time' in item and item['start_time'] is not None:
                        md_lines.append(f"- **开始时间**: {item['start_time']}s")

                    if 'expected_version' in item:
                        md_lines.append(f"- **期望版本**: {item['expected_version']}")
                    if 'actual_version' in item:
                        md_lines.append(f"- **实际版本**: {item['actual_version']}")
                    if 'file_name' in item:
                        md_lines.append(f"- **文件名**: {item['file_name']}")

                    if 'field_name' in item:
                        md_lines.append(f"- **字段**: {item['field_name']}")
                    if 'source_values' in item:
                        md_lines.append(f"- **值分布**: {json.dumps(item['source_values'], ensure_ascii=False)}")
                    if 'affected_files' in item:
                        md_lines.append(f"- **影响文件**: {', '.join(item['affected_files'])}")

                    if item.get('context'):
                        md_lines.append(f"- **上下文**: {json.dumps(item['context'], ensure_ascii=False)}")

                    md_lines.append("")

        if report.bad_rows:
            md_lines.append("## 坏行明细（按类型分列）")
            md_lines.append("")
            for bad_type, rows in report.bad_rows.items():
                md_lines.append(f"### {bad_type} ({len(rows)} 条)")
                md_lines.append("")
                for i, row in enumerate(rows, 1):
                    md_lines.append(f"{i}. {row.get('description', '无描述')}")
                    md_lines.append(f"   - 轨道: {row.get('track', 'N/A')}, 通道: {row.get('channel', 'N/A')}")
                    if 'pitch' in row:
                        md_lines.append(f"   - 音高: {row['pitch']}")
                    if 'time' in row:
                        md_lines.append(f"   - 时间: {row['time']:.3f}s")
                    if 'velocity' in row:
                        md_lines.append(f"   - 力度: {row['velocity']}")
                md_lines.append("")

        if report.correction_info['has_corrections']:
            md_lines.append("## 修正历史记录")
            md_lines.append("")
            ci = report.correction_info
            md_lines.append(f"- **总修正次数**: {ci['total_corrections']}")
            md_lines.append(f"- **创建时间**: {ci['created_at']}")
            md_lines.append(f"- **更新时间**: {ci['updated_at']}")
            md_lines.append("")
            md_lines.append("### 修正明细")
            md_lines.append("")
            for i, corr in enumerate(ci['corrections'], 1):
                md_lines.append(f"#### {i}. {corr['correction_id']}")
                md_lines.append("")
                md_lines.append(f"- **音符ID**: {corr['note_id']}")
                if corr['anomaly_id']:
                    md_lines.append(f"- **异常ID**: {corr['anomaly_id']}")
                md_lines.append(f"- **原力度**: {corr['old_velocity']}")
                md_lines.append(f"- **新力度**: {corr['new_velocity']}")
                md_lines.append(f"- **变化量**: {corr['velocity_change']:+}")
                md_lines.append(f"- **修正原因**: {corr['reason']}")
                md_lines.append(f"- **修正人**: {corr['corrected_by']}")
                md_lines.append(f"- **修正时间**: {corr['corrected_at']}")
                if corr['context']:
                    md_lines.append(f"- **上下文**: {json.dumps(corr['context'], ensure_ascii=False)}")
                md_lines.append("")

        md_lines.append("---")
        md_lines.append("")
        md_lines.append("*本报告由MIDI力度曲线清洗系统自动生成*")

        return "\n".join(md_lines)
