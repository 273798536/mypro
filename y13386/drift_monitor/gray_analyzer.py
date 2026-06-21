from typing import Dict, Any, List, Optional
from copy import deepcopy

from .models import (
    DriftSnapshot, GrayDecomposition, DriftStatus, ThresholdConfig, FeatureDrift
)
from .metrics import determine_status, aggregate_status
from .snapshot_manager import SnapshotManager


class GrayAnalyzer:
    def __init__(self, manager: SnapshotManager):
        self.manager = manager

    def _recompute_with_threshold(self,
                                  snapshot: DriftSnapshot,
                                  new_threshold: ThresholdConfig) -> Dict[str, DriftStatus]:
        results = {}
        for fd in snapshot.feature_drifts:
            status = determine_status(
                fd.psi, fd.ks_stat,
                fd.current_stats.sample_count,
                new_threshold
            )
            results[fd.feature_name] = status
        return results

    def _recompute_with_samples(self,
                                baseline_fd: FeatureDrift,
                                current_fd: FeatureDrift) -> DriftStatus:
        threshold = current_fd.baseline_stats and DriftStatus.NORMAL or DriftStatus.NORMAL
        return current_fd.status

    def decompose(self,
                  baseline_run_id: str, baseline_version: str,
                  current_run_id: str, current_version: str) -> GrayDecomposition:
        baseline = self.manager.get(baseline_run_id, baseline_version)
        current = self.manager.get(current_run_id, current_version)
        if baseline is None or current is None:
            raise ValueError("Snapshot not found")

        sample_change: Dict[str, DriftStatus] = {}
        baseline_feats = {f.feature_name: f for f in baseline.feature_drifts}
        current_feats = {f.feature_name: f for f in current.feature_drifts}

        for fname in set(baseline_feats.keys()) | set(current_feats.keys()):
            bf = baseline_feats.get(fname)
            cf = current_feats.get(fname)
            if bf is None or cf is None:
                sample_change[fname] = DriftStatus.GRAY
                continue
            if cf.status != bf.status:
                sample_change[fname] = cf.status
            else:
                sample_change[fname] = DriftStatus.NORMAL

        threshold_change: Dict[str, DriftStatus] = {}
        param_diffs = {}
        try:
            if baseline_run_id == current_run_id:
                param_diffs = self.manager.compare_params(
                    baseline_run_id, baseline_version, current_version
                )
        except Exception:
            pass

        has_threshold_change = any(k.startswith("threshold.") for k in param_diffs.keys())
        if has_threshold_change:
            recomputed = self._recompute_with_threshold(current, current.params.threshold)
            for fname, new_status in recomputed.items():
                bf = baseline_feats.get(fname)
                if bf and bf.status != new_status:
                    threshold_change[fname] = new_status

        human_effect: Dict[str, Dict[str, Any]] = {}
        for hj in current.human_judgments:
            human_effect[f"judgment_{hj.timestamp.strftime('%H%M%S')}"] = {
                "judge": hj.judge,
                "from": hj.original_status.value,
                "to": hj.new_status.value,
                "reason": hj.reason,
                "timestamp": hj.timestamp.isoformat()
            }

        return GrayDecomposition(
            sample_change_effect=sample_change,
            threshold_change_effect=threshold_change,
            human_judgment_effect=human_effect,
            baseline_snapshot=f"{baseline_run_id}@{baseline_version}",
            current_snapshot=f"{current_run_id}@{current_version}"
        )
