"""
核心算法模块
包含图结构表示和欧拉路径检测算法
"""

from .graph import Graph, Edge
from .euler import (
    EulerType,
    EulerCheckResult,
    EulerPathResult,
    check_euler_conditions,
    find_euler_path,
    generate_explanation
)

__all__ = [
    "Graph",
    "Edge",
    "EulerType",
    "EulerCheckResult",
    "EulerPathResult",
    "check_euler_conditions",
    "find_euler_path",
    "generate_explanation"
]
