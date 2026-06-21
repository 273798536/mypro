import os
import json
import pickle
from datetime import datetime
from typing import List, Dict, Optional, Any
from copy import deepcopy

from .models import (
    DriftSnapshot, SnapshotParams, ThresholdConfig,
    HumanJudgment, AuditRecord, DriftStatus, FeatureDrift
)
from .metrics import compute_feature_drift, aggregate_status


class SnapshotManager:
    def __init__(self, storage_dir: str = "./snapshots"):
        self.storage_dir = storage_dir
        os.makedirs(storage_dir, exist_ok=True)
        self._snapshots: Dict[str, Dict[str, DriftSnapshot]] = {}
        self._load_all()

    def _snapshot_path(self, run_id: str, version: str) -> str:
        safe_run = run_id.replace("/", "_")
        return os.path.join(self.storage_dir, f"{safe_run}__v{version}.pkl")

    def _meta_path(self) -> str:
        return os.path.join(self.storage_dir, "meta.json")

    def _load_all(self):
        if not os.path.exists(self.storage_dir):
            return
        for fname in os.listdir(self.storage_dir):
            if fname.endswith(".pkl"):
                try:
                    with open(os.path.join(self.storage_dir, fname), "rb") as f:
                        snap = pickle.load(f)
                    if snap.run_id not in self._snapshots:
                        self._snapshots[snap.run_id] = {}
                    self._snapshots[snap.run_id][snap.version] = snap
                except Exception:
                    continue

    def list_run_ids(self) -> List[str]:
        return sorted(self._snapshots.keys())

    def list_versions(self, run_id: str) -> List[str]:
        if run_id not in self._snapshots:
            return []
        return sorted(self._snapshots[run_id].keys())

    def get(self, run_id: str, version: Optional[str] = None) -> Optional[DriftSnapshot]:
        if run_id not in self._snapshots:
            return None
        if version is None:
            versions = self.list_versions(run_id)
            if not versions:
                return None
            version = versions[-1]
        return self._snapshots[run_id].get(version)

    def _save(self, snapshot: DriftSnapshot):
        if snapshot.run_id not in self._snapshots:
            self._snapshots[snapshot.run_id] = {}
        self._snapshots[snapshot.run_id][snapshot.version] = snapshot
        with open(self._snapshot_path(snapshot.run_id, snapshot.version), "wb") as f:
            pickle.dump(snapshot, f)

    def deduplicate_records(self, records: List[Dict[str, Any]]) -> tuple:
        seen = set()
        deduped = []
        duplicates = []
        for rec in records:
            rid = rec.get("run_id")
            if rid in seen:
                duplicates.append(rid)
                continue
            if rid is not None:
                seen.add(rid)
            deduped.append(rec)
        return deduped, duplicates

    def generate_snapshot(self,
                          run_id: str,
                          version: str,
                          baseline_data: Dict[str, List[float]],
                          current_data: Dict[str, List[float]],
                          threshold: Optional[ThresholdConfig] = None,
                          extra_params: Optional[Dict[str, Any]] = None,
                          raw_records: Optional[List[Dict[str, Any]]] = None,
                          is_gray: bool = False,
                          notes: Optional[List[str]] = None) -> DriftSnapshot:
        threshold = threshold or ThresholdConfig()
        extra_params = extra_params or {}

        duplicate_run_ids = []
        if raw_records is not None:
            _, duplicate_run_ids = self.deduplicate_records(raw_records)

        all_features = set(baseline_data.keys()) | set(current_data.keys())
        feature_drifts: List[FeatureDrift] = []
        for feat in sorted(all_features):
            base_vals = baseline_data.get(feat, [])
            curr_vals = current_data.get(feat, [])
            fd = compute_feature_drift(feat, base_vals, curr_vals, threshold)
            feature_drifts.append(fd)

        overall = aggregate_status([fd.status for fd in feature_drifts])

        params = SnapshotParams(
            run_id=run_id,
            version=version,
            threshold=deepcopy(threshold),
            extra_params=dict(extra_params),
            created_at=datetime.now()
        )

        snapshot = DriftSnapshot(
            run_id=run_id,
            version=version,
            params=params,
            overall_status=overall,
            feature_drifts=feature_drifts,
            sample_count=max(len(v) for v in current_data.values()) if current_data else 0,
            duplicate_run_ids=duplicate_run_ids,
            human_judgments=[],
            audit_trail=[],
            notes=notes or [],
            created_at=datetime.now(),
            is_gray=is_gray
        )

        self._save(snapshot)
        return snapshot

    def apply_human_judgment(self,
                             run_id: str,
                             version: str,
                             judge: str,
                             new_status: DriftStatus,
                             reason: str,
                             feature_name: Optional[str] = None) -> DriftSnapshot:
        snap = self.get(run_id, version)
        if snap is None:
            raise ValueError(f"Snapshot {run_id} v{version} not found")

        if feature_name:
            fd = next((f for f in snap.feature_drifts if f.feature_name == feature_name), None)
            if fd is None:
                raise ValueError(f"Feature {feature_name} not found")
            original = fd.status
            fd.status = new_status
            fd.note = f"人工改判: {reason} (by {judge})"
            snap.audit_trail.append(AuditRecord(
                field=f"feature_status:{feature_name}",
                old_value=original.value,
                new_value=new_status.value,
                operator=judge,
                note=reason
            ))
            new_overall = aggregate_status([f.status for f in snap.feature_drifts])
            if new_overall != snap.overall_status:
                snap.audit_trail.append(AuditRecord(
                    field="overall_status",
                    old_value=snap.overall_status.value,
                    new_value=new_overall.value,
                    operator=judge,
                    note=f"随特征 {feature_name} 改判联动更新"
                ))
                snap.overall_status = new_overall
        else:
            original = snap.overall_status
            snap.overall_status = new_status
            snap.audit_trail.append(AuditRecord(
                field="overall_status",
                old_value=original.value,
                new_value=new_status.value,
                operator=judge,
                note=reason
            ))

        snap.human_judgments.append(HumanJudgment(
            judge=judge,
            original_status=original if not feature_name else DriftStatus.GRAY,
            new_status=new_status,
            reason=reason
        ))

        self._save(snap)
        return snap

    def add_note(self, run_id: str, version: str, note: str, operator: str = "system"):
        snap = self.get(run_id, version)
        if snap is None:
            raise ValueError(f"Snapshot {run_id} v{version} not found")
        snap.notes.append(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {operator}: {note}")
        self._save(snap)
        return snap

    def compare_params(self, run_id: str, version_a: str, version_b: str) -> Dict[str, Any]:
        a = self.get(run_id, version_a)
        b = self.get(run_id, version_b)
        if a is None or b is None:
            raise ValueError("Snapshot not found")

        diffs = {}

        ta, tb = a.params.threshold, b.params.threshold
        for field in ["psi_warning", "psi_drift", "ks_warning", "ks_drift", "min_samples"]:
            va = getattr(ta, field)
            vb = getattr(tb, field)
            if va != vb:
                diffs[f"threshold.{field}"] = {"from": va, "to": vb}

        for key in set(a.params.extra_params.keys()) | set(b.params.extra_params.keys()):
            va = a.params.extra_params.get(key)
            vb = b.params.extra_params.get(key)
            if va != vb:
                diffs[f"extra.{key}"] = {"from": va, "to": vb}

        return diffs

    def compare_results(self, run_id: str, version_a: str, version_b: str) -> Dict[str, Any]:
        a = self.get(run_id, version_a)
        b = self.get(run_id, version_b)
        if a is None or b is None:
            raise ValueError("Snapshot not found")

        changes = {
            "overall_status": {
                "from": a.overall_status.value,
                "to": b.overall_status.value,
                "changed": a.overall_status != b.overall_status
            },
            "features": {}
        }

        feats_a = {f.feature_name: f for f in a.feature_drifts}
        feats_b = {f.feature_name: f for f in b.feature_drifts}

        for fname in set(feats_a.keys()) | set(feats_b.keys()):
            fa = feats_a.get(fname)
            fb = feats_b.get(fname)
            if fa is None or fb is None:
                changes["features"][fname] = {"note": "特征仅存在于一个版本"}
                continue

            feat_change = {}
            if fa.status != fb.status:
                feat_change["status"] = {"from": fa.status.value, "to": fb.status.value}
            if abs(fa.psi - fb.psi) > 1e-6:
                feat_change["psi"] = {"from": round(fa.psi, 4), "to": round(fb.psi, 4)}
            if abs(fa.ks_stat - fb.ks_stat) > 1e-6:
                feat_change["ks_stat"] = {"from": round(fa.ks_stat, 4), "to": round(fb.ks_stat, 4)}
            if feat_change:
                changes["features"][fname] = feat_change

        return changes

    def get_history(self, run_id: str, version: Optional[str] = None) -> List[Dict[str, Any]]:
        if version:
            snap = self.get(run_id, version)
            if snap is None:
                return []
            records = []
            for audit in snap.audit_trail:
                records.append({
                    "type": "audit",
                    "timestamp": audit.timestamp,
                    "operator": audit.operator,
                    "field": audit.field,
                    "old_value": audit.old_value,
                    "new_value": audit.new_value,
                    "note": audit.note
                })
            for hj in snap.human_judgments:
                records.append({
                    "type": "human_judgment",
                    "timestamp": hj.timestamp,
                    "judge": hj.judge,
                    "from_status": hj.original_status.value,
                    "to_status": hj.new_status.value,
                    "reason": hj.reason
                })
            records.sort(key=lambda r: r["timestamp"])
            return records

        versions = self.list_versions(run_id)
        all_records = []
        for v in versions:
            for r in self.get_history(run_id, v):
                r["version"] = v
                all_records.append(r)
        all_records.sort(key=lambda r: r["timestamp"])
        return all_records
