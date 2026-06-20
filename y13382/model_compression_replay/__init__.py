"""
模型压缩异常回放系统
Model Compression Anomaly Replay System

核心能力：
1. 训练日志解析与原始行定位
2. 公式、单位、边界值显式化
3. 版本别名机制
4. 边界样本与结论关联
5. 误判样本回放与改判解释
6. Markdown报告生成
"""

from .models import (
    TrainingLogEntry,
    CompressionSample,
    ProcessingRecord,
    MetricWithFormula,
    BoundaryValue,
    VersionAlias,
    ReplayResult,
    SampleVerdict,
    LogSeverity,
    ProcessingStage,
    Conclusion,
)
from .log_parser import LogParser
from .metrics import CompressionMetrics
from .version_alias import VersionAliasRegistry
from .sample_replay import SampleReplayer
from .report_generator import MarkdownReportGenerator
from .replay_pipeline import ReplayPipeline, SampleSpec

__all__ = [
    "TrainingLogEntry",
    "CompressionSample",
    "ProcessingRecord",
    "MetricWithFormula",
    "BoundaryValue",
    "VersionAlias",
    "ReplayResult",
    "SampleVerdict",
    "LogSeverity",
    "ProcessingStage",
    "Conclusion",
    "LogParser",
    "CompressionMetrics",
    "VersionAliasRegistry",
    "SampleReplayer",
    "MarkdownReportGenerator",
    "ReplayPipeline",
    "SampleSpec",
]

__version__ = "1.0.0"
