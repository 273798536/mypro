from typing import Dict, List, Any, Tuple, Optional
from .models import (
    Snapshot, FeatureRow, VersionDiff,
    RowStatus, GrayFlag, ModificationType
)


class VersionComparator:
    def compare(self, old_snapshot: Snapshot, new_snapshot: Snapshot) -> VersionDiff:
        diff = VersionDiff(
            old_version_id=old_snapshot.version.version_id,
            new_version_id=new_snapshot.version.version_id,
        )

        diff.sample_changes = self._compare_samples(old_snapshot, new_snapshot)
        diff.threshold_changes = self._compare_thresholds(old_snapshot, new_snapshot)
        diff.manual_corrections = self._extract_manual_corrections(new_snapshot)
        diff.metric_changes = self._compare_metrics(old_snapshot, new_snapshot)
        diff.status_changes = self._compare_status(old_snapshot, new_snapshot)
        diff.gray_changes = self._compare_gray(old_snapshot, new_snapshot)

        return diff

    def _compare_samples(
        self, old_snapshot: Snapshot, new_snapshot: Snapshot
    ) -> List[Dict[str, Any]]:
        old_map = {r.sample_id: r for r in old_snapshot.rows}
        new_map = {r.sample_id: r for r in new_snapshot.rows}

        all_ids = set(old_map.keys()) | set(new_map.keys())
        changes: List[Dict[str, Any]] = []

        for sample_id in sorted(all_ids):
            old_row = old_map.get(sample_id)
            new_row = new_map.get(sample_id)

            change = self._analyze_sample_change(sample_id, old_row, new_row)
            if change:
                changes.append(change)

        return changes

    def _analyze_sample_change(
        self,
        sample_id: str,
        old_row: Optional[FeatureRow],
        new_row: Optional[FeatureRow]
    ) -> Optional[Dict[str, Any]]:
        if old_row is None and new_row is not None:
            return {
                "sample_id": sample_id,
                "change_type": "added",
                "new_status": new_row.status.value,
                "new_gray_flag": new_row.gray_flag.value,
                "is_boundary": new_row.is_boundary,
                "features": new_row.features,
            }

        if old_row is not None and new_row is None:
            return {
                "sample_id": sample_id,
                "change_type": "removed",
                "old_status": old_row.status.value,
                "old_gray_flag": old_row.gray_flag.value,
                "is_boundary": old_row.is_boundary,
            }

        if old_row is None or new_row is None:
            return None

        if (old_row.status == new_row.status
                and old_row.gray_flag == new_row.gray_flag
                and old_row.features == new_row.features
                and old_row.modification_type == new_row.modification_type):
            return None

        feature_diffs = {}
        all_keys = set(old_row.features.keys()) | set(new_row.features.keys())
        for key in sorted(all_keys):
            old_val = old_row.features.get(key)
            new_val = new_row.features.get(key)
            if old_val != new_val:
                feature_diffs[key] = {
                    "old": old_val,
                    "new": new_val,
                    "delta": round((new_val - old_val), 6) if old_val is not None and new_val is not None else None,
                }

        return {
            "sample_id": sample_id,
            "change_type": "modified",
            "status_changed": old_row.status != new_row.status,
            "old_status": old_row.status.value,
            "new_status": new_row.status.value,
            "gray_changed": old_row.gray_flag != new_row.gray_flag,
            "old_gray_flag": old_row.gray_flag.value,
            "new_gray_flag": new_row.gray_flag.value,
            "modification_changed": old_row.modification_type != new_row.modification_type,
            "old_modification": old_row.modification_type.value,
            "new_modification": new_row.modification_type.value,
            "modification_note": new_row.modification_note,
            "boundary_changed": old_row.is_boundary != new_row.is_boundary,
            "old_is_boundary": old_row.is_boundary,
            "new_is_boundary": new_row.is_boundary,
            "feature_diffs": feature_diffs,
        }

    def _compare_thresholds(
        self, old_snapshot: Snapshot, new_snapshot: Snapshot
    ) -> List[Dict[str, Any]]:
        old_thresholds = old_snapshot.version.thresholds
        new_thresholds = new_snapshot.version.thresholds

        all_names = set(old_thresholds.keys()) | set(new_thresholds.keys())
        changes: List[Dict[str, Any]] = []

        for name in sorted(all_names):
            old_th = old_thresholds.get(name)
            new_th = new_thresholds.get(name)

            if old_th is None and new_th is not None:
                changes.append({
                    "feature_name": name,
                    "change_type": "added",
                    "min_value": new_th.min_value,
                    "max_value": new_th.max_value,
                    "is_manual": new_th.is_manual,
                })
            elif old_th is not None and new_th is None:
                changes.append({
                    "feature_name": name,
                    "change_type": "removed",
                    "min_value": old_th.min_value,
                    "max_value": old_th.max_value,
                    "is_manual": old_th.is_manual,
                })
            elif old_th and new_th and (
                old_th.min_value != new_th.min_value
                or old_th.max_value != new_th.max_value
                or old_th.is_manual != new_th.is_manual
                or old_th.allow_null != new_th.allow_null
            ):
                changes.append({
                    "feature_name": name,
                    "change_type": "modified",
                    "old_min": old_th.min_value,
                    "new_min": new_th.min_value,
                    "old_max": old_th.max_value,
                    "new_max": new_th.max_value,
                    "old_allow_null": old_th.allow_null,
                    "new_allow_null": new_th.allow_null,
                    "is_manual": new_th.is_manual,
                    "was_manual": old_th.is_manual,
                })

        return changes

    def _extract_manual_corrections(self, snapshot: Snapshot) -> List[Dict[str, Any]]:
        corrections: List[Dict[str, Any]] = []
        for row in snapshot.rows:
            if row.modification_type != ModificationType.NONE:
                corrections.append({
                    "sample_id": row.sample_id,
                    "modification_type": row.modification_type.value,
                    "modification_note": row.modification_note,
                    "status": row.status.value,
                    "gray_flag": row.gray_flag.value,
                    "features": row.features,
                })
        return corrections

    def _compare_metrics(
        self, old_snapshot: Snapshot, new_snapshot: Snapshot
    ) -> Dict[str, Dict[str, float]]:
        old_metrics = old_snapshot.metrics
        new_metrics = new_snapshot.metrics

        all_features = set(old_metrics.mean_values.keys()) | set(new_metrics.mean_values.keys())
        changes: Dict[str, Dict[str, float]] = {}

        for feature in sorted(all_features):
            changes[feature] = {}
            for metric_name in ["mean_values", "std_values", "min_values", "max_values"]:
                old_dict = getattr(old_metrics, metric_name)
                new_dict = getattr(new_metrics, metric_name)
                old_val = old_dict.get(feature, 0.0)
                new_val = new_dict.get(feature, 0.0)
                if old_val != new_val:
                    short_name = metric_name.replace("_values", "")
                    changes[feature][f"{short_name}_delta"] = round(new_val - old_val, 6)
                    changes[feature][f"{short_name}_old"] = round(old_val, 6)
                    changes[feature][f"{short_name}_new"] = round(new_val, 6)
                    changes[feature][f"{short_name}_change_pct"] = (
                        round((new_val - old_val) / old_val * 100, 2)
                        if old_val != 0 else float("inf")
                    )

            old_outlier = old_metrics.outlier_counts.get(feature, 0)
            new_outlier = new_metrics.outlier_counts.get(feature, 0)
            if old_outlier != new_outlier:
                changes[feature]["outlier_delta"] = new_outlier - old_outlier
                changes[feature]["outlier_old"] = old_outlier
                changes[feature]["outlier_new"] = new_outlier

            old_null = old_metrics.null_counts.get(feature, 0)
            new_null = new_metrics.null_counts.get(feature, 0)
            if old_null != new_null:
                changes[feature]["null_delta"] = new_null - old_null
                changes[feature]["null_old"] = old_null
                changes[feature]["null_new"] = new_null

            if not changes[feature]:
                del changes[feature]

        return changes

    def _compare_status(
        self, old_snapshot: Snapshot, new_snapshot: Snapshot
    ) -> Dict[str, Dict[str, int]]:
        old_stats = old_snapshot.stats
        new_stats = new_snapshot.stats

        fields = [
            "total", "processed", "bad", "skipped", "boundary",
            "gray_candidate", "gray_enabled", "gray_error",
            "manual_corrections", "auto_fixes", "threshold_adjustments",
        ]

        changes: Dict[str, Dict[str, int]] = {}
        for field in fields:
            old_val = getattr(old_stats, field)
            new_val = getattr(new_stats, field)
            if old_val != new_val:
                changes[field] = {
                    "old": old_val,
                    "new": new_val,
                    "delta": new_val - old_val,
                }

        return changes

    def _compare_gray(
        self, old_snapshot: Snapshot, new_snapshot: Snapshot
    ) -> Dict[str, Any]:
        old_version = old_snapshot.version
        new_version = new_snapshot.version

        changes: Dict[str, Any] = {}

        if old_version.gray_ratio_config != new_version.gray_ratio_config:
            changes["gray_ratio_config"] = {
                "old": old_version.gray_ratio_config,
                "new": new_version.gray_ratio_config,
            }

        if old_version.gray_ratio != new_version.gray_ratio:
            changes["gray_ratio_actual"] = {
                "old": round(old_version.gray_ratio, 4),
                "new": round(new_version.gray_ratio, 4),
                "delta": round(new_version.gray_ratio - old_version.gray_ratio, 4),
            }

        old_rows = old_snapshot.rows
        new_rows = new_snapshot.rows

        old_gray_ids = {r.sample_id for r in old_rows if r.gray_flag != GrayFlag.NORMAL}
        new_gray_ids = {r.sample_id for r in new_rows if r.gray_flag != GrayFlag.NORMAL}

        changes["gray_samples"] = {
            "added": sorted(new_gray_ids - old_gray_ids),
            "removed": sorted(old_gray_ids - new_gray_ids),
            "count_added": len(new_gray_ids - old_gray_ids),
            "count_removed": len(old_gray_ids - new_gray_ids),
        }

        return changes
