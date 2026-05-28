"""配置和常量定义"""

from typing import List, Dict, Any
from dataclasses import dataclass, field


@dataclass
class StandardizationRule:
    """标准化规则"""
    method: str = "zscore"
    features: List[str] = field(default_factory=list)
    exclude_features: List[str] = field(default_factory=list)
    with_mean: bool = True
    with_std: bool = True
    min_value: float = 0.0
    max_value: float = 1.0


@dataclass
class ClusteringConfig:
    """聚类配置"""
    n_clusters: int = 3
    init: str = "k-means++"
    n_init: int = 10
    max_iter: int = 300
    tol: float = 1e-4
    random_state: int = 42
    algorithm: str = "lloyd"


@dataclass
class OutlierConfig:
    """异常值检测配置"""
    method: str = "iqr"
    iqr_threshold: float = 1.5
    zscore_threshold: float = 3.0
    isolation_forest_contamination: float = 0.1


@dataclass
class QualityThresholds:
    """质量阈值配置"""
    min_silhouette_score: float = 0.2
    min_cluster_size: int = 5
    max_cluster_size_ratio: float = 0.8
    max_empty_clusters: int = 0
    min_feature_variance: float = 1e-6


@dataclass
class AuditConfig:
    """审计配置"""
    preserve_source: bool = True
    track_corrections: bool = True
    log_all_steps: bool = True
    include_raw_data: bool = False
    max_audit_entries: int = 10000


class Constants:
    """常量定义"""
    SUPPORTED_INPUT_FORMATS = [".csv", ".xlsx", ".xls"]
    SUPPORTED_OUTPUT_FORMATS = [".xlsx", ".csv", ".html", ".json", ".md"]
    STANDARDIZATION_METHODS = ["zscore", "minmax", "robust", "none"]
    OUTLIER_DETECTION_METHODS = ["iqr", "zscore", "isolation_forest", "none"]
    MISSING_VALUE_STRATEGIES = ["drop", "mean", "median", "mode", "zero"]
    FEATURE_IMPORTANCE_METHODS = ["f_value", "chi2", "mutual_info"]

    WARNING_EMPTY_CLUSTER = "检测到空簇！请检查聚类数设置是否过大或数据分布是否异常"
    WARNING_SCALE_MISMATCH = "特征尺度差异过大，可能导致权重偏向尺度大的特征"
    WARNING_OUTLIERS = "检测到潜在异常值，可能拉偏聚类结果"
    WARNING_LOW_VARIANCE = "存在方差极低的特征，可能影响聚类效果"
    WARNING_IMBALANCED_CLUSTERS = "簇大小差异过大，聚类结果可能不可靠"
    WARNING_LOW_SILHOUETTE = "轮廓系数过低，聚类结构不明显"

    ERROR_MISSING_FILE = "文件不存在"
    ERROR_INVALID_FORMAT = "不支持的文件格式"
    ERROR_MISSING_COLUMNS = "缺少必需的列"
    ERROR_INVALID_DATA_TYPE = "无效的数据类型"
    ERROR_NEGATIVE_VALUE = "特征值不能为负（适用于特定标准化方法）"
    ERROR_INVALID_CLUSTER_COUNT = "聚类数必须大于1且小于样本数"
