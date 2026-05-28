"""聚类质量评估模块 - 轮廓系数、CH指数、DB指数等"""

from typing import Optional, List, Dict, Any, Tuple
import pandas as pd
import numpy as np
from sklearn.metrics import (
    silhouette_score,
    silhouette_samples,
    calinski_harabasz_score,
    davies_bouldin_score,
)

from .exceptions import SourceLocation
from .data_loader import DataSource
from .preprocessor import PreprocessingResult
from .clusterer import ClusteringResult
from .audit import AuditTrail, ActionType, Severity
from .config import QualityThresholds, Constants


class QualityMetricsResult:
    """质量指标结果"""

    def __init__(self):
        self.overall_silhouette_score: Optional[float] = None
        self.sample_silhouette_scores: Optional[np.ndarray] = None
        self.per_cluster_silhouette: Dict[int, Dict[str, float]] = {}
        self.calinski_harabasz_score: Optional[float] = None
        self.davies_bouldin_score: Optional[float] = None
        self.cluster_separation: Dict[int, Dict[str, float]] = {}
        self.cluster_cohesion: Dict[int, float] = {}
        self.quality_assessment: str = "unknown"
        self.quality_scores: Dict[str, float] = {}
        self.warnings: List[Dict[str, Any]] = []
        self.low_silhouette_samples: List[Dict[str, Any]] = []
        self.negative_silhouette_samples: List[Dict[str, Any]] = []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "overall_silhouette_score": float(self.overall_silhouette_score) if self.overall_silhouette_score is not None else None,
            "per_cluster_silhouette": {
                str(k): {
                    "mean": float(v.get("mean", 0)),
                    "median": float(v.get("median", 0)),
                    "std": float(v.get("std", 0)),
                    "min": float(v.get("min", 0)),
                    "max": float(v.get("max", 0)),
                    "negative_count": int(v.get("negative_count", 0)),
                    "negative_ratio": float(v.get("negative_ratio", 0)),
                }
                for k, v in self.per_cluster_silhouette.items()
            },
            "calinski_harabasz_score": float(self.calinski_harabasz_score) if self.calinski_harabasz_score is not None else None,
            "davies_bouldin_score": float(self.davies_bouldin_score) if self.davies_bouldin_score is not None else None,
            "cluster_separation": {
                str(k): {str(kk): float(vv) for kk, vv in v.items()}
                for k, v in self.cluster_separation.items()
            },
            "cluster_cohesion": {str(k): float(v) for k, v in self.cluster_cohesion.items()},
            "quality_assessment": self.quality_assessment,
            "quality_scores": {k: float(v) for k, v in self.quality_scores.items()},
            "warnings": self.warnings,
            "low_silhouette_count": len(self.low_silhouette_samples),
            "negative_silhouette_count": len(self.negative_silhouette_samples),
        }


