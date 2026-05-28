"""聚类解释模块 - 特征重要性、样本解释、簇特征画像"""

from typing import Optional, List, Dict, Any, Tuple
import pandas as pd
import numpy as np
from sklearn.feature_selection import f_classif, chi2, mutual_info_classif
from sklearn.ensemble import RandomForestClassifier
from sklearn.inspection import permutation_importance

from .exceptions import SourceLocation
from .data_loader import DataSource
from .preprocessor import PreprocessingResult
from .clusterer import ClusteringResult
from .metrics import QualityMetricsResult
from .audit import AuditTrail, ActionType, Severity
from .config import Constants


class InterpretationResult:
    """解释结果"""

    def __init__(self):
        self.feature_importance: Dict[str, float] = {}
        self.feature_importance_ranked: List[Dict[str, Any]] = []
        self.per_cluster_feature_stats: Dict[int, Dict[str, Dict[str, float]]] = {}
        self.per_cluster_distinguishing_features: Dict[int, List[Dict[str, Any]]] = {}
        self.sample_interpretations: List[Dict[str, Any]] = []
        self.cluster_profiles: Dict[int, Dict[str, Any]] = {}
        self.feature_ranking_method: str = "f_value"
        self.warnings: List[Dict[str, Any]] = []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "feature_importance": {k: float(v) for k, v in self.feature_importance.items()},
            "feature_importance_ranked": [
                {
                    "feature": item["feature"],
                    "importance": float(item["importance"]),
                    "rank": int(item["rank"]),
                }
                for item in self.feature_importance_ranked
            ],
            "per_cluster_feature_stats": {
                str(cid): {
                    feat: {k: float(v) for k, v in stats.items()}
                    for feat, stats in cluster_stats.items()
                }
                for cid, cluster_stats in self.per_cluster_feature_stats.items()
            },
            "per_cluster_distinguishing_features": {
                str(cid): [
                    {
                        "feature": item["feature"],
                        "z_score": float(item["z_score"]),
                        "direction": item["direction"],
                        "importance_rank": int(item["importance_rank"]),
                    }
                    for item in features
                ]
                for cid, features in self.per_cluster_distinguishing_features.items()
            },
            "cluster_profiles": {
                str(cid): {
                    "name": profile.get("name", f"簇{cid}"),
                    "description": profile.get("description", ""),
                    "key_features": profile.get("key_features", []),
                    "size": int(profile.get("size", 0)),
                    "percentage": float(profile.get("percentage", 0)),
                }
                for cid, profile in self.cluster_profiles.items()
            },
            "sample_interpretations_count": len(self.sample_interpretations),
            "feature_ranking_method": self.feature_ranking_method,
            "warnings": self.warnings,
        }


