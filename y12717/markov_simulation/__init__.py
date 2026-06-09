"""马尔可夫链课堂模拟系统

模块分工：
- core:       核心计算引擎（马尔可夫链运算、边界处理、审计追踪）
- records:    统一处理记录（界面/报告共用数据源）
- visualization: 图表生成
- report:     报告生成（含普通话解释）
- exceptions: 自定义异常类型
"""

from .core import MarkovChain
from .records import ProcessingRecord, BatchProcessor
from .visualization import MarkovVisualizer
from .report import ReportGenerator
from .exceptions import (
    MarkovError,
    EmptyStateError,
    InvalidTransitionMatrixError,
    NonStochasticMatrixError,
    StateNotFoundError,
    ConvergenceWarning,
)

__all__ = [
    "MarkovChain",
    "ProcessingRecord",
    "BatchProcessor",
    "MarkovVisualizer",
    "ReportGenerator",
    "MarkovError",
    "EmptyStateError",
    "InvalidTransitionMatrixError",
    "NonStochasticMatrixError",
    "StateNotFoundError",
    "ConvergenceWarning",
]

__version__ = "1.0.0"
