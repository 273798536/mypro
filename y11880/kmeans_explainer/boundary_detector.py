"""边界样例检测模块 - 检测特征尺度错、空簇、异常值拉偏等边界情况"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum


class BoundaryIssueType(Enum):
    """边界问题类型枚举"""
    SCALE_MISMATCH = "scale_mismatch"
    EMPTY_CLUSTER = "empty_cluster"
    OUTLIER_BIAS = "outlier_bias"
    EXTREME_VALUE = "extreme_value"
    SINGLE_VALUE_FEATURE = "single_value_feature"
    HIGH_SKEWNESS = "high_skewness"


class BoundaryDetector:
    """边界样例检测器"""

    def __init__(
        self,
        scale_range_threshold: float = 1e6,
        skewness_threshold: float = 2.0,
        outlier_zscore_threshold: float = 3.0
    ):
        """
        初始化边界检测器
        
        Args:
            scale_range_threshold: 尺度范围阈值
            skewness_threshold: 偏度阈值
            outlier_zscore_threshold: 异常值Z-score阈值
        """
        self.scale_range_threshold = scale_range_threshold
        self.skewness_threshold = skewness_threshold
        self.outlier_zscore_threshold = outlier_zscore_threshold
        self.issues: List[Dict[str, Any]] = []

    def detect_all(self, data: pd.DataFrame, cluster_labels: Optional[np.ndarray] = None) -> List[Dict[str, Any]]:
        """
        检测所有边界问题
        
        Args:
            data: 输入数据
            cluster_labels: 聚类标签（可选）
            
        Returns:
            问题列表
        """
        self.issues = []

        self._detect_scale_mismatch(data)
        self._detect_single_value_features(data)
        self._detect_high_skewness(data)
        self._detect_extreme_values(data)

        if cluster_labels is not None:
            self._detect_empty_clusters(cluster_labels)
            self._detect_outlier_bias(data, cluster_labels)

        return self.issues

    def _detect_scale_mismatch(self, data: pd.DataFrame):
        """检测特征尺度不匹配"""
        numeric_cols = data.select_dtypes(include=['number']).columns

        for col in numeric_cols:
            col_data = data[col].dropna()
            if len(col_data) == 0:
                continue

            data_range = col_data.max() - col_data.min()
            mean_val = abs(col_data.mean())

            if data_range > self.scale_range_threshold:
                self.issues.append({
                    'type': BoundaryIssueType.SCALE_MISMATCH.value,
                    'feature': col,
                    'severity': 'high',
                    'description': f"特征 '{col}' 数值范围过大 ({data_range:.2e})，可能导致尺度不匹配",
                    'details': {
                        'range': float(data_range),
                        'mean': float(mean_val),
                        'min': float(col_data.min()),
                        'max': float(col_data.max())
                    }
                })

    def _detect_single_value_features(self, data: pd.DataFrame):
        """检测单值特征（方差为0）"""
        numeric_cols = data.select_dtypes(include=['number']).columns

        for col in numeric_cols:
            col_data = data[col].dropna()
            if len(col_data) == 0:
                continue

            unique_count = col_data.nunique()
            if unique_count == 1:
                self.issues.append({
                    'type': BoundaryIssueType.SINGLE_VALUE_FEATURE.value,
                    'feature': col,
                    'severity': 'medium',
                    'description': f"特征 '{col}' 所有值相同 ({col_data.iloc[0]})，对聚类无贡献",
                    'details': {
                        'unique_count': int(unique_count),
                        'value': float(col_data.iloc[0])
                    }
                })

    def _detect_high_skewness(self, data: pd.DataFrame):
        """检测高偏度特征"""
        numeric_cols = data.select_dtypes(include=['number']).columns

        for col in numeric_cols:
            col_data = data[col].dropna()
            if len(col_data) == 0:
                continue

            skewness = col_data.skew()
            if abs(skewness) > self.skewness_threshold:
                self.issues.append({
                    'type': BoundaryIssueType.HIGH_SKEWNESS.value,
                    'feature': col,
                    'severity': 'medium',
                    'description': f"特征 '{col}' 偏度过高 ({skewness:.2f})，建议进行对数变换",
                    'details': {
                        'skewness': float(skewness),
                        'threshold': self.skewness_threshold
                    }
                })

    def _detect_extreme_values(self, data: pd.DataFrame):
        """检测极端值"""
        numeric_cols = data.select_dtypes(include=['number']).columns

        for col in numeric_cols:
            col_data = data[col].dropna()
            if len(col_data) == 0:
                continue

            z_scores = np.abs((col_data - col_data.mean()) / col_data.std() if col_data.std() > 0 else 0)
            extreme_indices = np.where(z_scores > self.outlier_zscore_threshold)[0]

            if len(extreme_indices) > 0:
                extreme_ratio = len(extreme_indices) / len(col_data)
                self.issues.append({
                    'type': BoundaryIssueType.EXTREME_VALUE.value,
                    'feature': col,
                    'severity': 'high' if extreme_ratio > 0.1 else 'medium',
                    'description': f"特征 '{col}' 包含 {len(extreme_indices)} 个极端值（占比 {extreme_ratio:.1%}）",
                    'details': {
                        'extreme_count': int(len(extreme_indices)),
                        'extreme_ratio': float(extreme_ratio),
                        'threshold': self.outlier_zscore_threshold
                    }
                })

    def _detect_empty_clusters(self, cluster_labels: np.ndarray):
        """检测空簇"""
        unique_labels, counts = np.unique(cluster_labels, return_counts=True)
        n_clusters = len(unique_labels)

        for label, count in zip(unique_labels, counts):
            if count == 0:
                self.issues.append({
                    'type': BoundaryIssueType.EMPTY_CLUSTER.value,
                    'feature': f'cluster_{label}',
                    'severity': 'high',
                    'description': f"聚类 {label} 为空簇",
                    'details': {
                        'cluster_id': int(label),
                        'n_clusters': n_clusters
                    }
                })

    def _detect_outlier_bias(self, data: pd.DataFrame, cluster_labels: np.ndarray):
        """检测异常值拉偏"""
        numeric_cols = data.select_dtypes(include=['number']).columns
        unique_labels = np.unique(cluster_labels)

        for col in numeric_cols:
            for cluster in unique_labels:
                cluster_data = data[col][cluster_labels == cluster].dropna()
                if len(cluster_data) < 3:
                    continue

                overall_data = data[col].dropna()
                cluster_mean = cluster_data.mean()
                overall_mean = overall_data.mean()

                mean_diff = abs(cluster_mean - overall_mean)
                overall_std = overall_data.std()

                if overall_std > 0 and mean_diff > 2 * overall_std:
                    self.issues.append({
                        'type': BoundaryIssueType.OUTLIER_BIAS.value,
                        'feature': f'{col}_cluster_{cluster}',
                        'severity': 'high',
                        'description': f"聚类 {cluster} 的 '{col}' 均值 ({cluster_mean:.2f}) 显著偏离总体均值 ({overall_mean:.2f})，可能被异常值拉偏",
                        'details': {
                            'cluster_id': int(cluster),
                            'feature': col,
                            'cluster_mean': float(cluster_mean),
                            'overall_mean': float(overall_mean),
                            'std_diff': float(mean_diff / overall_std if overall_std > 0 else 0)
                        }
                    })

    def get_issue_summary(self) -> Dict[str, Any]:
        """
        获取问题摘要
        
        Returns:
            问题摘要字典
        """
        summary = {
            'total_issues': len(self.issues),
            'by_severity': {'high': 0, 'medium': 0, 'low': 0},
            'by_type': {},
            'issues': self.issues
        }

        for issue in self.issues:
            severity = issue.get('severity', 'medium')
            if severity in summary['by_severity']:
                summary['by_severity'][severity] += 1

            issue_type = issue.get('type', 'unknown')
            if issue_type not in summary['by_type']:
                summary['by_type'][issue_type] = 0
            summary['by_type'][issue_type] += 1

        return summary

    def print_issue_report(self):
        """打印问题报告"""
        print("\n" + "=" * 80)
        print("「边界样例检测报告」")
        print("=" * 80)

        if not self.issues:
            print("✅ 未检测到边界问题")
            return

        summary = self.get_issue_summary()
        print(f"\n⚠️  总问题数: {summary['total_issues']}")
        print(f"   严重: {summary['by_severity']['high']} | 中等: {summary['by_severity']['medium']} | 轻微: {summary['by_severity']['low']}")

        print("\n📋 按类型统计:")
        for issue_type, count in summary['by_type'].items():
            print(f"  - {issue_type}: {count} 处")

        print("\n🔍 详细问题:")
        for i, issue in enumerate(self.issues, 1):
            severity_marker = "🔴" if issue['severity'] == 'high' else "🟡"
            print(f"\n  [{i}] {severity_marker} [{issue['severity'].upper()}] {issue['type']}")
            print(f"      特征: {issue['feature']}")
            print(f"      说明: {issue['description']}")

        print("\n" + "=" * 80 + "\n")
