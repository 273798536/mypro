"""特征预处理模块 - 标准化、缺失值处理、异常值检测"""

from typing import Optional, List, Dict, Any, Tuple
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler
from sklearn.ensemble import IsolationForest

from .exceptions import ScalingError, OutlierError, SourceLocation
from .data_loader import DataSource
from .audit import AuditTrail, ActionType, Severity
from .config import StandardizationRule, OutlierConfig, Constants, QualityThresholds


class PreprocessingResult:
    """预处理结果"""

    def __init__(self):
        self.scaled_df: Optional[pd.DataFrame] = None
        self.original_df: Optional[pd.DataFrame] = None
        self.feature_columns: List[str] = []
        self.scaler: Optional[Any] = None
        self.scaler_type: str = "none"
        self.scaler_params: Dict[str, Any] = {}
        self.missing_value_corrections: List[Dict[str, Any]] = []
        self.outlier_info: Dict[str, Any] = {}
        self.feature_stats_before: Dict[str, Dict[str, float]] = {}
        self.feature_stats_after: Dict[str, Dict[str, float]] = {}
        self.applied_rules: List[Dict[str, Any]] = []
        self.warnings: List[Dict[str, Any]] = []
        self.errors: List[Dict[str, Any]] = []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "feature_columns": self.feature_columns,
            "scaler_type": self.scaler_type,
            "scaler_params": self.scaler_params,
            "missing_value_corrections": self.missing_value_corrections,
            "outlier_info": self.outlier_info,
            "feature_stats_before": self.feature_stats_before,
            "feature_stats_after": self.feature_stats_after,
            "applied_rules": self.applied_rules,
            "warnings": self.warnings,
            "errors": self.errors,
        }


