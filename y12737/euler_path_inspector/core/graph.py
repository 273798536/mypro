"""
图结构表示模块
提供有向图和无向图的表示与基本操作。
"""

from typing import Dict, List, Set, Optional, Any, Tuple
from collections import defaultdict
from dataclasses import dataclass, field


@dataclass
class Edge:
    """边的表示"""
    source: Any
    target: Any
    weight: float = 1.0
    directed: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if not self.directed and self.source > self.target:
            self.source, self.target = self.target, self.source

    def __key(self):
        if self.directed:
            return (self.source, self.target, self.directed)
        return tuple(sorted([self.source, self.target])) + (self.directed,)

    def __hash__(self):
        return hash(self.__key())

    def __eq__(self, other):
        if not isinstance(other, Edge):
            return False
        return self.__key() == other.__key()

    def __repr__(self):
        arrow = "->" if self.directed else "--"
        return f"Edge({self.source}{arrow}{self.target}, w={self.weight})"


class Graph:
    """
    图数据结构
    支持有向图和无向图
    """

    def __init__(self, directed: bool = False, name: str = "unnamed"):
        self.directed = directed
        self.name = name
        self._vertices: Set[Any] = set()
        self._edges: List[Edge] = []
        self._adj_list: Dict[Any, List[Any]] = defaultdict(list)
        self._in_degree: Dict[Any, int] = defaultdict(int)
        self._out_degree: Dict[Any, int] = defaultdict(int)

    def add_vertex(self, vertex: Any) -> None:
        """添加顶点"""
        if vertex not in self._vertices:
            self._vertices.add(vertex)
            if vertex not in self._adj_list:
                self._adj_list[vertex] = []

    def add_edge(self, source: Any, target: Any, weight: float = 1.0,
                 metadata: Optional[Dict[str, Any]] = None) -> None:
        """添加边"""
        self.add_vertex(source)
        self.add_vertex(target)

        edge = Edge(source, target, weight, self.directed, metadata or {})
        self._edges.append(edge)

        self._adj_list[source].append(target)
        self._out_degree[source] += 1
        self._in_degree[target] += 1

        if not self.directed:
            self._adj_list[target].append(source)
            self._out_degree[target] += 1
            self._in_degree[source] += 1

    @property
    def vertices(self) -> Set[Any]:
        return self._vertices.copy()

    @property
    def edges(self) -> List[Edge]:
        return self._edges.copy()

    @property
    def vertex_count(self) -> int:
        return len(self._vertices)

    @property
    def edge_count(self) -> int:
        return len(self._edges)

    def is_empty(self) -> bool:
        """检查图是否为空（无顶点）"""
        return self.vertex_count == 0

    def has_edges(self) -> bool:
        """检查图是否有边"""
        return self.edge_count > 0

    def get_degree(self, vertex: Any) -> int:
        """获取顶点的度数"""
        if vertex not in self._vertices:
            return 0
        if self.directed:
            return self._in_degree.get(vertex, 0) + self._out_degree.get(vertex, 0)
        return len(self._adj_list.get(vertex, []))

    def get_in_degree(self, vertex: Any) -> int:
        """获取顶点的入度（有向图）"""
        if not self.directed:
            return self.get_degree(vertex)
        return self._in_degree.get(vertex, 0)

    def get_out_degree(self, vertex: Any) -> int:
        """获取顶点的出度（有向图）"""
        if not self.directed:
            return self.get_degree(vertex)
        return self._out_degree.get(vertex, 0)

    def get_neighbors(self, vertex: Any) -> List[Any]:
        """获取邻居顶点"""
        return self._adj_list.get(vertex, []).copy()

    def is_connected(self) -> bool:
        """
        检查图的连通性
        忽略度数为0的孤立顶点
        """
        non_isolated = [v for v in self._vertices if self.get_degree(v) > 0]
        if len(non_isolated) <= 1:
            return True

        start = non_isolated[0]
        visited = set()
        stack = [start]

        while stack:
            v = stack.pop()
            if v in visited:
                continue
            visited.add(v)
            for neighbor in self._adj_list.get(v, []):
                if neighbor not in visited:
                    stack.append(neighbor)

        for v in non_isolated:
            if v not in visited:
                return False
        return True

    def is_weakly_connected(self) -> bool:
        """
        检查有向图的弱连通性
        将有向边视为无向边后检查连通性
        """
        if not self.directed:
            return self.is_connected()

        non_isolated = [v for v in self._vertices if self.get_degree(v) > 0]
        if len(non_isolated) <= 1:
            return True

        undirected_adj: Dict[Any, Set[Any]] = defaultdict(set)
        for edge in self._edges:
            undirected_adj[edge.source].add(edge.target)
            undirected_adj[edge.target].add(edge.source)

        start = non_isolated[0]
        visited = set()
        stack = [start]

        while stack:
            v = stack.pop()
            if v in visited:
                continue
            visited.add(v)
            for neighbor in undirected_adj.get(v, set()):
                if neighbor not in visited:
                    stack.append(neighbor)

        for v in non_isolated:
            if v not in visited:
                return False
        return True

    def get_odd_degree_vertices(self) -> List[Any]:
        """获取度数为奇数的顶点列表"""
        return [v for v in self._vertices if self.get_degree(v) % 2 != 0]

    def get_in_out_degree_diff(self) -> Dict[Any, int]:
        """获取有向图各顶点的(出度-入度)差值"""
        result = {}
        for v in self._vertices:
            diff = self.get_out_degree(v) - self.get_in_degree(v)
            if diff != 0:
                result[v] = diff
        return result

    def to_dict(self) -> Dict[str, Any]:
        """将图转换为字典格式"""
        return {
            "name": self.name,
            "directed": self.directed,
            "vertices": list(self._vertices),
            "edges": [
                {
                    "source": e.source,
                    "target": e.target,
                    "weight": e.weight,
                    "metadata": e.metadata
                }
                for e in self._edges
            ],
            "stats": {
                "vertex_count": self.vertex_count,
                "edge_count": self.edge_count
            }
        }
