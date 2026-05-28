"""自定义异常类，支持源位置追踪"""

from typing import Optional, Dict, Any
from dataclasses import dataclass, field


@dataclass
class SourceLocation:
    """源位置信息，用于追踪错误发生的具体位置"""
    file_path: Optional[str] = None
    sheet_name: Optional[str] = None
    row_number: Optional[int] = None
    column_name: Optional[str] = None
    column_index: Optional[int] = None
    source_type: Optional[str] = None
    context: Dict[str, Any] = field(default_factory=dict)

    def __str__(self) -> str:
        parts = []
        if self.file_path:
            parts.append(f"文件: {self.file_path}")
        if self.sheet_name:
            parts.append(f"工作表: {self.sheet_name}")
        if self.row_number is not None:
            parts.append(f"行号: {self.row_number}")
        if self.column_name:
            parts.append(f"列名: {self.column_name}")
        elif self.column_index is not None:
            parts.append(f"列索引: {self.column_index}")
        return ", ".join(parts) if parts else "位置未知"


class KMeansAuditError(Exception):
    """基础异常类，所有KMeans审计工具的异常都继承自此"""

    def __init__(self, message: str, location: Optional[SourceLocation] = None, **kwargs):
        self.location = location
        self.extra_info = kwargs
        full_message = message
        if location:
            full_message = f"{message} ({location})"
        super().__init__(full_message)


class DataSourceError(KMeansAuditError):
    """数据源错误 - 文件读取、格式错误等"""
    pass


class ValidationError(KMeansAuditError):
    """数据验证错误 - 输入校验失败"""
    pass


class EmptyClusterError(KMeansAuditError):
    """空簇错误 - 聚类后出现空簇"""
    pass


class ScalingError(KMeansAuditError):
    """特征缩放错误 - 标准化过程中出现问题"""
    pass


class OutlierError(KMeansAuditError):
    """异常值错误 - 异常值可能影响聚类结果"""
    pass


class ConvergenceError(KMeansAuditError):
    """收敛错误 - 聚类算法未收敛"""
    pass


class ReportError(KMeansAuditError):
    """报告生成错误"""
    pass


class AuditTrailError(KMeansAuditError):
    """审计追踪错误"""
    pass
