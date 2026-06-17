"""核心业务引擎。"""

from .compare_engine import GrayCompareEngine, GrayCompareResult
from .decomposer import ResultDecomposer, DecomposedResult
from .duplicate_detector import DuplicateDetector, DuplicateIssue
from .history_tracker import HistoryTracker

__all__ = [
    "GrayCompareEngine",
    "GrayCompareResult",
    "ResultDecomposer",
    "DecomposedResult",
    "DuplicateDetector",
    "DuplicateIssue",
    "HistoryTracker",
]
