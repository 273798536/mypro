"""图论割点核心算法模块

基于Tarjan算法实现无向图的割点（关节点）查找。
割点定义：移除该顶点后，图的连通分量数目增加。
"""

from dataclasses import dataclass, field
from typing import Dict, List, Set, Tuple, Optional
from enum import Enum


class CutPointType(Enum):
    """割点类型分类，用于边界复核"""
    NORMAL = "normal"           # 普通割点
    BOUNDARY = "boundary"       # 边界割点（仅连接两个分量）
    ISOLATED = "isolated"       # 孤立点（特殊边界）
    BRIDGE_HEAD = "bridge_head" # 桥的端点（敏感边界）


@dataclass
class Graph:
    """无向图数据结构"""
    vertices: List[int] = field(default_factory=list)
    adjacency: Dict[int, List[int]] = field(default_factory=dict)
    metadata: Dict[str, str] = field(default_factory=dict)

    def add_vertex(self, v: int) -> None:
        if v not in self.adjacency:
            self.vertices.append(v)
            self.adjacency[v] = []

    def add_edge(self, u: int, v: int) -> None:
        self.add_vertex(u)
        self.add_vertex(v)
        if v not in self.adjacency[u]:
            self.adjacency[u].append(v)
        if u not in self.adjacency[v]:
            self.adjacency[v].append(u)

    def get_degree(self, v: int) -> int:
        return len(self.adjacency.get(v, []))

    def get_neighbors(self, v: int) -> List[int]:
        return self.adjacency.get(v, []).copy()


@dataclass
class CutPointResult:
    """割点检测结果"""
    cut_points: Set[int] = field(default_factory=set)
    cut_point_types: Dict[int, CutPointType] = field(default_factory=dict)
    discovery_time: Dict[int, int] = field(default_factory=dict)
    low_value: Dict[int, int] = field(default_factory=dict)
    parent: Dict[int, Optional[int]] = field(default_factory=dict)
    component_count_after_removal: Dict[int, int] = field(default_factory=dict)

    def is_cut_point(self, v: int) -> bool:
        return v in self.cut_points

    def get_type(self, v: int) -> CutPointType:
        return self.cut_point_types.get(v, CutPointType.NORMAL)


class TarjanCutPointFinder:
    """Tarjan割点查找算法实现"""

    def __init__(self):
        self._time = 0
        self._visited: Set[int] = set()
        self._result = CutPointResult()

    def find_cut_points(self, graph: Graph) -> CutPointResult:
        """查找图中所有割点"""
        self._reset()
        self._result = CutPointResult()

        for v in graph.vertices:
            if v not in self._visited:
                self._dfs(graph, v, None)

        self._classify_cut_points(graph)
        return self._result

    def _reset(self) -> None:
        self._time = 0
        self._visited.clear()

    def _dfs(self, graph: Graph, u: int, parent: Optional[int]) -> None:
        """深度优先搜索核心逻辑"""
        self._visited.add(u)
        self._time += 1
        self._result.discovery_time[u] = self._time
        self._result.low_value[u] = self._time
        self._result.parent[u] = parent

        children_count = 0

        for v in graph.get_neighbors(u):
            if v not in self._visited:
                children_count += 1
                self._dfs(graph, v, u)

                self._result.low_value[u] = min(
                    self._result.low_value[u],
                    self._result.low_value[v]
                )

                if parent is None and children_count > 1:
                    self._result.cut_points.add(u)

                if parent is not None and self._result.low_value[v] >= self._result.discovery_time[u]:
                    self._result.cut_points.add(u)

            elif v != parent:
                self._result.low_value[u] = min(
                    self._result.low_value[u],
                    self._result.discovery_time[v]
                )

    def _classify_cut_points(self, graph: Graph) -> None:
        """对割点进行类型分类，用于边界复核"""
        for cp in self._result.cut_points:
            components = self._count_components_after_removal(graph, cp)
            self._result.component_count_after_removal[cp] = components

            degree = graph.get_degree(cp)

            if degree == 1:
                self._result.cut_point_types[cp] = CutPointType.BRIDGE_HEAD
            elif components == 2:
                self._result.cut_point_types[cp] = CutPointType.BOUNDARY
            else:
                self._result.cut_point_types[cp] = CutPointType.NORMAL

        for v in graph.vertices:
            if graph.get_degree(v) == 0:
                self._result.cut_point_types[v] = CutPointType.ISOLATED

    def _count_components_after_removal(self, graph: Graph, removed: int) -> int:
        """计算移除某顶点后的连通分量数目"""
        visited = set()
        count = 0

        for v in graph.vertices:
            if v == removed or v in visited:
                continue

            count += 1
            stack = [v]
            visited.add(v)

            while stack:
                current = stack.pop()
                for neighbor in graph.get_neighbors(current):
                    if neighbor != removed and neighbor not in visited:
                        visited.add(neighbor)
                        stack.append(neighbor)

        return count
