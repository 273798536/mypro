"""质量评估模块 - 轮廓系数、聚类质量评估"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from sklearn.metrics import silhouette_score, silhouette_samples, calinski_harabasz_score, davies_bouldin_score


class QualityEvaluator:
    """聚类质量评估器"""

    def __init__(self):
        self.silhouette_score_: Optional[float] = None
        self.silhouette_samples_: Optional[np.ndarray] = None
        self.calinski_harabasz_score_: Optional[float] = None
        self.davies_bouldin_score_: Optional[float] = None
        self.cluster_silhouette_scores_: Dict[int, float] = {}

    def evaluate(
        self,
        data: np.ndarray,
        labels: np.ndarray,
        sample_size: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        评估聚类质量
        
        Args:
            data: 标准化后的数据
            labels: 聚类标签
            sample_size: 采样大小（用于加速轮廓系数计算）
            
        Returns:
            评估结果字典
        """
        if len(np.unique(labels)) < 2:
            raise ValueError("聚类数量必须大于等于2才能计算评估指标")

        if sample_size and len(data) > sample_size:
            indices = np.random.choice(len(data), sample_size, replace=False)
            sample_data = data[indices]
            sample_labels = labels[indices]
        else:
            sample_data = data
            sample_labels = labels

        try:
            self.silhouette_score_ = silhouette_score(sample_data, sample_labels, metric='euclidean')
            self.silhouette_samples_ = silhouette_samples(sample_data, sample_labels, metric='euclidean')

            for label in np.unique(sample_labels):
                mask = sample_labels == label
                if mask.sum() > 0:
                    self.cluster_silhouette_scores_[int(label)] = float(self.silhouette_samples_[mask].mean())

        except Exception as e:
            self.silhouette_score_ = None
            print(f"轮廓系数计算失败: {e}")

        try:
            self.calinski_harabasz_score_ = calinski_harabasz_score(data, labels)
        except Exception as e:
            self.calinski_harabasz_score_ = None
            print(f"Calinski-Harabasz指数计算失败: {e}")

        try:
            self.davies_bouldin_score_ = davies_bouldin_score(data, labels)
        except Exception as e:
            self.davies_bouldin_score_ = None
            print(f"Davies-Bouldin指数计算失败: {e}")

        return self.get_evaluation_summary()

    def get_evaluation_summary(self) -> Dict[str, Any]:
        """
        获取评估摘要
        
        Returns:
            评估摘要字典
        """
        summary = {
            'silhouette_score': float(self.silhouette_score_) if self.silhouette_score_ is not None else None,
            'calinski_harabasz_score': float(self.calinski_harabasz_score_) if self.calinski_harabasz_score_ is not None else None,
            'davies_bouldin_score': float(self.davies_bouldin_score_) if self.davies_bouldin_score_ is not None else None,
            'cluster_silhouette_scores': {k: v for k, v in self.cluster_silhouette_scores_.items()},
            'interpretation': self._interpret_scores()
        }
        return summary

    def _interpret_scores(self) -> Dict[str, str]:
        """
        解释评分结果
        
        Returns:
            评分解释字典
        """
        interpretation = {}

        if self.silhouette_score_ is not None:
            if self.silhouette_score_ > 0.7:
                interpretation['silhouette'] = "优秀 - 聚类结构非常清晰"
            elif self.silhouette_score_ > 0.5:
                interpretation['silhouette'] = "良好 - 聚类结构合理"
            elif self.silhouette_score_ > 0.25:
                interpretation['silhouette'] = "一般 - 聚类结构较弱"
            else:
                interpretation['silhouette'] = "较差 - 可能没有聚类结构"

        if self.calinski_harabasz_score_ is not None:
            interpretation['calinski_harabasz'] = f"CH指数越高越好，当前值: {self.calinski_harabasz_score_:.2f}"

        if self.davies_bouldin_score_ is not None:
            if self.davies_bouldin_score_ < 0.5:
                interpretation['davies_bouldin'] = "优秀 - 聚类间区分度很高"
            elif self.davies_bouldin_score_ < 1.0:
                interpretation['davies_bouldin'] = "良好 - 聚类间有较好区分度"
            else:
                interpretation['davies_bouldin'] = "一般 - 聚类间区分度一般"

        return interpretation

    def find_best_k(
        self,
        data: np.ndarray,
        k_range: Tuple[int, int] = (2, 10),
        sample_size: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        寻找最佳聚类数
        
        Args:
            data: 标准化后的数据
            k_range: K值范围 (min, max)
            sample_size: 采样大小
            
        Returns:
            最佳K值评估结果
        """
        results = []

        for k in range(k_range[0], k_range[1] + 1):
            from sklearn.cluster import KMeans
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            labels = kmeans.fit_predict(data)

            try:
                sil_score = silhouette_score(data, labels, metric='euclidean', sample_size=sample_size)
            except:
                sil_score = None

            try:
                ch_score = calinski_harabasz_score(data, labels)
            except:
                ch_score = None

            try:
                db_score = davies_bouldin_score(data, labels)
            except:
                db_score = None

            results.append({
                'k': k,
                'silhouette_score': sil_score,
                'calinski_harabasz_score': ch_score,
                'davies_bouldin_score': db_score,
                'inertia': kmeans.inertia_
            })

        best_sil = max([r for r in results if r['silhouette_score'] is not None],
                       key=lambda x: x['silhouette_score']) if any(r['silhouette_score'] for r in results) else None
        best_ch = max([r for r in results if r['calinski_harabasz_score'] is not None],
                      key=lambda x: x['calinski_harabasz_score']) if any(r['calinski_harabasz_score'] for r in results) else None
        best_db = min([r for r in results if r['davies_bouldin_score'] is not None],
                      key=lambda x: x['davies_bouldin_score']) if any(r['davies_bouldin_score'] for r in results) else None

        return {
            'all_results': results,
            'best_k_silhouette': best_sil['k'] if best_sil else None,
            'best_k_calinski': best_ch['k'] if best_ch else None,
            'best_k_davies': best_db['k'] if best_db else None,
            'recommendation': self._recommend_k(best_sil, best_ch, best_db)
        }

    def _recommend_k(self, best_sil, best_ch, best_db) -> str:
        """推荐最佳K值"""
        candidates = []
        if best_sil:
            candidates.append(best_sil['k'])
        if best_ch:
            candidates.append(best_ch['k'])
        if best_db:
            candidates.append(best_db['k'])

        if not candidates:
            return "无法推荐，评估指标计算失败"

        from collections import Counter
        counter = Counter(candidates)
        most_common = counter.most_common(1)[0]

        if most_common[1] >= 2:
            return f"推荐聚类数 K={most_common[0]}（{most_common[1]}/3 指标一致推荐）"
        else:
            return f"各指标推荐不一致：轮廓系数={best_sil['k'] if best_sil else 'N/A'}, CH={best_ch['k'] if best_ch else 'N/A'}, DB={best_db['k'] if best_db else 'N/A'}"

    def print_evaluation_report(self):
        """打印评估报告"""
        print("\n" + "=" * 80)
        print("「聚类质量评估报告」")
        print("=" * 80)

        summary = self.get_evaluation_summary()

        print("\n📊 核心指标:")
        if summary['silhouette_score'] is not None:
            print(f"  轮廓系数 (Silhouette): {summary['silhouette_score']:.4f}")
            print(f"    解释: {summary['interpretation'].get('silhouette', 'N/A')}")
        else:
            print("  轮廓系数: 计算失败")

        if summary['calinski_harabasz_score'] is not None:
            print(f"  Calinski-Harabasz指数: {summary['calinski_harabasz_score']:.4f}")
            print(f"    解释: {summary['interpretation'].get('calinski_harabasz', 'N/A')}")
        else:
            print("  Calinski-Harabasz指数: 计算失败")

        if summary['davies_bouldin_score'] is not None:
            print(f"  Davies-Bouldin指数: {summary['davies_bouldin_score']:.4f}")
            print(f"    解释: {summary['interpretation'].get('davies_bouldin', 'N/A')}")
        else:
            print("  Davies-Bouldin指数: 计算失败")

        if summary['cluster_silhouette_scores']:
            print("\n🎯 各簇轮廓系数:")
            for cluster, score in sorted(summary['cluster_silhouette_scores'].items()):
                bar = "█" * int(score * 50)
                print(f"  簇 {cluster}: {score:.4f} {bar}")

        print("\n" + "=" * 80 + "\n")
