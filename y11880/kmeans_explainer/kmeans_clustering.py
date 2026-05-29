"""KMeans聚类模块 - 含空簇、异常值处理、可重复性保证"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, silhouette_samples
from sklearn.preprocessing import StandardScaler
from scipy import stats
import warnings
warnings.filterwarnings('ignore')


class KMeansClusterer:
    """KMeans聚类器 - 增强版"""

    def __init__(
        self,
        n_clusters: int = 3,
        random_state: int = 42,
        max_iter: int = 300,
        n_init: int = 10,
        handle_empty_clusters: bool = True,
        handle_outliers: bool = True,
        outlier_threshold: float = 3.0,
        ensure_reproducibility: bool = True
    ):
        """
        初始化KMeans聚类器
        
        Args:
            n_clusters: 聚类数量
            random_state: 随机种子（保证可重复性）
            max_iter: 最大迭代次数
            n_init: 初始化次数
            handle_empty_clusters: 是否处理空簇
            handle_outliers: 是否处理异常值
            outlier_threshold: 异常值阈值（Z-score）
            ensure_reproducibility: 是否确保可重复性
        """
        self.n_clusters = n_clusters
        self.random_state = random_state
        self.max_iter = max_iter
        self.n_init = n_init
        self.handle_empty_clusters = handle_empty_clusters
        self.handle_outliers = handle_outliers
        self.outlier_threshold = outlier_threshold
        self.ensure_reproducibility = ensure_reproducibility

        if ensure_reproducibility:
            np.random.seed(random_state)

        self.model: Optional[KMeans] = None
        self.labels_: Optional[np.ndarray] = None
        self.centers_: Optional[np.ndarray] = None
        self.inertia_: Optional[float] = None
        self.outlier_mask_: Optional[np.ndarray] = None
        self.empty_clusters_handled: int = 0
        self.cluster_sizes_: Optional[Dict[int, int]] = {}
        self.feature_names: List[str] = []
        self.raw_data: Optional[pd.DataFrame] = None
        self.scaled_data: Optional[np.ndarray] = None

    def detect_outliers(self, data: pd.DataFrame) -> np.ndarray:
        """
        检测异常值
        
        Args:
            data: 输入数据
            
        Returns:
            异常值掩码（True表示异常值）
        """
        z_scores = np.abs(stats.zscore(data, nan_policy='omit'))
        outlier_mask = (z_scores > self.outlier_threshold).any(axis=1)
        return outlier_mask

    def remove_outliers(self, data: pd.DataFrame) -> Tuple[pd.DataFrame, np.ndarray]:
        """
        移除异常值
        
        Args:
            data: 输入数据
            
        Returns:
            (清理后的数据, 异常值掩码)
        """
        outlier_mask = self.detect_outliers(data)
        cleaned_data = data[~outlier_mask].copy()
        return cleaned_data, outlier_mask

    def _handle_empty_clusters(self, data: np.ndarray, labels: np.ndarray, centers: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        处理空簇
        
        Args:
            data: 标准化后的数据
            labels: 聚类标签
            centers: 聚类中心
            
        Returns:
            (处理后的标签, 处理后的中心)
        """
        unique_labels, counts = np.unique(labels, return_counts=True)
        empty_clusters = [i for i in range(self.n_clusters) if i not in unique_labels or counts[list(unique_labels).index(i)] == 0]

        self.empty_clusters_handled = len(empty_clusters)

        for empty_cluster in empty_clusters:
            distances = np.sum((data - centers[labels]) ** 2, axis=1)
            farthest_point_idx = np.argmax(distances)
            original_cluster = labels[farthest_point_idx]

            labels[farthest_point_idx] = empty_cluster
            centers[empty_cluster] = data[farthest_point_idx]

        return labels, centers

    def fit(self, data: pd.DataFrame) -> 'KMeansClusterer':
        """
        拟合KMeans聚类
        
        Args:
            data: 输入数据（DataFrame）
            
        Returns:
            self
        """
        self.raw_data = data.copy()
        self.feature_names = list(data.columns)

        working_data = data.copy()

        if self.handle_outliers:
            cleaned_data, outlier_mask = self.remove_outliers(working_data)
            self.outlier_mask_ = outlier_mask
            working_data = cleaned_data
        else:
            self.outlier_mask_ = np.zeros(len(data), dtype=bool)

        self.scaled_data = working_data.values

        self.model = KMeans(
            n_clusters=min(self.n_clusters, len(working_data)),
            random_state=self.random_state,
            max_iter=self.max_iter,
            n_init=self.n_init,
            init='k-means++'
        )

        labels = self.model.fit_predict(self.scaled_data)
        centers = self.model.cluster_centers_

        if self.handle_empty_clusters:
            labels, centers = self._handle_empty_clusters(self.scaled_data, labels, centers)

        self.labels_ = labels
        self.centers_ = centers
        self.inertia_ = self.model.inertia_

        self._calculate_cluster_sizes()

        return self

    def _calculate_cluster_sizes(self):
        """计算各簇大小"""
        if self.labels_ is not None:
            unique, counts = np.unique(self.labels_, return_counts=True)
            self.cluster_sizes_ = {int(label): int(count) for label, count in zip(unique, counts)}

    def predict(self, data: pd.DataFrame) -> np.ndarray:
        """
        预测新数据的聚类标签
        
        Args:
            data: 新数据
            
        Returns:
            聚类标签
        """
        if self.model is None:
            raise ValueError("模型未拟合，请先调用fit()方法")

        return self.model.predict(data.values)

    def get_cluster_centers_df(self) -> pd.DataFrame:
        """
        获取聚类中心DataFrame"""
        if self.centers_ is None:
            raise ValueError("模型未拟合，请先调用fit()方法")

        return pd.DataFrame(self.centers_, columns=self.feature_names)

    def get_cluster_summary(self) -> Dict[str, Any]:
        """
        获取聚类摘要
        
        Returns:
            聚类摘要字典
        """
        if self.labels_ is None:
            raise ValueError("模型未拟合，请先调用fit()方法")

        summary = {
            'n_clusters': self.n_clusters,
            'cluster_sizes': self.cluster_sizes_,
            'inertia': float(self.inertia_),
            'empty_clusters_handled': self.empty_clusters_handled,
            'outliers_detected': int(self.outlier_mask_.sum()) if self.outlier_mask_ is not None else 0,
            'total_samples': len(self.raw_data) if self.raw_data is not None else 0,
            'cleaned_samples': len(self.labels_) if self.labels_ is not None else 0,
            'random_state': self.random_state,
            'feature_names': self.feature_names
        }
        return summary

    def get_cluster_details(self) -> pd.DataFrame:
        """
        获取每个样本的聚类详情
        
        Returns:
            包含聚类标签的DataFrame
        """
        if self.raw_data is None or self.labels_ is None:
            raise ValueError("模型未拟合，请先调用fit()方法")

        result_df = self.raw_data.copy()

        full_labels = np.full(len(result_df), -1)
        full_labels[~self.outlier_mask_] = self.labels_
        result_df['cluster'] = full_labels
        result_df['is_outlier'] = self.outlier_mask_

        return result_df

    def get_cluster_profiles(self) -> pd.DataFrame:
        """
        获取各簇的特征画像
        
        Returns:
            各簇特征画像DataFrame
        """
        if self.raw_data is None or self.labels_ is None:
            raise ValueError("模型未拟合，请先调用fit()方法")

        cleaned_data = self.raw_data[~self.outlier_mask_].copy()
        cleaned_data['cluster'] = self.labels_

        profiles = cleaned_data.groupby('cluster').agg(['mean', 'std', 'min', 'max', 'count'])
        return profiles

    def explain_cluster_reasons(self, top_n_features: int = 5) -> Dict[int, List[Dict[str, Any]]]:
        """
        解释每个簇形成的原因（特征重要性）
        
        Args:
            top_n_features: 每个簇展示的特征数量
            
        Returns:
            每个簇的解释
        """
        if self.centers_ is None:
            raise ValueError("模型未拟合，请先调用fit()方法")

        overall_mean = self.raw_data.mean().values

        explanations = {}

        for cluster_id in range(self.n_clusters):
            cluster_center = self.centers_[cluster_id]
            diff_from_mean = cluster_center - overall_mean

            feature_importance = []
            for i, feature in enumerate(self.feature_names):
                feature_importance.append({
                    'feature': feature,
                    'difference': float(diff_from_mean[i]),
                    'absolute_diff': float(abs(diff_from_mean[i])),
                    'direction': '高于均值' if diff_from_mean[i] > 0 else '低于均值'
                })

            feature_importance.sort(key=lambda x: x['absolute_diff'], reverse=True)
            explanations[cluster_id] = feature_importance[:top_n_features]

        return explanations
