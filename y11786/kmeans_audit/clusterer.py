"""聚类模块 - KMeans聚类，空簇检测，收敛性验证"""

from typing import Optional, List, Dict, Any, Tuple
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.exceptions import ConvergenceWarning
import warnings

from .exceptions import (
    EmptyClusterError,
    ConvergenceError,
    SourceLocation,
    OutlierError,
)
from .data_loader import DataSource
from .preprocessor import PreprocessingResult
from .audit import AuditTrail, ActionType, Severity
from .config import ClusteringConfig, QualityThresholds, Constants


class ClusteringResult:
    """聚类结果"""

    def __init__(self):
        self.labels: Optional[np.ndarray] = None
        self.centers: Optional[np.ndarray] = None
        self.inertia: float = 0.0
        self.n_iter: int = 0
        self.converged: bool = False
        self.n_clusters: int = 0
        self.cluster_sizes: Dict[int, int] = {}
        self.empty_clusters: List[int] = []
        self.cluster_info: Dict[int, Dict[str, Any]] = {}
        self.warnings: List[Dict[str, Any]] = []
        self.errors: List[Dict[str, Any]] = []
        self.kmeans_model: Optional[KMeans] = None
        self.used_samples: Optional[pd.DataFrame] = None
        self.outlier_impact: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "n_clusters": self.n_clusters,
            "inertia": float(self.inertia),
            "n_iter": int(self.n_iter),
            "converged": self.converged,
            "cluster_sizes": {str(k): int(v) for k, v in self.cluster_sizes.items()},
            "empty_clusters": [int(c) for c in self.empty_clusters],
            "cluster_info": {
                str(k): {
                    "size": int(v.get("size", 0)),
                    "percentage": float(v.get("percentage", 0)),
                    "center": [float(x) for x in v.get("center", [])],
                }
                for k, v in self.cluster_info.items()
            },
            "warnings": self.warnings,
            "errors": self.errors,
            "outlier_impact": self.outlier_impact,
        }


