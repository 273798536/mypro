import json
import os
from datetime import datetime
from typing import Optional
from .models import Sample, SampleClassification, ConflictType
from .conflict_detector import detect_all_conflicts
from .version_tracker import (
    compare_versions,
    mark_conclusion_inconsistency,
    preserve_overwritten_modulation_evidence,
    get_version_evidence_for_conflict,
)
from .sample_manager import (
    load_samples_from_root,
    filter_normal,
    filter_boundary,
    filter_bad,
    filter_with_conflicts,
    filter_conclusion_inconsistent,
    get_sample_by_id,
    save_audit_results,
)


class AuditEngine:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.samples: list = []
        self.audit_time: str = ""
        self.audit_summary: dict = {}

    def load_data(self):
        self.samples = load_samples_from_root(self.data_dir)
        return self.samples

    def run_audit(self) -> dict:
        self.audit_time = datetime.now().isoformat()
        for sample in self.samples:
            conflicts = detect_all_conflicts(sample)
            sample.conflicts = conflicts
            consistency_result = mark_conclusion_inconsistency(sample)
            overwritten = preserve_overwritten_modulation_evidence(sample)
            for conflict in sample.conflicts:
                evidence = get_version_evidence_for_conflict(
                    sample,
                    conflict.conflict_type.value,
                    conflict.related_bar_range,
                )
                if evidence:
                    if not conflict.evidence_version_ids:
                        conflict.evidence_version_ids = []
                    for e in evidence:
                        if e["version_id"] not in conflict.evidence_version_ids:
                            conflict.evidence_version_ids.append(e["version_id"])
            sample.meta["_audit"] = {
                "audit_time": self.audit_time,
                "consistency_result": {
                    k: v
                    for k, v in consistency_result.items()
                    if k != "version_diffs"
                },
                "overwritten_modulation_evidence": overwritten,
                "version_diffs": consistency_result.get("version_diffs", []),
            }
        self.audit_summary = self._build_summary()
        return self.audit_summary

    def _build_summary(self) -> dict:
        total = len(self.samples)
        normals = filter_normal(self.samples)
        boundaries = filter_boundary(self.samples)
        bads = filter_bad(self.samples)
        with_conflicts = filter_with_conflicts(self.samples)
        inconsistent = filter_conclusion_inconsistent(self.samples)
        conflict_counts = {}
        for sample in self.samples:
            for c in sample.conflicts:
                key = c.conflict_type.value
                conflict_counts[key] = conflict_counts.get(key, 0) + 1
        return {
            "audit_time": self.audit_time,
            "total_samples": total,
            "classification_counts": {
                "normal": len(normals),
                "boundary": len(boundaries),
                "bad": len(bads),
            },
            "conflict_counts": conflict_counts,
            "total_conflicts": sum(conflict_counts.values()),
            "samples_with_conflicts": len(with_conflicts),
            "samples_conclusion_inconsistent": len(inconsistent),
            "failure_paths": self._build_failure_paths(),
        }

    def _build_failure_paths(self) -> list:
        paths = []
        for sample in self.samples:
            if not sample.conflicts:
                continue
            for conflict in sample.conflicts:
                path = {
                    "sample_id": sample.sample_id,
                    "classification": sample.classification.value,
                    "conflict_type": conflict.conflict_type.value,
                    "description": conflict.description,
                    "severity": conflict.severity.value,
                    "bar_range": list(conflict.related_bar_range),
                    "evidence_version_ids": conflict.evidence_version_ids,
                    "resolved": conflict.resolved,
                    "trace": self._build_trace(sample, conflict),
                }
                paths.append(path)
        return paths

    def _build_trace(self, sample: Sample, conflict) -> dict:
        trace = {
            "chord_analyses": [],
            "version_comparison": [],
            "error_annotation": conflict.description,
        }
        for a in sample.chord_analyses:
            if (
                a.bar_start <= conflict.related_bar_range[1]
                and a.bar_end >= conflict.related_bar_range[0]
            ):
                trace["chord_analyses"].append(
                    {
                        "bar_start": a.bar_start,
                        "bar_end": a.bar_end,
                        "expected_chord": a.expected_chord,
                        "actual_chord": a.actual_chord,
                        "match_result": a.match_result.value,
                        "confidence": a.confidence,
                    }
                )
        diffs = compare_versions(sample)
        for d in diffs:
            trace["version_comparison"].append(d)
        if hasattr(sample, "meta") and "_audit" in sample.meta:
            audit_meta = sample.meta["_audit"]
            if audit_meta.get("overwritten_modulation_evidence"):
                trace["overwritten_modulation"] = audit_meta[
                    "overwritten_modulation_evidence"
                ]
        return trace

    def get_sample_detail(self, sample_id: str) -> Optional[dict]:
        sample = get_sample_by_id(self.samples, sample_id)
        if sample is None:
            return None
        detail = sample.to_dict()
        detail["version_chain"] = [
            v.to_dict() for v in sample.get_version_chain()
        ]
        detail["version_diffs"] = compare_versions(sample)
        consistency = mark_conclusion_inconsistency(sample)
        detail["consistency"] = {
            k: v for k, v in consistency.items() if k != "version_diffs"
        }
        detail["trace_paths"] = []
        for conflict in sample.conflicts:
            detail["trace_paths"].append(
                {
                    "conflict_type": conflict.conflict_type.value,
                    "trace": self._build_trace(sample, conflict),
                }
            )
        return detail

    def filter_samples(
        self,
        classification: Optional[str] = None,
        has_conflicts: Optional[bool] = None,
        conflict_type: Optional[str] = None,
    ) -> list:
        result = self.samples
        if classification:
            cls = SampleClassification(classification)
            result = filter_by_classification(result, cls)
        if has_conflicts is True:
            result = filter_with_conflicts(result)
        if has_conflicts is False:
            result = [s for s in result if not s.conflicts]
        if conflict_type:
            ct = ConflictType(conflict_type)
            filtered = []
            for s in result:
                for c in s.conflicts:
                    if c.conflict_type == ct:
                        filtered.append(s)
                        break
            result = filtered
        return result

    def save_results(self, output_dir: str) -> str:
        os.makedirs(output_dir, exist_ok=True)
        summary_path = save_audit_results(self.samples, output_dir)
        audit_path = os.path.join(output_dir, "audit_summary.json")
        with open(audit_path, "w", encoding="utf-8") as f:
            json.dump(self.audit_summary, f, ensure_ascii=False, indent=2)
        details_dir = os.path.join(output_dir, "details")
        os.makedirs(details_dir, exist_ok=True)
        for sample in self.samples:
            detail = self.get_sample_detail(sample.sample_id)
            if detail:
                detail_path = os.path.join(
                    details_dir, f"{sample.sample_id}.json"
                )
                with open(detail_path, "w", encoding="utf-8") as f:
                    json.dump(detail, f, ensure_ascii=False, indent=2)
        return output_dir


def filter_by_classification(samples, cls):
    from .sample_manager import filter_by_classification as _fbc

    return _fbc(samples, cls)