class QualityMetrics:
    """聚类质量评估器"""

    def __init__(
        self,
        data_source: DataSource,
        preprocessing_result: PreprocessingResult,
        clustering_result: ClusteringResult,
        audit_trail: Optional[AuditTrail] = None,
        thresholds: Optional[QualityThresholds] = None,
    ):
        self.data_source = data_source
        self.preprocessing_result = preprocessing_result
        self.clustering_result = clustering_result
        self.scaled_df = clustering_result.used_samples
        self.labels = clustering_result.labels
        self.audit_trail = audit_trail or AuditTrail()
        self.thresholds = thresholds or QualityThresholds()

    def calculate_all(self) -> QualityMetricsResult:
        """计算所有质量指标"""
        result = QualityMetricsResult()

        if self.scaled_df is None or self.labels is None:
            self.audit_trail.log_warning(
                action_type=ActionType.METRICS_CALCULATION,
                message="没有有效的聚类结果，无法计算质量指标",
                source_location=self.data_source.get_location(),
            )
            return result

        X = self.scaled_df.values
        labels = self.labels
        n_clusters = self.clustering_result.n_clusters

        unique_labels = np.unique(labels)
        if len(unique_labels) < 2:
            result.warnings.append(
                {
                    "message": "有效簇数小于2，无法计算轮廓系数等指标",
                    "n_unique_clusters": len(unique_labels),
                    "action": "warn",
                }
            )
            return result

        self._calculate_silhouette_scores(result, X, labels, unique_labels)

        self._calculate_calinski_harabasz(result, X, labels)

        self._calculate_davies_bouldin(result, X, labels)

        self._calculate_cluster_separation(result, X, labels, unique_labels)

        self._calculate_cluster_cohesion(result, X, labels, unique_labels)

        self._assess_overall_quality(result)

        self._log_metrics_result(result)

        return result

    def _calculate_silhouette_scores(
        self,
        result: QualityMetricsResult,
        X: np.ndarray,
        labels: np.ndarray,
        unique_labels: np.ndarray,
    ):
        """计算轮廓系数"""
        try:
            if len(X) > 10000:
                sample_size = min(10000, len(X))
                indices = np.random.choice(len(X), sample_size, replace=False)
                X_sample = X[indices]
                labels_sample = labels[indices]
                result.overall_silhouette_score = silhouette_score(X_sample, labels_sample)
                self.audit_trail.log_info(
                    action_type=ActionType.METRICS_CALCULATION,
                    message=f"数据量较大 ({len(X)})，使用 {sample_size} 个样本计算轮廓系数",
                    source_location=self.data_source.get_location(),
                    total_samples=len(X),
                    used_samples=sample_size,
                )
            else:
                result.overall_silhouette_score = silhouette_score(X, labels)

            result.sample_silhouette_scores = silhouette_samples(X, labels)

            for cluster_id in unique_labels:
                cluster_mask = labels == cluster_id
                cluster_silhouette = result.sample_silhouette_scores[cluster_mask]

                negative_count = (cluster_silhouette < 0).sum()
                negative_ratio = negative_count / len(cluster_silhouette) if len(cluster_silhouette) > 0 else 0

                result.per_cluster_silhouette[int(cluster_id)] = {
                    "mean": float(cluster_silhouette.mean()),
                    "median": float(np.median(cluster_silhouette)),
                    "std": float(cluster_silhouette.std()),
                    "min": float(cluster_silhouette.min()),
                    "max": float(cluster_silhouette.max()),
                    "negative_count": int(negative_count),
                    "negative_ratio": float(negative_ratio),
                }

                if negative_ratio > 0.3:
                    location = self.data_source.get_location()
                    result.warnings.append(
                        {
                            "message": f"簇 {cluster_id} 有 {negative_ratio:.1%} 的样本轮廓系数为负，可能聚类不当",
                            "cluster_id": int(cluster_id),
                            "negative_ratio": float(negative_ratio),
                            "negative_count": int(negative_count),
                            "location": str(location),
                            "action": "warn",
                        }
                    )
                    self.audit_trail.log_warning(
                        action_type=ActionType.METRICS_CALCULATION,
                        message=f"簇 {cluster_id} 负轮廓系数比例过高: {negative_ratio:.1%}",
                        source_location=location,
                        cluster_id=int(cluster_id),
                        negative_ratio=float(negative_ratio),
                    )

            self._find_problematic_samples(result, labels)

            if result.overall_silhouette_score < self.thresholds.min_silhouette_score:
                location = self.data_source.get_location()
                result.warnings.append(
                    {
                        "message": Constants.WARNING_LOW_SILHOUETTE,
                        "silhouette_score": float(result.overall_silhouette_score),
                        "threshold": self.thresholds.min_silhouette_score,
                        "location": str(location),
                        "action": "warn",
                    }
                )
                self.audit_trail.log_warning(
                    action_type=ActionType.METRICS_CALCULATION,
                    message=f"整体轮廓系数过低: {result.overall_silhouette_score:.4f}",
                    source_location=location,
                    silhouette_score=float(result.overall_silhouette_score),
                    threshold=self.thresholds.min_silhouette_score,
                )

            self.audit_trail.log_info(
                action_type=ActionType.METRICS_CALCULATION,
                message=f"整体轮廓系数: {result.overall_silhouette_score:.4f}",
                source_location=self.data_source.get_location(),
                silhouette_score=float(result.overall_silhouette_score),
            )

        except Exception as e:
            location = self.data_source.get_location()
            result.warnings.append(
                {
                    "message": f"计算轮廓系数失败: {str(e)}",
                    "error_type": type(e).__name__,
                    "location": str(location),
                    "action": "warn",
                }
            )
            self.audit_trail.log_warning(
                action_type=ActionType.METRICS_CALCULATION,
                message=f"计算轮廓系数失败: {str(e)}",
                source_location=location,
                error_type=type(e).__name__,
            )

    def _find_problematic_samples(
        self, result: QualityMetricsResult, labels: np.ndarray
    ):
        """找出有问题的样本（轮廓系数低或为负）"""
        if result.sample_silhouette_scores is None:
            return

        silhouette_scores = result.sample_silhouette_scores
        used_indices = (
            self.clustering_result.used_samples.index
            if self.clustering_result.used_samples is not None
            else range(len(labels))
        )

        for i, score in enumerate(silhouette_scores):
            original_idx = used_indices[i] if hasattr(used_indices, '__getitem__') else i
            original_row = (
                self.data_source.original_row_numbers[original_idx]
                if original_idx < len(self.data_source.original_row_numbers)
                else None
            )

            if score < 0:
                location = self.data_source.get_row_location(original_idx)
                result.negative_silhouette_samples.append(
                    {
                        "index": int(i),
                        "original_index": int(original_idx),
                        "original_row": original_row,
                        "cluster_id": int(labels[i]),
                        "silhouette_score": float(score),
                        "location": str(location),
                    }
                )
                if len(result.negative_silhouette_samples) <= 10:
                    self.audit_trail.add_entry(
                        ActionType.METRICS_CALCULATION,
                        Severity.WARNING,
                        message=f"样本轮廓系数为负: {score:.4f}",
                        source_location=location,
                        original_row=original_row,
                        cluster_id=int(labels[i]),
                        silhouette_score=float(score),
                    )

            elif score < 0.2:
                location = self.data_source.get_row_location(original_idx)
                result.low_silhouette_samples.append(
                    {
                        "index": int(i),
                        "original_index": int(original_idx),
                        "original_row": original_row,
                        "cluster_id": int(labels[i]),
                        "silhouette_score": float(score),
                        "location": str(location),
                    }
                )

        if len(result.negative_silhouette_samples) > 10:
            self.audit_trail.log_warning(
                action_type=ActionType.METRICS_CALCULATION,
                message=f"共检测到 {len(result.negative_silhouette_samples)} 个负轮廓系数样本（仅显示前10个）",
                source_location=self.data_source.get_location(),
                total_negative=len(result.negative_silhouette_samples),
            )

    def _calculate_calinski_harabasz(
        self,
        result: QualityMetricsResult,
        X: np.ndarray,
        labels: np.ndarray,
    ):
        """计算CH指数（Calinski-Harabasz Index）"""
        try:
            result.calinski_harabasz_score = calinski_harabasz_score(X, labels)
            self.audit_trail.log_info(
                action_type=ActionType.METRICS_CALCULATION,
                message=f"CH指数: {result.calinski_harabasz_score:.4f}",
                source_location=self.data_source.get_location(),
                calinski_harabasz_score=float(result.calinski_harabasz_score),
            )
        except Exception as e:
            result.warnings.append(
                {
                    "message": f"计算CH指数失败: {str(e)}",
                    "error_type": type(e).__name__,
                }
            )
            self.audit_trail.log_warning(
                action_type=ActionType.METRICS_CALCULATION,
                message=f"计算CH指数失败: {str(e)}",
                source_location=self.data_source.get_location(),
                error_type=type(e).__name__,
            )

    def _calculate_davies_bouldin(
        self,
        result: QualityMetricsResult,
        X: np.ndarray,
        labels: np.ndarray,
    ):
        """计算DB指数（Davies-Bouldin Index）"""
        try:
            result.davies_bouldin_score = davies_bouldin_score(X, labels)
            self.audit_trail.log_info(
                action_type=ActionType.METRICS_CALCULATION,
                message=f"DB指数: {result.davies_bouldin_score:.4f}",
                source_location=self.data_source.get_location(),
                davies_bouldin_score=float(result.davies_bouldin_score),
            )
        except Exception as e:
            result.warnings.append(
                {
                    "message": f"计算DB指数失败: {str(e)}",
                    "error_type": type(e).__name__,
                }
            )
            self.audit_trail.log_warning(
                action_type=ActionType.METRICS_CALCULATION,
                message=f"计算DB指数失败: {str(e)}",
                source_location=self.data_source.get_location(),
                error_type=type(e).__name__,
            )

    def _calculate_cluster_separation(
        self,
        result: QualityMetricsResult,
        X: np.ndarray,
        labels: np.ndarray,
        unique_labels: np.ndarray,
    ):
        """计算簇间分离度"""
        centers = self.clustering_result.centers

        if centers is None:
            return

        for i, cluster_i in enumerate(unique_labels):
            result.cluster_separation[int(cluster_i)] = {}
            for j, cluster_j in enumerate(unique_labels):
                if i != j:
                    distance = np.linalg.norm(centers[i] - centers[j])
                    result.cluster_separation[int(cluster_i)][int(cluster_j)] = float(distance)

        min_separation = min(
            [
                result.cluster_separation[k1][k2]
                for k1 in result.cluster_separation
                for k2 in result.cluster_separation[k1]
            ]
        )
        max_separation = max(
            [
                result.cluster_separation[k1][k2]
                for k1 in result.cluster_separation
                for k2 in result.cluster_separation[k1]
            ]
        )

        if min_separation < 0.5:
            location = self.data_source.get_location()
            result.warnings.append(
                {
                    "message": "簇间最小分离度过小，部分簇可能过于接近",
                    "min_separation": float(min_separation),
                    "max_separation": float(max_separation),
                    "location": str(location),
                    "action": "warn",
                }
            )
            self.audit_trail.log_warning(
                action_type=ActionType.METRICS_CALCULATION,
                message=f"簇间最小分离度过小: {min_separation:.4f}",
                source_location=location,
                min_separation=float(min_separation),
            )

    def _calculate_cluster_cohesion(
        self,
        result: QualityMetricsResult,
        X: np.ndarray,
        labels: np.ndarray,
        unique_labels: np.ndarray,
    ):
        """计算簇内聚合度"""
        centers = self.clustering_result.centers

        if centers is None:
            return

        for cluster_id in unique_labels:
            cluster_mask = labels == cluster_id
            cluster_data = X[cluster_mask]
            cluster_center = centers[np.where(unique_labels == cluster_id)[0][0]]

            avg_distance = np.mean(
                [np.linalg.norm(point - cluster_center) for point in cluster_data]
            )
            result.cluster_cohesion[int(cluster_id)] = float(avg_distance)

        max_cohesion = max(result.cluster_cohesion.values())
        min_cohesion = min(result.cluster_cohesion.values())

        if max_cohesion > min_cohesion * 3 and min_cohesion > 0:
            location = self.data_source.get_location()
            result.warnings.append(
                {
                    "message": "簇内聚合度差异过大，部分簇样本分布过于分散",
                    "max_cohesion": float(max_cohesion),
                    "min_cohesion": float(min_cohesion),
                    "ratio": float(max_cohesion / min_cohesion),
                    "location": str(location),
                    "action": "warn",
                }
            )
            self.audit_trail.log_warning(
                action_type=ActionType.METRICS_CALCULATION,
                message=f"簇内聚合度差异过大，比例: {max_cohesion / min_cohesion:.2f}",
                source_location=location,
                ratio=float(max_cohesion / min_cohesion),
            )

    def _assess_overall_quality(self, result: QualityMetricsResult):
        """评估整体聚类质量"""
        scores = {}
        total_weight = 0

        if result.overall_silhouette_score is not None:
            silhouette = result.overall_silhouette_score
            if silhouette >= 0.6:
                scores["silhouette"] = 1.0
            elif silhouette >= 0.4:
                scores["silhouette"] = 0.8
            elif silhouette >= 0.2:
                scores["silhouette"] = 0.6
            elif silhouette >= 0:
                scores["silhouette"] = 0.4
            else:
                scores["silhouette"] = 0.2
            total_weight += 0.4

        if result.calinski_harabasz_score is not None:
            ch = result.calinski_harabasz_score
            if ch >= 500:
                scores["calinski_harabasz"] = 1.0
            elif ch >= 200:
                scores["calinski_harabasz"] = 0.8
            elif ch >= 100:
                scores["calinski_harabasz"] = 0.6
            elif ch >= 50:
                scores["calinski_harabasz"] = 0.4
            else:
                scores["calinski_harabasz"] = 0.2
            total_weight += 0.3

        if result.davies_bouldin_score is not None:
            db = result.davies_bouldin_score
            if db <= 0.5:
                scores["davies_bouldin"] = 1.0
            elif db <= 1.0:
                scores["davies_bouldin"] = 0.8
            elif db <= 1.5:
                scores["davies_bouldin"] = 0.6
            elif db <= 2.0:
                scores["davies_bouldin"] = 0.4
            else:
                scores["davies_bouldin"] = 0.2
            total_weight += 0.3

        result.quality_scores = scores

        if total_weight > 0:
            overall_score = sum(
                scores.get(k, 0) * (0.4 if k == "silhouette" else 0.3)
                for k in scores
            ) / total_weight

            if overall_score >= 0.8:
                result.quality_assessment = "excellent"
            elif overall_score >= 0.6:
                result.quality_assessment = "good"
            elif overall_score >= 0.4:
                result.quality_assessment = "fair"
            elif overall_score >= 0.2:
                result.quality_assessment = "poor"
            else:
                result.quality_assessment = "bad"

            result.quality_scores["overall"] = float(overall_score)

            self.audit_trail.log_info(
                action_type=ActionType.METRICS_CALCULATION,
                message=f"聚类质量评估: {result.quality_assessment} (得分: {overall_score:.2f})",
                source_location=self.data_source.get_location(),
                quality_assessment=result.quality_assessment,
                overall_score=float(overall_score),
            )

    def _log_metrics_result(self, result: QualityMetricsResult):
        """记录质量指标结果到审计追踪"""
        silhouette_str = f"{result.overall_silhouette_score:.4f}" if result.overall_silhouette_score is not None else "N/A"
        ch_str = f"{result.calinski_harabasz_score:.4f}" if result.calinski_harabasz_score is not None else "N/A"
        db_str = f"{result.davies_bouldin_score:.4f}" if result.davies_bouldin_score is not None else "N/A"
        self.audit_trail.log_info(
            action_type=ActionType.METRICS_CALCULATION,
            message=f"质量指标计算完成: 轮廓系数={silhouette_str}, CH指数={ch_str}, DB指数={db_str}",
            source_location=self.data_source.get_location(),
            silhouette_score=float(result.overall_silhouette_score) if result.overall_silhouette_score else None,
            calinski_harabasz_score=float(result.calinski_harabasz_score) if result.calinski_harabasz_score else None,
            davies_bouldin_score=float(result.davies_bouldin_score) if result.davies_bouldin_score else None,
            quality_assessment=result.quality_assessment,
        )
