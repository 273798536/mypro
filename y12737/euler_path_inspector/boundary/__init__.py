"""
边界样例模块
定义常见边界情况及其处理意见
"""

from .cases import (
    BoundaryCase,
    BOUNDARY_CASES,
    get_boundary_case,
    trace_boundary_case,
    get_all_boundary_tags,
    summarize_boundary_cases
)

__all__ = [
    "BoundaryCase",
    "BOUNDARY_CASES",
    "get_boundary_case",
    "trace_boundary_case",
    "get_all_boundary_tags",
    "summarize_boundary_cases"
]
