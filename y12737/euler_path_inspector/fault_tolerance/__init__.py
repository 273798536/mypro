"""
容错处理模块
"""

from .processor import (
    GapSeverity,
    ParameterGap,
    FaultTolerantResult,
    FaultTolerantProcessor
)

__all__ = [
    "GapSeverity",
    "ParameterGap",
    "FaultTolerantResult",
    "FaultTolerantProcessor"
]