class ClusterInterpreter:
    """聚类结果解释器"""

    def __init__(
        self,
        data_source: DataSource,
        preprocessing_result: PreprocessingResult,
        clustering_result: ClusteringResult,
        metrics_result: Optional[QualityMetricsResult] = None,
        audit_trail: Optional[AuditTrail] = None,
        label_remarks: Optional[List[Dict[str, Any]]] = None,
    ):
        self.data_source = data_source
        self.original_df = data_source.df
        self.preprocessing_result = preprocessing_result
        self.clustering_result = clustering_result
        self.metrics_result = metrics_result
        self.feature_columns = preprocessing_result.feature_columns
        self.audit_trail = audit_trail or AuditTrail()
        self.label_remarks = label_remarks or []

        self.labels = clustering_result.labels
        self.scaled_df = clustering_result.used_samples
        self.used_indices = (
            self.scaled_df.index if self.scaled_df is not None else None
        )

    def interpret_all(
        self,
        method: str = "f_value",
        n_top_features: int = 5,
        n_sample_interpretations: int = 10,
    ) -> InterpretationResult:
        """执行所有解释分析

        Args:
            method: 特征重要性计算方法: f_value, chi2, mutual_info, random_forest
            n_top_features: 每个簇展示的主要特征数
            n_sample_interpretations: 要解释的样本数

        Returns:
            InterpretationResult
        """
        result = InterpretationResult()
        result.feature_ranking_method = method

        if self.scaled_df is None or self.labels is None:
            result.warnings.append(
                {
                    "message": "没有有效的聚类结果，无法进行解释分析",
                    "action": "warn",
                }
            )
            return result

        X = self.scaled_df.values
        y = self.labels

        unique_labels = np.unique(y)
        if len(unique_labels) < 2:
            result.warnings.append(
                {
                    "message": "有效簇数小于2，无法计算特征重要性",
                    "n_unique_clusters": len(unique_labels),
                    "action": "warn",
                }
            )
            return result

        self._calculate_feature_importance(result, X, y, method)

        self._calculate_per_cluster_stats(result)

        self._identify_distinguishing_features(result, n_top_features)

        self._generate_cluster_profiles(result, n_top_features)

        self._generate_sample_interpretations(result, n_sample_interpretations)

        self._log_interpretation_result(result)

        return result

    def _calculate_feature_importance(
        self,
        result: InterpretationResult,
        X: np.ndarray,
        y: np.ndarray,
        method: str,
    ):
        """计算特征重要性"""
        feature_names = self.feature_columns
        importance_scores = None

        try:
            if method == "f_value":
                f_scores, _ = f_classif(X, y)
                importance_scores = f_scores / f_scores.sum() if f_scores.sum() > 0 else f_scores
            elif method == "chi2":
                X_nonneg = X - X.min(axis=0) if (X < 0).any() else X
                chi2_scores, _ = chi2(X_nonneg, y)
                importance_scores = chi2_scores / chi2_scores.sum() if chi2_scores.sum() > 0 else chi2_scores
            elif method == "mutual_info":
                mi_scores = mutual_info_classif(X, y, random_state=42)
                importance_scores = mi_scores / mi_scores.sum() if mi_scores.sum() > 0 else mi_scores
            elif method == "random_forest":
                rf = RandomForestClassifier(n_estimators=100, random_state=42)
                rf.fit(X, y)
                importance_scores = rf.feature_importances_
            else:
                self.audit_trail.log_warning(
                    action_type=ActionType.INTERPRETATION,
                    message=f"不支持的特征重要性方法: {method}，回退到f_value",
                    source_location=self.data_source.get_location(),
                    method=method,
                )
                f_scores, _ = f_classif(X, y)
                importance_scores = f_scores / f_scores.sum() if f_scores.sum() > 0 else f_scores
                result.feature_ranking_method = "f_value"

            for i, feature in enumerate(feature_names):
                if i < len(importance_scores):
                    result.feature_importance[feature] = float(importance_scores[i])

            sorted_features = sorted(
                result.feature_importance.items(),
                key=lambda x: x[1],
                reverse=True,
            )

            for rank, (feature, importance) in enumerate(sorted_features, 1):
                result.feature_importance_ranked.append(
                    {
                        "feature": feature,
                        "importance": importance,
                        "rank": rank,
                    }
                )

            top_features = [f["feature"] for f in result.feature_importance_ranked[:3]]
            self.audit_trail.log_info(
                action_type=ActionType.INTERPRETATION,
                message=f"特征重要性计算完成，最重要的3个特征: {', '.join(top_features)}",
                source_location=self.data_source.get_location(),
                method=result.feature_ranking_method,
                top_features=top_features,
            )

        except Exception as e:
            location = self.data_source.get_location()
            result.warnings.append(
                {
                    "message": f"计算特征重要性失败: {str(e)}",
                    "error_type": type(e).__name__,
                    "location": str(location),
                    "action": "warn",
                }
            )
            self.audit_trail.log_warning(
                action_type=ActionType.INTERPRETATION,
                message=f"计算特征重要性失败: {str(e)}",
                source_location=location,
                error_type=type(e).__name__,
            )

    def _calculate_per_cluster_stats(self, result: InterpretationResult):
        """计算每个簇的特征统计量"""
        if self.used_indices is None:
            return

        original_data = self.original_df.loc[self.used_indices]
        labels = self.labels

        for cluster_id in np.unique(labels):
            cluster_mask = labels == cluster_id
            cluster_data = original_data[cluster_mask]
            all_data = original_data

            result.per_cluster_feature_stats[int(cluster_id)] = {}

            for feature in self.feature_columns:
                if feature not in cluster_data.columns:
                    continue

                cluster_mean = cluster_data[feature].mean()
                cluster_std = cluster_data[feature].std()
                overall_mean = all_data[feature].mean()
                overall_std = all_data[feature].std()

                z_score = (
                    (cluster_mean - overall_mean) / overall_std
                    if overall_std > 0
                    else 0
                )

                result.per_cluster_feature_stats[int(cluster_id)][feature] = {
                    "cluster_mean": float(cluster_mean),
                    "cluster_std": float(cluster_std),
                    "overall_mean": float(overall_mean),
                    "overall_std": float(overall_std),
                    "z_score": float(z_score),
                    "diff_from_mean": float(cluster_mean - overall_mean),
                    "ratio_to_mean": float(cluster_mean / overall_mean) if overall_mean != 0 else 0,
                }

    def _identify_distinguishing_features(
        self, result: InterpretationResult, n_top: int
    ):
        """识别每个簇的区分性特征"""
        feature_importance_map = {
            item["feature"]: item["rank"] for item in result.feature_importance_ranked
        }

        for cluster_id in np.unique(self.labels):
            cluster_stats = result.per_cluster_feature_stats.get(int(cluster_id), {})
            features_with_z = []

            for feature, stats in cluster_stats.items():
                z_score = abs(stats.get("z_score", 0))
                direction = "high" if stats.get("z_score", 0) > 0 else "low"
                importance_rank = feature_importance_map.get(feature, 999)

                features_with_z.append(
                    {
                        "feature": feature,
                        "z_score": z_score,
                        "raw_z_score": stats.get("z_score", 0),
                        "direction": direction,
                        "importance_rank": importance_rank,
                        "cluster_mean": stats.get("cluster_mean", 0),
                        "overall_mean": stats.get("overall_mean", 0),
                    }
                )

            features_with_z.sort(key=lambda x: (-x["z_score"], x["importance_rank"]))

            result.per_cluster_distinguishing_features[int(cluster_id)] = features_with_z[:n_top]

            top_feats = [f"{f['feature']}({f['direction']})" for f in features_with_z[:3]]
            self.audit_trail.log_info(
                action_type=ActionType.INTERPRETATION,
                message=f"簇 {cluster_id} 主要区分特征: {', '.join(top_feats)}",
                source_location=self.data_source.get_location(),
                cluster_id=int(cluster_id),
                top_features=top_feats,
            )

    def _generate_cluster_profiles(
        self, result: InterpretationResult, n_top: int
    ):
        """生成簇画像"""
        label_map = {}
        for remark in self.label_remarks:
            if "label" in remark and "remark" in remark:
                label_map[str(remark["label"])] = remark["remark"]

        for cluster_id in np.unique(self.labels):
            cluster_id_int = int(cluster_id)
            distinguishing_features = result.per_cluster_distinguishing_features.get(
                cluster_id_int, []
            )
            cluster_info = self.clustering_result.cluster_info.get(cluster_id_int, {})

            key_features = []
            for feat in distinguishing_features[:n_top]:
                feature = feat["feature"]
                direction = feat["direction"]
                z_score = feat["raw_z_score"]
                cluster_mean = feat["cluster_mean"]
                overall_mean = feat["overall_mean"]

                if direction == "high":
                    desc = f"{feature}显著高于平均水平"
                else:
                    desc = f"{feature}显著低于平均水平"

                key_features.append(
                    {
                        "feature": feature,
                        "direction": direction,
                        "z_score": float(z_score),
                        "cluster_mean": float(cluster_mean),
                        "overall_mean": float(overall_mean),
                        "description": desc,
                    }
                )

            description_parts = []
            for feat in key_features[:3]:
                direction_word = "高" if feat["direction"] == "high" else "低"
                description_parts.append(f"{feat['feature']}{direction_word}")

            description = "、".join(description_parts)
            if description:
                description = f"该群体的主要特征是{description}"

            default_name = label_map.get(str(cluster_id_int), f"簇{cluster_id_int}")

            result.cluster_profiles[cluster_id_int] = {
                "name": default_name,
                "description": description,
                "key_features": key_features,
                "size": int(cluster_info.get("size", 0)),
                "percentage": float(cluster_info.get("percentage", 0)),
            }

            self.audit_trail.log_info(
                action_type=ActionType.INTERPRETATION,
                message=f"簇 {cluster_id_int} 画像: {description}",
                source_location=self.data_source.get_location(),
                cluster_id=cluster_id_int,
                profile=result.cluster_profiles[cluster_id_int],
            )

    def _generate_sample_interpretations(
        self, result: InterpretationResult, n_samples: int
    ):
        """生成样本级别的解释"""
        if self.labels is None or self.used_indices is None:
            return

        n_samples = min(n_samples, len(self.labels))

        selected_indices = list(range(n_samples))

        silhouette_scores = None
        if self.metrics_result and self.metrics_result.sample_silhouette_scores is not None:
            silhouette_scores = self.metrics_result.sample_silhouette_scores
            sorted_by_silhouette = np.argsort(silhouette_scores)
            selected_indices = list(sorted_by_silhouette[: min(3, n_samples // 3)])
            selected_indices += list(sorted_by_silhouette[-min(3, n_samples // 3) :])
            remaining = n_samples - len(selected_indices)
            if remaining > 0:
                import random

                remaining_indices = [
                    i for i in range(len(self.labels)) if i not in selected_indices
                ]
                selected_indices += random.sample(
                    remaining_indices, min(remaining, len(remaining_indices))
                )

        for idx in selected_indices:
            if idx >= len(self.labels):
                continue

            cluster_id = int(self.labels[idx])
            original_idx = self.used_indices[idx]
            original_row = (
                self.data_source.original_row_numbers[original_idx]
                if original_idx < len(self.data_source.original_row_numbers)
                else None
            )
            location = self.data_source.get_row_location(original_idx)

            feature_contributions = []
            sample_data = self.scaled_df.iloc[idx] if self.scaled_df is not None else None
            cluster_center = (
                self.clustering_result.centers[cluster_id]
                if self.clustering_result.centers is not None
                else None
            )

            if sample_data is not None and cluster_center is not None:
                for i, feature in enumerate(self.feature_columns):
                    if i < len(sample_data) and i < len(cluster_center):
                        sample_val = sample_data.iloc[i]
                        center_val = cluster_center[i]
                        distance = abs(sample_val - center_val)

                        feature_contributions.append(
                            {
                                "feature": feature,
                                "sample_value_scaled": float(sample_val),
                                "cluster_center_scaled": float(center_val),
                                "distance_to_center": float(distance),
                            }
                        )

                feature_contributions.sort(key=lambda x: -x["distance_to_center"])

            sample_silhouette = None
            if silhouette_scores is not None and idx < len(silhouette_scores):
                sample_silhouette = float(silhouette_scores[idx])

            interpretation = {
                "index": int(idx),
                "original_index": int(original_idx),
                "original_row": original_row,
                "cluster_id": cluster_id,
                "silhouette_score": sample_silhouette,
                "location": str(location),
                "top_contributing_features": feature_contributions[:5],
            }

            result.sample_interpretations.append(interpretation)

            if len(result.sample_interpretations) <= 5:
                top_feat = feature_contributions[0] if feature_contributions else None
                self.audit_trail.add_entry(
                    ActionType.INTERPRETATION,
                    Severity.INFO,
                    message=f"样本解释: 被分配到簇{cluster_id}",
                    source_location=location,
                    original_row=original_row,
                    cluster_id=cluster_id,
                    silhouette_score=sample_silhouette,
                    top_feature=top_feat["feature"] if top_feat else None,
                )

    def _log_interpretation_result(self, result: InterpretationResult):
        """记录解释结果到审计追踪"""
        n_features = len(result.feature_importance)
        n_clusters = len(result.cluster_profiles)
        n_samples = len(result.sample_interpretations)

        self.audit_trail.log_info(
            action_type=ActionType.INTERPRETATION,
            message=f"解释分析完成: {n_features} 个特征重要性, {n_clusters} 个簇画像, {n_samples} 个样本解释",
            source_location=self.data_source.get_location(),
            method=result.feature_ranking_method,
            n_features=n_features,
            n_clusters=n_clusters,
            n_samples=n_samples,
        )
