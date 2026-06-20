from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from models import (
    InfluenceLevel,
    ManualCorrection,
    MaterialType,
    NoteEntry,
    NoteSource,
    SampleRecord,
    TimelineEntry,
    VersionSnapshot,
)


class TimelineBuilder:
    def __init__(self) -> None:
        self._entries: List[TimelineEntry] = []

    def add_sample(
        self,
        sample: SampleRecord,
        influence: InfluenceLevel = InfluenceLevel.DIRECT,
    ) -> TimelineEntry:
        entry = TimelineEntry(
            entry_id=f"tl_sample_{sample.sample_id}",
            material_type=MaterialType.SAMPLE,
            timestamp=sample.timestamp,
            version_tag=sample.version_tag,
            payload={
                "sample_id": sample.sample_id,
                "fingerprint": sample.fingerprint(),
                "is_bad_data": sample.is_bad_data,
                "bad_data_reason": sample.bad_data_reason,
                "raw_row_index": sample.raw_row_index,
                "source_file": sample.source_file,
            },
            influence_on_conclusion=influence,
            source_description=self._describe_sample(sample),
        )
        self._entries.append(entry)
        return entry

    def add_snapshot(
        self,
        snapshot: VersionSnapshot,
        influence: InfluenceLevel = InfluenceLevel.DIRECT,
    ) -> TimelineEntry:
        entry = TimelineEntry(
            entry_id=f"tl_snap_{snapshot.version_id}",
            material_type=MaterialType.FEATURE_SNAPSHOT,
            timestamp=snapshot.timestamp,
            version_tag=snapshot.version_id,
            payload={
                "version_id": snapshot.version_id,
                "alias": snapshot.alias,
                "resolved_version_id": snapshot.resolved_version_id,
                "is_legacy": snapshot.is_legacy,
                "thresholds": snapshot.thresholds,
            },
            influence_on_conclusion=influence,
            source_description=self._describe_snapshot(snapshot),
        )
        self._entries.append(entry)
        return entry

    def add_threshold(
        self,
        version_tag: str,
        thresholds: Dict[str, float],
        influence: InfluenceLevel = InfluenceLevel.DIRECT,
    ) -> TimelineEntry:
        entry = TimelineEntry(
            entry_id=f"tl_thresh_{version_tag}",
            material_type=MaterialType.THRESHOLD,
            timestamp=datetime.now().isoformat(),
            version_tag=version_tag,
            payload={"thresholds": thresholds},
            influence_on_conclusion=influence,
            source_description=f"阈值配置 (版本 {version_tag})",
        )
        self._entries.append(entry)
        return entry

    def add_correction(
        self,
        correction: ManualCorrection,
        influence: InfluenceLevel = InfluenceLevel.DIRECT,
    ) -> TimelineEntry:
        entry = TimelineEntry(
            entry_id=f"tl_corr_{correction.correction_id}",
            material_type=MaterialType.MANUAL_CORRECTION,
            timestamp=correction.timestamp,
            version_tag=correction.version_tag,
            payload={
                "correction_id": correction.correction_id,
                "sample_id": correction.sample_id,
                "original_label": correction.original_label,
                "corrected_label": correction.corrected_label,
                "operator": correction.operator,
                "reason": correction.reason,
            },
            influence_on_conclusion=influence,
            source_description=self._describe_correction(correction),
        )
        self._entries.append(entry)
        return entry

    def add_note(
        self,
        note: NoteEntry,
        influence: InfluenceLevel = InfluenceLevel.NONE,
    ) -> TimelineEntry:
        entry = TimelineEntry(
            entry_id=f"tl_note_{note.note_id}",
            material_type=MaterialType.NOTE,
            timestamp=note.timestamp,
            version_tag=note.version_tag,
            payload={
                "note_id": note.note_id,
                "content": note.content,
                "source": note.source.value,
                "related_sample_ids": note.related_sample_ids,
            },
            influence_on_conclusion=influence if influence != InfluenceLevel.NONE else note.influence,
            source_description=self._describe_note(note),
        )
        self._entries.append(entry)
        return entry

    def add_metric(
        self,
        version_tag: str,
        metrics: Dict[str, Any],
        influence: InfluenceLevel = InfluenceLevel.INDIRECT,
    ) -> TimelineEntry:
        entry = TimelineEntry(
            entry_id=f"tl_metric_{version_tag}",
            material_type=MaterialType.METRIC,
            timestamp=datetime.now().isoformat(),
            version_tag=version_tag,
            payload={"metrics": metrics},
            influence_on_conclusion=influence,
            source_description=f"指标记录 (版本 {version_tag})",
        )
        self._entries.append(entry)
        return entry

    def build(self) -> List[TimelineEntry]:
        return sorted(self._entries, key=lambda e: e.timestamp)

    def filter_influential(self) -> List[TimelineEntry]:
        return [
            e
            for e in self.build()
            if e.influence_on_conclusion != InfluenceLevel.NONE
        ]

    @staticmethod
    def _describe_sample(sample: SampleRecord) -> str:
        parts = [f"样本 {sample.sample_id}"]
        if sample.is_bad_data:
            parts.append(f"[坏数据: {sample.bad_data_reason}]")
        if sample.raw_row_index is not None:
            parts.append(f"(原始行 {sample.raw_row_index})")
        if sample.source_file:
            parts.append(f"来源: {sample.source_file}")
        return " ".join(parts)

    @staticmethod
    def _describe_snapshot(snapshot: VersionSnapshot) -> str:
        parts = [f"特征快照 {snapshot.version_id}"]
        if snapshot.alias:
            parts.append(f"(别名: {snapshot.alias})")
        if snapshot.is_legacy:
            parts.append("[旧版快照]")
        if snapshot.resolved_version_id:
            parts.append(f"-> 解析至 {snapshot.resolved_version_id}")
        return " ".join(parts)

    @staticmethod
    def _describe_correction(correction: ManualCorrection) -> str:
        return (
            f"人工修正 {correction.correction_id}: "
            f"样本 {correction.sample_id} 标签 {correction.original_label}->{correction.corrected_label} "
            f"by {correction.operator} 原因: {correction.reason}"
        )

    @staticmethod
    def _describe_note(note: NoteEntry) -> str:
        src_map = {
            NoteSource.BACKFILLED: "后补备注",
            NoteSource.VERBAL: "口头备注",
            NoteSource.SYSTEM: "系统备注",
        }
        return f"{src_map.get(note.source, '备注')} [{note.note_id}]: {note.content}"


class ProvenanceChain:
    def __init__(self, timeline: List[TimelineEntry]) -> None:
        self._timeline = timeline

    def for_sample(self, sample_id: str) -> List[TimelineEntry]:
        result: List[TimelineEntry] = []
        for entry in self._timeline:
            if (
                entry.material_type == MaterialType.SAMPLE
                and entry.payload.get("sample_id") == sample_id
            ):
                result.append(entry)
            elif (
                entry.material_type == MaterialType.MANUAL_CORRECTION
                and entry.payload.get("sample_id") == sample_id
            ):
                result.append(entry)
            elif (
                entry.material_type == MaterialType.NOTE
                and sample_id in entry.payload.get("related_sample_ids", [])
            ):
                result.append(entry)
        return result

    def influenced_entries(self) -> List[TimelineEntry]:
        return [
            e
            for e in self._timeline
            if e.influence_on_conclusion != InfluenceLevel.NONE
        ]

    def material_summary(self) -> Dict[str, List[str]]:
        summary: Dict[str, List[str]] = {}
        for entry in self._timeline:
            key = entry.material_type.value
            if key not in summary:
                summary[key] = []
            summary[key].append(entry.source_description)
        return summary
