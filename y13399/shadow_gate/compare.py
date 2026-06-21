from typing import Dict, Any, List, Tuple
import json
import os

from .storage import Storage
from .models import VersionDiff, EvidenceSnapshot


def _diff_dict(base: Dict[str, Any], current: Dict[str, Any]) -> Dict[str, Any]:
    result: Dict[str, Any] = {"added": {}, "removed": {}, "changed": {}}
    all_keys = set(base.keys()) | set(current.keys())
    for k in all_keys:
        if k not in base:
            result["added"][k] = current[k]
        elif k not in current:
            result["removed"][k] = base[k]
        elif base[k] != current[k]:
            result["changed"][k] = {"before": base[k], "after": current[k]}
    return result


def _diff_list(base: List[Any], current: List[Any]) -> Dict[str, Any]:
    return {
        "base_count": len(base),
        "current_count": len(current),
        "added": [x for x in current if x not in base],
        "removed": [x for x in base if x not in current],
    }


class VersionComparer:
    def __init__(self, storage: Storage):
        self.storage = storage

    def compare_evidence(self, run_id: str, base: EvidenceSnapshot,
                         current: EvidenceSnapshot, base_version: str,
                         current_version: str) -> VersionDiff:
        sample_diff = _diff_list(base.samples, current.samples)
        threshold_diff = _diff_dict(base.thresholds, current.thresholds)
        correction_diff = _diff_list(
            [json.dumps(c, sort_keys=True, ensure_ascii=False) for c in base.manual_corrections],
            [json.dumps(c, sort_keys=True, ensure_ascii=False) for c in current.manual_corrections],
        )
        metric_diff = _diff_dict(base.metrics, current.metrics)

        diff = VersionDiff(
            run_id=run_id,
            base_version=base_version,
            current_version=current_version,
            sample_diff=sample_diff,
            threshold_diff=threshold_diff,
            manual_correction_diff=correction_diff,
            metric_diff=metric_diff,
        )
        self.storage.save_version_diff(diff)
        return diff

    def compare_from_archive(self, run_id: str, archive_path: str,
                             current_evidence: EvidenceSnapshot,
                             base_version: str = "previous",
                             current_version: str = "current") -> VersionDiff:
        with open(archive_path, "r", encoding="utf-8") as f:
            base_data = json.load(f)
        base = EvidenceSnapshot(**base_data)
        return self.compare_evidence(run_id, base, current_evidence,
                                     base_version, current_version)

    def compare_reruns(self, run_id: str) -> List[Dict[str, Any]]:
        record = self.storage.get_record(run_id)
        if record is None:
            return []

        results: List[Dict[str, Any]] = []
        archived_evidences: List[Tuple[str, EvidenceSnapshot]] = []

        for h in record.history:
            if h.get("event") == "rerun_archive" and "archive_path" in h:
                ap = h["archive_path"]
                if os.path.exists(ap):
                    try:
                        with open(ap, "r", encoding="utf-8") as f:
                            data = json.load(f)
                        archived_evidences.append((ap, EvidenceSnapshot(**data)))
                    except Exception:
                        pass

        for i, (path, ev) in enumerate(archived_evidences):
            diff = self.compare_evidence(
                run_id, ev, record.evidence,
                base_version=f"archive_{i}",
                current_version="current",
            )
            result = diff.to_dict()
            result["archive_path"] = path
            results.append(result)

        return results

    def get_summary(self, diff: VersionDiff) -> Dict[str, Any]:
        def _count_changes(d: Dict[str, Any]) -> int:
            return len(d.get("added", {})) + len(d.get("removed", {})) + len(d.get("changed", {}))

        return {
            "run_id": diff.run_id,
            "base_version": diff.base_version,
            "current_version": diff.current_version,
            "sample_changes": _count_changes(diff.sample_diff),
            "threshold_changes": _count_changes(diff.threshold_diff),
            "manual_correction_changes": _count_changes(diff.manual_correction_diff),
            "metric_changes": _count_changes(diff.metric_diff),
            "generated_at": diff.generated_at,
        }
