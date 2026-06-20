import pandas as pd
import numpy as np
from datetime import datetime
from typing import List, Dict, Optional, Tuple
import os

from .models import (
    FeatureRow, RowStatus, GrayFlag, ModificationType,
    ProcessingStats, SnapshotMetrics, SnapshotThreshold,
    SnapshotVersion, Snapshot
)


class SnapshotProcessor:
    def __init__(
        self,
        version: Optional[SnapshotVersion] = None,
        skip_patterns: Optional[List[str]] = None,
        bad_row_threshold: float = 0.5,
        boundary_threshold: float = 0.01,
    ):
        self.version = version or SnapshotVersion()
        self.skip_patterns = skip_patterns or ["skip", "ignore", "test_"]
        self.bad_row_threshold = bad_row_threshold
        self.boundary_threshold = boundary_threshold
        self.stats = ProcessingStats()

    def load_data(self, file_path: str) -> pd.DataFrame:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"文件不存在: {file_path}")

        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".csv":
            df = pd.read_csv(file_path)
        elif ext in [".xlsx", ".xls"]:
            df = pd.read_excel(file_path)
        elif ext in [".json", ".jsonl"]:
            df = pd.read_json(file_path, lines=ext == ".jsonl")
        else:
            raise ValueError(f"不支持的文件格式: {ext}")

        return df

    def _detect_skip(self, row: pd.Series, idx: int) -> bool:
        sample_id = str(row.get("sample_id", f"row_{idx}")).lower()
        for pattern in self.skip_patterns:
            if pattern in sample_id:
                return True

        if "skip" in str(row.get("note", "")).lower():
            return True

        return False

    def _detect_bad_row(self, row: pd.Series, feature_cols: List[str]) -> Tuple[bool, str]:
        null_ratio = row[feature_cols].isnull().sum() / len(feature_cols)
        if null_ratio > self.bad_row_threshold:
            return True, f"缺失值比例过高: {null_ratio:.2%}"

        for col in feature_cols:
            val = row[col]
            if pd.notna(val):
                try:
                    float_val = float(val)
                    if np.isinf(float_val):
                        return True, f"特征 {col} 包含无穷大值"
                except (ValueError, TypeError):
                    return True, f"特征 {col} 不是数值类型"

        threshold = self.version.thresholds
        for col in feature_cols:
            if col in threshold:
                th = threshold[col]
                val = row[col]
                if pd.notna(val):
                    if th.min_value is not None and float(val) < th.min_value:
                        return True, f"特征 {col} 低于阈值下限: {val} < {th.min_value}"
                    if th.max_value is not None and float(val) > th.max_value:
                        return True, f"特征 {col} 高于阈值上限: {val} > {th.max_value}"

        return False, ""

    def _detect_boundary(
        self,
        row: pd.Series,
        feature_cols: List[str],
        metrics: SnapshotMetrics
    ) -> bool:
        for col in feature_cols:
            val = row[col]
            if pd.isna(val):
                continue
            if col in metrics.mean_values and col in metrics.std_values:
                mean = metrics.mean_values[col]
                std = metrics.std_values[col]
                if std > 0:
                    z_score = abs(float(val) - mean) / std
                    if z_score > 2.5 and z_score < 4.0:
                        return True

                if col in metrics.min_values and col in metrics.max_values:
                    min_val = metrics.min_values[col]
                    max_val = metrics.max_values[col]
                    val_range = max_val - min_val
                    if val_range > 0:
                        distance = min(float(val) - min_val, max_val - float(val))
                        if distance / val_range < self.boundary_threshold:
                            return True

        return False

    def _calculate_metrics(self, df: pd.DataFrame, feature_cols: List[str]) -> SnapshotMetrics:
        metrics = SnapshotMetrics()
        for col in feature_cols:
            vals = pd.to_numeric(df[col], errors="coerce")
            metrics.mean_values[col] = float(vals.mean()) if vals.notna().any() else 0.0
            metrics.std_values[col] = float(vals.std()) if vals.notna().any() else 0.0
            metrics.min_values[col] = float(vals.min()) if vals.notna().any() else 0.0
            metrics.max_values[col] = float(vals.max()) if vals.notna().any() else 0.0
            metrics.null_counts[col] = int(vals.isnull().sum())
            if metrics.std_values[col] > 0:
                z_scores = (vals - metrics.mean_values[col]) / metrics.std_values[col]
                metrics.outlier_counts[col] = int((abs(z_scores) > 3).sum())
            else:
                metrics.outlier_counts[col] = 0
        return metrics

    def _apply_gray_flag(
        self,
        row: pd.Series,
        idx: int,
        total_rows: int,
        gray_ratio_config: Optional[float]
    ) -> Tuple[GrayFlag, Optional[float]]:
        if gray_ratio_config is None:
            return GrayFlag.NORMAL, None

        if gray_ratio_config < 0 or gray_ratio_config > 1:
            return GrayFlag.GRAY_ERROR, gray_ratio_config

        if gray_ratio_config == 0:
            return GrayFlag.NORMAL, gray_ratio_config

        if gray_ratio_config == 1.0:
            return GrayFlag.GRAY_ENABLED, gray_ratio_config

        if idx < int(total_rows * gray_ratio_config):
            return GrayFlag.GRAY_CANDIDATE, gray_ratio_config

        return GrayFlag.NORMAL, gray_ratio_config

    def _detect_modification(
        self,
        row: pd.Series,
        feature_cols: List[str]
    ) -> Tuple[ModificationType, Optional[str]]:
        mod_note = str(row.get("modification_note", "")).lower()
        if "manual" in mod_note or "人工" in mod_note:
            return ModificationType.MANUAL_CORRECTION, str(row.get("modification_note", ""))

        if "auto" in mod_note or "自动" in mod_note:
            return ModificationType.AUTO_FIX, str(row.get("modification_note", ""))

        if "threshold" in mod_note or "阈值" in mod_note:
            return ModificationType.THRESHOLD_ADJUSTMENT, str(row.get("modification_note", ""))

        for col in feature_cols:
            orig_col = f"{col}_original"
            if orig_col in row.index and pd.notna(row[orig_col]):
                if pd.notna(row[col]) and float(row[col]) != float(row[orig_col]):
                    return ModificationType.MANUAL_CORRECTION, f"{col} 从 {row[orig_col]} 修改为 {row[col]}"

        return ModificationType.NONE, None

    def process(
        self,
        file_path: str,
        feature_cols: Optional[List[str]] = None,
        label_col: Optional[str] = None,
        sample_id_col: Optional[str] = None,
    ) -> Snapshot:
        self.stats.start_time = datetime.now()
        df = self.load_data(file_path)
        self.stats.total = len(df)

        if feature_cols is None:
            exclude_cols = ["sample_id", "label", "note", "modification_note", "skip"]
            if sample_id_col:
                exclude_cols.append(sample_id_col)
            if label_col:
                exclude_cols.append(label_col)
            feature_cols = [col for col in df.columns if col not in exclude_cols
                            and not col.endswith("_original")]

        initial_df = df.copy()
        for col in feature_cols:
            initial_df[col] = pd.to_numeric(initial_df[col], errors="coerce")
        metrics = self._calculate_metrics(initial_df, feature_cols)

        rows: List[FeatureRow] = []
        gray_ratio_config = self.version.gray_ratio_config

        for idx, row in df.iterrows():
            sample_id = str(row.get(sample_id_col if sample_id_col else "sample_id",
                                    f"row_{idx}"))

            if self._detect_skip(row, idx):
                feature_row = FeatureRow(
                    sample_id=sample_id,
                    features={},
                    status=RowStatus.SKIPPED,
                    error_message="按规则跳过",
                    source_version=self.version.version_id,
                )
                self.stats.skipped += 1
                rows.append(feature_row)
                continue

            is_bad, bad_reason = self._detect_bad_row(row, feature_cols)
            if is_bad:
                features = {col: (float(row[col]) if pd.notna(row[col]) else None)
                           for col in feature_cols}
                feature_row = FeatureRow(
                    sample_id=sample_id,
                    features=features,
                    label=float(row[label_col]) if label_col and pd.notna(row.get(label_col)) else None,
                    status=RowStatus.BAD,
                    error_message=bad_reason,
                    source_version=self.version.version_id,
                )
                self.stats.bad += 1
                rows.append(feature_row)
                continue

            features = {col: float(row[col]) for col in feature_cols if pd.notna(row[col])}
            label = float(row[label_col]) if label_col and pd.notna(row.get(label_col)) else None

            is_boundary = self._detect_boundary(row, feature_cols, metrics)
            if is_boundary:
                self.stats.boundary += 1

            gray_flag, actual_gray_ratio = self._apply_gray_flag(
                row, idx, len(df), gray_ratio_config
            )
            if gray_flag == GrayFlag.GRAY_CANDIDATE:
                self.stats.gray_candidate += 1
            elif gray_flag == GrayFlag.GRAY_ENABLED:
                self.stats.gray_enabled += 1
            elif gray_flag == GrayFlag.GRAY_ERROR:
                self.stats.gray_error += 1

            mod_type, mod_note = self._detect_modification(row, feature_cols)
            if mod_type == ModificationType.MANUAL_CORRECTION:
                self.stats.manual_corrections += 1
            elif mod_type == ModificationType.AUTO_FIX:
                self.stats.auto_fixes += 1
            elif mod_type == ModificationType.THRESHOLD_ADJUSTMENT:
                self.stats.threshold_adjustments += 1

            actual_ratio = actual_gray_ratio if actual_gray_ratio is not None else self.version.gray_ratio

            feature_row = FeatureRow(
                sample_id=sample_id,
                features=features,
                label=label,
                status=RowStatus.BOUNDARY if is_boundary else RowStatus.PROCESSED,
                gray_flag=gray_flag,
                gray_ratio=actual_ratio,
                modification_type=mod_type,
                modification_note=mod_note,
                source_version=self.version.version_id,
                is_boundary=is_boundary,
                metadata={"row_index": idx},
            )
            self.stats.processed += 1
            rows.append(feature_row)

        self.stats.end_time = datetime.now()
        self.version.gray_ratio = self.stats.gray_rate

        snapshot = Snapshot(
            version=self.version,
            rows=rows,
            stats=self.stats,
            metrics=metrics,
            source_file=file_path,
        )

        return snapshot

    def filter_rows(
        self,
        snapshot: Snapshot,
        status_filter: Optional[List[RowStatus]] = None,
        gray_filter: Optional[List[GrayFlag]] = None,
        modification_filter: Optional[List[ModificationType]] = None,
        boundary_only: bool = False,
    ) -> List[FeatureRow]:
        filtered = snapshot.rows

        if status_filter:
            filtered = [r for r in filtered if r.status in status_filter]

        if gray_filter:
            filtered = [r for r in filtered if r.gray_flag in gray_filter]

        if modification_filter:
            filtered = [r for r in filtered if r.modification_type in modification_filter]

        if boundary_only:
            filtered = [r for r in filtered if r.is_boundary]

        return filtered
