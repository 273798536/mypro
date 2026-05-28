"""输入验证模块 - 全面的数据校验，保留错误位置信息"""

from typing import Optional, List, Dict, Any, Tuple
import pandas as pd
import numpy as np

from .exceptions import ValidationError, SourceLocation
from .data_loader import DataSource
from .audit import AuditTrail, ActionType, Severity
from .config import Constants, QualityThresholds


class ValidationResult:
    """验证结果"""

    def __init__(self):
        self.errors: List[Dict[str, Any]] = []
        self.warnings: List[Dict[str, Any]] = []
        self.corrections: List[Dict[str, Any]] = []
        self.passed: bool = True

    def add_error(
        self,
        message: str,
        location: Optional[SourceLocation] = None,
        **kwargs,
    ):
        """添加错误"""
        self.errors.append(
            {"message": message, "location": location, "severity": "error", **kwargs}
        )
        self.passed = False

    def add_warning(
        self,
        message: str,
        location: Optional[SourceLocation] = None,
        **kwargs,
    ):
        """添加警告"""
        self.warnings.append(
            {"message": message, "location": location, "severity": "warning", **kwargs}
        )

    def add_correction(
        self,
        message: str,
        location: Optional[SourceLocation] = None,
        before_value: Any = None,
        after_value: Any = None,
        **kwargs,
    ):
        """添加修正记录"""
        self.corrections.append(
            {
                "message": message,
                "location": location,
                "before_value": before_value,
                "after_value": after_value,
                **kwargs,
            }
        )

    def has_errors(self) -> bool:
        """是否有错误"""
        return len(self.errors) > 0

    def has_warnings(self) -> bool:
        """是否有警告"""
        return len(self.warnings) > 0

    def has_corrections(self) -> bool:
        """是否有修正"""
        return len(self.corrections) > 0

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "passed": self.passed,
            "error_count": len(self.errors),
            "warning_count": len(self.warnings),
            "correction_count": len(self.corrections),
            "errors": [
                {
                    "message": e["message"],
                    "location": str(e["location"]) if e["location"] else None,
                    **{k: v for k, v in e.items() if k not in ["message", "location"]},
                }
                for e in self.errors
            ],
            "warnings": [
                {
                    "message": w["message"],
                    "location": str(w["location"]) if w["location"] else None,
                    **{k: v for k, v in w.items() if k not in ["message", "location"]},
                }
                for w in self.warnings
            ],
            "corrections": [
                {
                    "message": c["message"],
                    "location": str(c["location"]) if c["location"] else None,
                    "before_value": str(c.get("before_value")),
                    "after_value": str(c.get("after_value")),
                    **{
                        k: v
                        for k, v in c.items()
                        if k not in ["message", "location", "before_value", "after_value"]
                    },
                }
                for c in self.corrections
            ],
        }


