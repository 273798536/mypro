"""图论最短路核心计算模块。"""
from __future__ import annotations

import heapq
from typing import Dict, List, Optional, Tuple

from .models import Edge, GraphData, PathResult


class ShortestPathSolver:
    """Dijkstra 最短路求解器。"""

    def __init__(self, nodes: List[str], edges: List[Edge]):
        self.nodes = list(nodes)
        self.adjacency: Dict[str, List[Tuple[str, float, Optional[str]]]] = {}
        for n in self.nodes:
            self.adjacency[n] = []
        for e in edges:
            if e.from_node not in self.adjacency:
                self.adjacency[e.from_node] = []
            if e.to_node not in self.adjacency:
                self.adjacency[e.to_node] = []
            self.adjacency[e.from_node].append((e.to_node, e.weight, e.label))

    def solve(self, source: str, target: Optional[str] = None) -> PathResult:
        if source not in self.adjacency:
            return PathResult(
                distance=None,
                path=None,
                success=False,
                error=f"源节点 '{source}' 不存在于图中",
            )

        if target is not None and target not in self.adjacency:
            return PathResult(
                distance=None,
                path=None,
                success=False,
                error=f"目标节点 '{target}' 不存在于图中",
            )

        dist: Dict[str, float] = {n: float("inf") for n in self.adjacency}
        prev: Dict[str, Optional[str]] = {n: None for n in self.adjacency}
        dist[source] = 0.0
        pq: List[Tuple[float, str]] = [(0.0, source)]

        while pq:
            d, u = heapq.heappop(pq)
            if d > dist[u]:
                continue
            if target is not None and u == target:
                break
            for v, w, _lbl in self.adjacency[u]:
                if w < 0:
                    return PathResult(
                        distance=None,
                        path=None,
                        success=False,
                        error=f"检测到负权边 {u}->{v} (权重={w})，Dijkstra 不适用",
                    )
                nd = d + w
                if nd < dist[v]:
                    dist[v] = nd
                    prev[v] = u
                    heapq.heappush(pq, (nd, v))

        if target is not None:
            if dist[target] == float("inf"):
                return PathResult(
                    distance=None,
                    path=None,
                    success=False,
                    error=f"从 '{source}' 到 '{target}' 不存在可达路径",
                )
            path = self._reconstruct(prev, source, target)
            return PathResult(distance=dist[target], path=path, success=True)
        else:
            return PathResult(
                distance=None,
                path=None,
                success=True,
                error="未指定目标节点，仅完成单源最短距离计算",
            )

    def solve_all(self, source: str) -> Dict[str, PathResult]:
        results: Dict[str, PathResult] = {}
        if source not in self.adjacency:
            for n in self.nodes:
                results[n] = PathResult(
                    distance=None,
                    path=None,
                    success=False,
                    error=f"源节点 '{source}' 不存在于图中",
                )
            return results

        dist: Dict[str, float] = {n: float("inf") for n in self.adjacency}
        prev: Dict[str, Optional[str]] = {n: None for n in self.adjacency}
        dist[source] = 0.0
        pq: List[Tuple[float, str]] = [(0.0, source)]
        has_negative = False

        while pq and not has_negative:
            d, u = heapq.heappop(pq)
            if d > dist[u]:
                continue
            for v, w, _lbl in self.adjacency[u]:
                if w < 0:
                    has_negative = True
                    break
                nd = d + w
                if nd < dist[v]:
                    dist[v] = nd
                    prev[v] = u
                    heapq.heappush(pq, (nd, v))

        if has_negative:
            for n in self.nodes:
                results[n] = PathResult(
                    distance=None,
                    path=None,
                    success=False,
                    error="检测到负权边，Dijkstra 不适用",
                )
            return results

        for n in self.nodes:
            if dist[n] == float("inf"):
                results[n] = PathResult(
                    distance=None,
                    path=None,
                    success=False,
                    error=f"从 '{source}' 到 '{n}' 不存在可达路径",
                )
            else:
                path = self._reconstruct(prev, source, n)
                results[n] = PathResult(distance=dist[n], path=path, success=True)
        return results

    @staticmethod
    def _reconstruct(
        prev: Dict[str, Optional[str]], source: str, target: str
    ) -> List[str]:
        path: List[str] = []
        cur: Optional[str] = target
        while cur is not None:
            path.append(cur)
            cur = prev[cur]
        path.reverse()
        return path


def compute_shortest_path(data: GraphData) -> PathResult:
    """对给定图数据计算最短路。"""
    if not data.nodes:
        return PathResult(
            distance=None,
            path=None,
            success=False,
            error="图为空：没有节点",
        )
    if not data.edges and data.source != data.target:
        if data.source is None or data.target is None:
            return PathResult(
                distance=None,
                path=None,
                success=False,
                error="图无边且未同时指定源和目标",
            )
        if data.source == data.target:
            return PathResult(distance=0.0, path=[data.source], success=True)
        return PathResult(
            distance=None,
            path=None,
            success=False,
            error=f"图无边，从 '{data.source}' 到 '{data.target}' 无路径",
        )

    if data.source is None:
        return PathResult(
            distance=None,
            path=None,
            success=False,
            error="未指定源节点 (source)",
        )

    solver = ShortestPathSolver(data.nodes, data.edges)
    return solver.solve(data.source, data.target)
