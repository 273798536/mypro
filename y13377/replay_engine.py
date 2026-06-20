from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple

from models import (
    AnomalyResult,
    InfluenceLevel,
    ManualCorrection,
    NoteEntry,
    NoteSource,
    SampleRecord,
    TimelineEntry,
    VersionSnapshot,
)
from provenance import ProvenanceChain, TimelineBuilder
from version_manager import FeatureSnapshotManager, VersionRegistry


class AnomalyDetector:
    def __init__(
        self,
        default_threshold: float = 0.5,
    ) -> None:
        self._default_threshold = default_threshold

    def detect(
        self,
        sample: SampleRecord,
        threshold: float,
        feature_snapshot: Optional[Dict[str, Any]] = None,
    ) -> Tuple[bool, float]:
        if sample.is_bad_data:
            return False, 0.0

        score = sample.score
        if score is None:
            if feature_snapshot and "scoring_config" in feature_snapshot:
                score = self._compute_score(sample, feature_snapshot["scoring_config"])
            else:
                score = self._compute_score(sample, {})

        is_anomaly = score >= threshold
        return is_anomaly, score

    @staticmethod
    def _compute_score(
        sample: SampleRecord,
        scoring_config: Dict[str, Any],
    ) -> float:
        weights: Dict[str, float] = scoring_config.get("feature_weights", {})
        if not weights:
            feature_values = [
                v for v in sample.features.values() if isinstance(v, (int, float))
            ]
            if not feature_values:
                return 0.0
            return sum(feature_values) / len(feature_values)

        total = 0.0
        weight_sum = 0.0
        for feat, weight in weights.items():
            val = sample.features.get(feat)
            if val is not None and isinstance(val, (int, float)):
                total += val * weight
                weight_sum += weight
        if weight_sum == 0:
            return 0.0
        return total / weight_sum


class BadDataIsolator:
    @staticmethod
    def check(sample: SampleRecord) -> SampleRecord:
        issues: List[str] = []
        if sample.is_bad_data:
            return sample

        for key, val in sample.features.items():
            if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
                issues.append(f"特征 {key} 值异常: {val}")

        if sample.score is not None and (math.isnan(sample.score) or math.isinf(sample.score)):
            issues.append(f"分数异常: {sample.score}")

        if issues:
            sample.is_bad_data = True
            sample.bad_data_reason = "; ".join(issues)

        return sample

    @staticmethod
    def locate_original(sample: SampleRecord) -> Optional[str]:
        parts: List[str] = []
        if sample.source_file:
            parts.append(f"文件: {sample.source_file}")
        if sample.raw_row_index is not None:
            parts.append(f"原始行: {sample.raw_row_index}")
        if sample.sample_id:
            parts.append(f"对象ID: {sample.sample_id}")
        return " | ".join(parts) if parts else None


class ReplayEngine:
    def __init__(
        self,
        registry: VersionRegistry,
        threshold: float = 0.5,
    ) -> None:
        self._registry = registry
        self._detector = AnomalyDetector(default_threshold=threshold)
        self._isolator = BadDataIsolator()
        self._snapshot_mgr = FeatureSnapshotManager(registry)

    def replay_single(
        self,
        sample: SampleRecord,
        version_ref: str,
        corrections: Optional[List[ManualCorrection]] = None,
        notes: Optional[List[NoteEntry]] = None,
    ) -> AnomalyResult:
        sample = self._isolator.check(sample)

        snap = self._registry.resolve(version_ref)
        feature_snapshot = None
        snap_version = version_ref
        if snap:
            feature_snapshot = snap.feature_snapshot
            snap_version = snap.version_id
            threshold = snap.thresholds.get("anomaly_threshold", self._detector._default_threshold)
            threshold_version = snap.version_id
        else:
            threshold = self._detector._default_threshold
            threshold_version = version_ref

        is_anomaly, score = self._detector.detect(sample, threshold, feature_snapshot)

        applied_corrections: List[str] = []
        applied_notes: List[str] = []
        if corrections and not sample.is_bad_data:
            for corr in corrections:
                if corr.sample_id == sample.sample_id:
                    sample.label = corr.corrected_label
                    applied_corrections.append(corr.correction_id)
                    if corr.corrected_label == 0 and is_anomaly:
                        is_anomaly = False
                    elif corr.corrected_label == 1 and not is_anomaly:
                        is_anomaly = True

        if notes:
            for note in notes:
                if sample.sample_id in note.related_sample_ids:
                    applied_notes.append(note.note_id)

        timeline_builder = TimelineBuilder()
        timeline_builder.add_sample(
            sample,
            influence=InfluenceLevel.DIRECT if not sample.is_bad_data else InfluenceLevel.NONE,
        )
        if snap:
            timeline_builder.add_snapshot(
                snap,
                influence=InfluenceLevel.DIRECT if not snap.is_legacy else InfluenceLevel.INDIRECT,
            )
        timeline_builder.add_threshold(
            threshold_version,
            {"anomaly_threshold": threshold},
            influence=InfluenceLevel.DIRECT,
        )
        for corr_id in applied_corrections:
            if corrections:
                for c in corrections:
                    if c.correction_id == corr_id:
                        timeline_builder.add_correction(c, influence=InfluenceLevel.DIRECT)
        for note_id in applied_notes:
            if notes:
                for n in notes:
                    if n.note_id == note_id:
                        note_influence = (
                            InfluenceLevel.INDIRECT
                            if n.source in (NoteSource.BACKFILLED, NoteSource.VERBAL)
                            else InfluenceLevel.NONE
                        )
                        timeline_builder.add_note(n, influence=note_influence)

        original_ref = self._isolator.locate_original(sample)

        return AnomalyResult(
            sample_id=sample.sample_id,
            is_anomaly=is_anomaly,
            anomaly_score=score,
            threshold_used=threshold,
            threshold_version=threshold_version,
            feature_snapshot_version=snap_version,
            manual_corrections_applied=applied_corrections,
            notes_applied=applied_notes,
            timeline=timeline_builder.build(),
            bad_data_flag=sample.is_bad_data,
            bad_data_detail=sample.bad_data_reason if sample.is_bad_data else None,
            original_row_ref=original_ref,
            object_ref=sample.sample_id,
        )

    def replay_batch(
        self,
        samples: List[SampleRecord],
        version_ref: str,
        corrections: Optional[List[ManualCorrection]] = None,
        notes: Optional[List[NoteEntry]] = None,
    ) -> List[AnomalyResult]:
        return [
            self.replay_single(s, version_ref, corrections, notes) for s in samples
        ]

    def replay_across_versions(
        self,
        samples: List[SampleRecord],
        version_refs: List[str],
        corrections: Optional[List[ManualCorrection]] = None,
        notes: Optional[List[NoteEntry]] = None,
    ) -> Dict[str, List[AnomalyResult]]:
        results: Dict[str, List[AnomalyResult]] = {}
        for vref in version_refs:
            results[vref] = self.replay_batch(samples, vref, corrections, notes)
        return results