class DataValidator:
    """数据验证器"""

    def __init__(
        self,
        data_source: DataSource,
        audit_trail: Optional[AuditTrail] = None,
        thresholds: Optional[QualityThresholds] = None,
    ):
        self.data_source = data_source
        self.df = data_source.df
        self.audit_trail = audit_trail or AuditTrail()
        self.thresholds = thresholds or QualityThresholds()

    def validate_all(
        self,
        required_columns: Optional[List[str]] = None,
        feature_columns: Optional[List[str]] = None,
        customer_id_col: Optional[str] = None,
        n_clusters: int = 3,
    ) -> ValidationResult:
        """执行所有验证"""
        result = ValidationResult()

        self._validate_basic_structure(result)
        self._validate_required_columns(result, required_columns)
        self._validate_numeric_columns(result, feature_columns)
        self._validate_missing_values(result, feature_columns)
        self._validate_feature_scales(result, feature_columns)
        self._validate_feature_variance(result, feature_columns)
        self._validate_sample_count(result, n_clusters)
        self._validate_duplicates(result, customer_id_col)
        self._validate_infinite_values(result, feature_columns)

        self._log_validation_result(result)

        return result

    def _validate_basic_structure(self, result: ValidationResult):
        """验证基本结构"""
        if self.df.empty:
            result.add_error(
                "数据集为空，无法进行聚类分析",
                location=self.data_source.get_location(),
                action="reject",
            )
            return

        if len(self.df.columns) == 0:
            result.add_error(
                "数据集中没有任何列",
                location=self.data_source.get_location(),
                action="reject",
            )

    def _validate_required_columns(
        self, result: ValidationResult, required_columns: Optional[List[str]]
    ):
        """验证必需列是否存在"""
        if not required_columns:
            return

        missing_columns = [col for col in required_columns if col not in self.df.columns]
        if missing_columns:
            result.add_error(
                f"{Constants.ERROR_MISSING_COLUMNS}: {', '.join(missing_columns)}",
                location=self.data_source.get_location(),
                missing_columns=missing_columns,
                available_columns=list(self.df.columns),
                action="reject",
            )

    def _validate_numeric_columns(
        self, result: ValidationResult, feature_columns: Optional[List[str]]
    ):
        """验证特征列是否为数值类型"""
        if not feature_columns:
            feature_columns = self.df.select_dtypes(include=[np.number]).columns.tolist()

        for col in feature_columns:
            if col not in self.df.columns:
                result.add_error(
                    f"特征列不存在: {col}",
                    location=self.data_source.get_column_location(col),
                    action="reject",
                )
                continue

            if not pd.api.types.is_numeric_dtype(self.df[col]):
                result.add_error(
                    f"{Constants.ERROR_INVALID_DATA_TYPE}: 列 '{col}' 不是数值类型，实际类型: {self.df[col].dtype}",
                    location=self.data_source.get_column_location(col),
                    column=col,
                    dtype=str(self.df[col].dtype),
                    action="reject",
                )

    def _validate_missing_values(
        self, result: ValidationResult, feature_columns: Optional[List[str]]
    ):
        """验证缺失值"""
        if not feature_columns:
            feature_columns = self.df.select_dtypes(include=[np.number]).columns.tolist()

        for col in feature_columns:
            if col not in self.df.columns:
                continue

            missing_mask = self.df[col].isna()
            missing_count = missing_mask.sum()

            if missing_count > 0:
                missing_rows = self.df[missing_mask].index.tolist()

                for row_idx in missing_rows[:5]:
                    location = self.data_source.get_cell_location(row_idx, col)
                    result.add_warning(
                        f"列 '{col}' 存在缺失值",
                        location=location,
                        column=col,
                        value=self.df.loc[row_idx, col],
                        action="warn",
                    )

                if missing_count > 5:
                    result.add_warning(
                        f"列 '{col}' 共有 {missing_count} 个缺失值（仅显示前5个）",
                        location=self.data_source.get_column_location(col),
                        column=col,
                        missing_count=missing_count,
                        action="warn",
                    )

    def _validate_feature_scales(
        self, result: ValidationResult, feature_columns: Optional[List[str]]
    ):
        """验证特征尺度差异"""
        if not feature_columns:
            feature_columns = self.df.select_dtypes(include=[np.number]).columns.tolist()

        numeric_cols = [col for col in feature_columns if col in self.df.columns]
        if len(numeric_cols) < 2:
            return

        ranges = {}
        for col in numeric_cols:
            col_data = self.df[col].dropna()
            if len(col_data) > 0:
                ranges[col] = col_data.max() - col_data.min()

        if len(ranges) < 2:
            return

        max_range = max(ranges.values())
        min_range = min(ranges.values())

        if min_range > 0 and max_range / min_range > 1000:
            large_scale_features = [
                col for col, r in ranges.items() if r > max_range / 10
            ]
            small_scale_features = [
                col for col, r in ranges.items() if r < min_range * 10
            ]

            result.add_warning(
                Constants.WARNING_SCALE_MISMATCH,
                location=self.data_source.get_location(),
                max_range=max_range,
                min_range=min_range,
                ratio=max_range / min_range,
                large_scale_features=large_scale_features,
                small_scale_features=small_scale_features,
                action="warn",
            )

            for col in large_scale_features[:3]:
                location = self.data_source.get_column_location(col)
                result.add_warning(
                    f"特征 '{col}' 尺度过大 (范围: {ranges[col]:.2e})，可能主导聚类结果",
                    location=location,
                    column=col,
                    range=ranges[col],
                    action="warn",
                )

    def _validate_feature_variance(
        self, result: ValidationResult, feature_columns: Optional[List[str]]
    ):
        """验证特征方差"""
        if not feature_columns:
            feature_columns = self.df.select_dtypes(include=[np.number]).columns.tolist()

        for col in feature_columns:
            if col not in self.df.columns:
                continue

            col_data = self.df[col].dropna()
            if len(col_data) < 2:
                continue

            variance = col_data.var()
            if variance < self.thresholds.min_feature_variance:
                location = self.data_source.get_column_location(col)
                result.add_warning(
                    Constants.WARNING_LOW_VARIANCE,
                    location=location,
                    column=col,
                    variance=variance,
                    threshold=self.thresholds.min_feature_variance,
                    action="warn",
                )

    def _validate_sample_count(self, result: ValidationResult, n_clusters: int):
        """验证样本数量是否适合聚类数"""
        n_samples = len(self.df)

        if n_clusters <= 1:
            result.add_error(
                f"{Constants.ERROR_INVALID_CLUSTER_COUNT}: {n_clusters}，必须大于1",
                location=self.data_source.get_location(),
                n_clusters=n_clusters,
                action="reject",
            )
            return

        if n_clusters >= n_samples:
            result.add_error(
                f"{Constants.ERROR_INVALID_CLUSTER_COUNT}: {n_clusters}，必须小于样本数 {n_samples}",
                location=self.data_source.get_location(),
                n_clusters=n_clusters,
                n_samples=n_samples,
                action="reject",
            )
            return

        if n_samples / n_clusters < self.thresholds.min_cluster_size:
            result.add_warning(
                f"平均每个簇的样本数 ({n_samples / n_clusters:.1f}) 小于最小建议值 ({self.thresholds.min_cluster_size})",
                location=self.data_source.get_location(),
                n_samples=n_samples,
                n_clusters=n_clusters,
                avg_cluster_size=n_samples / n_clusters,
                min_cluster_size=self.thresholds.min_cluster_size,
                action="warn",
            )

    def _validate_duplicates(
        self, result: ValidationResult, customer_id_col: Optional[str]
    ):
        """验证重复记录"""
        if customer_id_col and customer_id_col in self.df.columns:
            duplicates = self.df.duplicated(subset=[customer_id_col], keep=False)
            if duplicates.any():
                dup_rows = self.df[duplicates].index.tolist()
                for row_idx in dup_rows[:5]:
                    location = self.data_source.get_row_location(row_idx)
                    result.add_warning(
                        f"发现重复的客户ID: {self.df.loc[row_idx, customer_id_col]}",
                        location=location,
                        customer_id=self.df.loc[row_idx, customer_id_col],
                        action="warn",
                    )
                if len(dup_rows) > 5:
                    result.add_warning(
                        f"共有 {len(dup_rows)} 条重复客户ID记录（仅显示前5个）",
                        location=self.data_source.get_location(),
                        duplicate_count=len(dup_rows),
                        action="warn",
                    )

        full_duplicates = self.df.duplicated(keep=False)
        if full_duplicates.any():
            dup_rows = self.df[full_duplicates].index.tolist()
            for row_idx in dup_rows[:3]:
                location = self.data_source.get_row_location(row_idx)
                result.add_warning(
                    "发现完全重复的记录",
                    location=location,
                    action="warn",
                )

    def _validate_infinite_values(
        self, result: ValidationResult, feature_columns: Optional[List[str]]
    ):
        """验证无穷大值"""
        if not feature_columns:
            feature_columns = self.df.select_dtypes(include=[np.number]).columns.tolist()

        for col in feature_columns:
            if col not in self.df.columns:
                continue

            inf_mask = np.isinf(self.df[col])
            inf_count = inf_mask.sum()

            if inf_count > 0:
                inf_rows = self.df[inf_mask].index.tolist()
                for row_idx in inf_rows[:5]:
                    location = self.data_source.get_cell_location(row_idx, col)
                    result.add_error(
                        f"列 '{col}' 包含无穷大值 (inf/-inf)",
                        location=location,
                        column=col,
                        value=self.df.loc[row_idx, col],
                        action="reject",
                    )

    def _log_validation_result(self, result: ValidationResult):
        """将验证结果记录到审计追踪"""
        for error in result.errors:
            self.audit_trail.add_entry(
                ActionType.VALIDATION,
                Severity.ERROR,
                message=error["message"],
                source_location=error.get("location"),
                **{k: v for k, v in error.items() if k not in ["message", "location", "severity"]},
            )

        for warning in result.warnings:
            self.audit_trail.add_entry(
                ActionType.VALIDATION,
                Severity.WARNING,
                message=warning["message"],
                source_location=warning.get("location"),
                **{k: v for k, v in warning.items() if k not in ["message", "location", "severity"]},
            )

        self.audit_trail.log_info(
            action_type=ActionType.VALIDATION,
            message=f"验证完成: {len(result.errors)} 个错误, {len(result.warnings)} 个警告",
            error_count=len(result.errors),
            warning_count=len(result.warnings),
            passed=result.passed,
        )
