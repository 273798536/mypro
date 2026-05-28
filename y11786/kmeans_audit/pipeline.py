"""主流程编排 - 整合所有模块完成完整的KMeans审计流程"""

from typing import Optional, List, Dict, Any, Tuple
import os
import pandas as pd
import numpy as np

from .data_loader import DataLoader, DataSource
from .validator import DataValidator, ValidationResult
from .preprocessor import FeaturePreprocessor, PreprocessingResult
from .clusterer import KMeansClusterer, ClusteringResult
from .metrics import QualityMetrics, QualityMetricsResult
from .interpreter import ClusterInterpreter, InterpretationResult
from .reporter import ReportGenerator
from .audit import AuditTrail, ActionType, Severity
from .config import (
    StandardizationRule,
    ClusteringConfig,
    OutlierConfig,
    QualityThresholds,
    Constants,
)
from .exceptions import KMeansAuditError, SourceLocation


class KMeansAuditPipeline:
    """KMeans分群审计完整流程"""

    def __init__(
        self,
        data_file: str,
        sheet_name: Optional[str] = None,
        config_file: Optional[str] = None,
        anomaly_file: Optional[str] = None,
        remarks_file: Optional[str] = None,
        previous_report_file: Optional[str] = None,
        audit_trail: Optional[AuditTrail] = None,
    ):
        self.data_file = data_file
        self.sheet_name = sheet_name
        self.config_file = config_file
        self.anomaly_file = anomaly_file
        self.remarks_file = remarks_file
        self.previous_report_file = previous_report_file

        self.audit_trail = audit_trail or AuditTrail()

        self.data_source: Optional[DataSource] = None
        self.loader: Optional[DataLoader] = None
        self.validator: Optional[DataValidator] = None
        self.preprocessor: Optional[FeaturePreprocessor] = None
        self.clusterer: Optional[KMeansClusterer] = None
        self.metrics_calculator: Optional[QualityMetrics] = None
        self.interpreter: Optional[ClusterInterpreter] = None
        self.reporter: Optional[ReportGenerator] = None

        self.validation_result: Optional[ValidationResult] = None
        self.preprocessing_result: Optional[PreprocessingResult] = None
        self.clustering_result: Optional[ClusteringResult] = None
        self.metrics_result: Optional[QualityMetricsResult] = None
        self.interpretation_result: Optional[InterpretationResult] = None

        self.standardization_rule: Optional[StandardizationRule] = None
        self.clustering_config: Optional[ClusteringConfig] = None
        self.outlier_config: Optional[OutlierConfig] = None
        self.thresholds: Optional[QualityThresholds] = None

        self.label_remarks: List[Dict[str, Any]] = []
        self.anomaly_records: List[Dict[str, Any]] = []
        self.previous_report: Optional[Dict[str, Any]] = None

        self._load_configs()

    def _load_configs(self):
        """加载配置文件"""
        self.loader = DataLoader(self.audit_trail)

        if self.config_file:
            try:
                config = self.loader.load_config_file(self.config_file)
                if "standardization_rules" in config:
                    self._parse_standardization_rules(config["standardization_rules"])
            except Exception as e:
                location = SourceLocation(file_path=self.config_file)
                self.audit_trail.log_warning(
                    action_type=ActionType.CONFIG_UPDATE,
                    message=f"加载配置文件失败: {str(e)}",
                    source_location=location,
                )

        if self.remarks_file:
            try:
                remarks_config = self.loader.load_config_file(self.remarks_file)
                if "label_remarks" in remarks_config:
                    self.label_remarks = remarks_config["label_remarks"]
            except Exception as e:
                location = SourceLocation(file_path=self.remarks_file)
                self.audit_trail.log_warning(
                    action_type=ActionType.CONFIG_UPDATE,
                    message=f"加载标签备注文件失败: {str(e)}",
                    source_location=location,
                )

        if self.anomaly_file:
            try:
                anomaly_config = self.loader.load_config_file(self.anomaly_file)
                if "anomaly_records" in anomaly_config:
                    self.anomaly_records = anomaly_config["anomaly_records"]
            except Exception as e:
                location = SourceLocation(file_path=self.anomaly_file)
                self.audit_trail.log_warning(
                    action_type=ActionType.CONFIG_UPDATE,
                    message=f"加载异常客户文件失败: {str(e)}",
                    source_location=location,
                )

        if self.previous_report_file:
            self.previous_report = self.loader.load_previous_report(
                self.previous_report_file
            )

        if not self.standardization_rule:
            self.standardization_rule = StandardizationRule()
        if not self.clustering_config:
            self.clustering_config = ClusteringConfig()
        if not self.outlier_config:
            self.outlier_config = OutlierConfig()
        if not self.thresholds:
            self.thresholds = QualityThresholds()

    def _parse_standardization_rules(self, rules: List[Dict[str, Any]]):
        """解析标准化规则"""
        features = []
        method = "zscore"

        for rule in rules:
            if "feature" in rule:
                features.append(rule["feature"])
            if "method" in rule and rule["method"] in Constants.STANDARDIZATION_METHODS:
                method = rule["method"]

        self.standardization_rule = StandardizationRule(
            method=method,
            features=features,
        )

    def run(
        self,
        n_clusters: int = 3,
        feature_columns: Optional[List[str]] = None,
        exclude_columns: Optional[List[str]] = None,
        customer_id_col: Optional[str] = None,
        standardization_method: str = "zscore",
        handle_missing: str = "mean",
        outlier_method: str = "iqr",
        exclude_outliers: bool = False,
        feature_importance_method: str = "f_value",
        stop_on_error: bool = True,
    ) -> Dict[str, Any]:
        """执行完整的审计流程

        Args:
            n_clusters: 聚类数
            feature_columns: 指定使用的特征列
            exclude_columns: 指定排除的列
            customer_id_col: 客户ID列名
            standardization_method: 标准化方法
            handle_missing: 缺失值处理策略
            outlier_method: 异常值检测方法
            exclude_outliers: 是否排除异常值
            feature_importance_method: 特征重要性方法
            stop_on_error: 遇到错误是否停止

        Returns:
            包含所有结果的字典
        """
        self.clustering_config.n_clusters = n_clusters
        self.standardization_rule.method = standardization_method
        self.outlier_config.method = outlier_method

        try:
            self._step_load_data()

            self._step_validate(feature_columns, customer_id_col, n_clusters)

            if self.validation_result and self.validation_result.has_errors():
                if stop_on_error:
                    raise KMeansAuditError(
                        f"数据验证失败，发现 {len(self.validation_result.errors)} 个错误",
                        location=self.data_source.get_location() if self.data_source else None,
                    )

            self._step_preprocess(feature_columns, exclude_columns, handle_missing, detect_outliers=True)

            self._step_cluster(exclude_outliers=exclude_outliers)

            if self.clustering_result and self.clustering_result.empty_clusters:
                if stop_on_error:
                    raise KMeansAuditError(
                        f"聚类结果存在空簇: {self.clustering_result.empty_clusters}",
                        location=self.data_source.get_location() if self.data_source else None,
                    )

            self._step_calculate_metrics()

            self._step_interpret(method=feature_importance_method)

            result_summary = self._get_result_summary()

            self.audit_trail.log_info(
                action_type=ActionType.REPORT_GENERATION,
                message="KMeans分群审计流程完成",
                n_clusters=n_clusters,
                quality=self.metrics_result.quality_assessment if self.metrics_result else "unknown",
            )

            return result_summary

        except KMeansAuditError:
            raise
        except Exception as e:
            location = self.data_source.get_location() if self.data_source else None
            raise KMeansAuditError(
                f"审计流程执行失败: {str(e)}",
                location=location,
            ) from e

    def _step_load_data(self):
        """步骤1: 加载数据"""
        self.data_source = self.loader.load(
            file_path=self.data_file,
            sheet_name=self.sheet_name,
        )

    def _step_validate(
        self,
        feature_columns: Optional[List[str]],
        customer_id_col: Optional[str],
        n_clusters: int,
    ):
        """步骤2: 数据验证"""
        self.validator = DataValidator(
            data_source=self.data_source,
            audit_trail=self.audit_trail,
            thresholds=self.thresholds,
        )

        self.validation_result = self.validator.validate_all(
            feature_columns=feature_columns,
            customer_id_col=customer_id_col,
            n_clusters=n_clusters,
        )

    def _step_preprocess(
        self,
        feature_columns: Optional[List[str]],
        exclude_columns: Optional[List[str]],
        handle_missing: str,
        detect_outliers: bool,
    ):
        """步骤3: 特征预处理"""
        self.preprocessor = FeaturePreprocessor(
            data_source=self.data_source,
            audit_trail=self.audit_trail,
            standardization_rule=self.standardization_rule,
            outlier_config=self.outlier_config,
            thresholds=self.thresholds,
        )

        self.preprocessing_result = self.preprocessor.preprocess(
            feature_columns=feature_columns,
            exclude_columns=exclude_columns,
            handle_missing=handle_missing,
            detect_outliers=detect_outliers,
        )

    def _step_cluster(self, exclude_outliers: bool = False):
        """步骤4: KMeans聚类"""
        self.clusterer = KMeansClusterer(
            data_source=self.data_source,
            preprocessing_result=self.preprocessing_result,
            audit_trail=self.audit_trail,
            clustering_config=self.clustering_config,
            thresholds=self.thresholds,
        )

        self.clustering_result = self.clusterer.cluster(
            n_clusters=self.clustering_config.n_clusters,
            exclude_outliers=exclude_outliers,
        )

    def _step_calculate_metrics(self):
        """步骤5: 计算质量指标"""
        self.metrics_calculator = QualityMetrics(
            data_source=self.data_source,
            preprocessing_result=self.preprocessing_result,
            clustering_result=self.clustering_result,
            audit_trail=self.audit_trail,
            thresholds=self.thresholds,
        )

        self.metrics_result = self.metrics_calculator.calculate_all()

    def _step_interpret(self, method: str = "f_value"):
        """步骤6: 结果解释"""
        self.interpreter = ClusterInterpreter(
            data_source=self.data_source,
            preprocessing_result=self.preprocessing_result,
            clustering_result=self.clustering_result,
            metrics_result=self.metrics_result,
            audit_trail=self.audit_trail,
            label_remarks=self.label_remarks,
        )

        self.interpretation_result = self.interpreter.interpret_all(
            method=method,
        )

    def export_report(
        self,
        output_path: str,
        format: Optional[str] = None,
        include_audit_trail: bool = True,
        include_raw_data: bool = False,
        include_sample_details: bool = True,
    ) -> str:
        """导出报告

        Args:
            output_path: 输出路径
            format: 输出格式
            include_audit_trail: 是否包含审计追踪
            include_raw_data: 是否包含原始数据
            include_sample_details: 是否包含样本详情

        Returns:
            实际输出的文件路径
        """
        self.reporter = ReportGenerator(
            data_source=self.data_source,
            audit_trail=self.audit_trail,
            validation_result=self.validation_result,
            preprocessing_result=self.preprocessing_result,
            clustering_result=self.clustering_result,
            metrics_result=self.metrics_result,
            interpretation_result=self.interpretation_result,
            anomaly_records=self.anomaly_records,
            previous_report=self.previous_report,
        )

        return self.reporter.export(
            output_path=output_path,
            format=format,
            include_audit_trail=include_audit_trail,
            include_raw_data=include_raw_data,
            include_sample_details=include_sample_details,
        )

    def _get_result_summary(self) -> Dict[str, Any]:
        """获取结果摘要"""
        return {
            "success": True,
            "n_samples": len(self.data_source.df) if self.data_source else 0,
            "n_features": len(self.preprocessing_result.feature_columns) if self.preprocessing_result else 0,
            "n_clusters": self.clustering_result.n_clusters if self.clustering_result else 0,
            "scaling_method": self.preprocessing_result.scaler_type if self.preprocessing_result else "none",
            "silhouette_score": self.metrics_result.overall_silhouette_score if self.metrics_result else None,
            "calinski_harabasz_score": self.metrics_result.calinski_harabasz_score if self.metrics_result else None,
            "davies_bouldin_score": self.metrics_result.davies_bouldin_score if self.metrics_result else None,
            "quality_assessment": self.metrics_result.quality_assessment if self.metrics_result else "unknown",
            "cluster_sizes": self.clustering_result.cluster_sizes if self.clustering_result else {},
            "empty_clusters": self.clustering_result.empty_clusters if self.clustering_result else [],
            "errors": [e["message"] for e in self.validation_result.errors] if self.validation_result else [],
            "warnings": [w.message for w in self.audit_trail.get_warnings()],
            "corrections": self.audit_trail.correction_count,
            "top_features": [
                f["feature"] for f in self.interpretation_result.feature_importance_ranked[:5]
            ] if self.interpretation_result else [],
            "outlier_count": self.preprocessing_result.outlier_info.get("total_count", 0) if self.preprocessing_result else 0,
            "audit_entries": len(self.audit_trail.entries),
        }