class KMeansClusterer:
    """KMeans聚类器"""

    def __init__(
        self,
        data_source: DataSource,
        preprocessing_result: PreprocessingResult,
        audit_trail: Optional[AuditTrail] = None,
        clustering_config: Optional[ClusteringConfig] = None,
        thresholds: Optional[QualityThresholds] = None,
    ):
        self.data_source = data_source
        self.preprocessing_result = preprocessing_result
        self.scaled_df = preprocessing_result.scaled_df
        self.audit_trail = audit_trail or AuditTrail()
        self.clustering_config = clustering_config or ClusteringConfig()
        self.thresholds = thresholds or QualityThresholds()

    def cluster(
        self,
        n_clusters: Optional[int] = None,
        exclude_outliers: bool = False,
    ) -> ClusteringResult:
        """执行KMeans聚类

        Args:
            n_clusters: 聚类数，默认使用配置中的值
            exclude_outliers: 是否排除异常值进行聚类

        Returns:
            ClusteringResult
        """
        result = ClusteringResult()

        if n_clusters is not None:
            self.clustering_config.n_clusters = n_clusters

        result.n_clusters = self.clustering_config.n_clusters

        self._validate_cluster_count(result)

        if result.errors:
            return result

        X, used_indices = self._prepare_data(result, exclude_outliers)

        result.used_samples = self.scaled_df.loc[used_indices] if used_indices is not None else self.scaled_df

        self._check_outlier_impact(result, exclude_outliers)

        kmeans = self._run_kmeans(result, X)

        if kmeans is None:
            return result

        self._analyze_clusters(result, kmeans, used_indices)

        self._check_empty_clusters(result)

        self._check_cluster_balance(result)

        self._check_convergence(result, kmeans)

        self._log_clustering_result(result)

        return result

    def _validate_cluster_count(self, result: ClusteringResult):
        """验证聚类数"""
        n_clusters = self.clustering_config.n_clusters
        n_samples = len(self.scaled_df) if self.scaled_df is not None else 0

        if n_clusters <= 1:
            location = self.data_source.get_location()
            result.errors.append(
                {
                    "message": f"{Constants.ERROR_INVALID_CLUSTER_COUNT}: {n_clusters}，必须大于1",
                    "location": str(location),
                    "n_clusters": n_clusters,
                    "action": "reject",
                }
            )
            self.audit_trail.log_error(
                action_type=ActionType.CLUSTERING,
                message=f"聚类数无效: {n_clusters}",
                source_location=location,
                n_clusters=n_clusters,
            )
            return

        if n_clusters >= n_samples:
            location = self.data_source.get_location()
            result.errors.append(
                {
                    "message": f"{Constants.ERROR_INVALID_CLUSTER_COUNT}: {n_clusters}，必须小于样本数 {n_samples}",
                    "location": str(location),
                    "n_clusters": n_clusters,
                    "n_samples": n_samples,
                    "action": "reject",
                }
            )
            self.audit_trail.log_error(
                action_type=ActionType.CLUSTERING,
                message=f"聚类数 ({n_clusters}) 大于等于样本数 ({n_samples})",
                source_location=location,
                n_clusters=n_clusters,
                n_samples=n_samples,
            )
            return

        avg_size = n_samples / n_clusters
        if avg_size < self.thresholds.min_cluster_size:
            location = self.data_source.get_location()
            result.warnings.append(
                {
                    "message": f"平均簇大小 ({avg_size:.1f}) 小于建议最小值 ({self.thresholds.min_cluster_size})",
                    "location": str(location),
                    "avg_cluster_size": avg_size,
                    "min_cluster_size": self.thresholds.min_cluster_size,
                    "action": "warn",
                }
            )
            self.audit_trail.log_warning(
                action_type=ActionType.CLUSTERING,
                message=f"平均簇大小过小: {avg_size:.1f}",
                source_location=location,
                avg_cluster_size=avg_size,
                min_cluster_size=self.thresholds.min_cluster_size,
            )

    def _prepare_data(
        self, result: ClusteringResult, exclude_outliers: bool
    ) -> Tuple[np.ndarray, Optional[pd.Index]]:
        """准备聚类数据"""
        if self.scaled_df is None or self.scaled_df.empty:
            location = self.data_source.get_location()
            result.errors.append(
                {
                    "message": "没有可用于聚类的数据",
                    "location": str(location),
                    "action": "reject",
                }
            )
            raise EmptyClusterError(
                "没有可用于聚类的数据",
                location=location,
            )

        used_indices = None

        if exclude_outliers and self.preprocessing_result.outlier_info:
            outlier_indices = self.preprocessing_result.outlier_info.get("outlier_indices", [])
            if outlier_indices:
                used_indices = self.scaled_df.index.difference(outlier_indices)
                if len(used_indices) == 0:
                    location = self.data_source.get_location()
                    result.errors.append(
                        {
                            "message": "排除异常值后没有剩余样本",
                            "location": str(location),
                            "outlier_count": len(outlier_indices),
                            "action": "reject",
                        }
                    )
                    raise OutlierError(
                        "排除异常值后没有剩余样本",
                        location=location,
                    )

                self.audit_trail.log_info(
                    action_type=ActionType.CLUSTERING,
                    message=f"排除 {len(outlier_indices)} 个异常值后使用 {len(used_indices)} 个样本进行聚类",
                    source_location=self.data_source.get_location(),
                    excluded_outliers=len(outlier_indices),
                    used_samples=len(used_indices),
                )

        X = (
            self.scaled_df.loc[used_indices].values
            if used_indices is not None
            else self.scaled_df.values
        )

        return X, used_indices

    def _check_outlier_impact(self, result: ClusteringResult, exclude_outliers: bool):
        """检查异常值对聚类的潜在影响"""
        outlier_info = self.preprocessing_result.outlier_info
        if not outlier_info:
            return

        outlier_count = outlier_info.get("total_count", 0)
        total_count = len(self.scaled_df) if self.scaled_df is not None else 0

        if total_count == 0:
            return

        outlier_ratio = outlier_count / total_count

        result.outlier_impact = {
            "outlier_count": int(outlier_count),
            "total_count": int(total_count),
            "ratio": float(outlier_ratio),
            "excluded": exclude_outliers,
            "risk_level": self._assess_outlier_risk(outlier_ratio),
        }

        if outlier_ratio > 0.1 and not exclude_outliers:
            location = self.data_source.get_location()
            result.warnings.append(
                {
                    "message": Constants.WARNING_OUTLIERS,
                    "location": str(location),
                    "outlier_ratio": outlier_ratio,
                    "outlier_count": outlier_count,
                    "suggestion": "建议考虑排除异常值或使用更鲁棒的聚类方法",
                    "action": "warn",
                }
            )
            self.audit_trail.log_warning(
                action_type=ActionType.OUTLIER_DETECTION,
                message=f"异常值比例过高 ({outlier_ratio:.1%})，可能拉偏聚类结果",
                source_location=location,
                outlier_ratio=outlier_ratio,
                outlier_count=outlier_count,
            )

    def _assess_outlier_risk(self, ratio: float) -> str:
        """评估异常值风险等级"""
        if ratio < 0.01:
            return "low"
        elif ratio < 0.05:
            return "medium"
        elif ratio < 0.1:
            return "high"
        else:
            return "critical"

    def _run_kmeans(self, result: ClusteringResult, X: np.ndarray) -> Optional[KMeans]:
        """运行KMeans聚类"""
        config = self.clustering_config

        try:
            with warnings.catch_warnings(record=True) as w:
                warnings.simplefilter("always")

                kmeans = KMeans(
                    n_clusters=config.n_clusters,
                    init=config.init,
                    n_init=config.n_init,
                    max_iter=config.max_iter,
                    tol=config.tol,
                    random_state=config.random_state,
                    algorithm=config.algorithm,
                )

                labels = kmeans.fit_predict(X)

                for warning in w:
                    if issubclass(warning.category, ConvergenceWarning):
                        location = self.data_source.get_location()
                        result.warnings.append(
                            {
                                "message": f"聚类算法可能未收敛: {str(warning.message)}",
                                "location": str(location),
                                "max_iter": config.max_iter,
                                "action": "warn",
                            }
                        )
                        self.audit_trail.log_warning(
                            action_type=ActionType.CLUSTERING,
                            message=f"KMeans未在 {config.max_iter} 次迭代内收敛",
                            source_location=location,
                            max_iter=config.max_iter,
                        )

                result.labels = labels
                result.centers = kmeans.cluster_centers_
                result.inertia = kmeans.inertia_
                result.n_iter = kmeans.n_iter_
                result.converged = kmeans.n_iter_ < config.max_iter
                result.kmeans_model = kmeans

                self.audit_trail.log_info(
                    action_type=ActionType.CLUSTERING,
                    message=f"KMeans聚类完成，迭代 {kmeans.n_iter_} 次，惯性 {kmeans.inertia_:.4f}",
                    source_location=self.data_source.get_location(),
                    n_iter=kmeans.n_iter_,
                    inertia=float(kmeans.inertia_),
                    converged=result.converged,
                )

                return kmeans

        except Exception as e:
            location = self.data_source.get_location()
            result.errors.append(
                {
                    "message": f"聚类执行失败: {str(e)}",
                    "location": str(location),
                    "error_type": type(e).__name__,
                    "action": "reject",
                }
            )
            self.audit_trail.log_error(
                action_type=ActionType.CLUSTERING,
                message=f"KMeans聚类失败: {str(e)}",
                source_location=location,
                error_type=type(e).__name__,
            )
            raise ConvergenceError(
                f"聚类执行失败: {str(e)}",
                location=location,
            ) from e

    def _analyze_clusters(
        self,
        result: ClusteringResult,
        kmeans: KMeans,
        used_indices: Optional[pd.Index],
    ):
        """分析聚类结果"""
        labels = result.labels
        n_clusters = result.n_clusters
        total_samples = len(labels)

        for cluster_id in range(n_clusters):
            cluster_mask = labels == cluster_id
            cluster_size = cluster_mask.sum()

            result.cluster_sizes[cluster_id] = int(cluster_size)

            percentage = (cluster_size / total_samples * 100) if total_samples > 0 else 0

            center = kmeans.cluster_centers_[cluster_id].tolist() if kmeans.cluster_centers_ is not None else []

            result.cluster_info[cluster_id] = {
                "size": int(cluster_size),
                "percentage": float(percentage),
                "center": [float(x) for x in center],
                "indices": (
                    used_indices[cluster_mask].tolist()
                    if used_indices is not None
                    else np.where(cluster_mask)[0].tolist()
                ),
            }

            if cluster_size > 0:
                sample_count = min(5, cluster_size)
                original_rows = []
                if used_indices is not None:
                    cluster_data_indices = used_indices[cluster_mask][:sample_count]
                else:
                    cluster_data_indices = np.where(cluster_mask)[0][:sample_count]

                for idx in cluster_data_indices:
                    if idx < len(self.data_source.original_row_numbers):
                        original_rows.append(
                            self.data_source.original_row_numbers[idx]
                        )

                result.cluster_info[cluster_id]["sample_original_rows"] = original_rows

    def _check_empty_clusters(self, result: ClusteringResult):
        """检查空簇"""
        n_clusters = result.n_clusters
        empty_clusters = []

        for cluster_id in range(n_clusters):
            if result.cluster_sizes.get(cluster_id, 0) == 0:
                empty_clusters.append(cluster_id)

        result.empty_clusters = empty_clusters

        if empty_clusters:
            location = self.data_source.get_location()
            result.errors.append(
                {
                    "message": Constants.WARNING_EMPTY_CLUSTER,
                    "location": str(location),
                    "empty_clusters": [int(c) for c in empty_clusters],
                    "n_empty_clusters": len(empty_clusters),
                    "max_allowed": self.thresholds.max_empty_clusters,
                    "action": "reject",
                }
            )

            for cluster_id in empty_clusters:
                self.audit_trail.add_entry(
                    ActionType.CLUSTERING,
                    Severity.ERROR,
                    message=f"簇 {cluster_id} 为空，没有任何样本被分配",
                    source_location=location,
                    cluster_id=cluster_id,
                )

            if len(empty_clusters) > self.thresholds.max_empty_clusters:
                raise EmptyClusterError(
                    f"检测到 {len(empty_clusters)} 个空簇 (簇ID: {empty_clusters})，超过最大允许值 {self.thresholds.max_empty_clusters}",
                    location=location,
                    empty_clusters=empty_clusters,
                )

    def _check_cluster_balance(self, result: ClusteringResult):
        """检查簇大小平衡性"""
        cluster_sizes = list(result.cluster_sizes.values())
        if not cluster_sizes:
            return

        max_size = max(cluster_sizes)
        min_size = min(cluster_sizes)
        total_size = sum(cluster_sizes)

        if total_size == 0:
            return

        max_ratio = max_size / total_size

        if max_ratio > self.thresholds.max_cluster_size_ratio:
            location = self.data_source.get_location()
            result.warnings.append(
                {
                    "message": Constants.WARNING_IMBALANCED_CLUSTERS,
                    "location": str(location),
                    "max_cluster_ratio": max_ratio,
                    "max_cluster_size": int(max_size),
                    "min_cluster_size": int(min_size),
                    "max_min_ratio": max_size / min_size if min_size > 0 else float("inf"),
                    "action": "warn",
                }
            )
            self.audit_trail.log_warning(
                action_type=ActionType.CLUSTERING,
                message=f"簇大小严重不平衡，最大簇占比 {max_ratio:.1%}",
                source_location=location,
                max_ratio=max_ratio,
                cluster_sizes=cluster_sizes,
            )

        if min_size < self.thresholds.min_cluster_size and min_size > 0:
            small_clusters = [
                cid
                for cid, size in result.cluster_sizes.items()
                if 0 < size < self.thresholds.min_cluster_size
            ]
            for cluster_id in small_clusters:
                location = self.data_source.get_location()
                result.warnings.append(
                    {
                        "message": f"簇 {cluster_id} 样本数 ({result.cluster_sizes[cluster_id]}) 小于建议最小值 ({self.thresholds.min_cluster_size})",
                        "location": str(location),
                        "cluster_id": cluster_id,
                        "cluster_size": int(result.cluster_sizes[cluster_id]),
                        "min_cluster_size": self.thresholds.min_cluster_size,
                        "action": "warn",
                    }
                )
                self.audit_trail.log_warning(
                    action_type=ActionType.CLUSTERING,
                    message=f"簇 {cluster_id} 样本数过小: {result.cluster_sizes[cluster_id]}",
                    source_location=location,
                    cluster_id=cluster_id,
                    cluster_size=int(result.cluster_sizes[cluster_id]),
                )

    def _check_convergence(self, result: ClusteringResult, kmeans: KMeans):
        """检查收敛性"""
        if not result.converged:
            location = self.data_source.get_location()
            result.warnings.append(
                {
                    "message": f"KMeans在 {result.n_iter} 次迭代后未完全收敛，可能影响结果稳定性",
                    "location": str(location),
                    "n_iter": result.n_iter,
                    "max_iter": self.clustering_config.max_iter,
                    "action": "warn",
                }
            )
            self.audit_trail.log_warning(
                action_type=ActionType.CLUSTERING,
                message=f"KMeans未完全收敛 (迭代 {result.n_iter}/{self.clustering_config.max_iter})",
                source_location=location,
                n_iter=result.n_iter,
                max_iter=self.clustering_config.max_iter,
            )

    def _log_clustering_result(self, result: ClusteringResult):
        """记录聚类结果到审计追踪"""
        self.audit_trail.log_info(
            action_type=ActionType.CLUSTERING,
            message=f"聚类分析完成: {result.n_clusters} 个簇, {len(result.empty_clusters)} 个空簇, {len(result.warnings)} 个警告",
            n_clusters=result.n_clusters,
            cluster_sizes=result.cluster_sizes,
            empty_clusters=result.empty_clusters,
            converged=result.converged,
            inertia=float(result.inertia),
        )