class FeaturePreprocessor:
    """特征预处理器"""

    def __init__(
        self,
        data_source: DataSource,
        audit_trail: Optional[AuditTrail] = None,
        standardization_rule: Optional[StandardizationRule] = None,
        outlier_config: Optional[OutlierConfig] = None,
        thresholds: Optional[QualityThresholds] = None,
    ):
        self.data_source = data_source
        self.df = data_source.df.copy()
        self.audit_trail = audit_trail or AuditTrail()
        self.standardization_rule = standardization_rule or StandardizationRule()
        self.outlier_config = outlier_config or OutlierConfig()
        self.thresholds = thresholds or QualityThresholds()

    def preprocess(
        self,
        feature_columns: Optional[List[str]] = None,
        exclude_columns: Optional[List[str]] = None,
        handle_missing: str = "mean",
        detect_outliers: bool = True,
    ) -> PreprocessingResult:
        """执行完整的预处理流程

        Args:
            feature_columns: 要使用的特征列，None表示使用所有数值列
            exclude_columns: 要排除的列
            handle_missing: 缺失值处理策略: drop, mean, median, mode, zero
            detect_outliers: 是否检测异常值

        Returns:
            PreprocessingResult
        """
        result = PreprocessingResult()
        result.original_df = self.df.copy()

        feature_columns = self._select_feature_columns(feature_columns, exclude_columns)
        result.feature_columns = feature_columns

        self._compute_feature_stats_before(result, feature_columns)

        self._handle_missing_values(result, feature_columns, handle_missing)

        self._check_negative_values(result, feature_columns)

        if detect_outliers:
            self._detect_outliers(result, feature_columns)

        self._standardize_features(result, feature_columns)

        self._compute_feature_stats_after(result, feature_columns)

        self._verify_scaling_quality(result, feature_columns)

        self._log_preprocessing_result(result)

        return result

    def _select_feature_columns(
        self,
        feature_columns: Optional[List[str]],
        exclude_columns: Optional[List[str]],
    ) -> List[str]:
        """选择特征列"""
        if feature_columns is None:
            feature_columns = self.df.select_dtypes(include=[np.number]).columns.tolist()

        if exclude_columns:
            feature_columns = [col for col in feature_columns if col not in exclude_columns]

        if self.standardization_rule.exclude_features:
            feature_columns = [
                col
                for col in feature_columns
                if col not in self.standardization_rule.exclude_features
            ]

        if self.standardization_rule.features:
            feature_columns = [
                col for col in feature_columns if col in self.standardization_rule.features
            ]

        missing_cols = [col for col in feature_columns if col not in self.df.columns]
        if missing_cols:
            location = self.data_source.get_location()
            raise ScalingError(
                f"特征列不存在: {', '.join(missing_cols)}",
                location=location,
                missing_columns=missing_cols,
            )

        return feature_columns

    def _compute_feature_stats_before(
        self, result: PreprocessingResult, feature_columns: List[str]
    ):
        """计算标准化前的特征统计量"""
        for col in feature_columns:
            data = self.df[col].dropna()
            if len(data) > 0:
                result.feature_stats_before[col] = {
                    "mean": float(data.mean()),
                    "std": float(data.std()),
                    "min": float(data.min()),
                    "max": float(data.max()),
                    "range": float(data.max() - data.min()),
                    "median": float(data.median()),
                    "count": int(len(data)),
                    "missing": int(self.df[col].isna().sum()),
                }

    def _handle_missing_values(
        self,
        result: PreprocessingResult,
        feature_columns: List[str],
        strategy: str,
    ):
        """处理缺失值"""
        if strategy not in Constants.MISSING_VALUE_STRATEGIES:
            location = self.data_source.get_location()
            raise ScalingError(
                f"不支持的缺失值处理策略: {strategy}",
                location=location,
                supported_strategies=Constants.MISSING_VALUE_STRATEGIES,
            )

        for col in feature_columns:
            missing_mask = self.df[col].isna()
            missing_count = missing_mask.sum()

            if missing_count == 0:
                continue

            missing_indices = self.df[missing_mask].index.tolist()

            if strategy == "drop":
                for idx in missing_indices:
                    location = self.data_source.get_cell_location(idx, col)
                    result.missing_value_corrections.append(
                        {
                            "column": col,
                            "row_index": idx,
                            "row_number": location.row_number,
                            "action": "dropped",
                            "before": None,
                            "after": None,
                            "location": str(location),
                        }
                    )
                self.df = self.df.dropna(subset=[col]).reset_index(drop=True)
                self.audit_trail.log_correction(
                    message=f"删除列 '{col}' 中的 {missing_count} 个缺失值（行已删除）",
                    source_location=self.data_source.get_column_location(col),
                    before_value=None,
                    after_value=None,
                    column=col,
                    missing_count=missing_count,
                )

            else:
                if strategy == "mean":
                    fill_value = self.df[col].mean()
                elif strategy == "median":
                    fill_value = self.df[col].median()
                elif strategy == "mode":
                    fill_value = self.df[col].mode().iloc[0] if not self.df[col].mode().empty else 0
                elif strategy == "zero":
                    fill_value = 0.0
                else:
                    fill_value = 0.0

                for idx in missing_indices[:10]:
                    location = self.data_source.get_cell_location(idx, col)
                    result.missing_value_corrections.append(
                        {
                            "column": col,
                            "row_index": idx,
                            "row_number": location.row_number,
                            "action": f"imputed_{strategy}",
                            "before": None,
                            "after": float(fill_value),
                            "location": str(location),
                        }
                    )
                    self.audit_trail.log_correction(
                        message=f"用{strategy}值填充缺失值",
                        source_location=location,
                        before_value=None,
                        after_value=fill_value,
                        column=col,
                        strategy=strategy,
                    )

                self.df[col] = self.df[col].fillna(fill_value)

                if missing_count > 10:
                    self.audit_trail.log_correction(
                        message=f"列 '{col}' 共填充 {missing_count} 个缺失值（仅显示前10个）",
                        source_location=self.data_source.get_column_location(col),
                        before_value=None,
                        after_value=fill_value,
                        column=col,
                        missing_count=missing_count,
                        strategy=strategy,
                    )

    def _check_negative_values(
        self, result: PreprocessingResult, feature_columns: List[str]
    ):
        """检查负值（适用于minmax等标准化方法）"""
        if self.standardization_rule.method != "minmax":
            return

        for col in feature_columns:
            neg_mask = self.df[col] < 0
            neg_count = neg_mask.sum()

            if neg_count > 0:
                neg_indices = self.df[neg_mask].index.tolist()
                location = self.data_source.get_column_location(col)

                result.warnings.append(
                    {
                        "message": Constants.ERROR_NEGATIVE_VALUE,
                        "column": col,
                        "negative_count": neg_count,
                        "location": str(location),
                    }
                )

                for idx in neg_indices[:5]:
                    cell_location = self.data_source.get_cell_location(idx, col)
                    self.audit_trail.log_warning(
                        action_type=ActionType.STANDARDIZATION,
                        message=f"MinMax标准化检测到负值: {self.df.loc[idx, col]}",
                        source_location=cell_location,
                        column=col,
                        value=float(self.df.loc[idx, col]),
                    )

                if neg_count > 5:
                    self.audit_trail.log_warning(
                        action_type=ActionType.STANDARDIZATION,
                        message=f"列 '{col}' 共检测到 {neg_count} 个负值（仅显示前5个）",
                        source_location=location,
                        column=col,
                        negative_count=neg_count,
                    )

    def _detect_outliers(
        self, result: PreprocessingResult, feature_columns: List[str]
    ):
        """检测异常值"""
        method = self.outlier_config.method
        if method == "none":
            return

        outlier_mask = pd.Series(False, index=self.df.index)
        outlier_details = {}

        if method == "iqr":
            outlier_mask, outlier_details = self._detect_outliers_iqr(
                feature_columns
            )
        elif method == "zscore":
            outlier_mask, outlier_details = self._detect_outliers_zscore(
                feature_columns
            )
        elif method == "isolation_forest":
            outlier_mask, outlier_details = self._detect_outliers_isolation_forest(
                feature_columns
            )

        outlier_count = outlier_mask.sum()
        outlier_indices = self.df[outlier_mask].index.tolist()

        result.outlier_info = {
            "method": method,
            "total_count": int(outlier_count),
            "outlier_indices": [int(i) for i in outlier_indices],
            "outlier_rows": [
                self.data_source.original_row_numbers[i]
                for i in outlier_indices
                if i < len(self.data_source.original_row_numbers)
            ],
            "details": outlier_details,
            "threshold": self._get_outlier_threshold(),
        }

        if outlier_count > 0:
            self.audit_trail.log_warning(
                action_type=ActionType.OUTLIER_DETECTION,
                message=Constants.WARNING_OUTLIERS,
                source_location=self.data_source.get_location(),
                method=method,
                outlier_count=int(outlier_count),
                outlier_rows=result.outlier_info["outlier_rows"][:10],
            )

            for idx in outlier_indices[:10]:
                location = self.data_source.get_row_location(idx)
                self.audit_trail.add_entry(
                    ActionType.OUTLIER_DETECTION,
                    Severity.WARNING,
                    message="检测到潜在异常值样本",
                    source_location=location,
                    row_index=int(idx),
                    features={
                        col: float(self.df.loc[idx, col])
                        for col in feature_columns
                        if col in self.df.columns
                    },
                )

            if outlier_count > 10:
                self.audit_trail.log_warning(
                    action_type=ActionType.OUTLIER_DETECTION,
                    message=f"共检测到 {outlier_count} 个潜在异常值样本（仅显示前10个）",
                    source_location=self.data_source.get_location(),
                    total_outliers=int(outlier_count),
                )

    def _detect_outliers_iqr(
        self, feature_columns: List[str]
    ) -> Tuple[pd.Series, Dict[str, Any]]:
        """使用IQR方法检测异常值"""
        threshold = self.outlier_config.iqr_threshold
        outlier_mask = pd.Series(False, index=self.df.index)
        details = {}

        for col in feature_columns:
            data = self.df[col]
            q1 = data.quantile(0.25)
            q3 = data.quantile(0.75)
            iqr = q3 - q1
            lower_bound = q1 - threshold * iqr
            upper_bound = q3 + threshold * iqr

            col_outliers = (data < lower_bound) | (data > upper_bound)
            outlier_mask |= col_outliers

            details[col] = {
                "q1": float(q1),
                "q3": float(q3),
                "iqr": float(iqr),
                "lower_bound": float(lower_bound),
                "upper_bound": float(upper_bound),
                "outlier_count": int(col_outliers.sum()),
                "threshold": threshold,
            }

        return outlier_mask, details

    def _detect_outliers_zscore(
        self, feature_columns: List[str]
    ) -> Tuple[pd.Series, Dict[str, Any]]:
        """使用Z-score方法检测异常值"""
        threshold = self.outlier_config.zscore_threshold
        outlier_mask = pd.Series(False, index=self.df.index)
        details = {}

        for col in feature_columns:
            data = self.df[col]
            mean = data.mean()
            std = data.std()

            if std == 0:
                details[col] = {
                    "mean": float(mean),
                    "std": 0.0,
                    "outlier_count": 0,
                    "note": "标准差为0，跳过检测",
                }
                continue

            z_scores = abs((data - mean) / std)
            col_outliers = z_scores > threshold
            outlier_mask |= col_outliers

            details[col] = {
                "mean": float(mean),
                "std": float(std),
                "threshold": threshold,
                "outlier_count": int(col_outliers.sum()),
                "max_zscore": float(z_scores.max()),
            }

        return outlier_mask, details

    def _detect_outliers_isolation_forest(
        self, feature_columns: List[str]
    ) -> Tuple[pd.Series, Dict[str, Any]]:
        """使用Isolation Forest检测异常值"""
        contamination = self.outlier_config.isolation_forest_contamination
        details = {}

        try:
            X = self.df[feature_columns].values
            iso_forest = IsolationForest(
                contamination=contamination,
                random_state=42,
            )
            predictions = iso_forest.fit_predict(X)
            outlier_mask = pd.Series(predictions == -1, index=self.df.index)
            scores = iso_forest.score_samples(X)

            details = {
                "contamination": contamination,
                "anomaly_scores": {
                    "min": float(scores.min()),
                    "max": float(scores.max()),
                    "mean": float(scores.mean()),
                },
            }

            return outlier_mask, details

        except Exception as e:
            self.audit_trail.log_warning(
                action_type=ActionType.OUTLIER_DETECTION,
                message=f"Isolation Forest检测失败，回退到IQR方法: {str(e)}",
                source_location=self.data_source.get_location(),
            )
            return self._detect_outliers_iqr(feature_columns)

    def _get_outlier_threshold(self) -> float:
        """获取异常值检测阈值"""
        if self.outlier_config.method == "iqr":
            return self.outlier_config.iqr_threshold
        elif self.outlier_config.method == "zscore":
            return self.outlier_config.zscore_threshold
        elif self.outlier_config.method == "isolation_forest":
            return self.outlier_config.isolation_forest_contamination
        return 0.0

    def _standardize_features(
        self, result: PreprocessingResult, feature_columns: List[str]
    ):
        """标准化特征"""
        method = self.standardization_rule.method

        if method == "none" or not feature_columns:
            result.scaled_df = self.df[feature_columns].copy()
            result.scaler_type = "none"
            result.applied_rules.append(
                {
                    "method": "none",
                    "features": feature_columns,
                    "note": "未应用标准化",
                }
            )
            return

        X = self.df[feature_columns].values

        if method == "zscore":
            scaler = StandardScaler(
                with_mean=self.standardization_rule.with_mean,
                with_std=self.standardization_rule.with_std,
            )
        elif method == "minmax":
            scaler = MinMaxScaler(
                feature_range=(
                    self.standardization_rule.min_value,
                    self.standardization_rule.max_value,
                )
            )
        elif method == "robust":
            scaler = RobustScaler()
        else:
            location = self.data_source.get_location()
            raise ScalingError(
                f"不支持的标准化方法: {method}",
                location=location,
                supported_methods=Constants.STANDARDIZATION_METHODS,
            )

        try:
            X_scaled = scaler.fit_transform(X)
            scaled_df = pd.DataFrame(X_scaled, columns=feature_columns, index=self.df.index)

            result.scaled_df = scaled_df
            result.scaler = scaler
            result.scaler_type = method
            result.scaler_params = self._get_scaler_params(scaler, method, feature_columns)
            result.applied_rules.append(
                {
                    "method": method,
                    "features": feature_columns,
                    "params": result.scaler_params,
                }
            )

            self.audit_trail.log_info(
                action_type=ActionType.STANDARDIZATION,
                message=f"成功应用 {method} 标准化",
                source_location=self.data_source.get_location(),
                method=method,
                features=feature_columns,
            )

        except Exception as e:
            location = self.data_source.get_location()
            raise ScalingError(
                f"标准化失败: {str(e)}",
                location=location,
                method=method,
            ) from e

    def _get_scaler_params(
        self, scaler: Any, method: str, feature_columns: List[str]
    ) -> Dict[str, Any]:
        """获取标准化器参数"""
        params = {}

        if method == "zscore":
            params = {
                "mean_": {
                    col: float(scaler.mean_[i]) for i, col in enumerate(feature_columns)
                },
                "scale_": {
                    col: float(scaler.scale_[i]) for i, col in enumerate(feature_columns)
                },
                "var_": {
                    col: float(scaler.var_[i]) for i, col in enumerate(feature_columns)
                },
            }
        elif method == "minmax":
            params = {
                "min_": {
                    col: float(scaler.min_[i]) for i, col in enumerate(feature_columns)
                },
                "scale_": {
                    col: float(scaler.scale_[i]) for i, col in enumerate(feature_columns)
                },
                "data_min_": {
                    col: float(scaler.data_min_[i]) for i, col in enumerate(feature_columns)
                },
                "data_max_": {
                    col: float(scaler.data_max_[i]) for i, col in enumerate(feature_columns)
                },
            }
        elif method == "robust":
            params = {
                "center_": {
                    col: float(scaler.center_[i]) for i, col in enumerate(feature_columns)
                },
                "scale_": {
                    col: float(scaler.scale_[i]) for i, col in enumerate(feature_columns)
                },
            }

        return params

    def _compute_feature_stats_after(
        self, result: PreprocessingResult, feature_columns: List[str]
    ):
        """计算标准化后的特征统计量"""
        if result.scaled_df is None:
            return

        for col in feature_columns:
            data = result.scaled_df[col].dropna()
            if len(data) > 0:
                result.feature_stats_after[col] = {
                    "mean": float(data.mean()),
                    "std": float(data.std()),
                    "min": float(data.min()),
                    "max": float(data.max()),
                    "range": float(data.max() - data.min()),
                    "median": float(data.median()),
                }

    def _verify_scaling_quality(
        self, result: PreprocessingResult, feature_columns: List[str]
    ):
        """验证标准化质量"""
        if result.scaled_df is None or result.scaler_type == "none":
            return

        for col in feature_columns:
            after = result.feature_stats_after.get(col, {})
            before = result.feature_stats_before.get(col, {})

            if result.scaler_type == "zscore":
                if abs(after.get("mean", 0)) > 0.01:
                    location = self.data_source.get_column_location(col)
                    result.warnings.append(
                        {
                            "message": f"Z-score标准化后均值偏离0: {after.get('mean', 0):.4f}",
                            "column": col,
                            "mean_after": after.get("mean", 0),
                            "location": str(location),
                        }
                    )
                    self.audit_trail.log_warning(
                        action_type=ActionType.STANDARDIZATION,
                        message=f"列 '{col}' Z-score标准化后均值为 {after.get('mean', 0):.4f}，偏离预期的0",
                        source_location=location,
                        column=col,
                        mean_after=after.get("mean", 0),
                    )

                if abs(after.get("std", 1) - 1) > 0.05:
                    location = self.data_source.get_column_location(col)
                    result.warnings.append(
                        {
                            "message": f"Z-score标准化后标准差偏离1: {after.get('std', 1):.4f}",
                            "column": col,
                            "std_after": after.get("std", 1),
                            "location": str(location),
                        }
                    )
                    self.audit_trail.log_warning(
                        action_type=ActionType.STANDARDIZATION,
                        message=f"列 '{col}' Z-score标准化后标准差为 {after.get('std', 1):.4f}，偏离预期的1",
                        source_location=location,
                        column=col,
                        std_after=after.get("std", 1),
                    )

            elif result.scaler_type == "minmax":
                if after.get("min", 0) < self.standardization_rule.min_value - 0.01:
                    location = self.data_source.get_column_location(col)
                    result.warnings.append(
                        {
                            "message": f"MinMax标准化后最小值低于范围: {after.get('min', 0):.4f}",
                            "column": col,
                            "min_after": after.get("min", 0),
                            "expected_min": self.standardization_rule.min_value,
                            "location": str(location),
                        }
                    )

                if after.get("max", 1) > self.standardization_rule.max_value + 0.01:
                    location = self.data_source.get_column_location(col)
                    result.warnings.append(
                        {
                            "message": f"MinMax标准化后最大值超出范围: {after.get('max', 1):.4f}",
                            "column": col,
                            "max_after": after.get("max", 1),
                            "expected_max": self.standardization_rule.max_value,
                            "location": str(location),
                        }
                    )

        if result.scaler_type != "none" and len(feature_columns) > 1:
            ranges = {}
            for col in feature_columns:
                after = result.feature_stats_after.get(col, {})
                ranges[col] = after.get("range", 0)

            if ranges:
                max_range = max(ranges.values())
                min_range = min(ranges.values())

                if min_range > 0 and max_range / min_range > 10:
                    location = self.data_source.get_location()
                    result.warnings.append(
                        {
                            "message": Constants.WARNING_SCALE_MISMATCH,
                            "max_range": max_range,
                            "min_range": min_range,
                            "ratio": max_range / min_range,
                            "location": str(location),
                        }
                    )
                    self.audit_trail.log_warning(
                        action_type=ActionType.STANDARDIZATION,
                        message=Constants.WARNING_SCALE_MISMATCH,
                        source_location=location,
                        ratio=max_range / min_range,
                    )

    def _log_preprocessing_result(self, result: PreprocessingResult):
        """记录预处理结果到审计追踪"""
        self.audit_trail.log_info(
            action_type=ActionType.STANDARDIZATION,
            message=f"预处理完成: {result.scaler_type} 标准化, {len(result.missing_value_corrections)} 个缺失值修正, {result.outlier_info.get('total_count', 0)} 个潜在异常值",
            scaler_type=result.scaler_type,
            missing_correction_count=len(result.missing_value_corrections),
            outlier_count=result.outlier_info.get("total_count", 0),
            warning_count=len(result.warnings),
        )
