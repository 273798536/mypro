from __future__ import annotations

import heapq
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple

import networkx as nx

from .graph import Edge, GraphData

logger = logging.getLogger(__name__)


@dataclass
class PathResult:
    source: str
    target: str
    path: List[str] = field(default_factory=list)
    edges: List[Edge] = field(default_factory=list)
    total_weight: float = float("inf")
    is_valid: bool = True
    error_message: str = ""
    algorithm: str = ""
    has_negative_cycle: bool = False
    negative_cycle_path: List[str] = field(default_factory=list)
    used_forbidden_edges: List[Edge] = field(default_factory=list)
    has_isolated_nodes: bool = False

    @property
    def path_str(self) -> str:
        return " -> ".join(self.path) if self.path else "无路径"

    @property
    def edge_count(self) -> int:
        return len(self.edges)


class ShortestPathAlgorithm:
    def __init__(self, graph_data: GraphData):
        self.graph_data = graph_data
        self.G_clean = graph_data.to_networkx(include_forbidden=False)
        self.G_with_forbidden = graph_data.to_networkx(include_forbidden=True)
        self._node_to_edges: Dict[Tuple[str, str], List[Edge]] = {}
        for edge in graph_data.edges:
            key = (edge.source, edge.target)
            if key not in self._node_to_edges:
                self._node_to_edges[key] = []
            self._node_to_edges[key].append(edge)

    def has_negative_edges(self, include_forbidden: bool = False) -> bool:
        edges_to_check = self.graph_data.edges
        if not include_forbidden:
            edges_to_check = [e for e in edges_to_check if not e.is_forbidden]
        return any(e.weight < 0 for e in edges_to_check)

    def detect_negative_cycles(self) -> List[List[str]]:
        try:
            if hasattr(nx, 'find_negative_cycles'):
                cycles = list(nx.find_negative_cycles(self.G_clean))
                return cycles
            else:
                cycles = []
                for node in self.G_clean.nodes:
                    try:
                        dist, path = nx.single_source_bellman_ford(self.G_clean, node)
                    except nx.NetworkXUnbounded:
                        cycles.append([node])
                        break
                return cycles
        except Exception:
            return []

    def _get_edges_from_path(self, path: List[str]) -> List[Edge]:
        edges = []
        for i in range(len(path) - 1):
            u, v = path[i], path[i + 1]
            key = (u, v)
            if key in self._node_to_edges:
                non_forbidden = [e for e in self._node_to_edges[key] if not e.is_forbidden]
                if non_forbidden:
                    edges.append(non_forbidden[0])
                else:
                    edges.append(self._node_to_edges[key][0])
        return edges

    def _check_isolated(self, source: str, target: str) -> Tuple[bool, str]:
        issues = []
        if source not in self.G_clean.nodes:
            issues.append(f"起点 {source} 不存在于图中")
        if target not in self.G_clean.nodes:
            issues.append(f"终点 {target} 不存在于图中")
        if source in self.G_clean.nodes and self.G_clean.out_degree(source) == 0 and source != target:
            issues.append(f"起点 {source} 是孤立点（无出边）")
        if target in self.G_clean.nodes and self.G_clean.in_degree(target) == 0 and source != target:
            issues.append(f"终点 {target} 是孤立点（无入边）")
        if issues:
            return True, "; ".join(issues)
        return False, ""

    def dijkstra(self, source: str, target: str) -> PathResult:
        result = PathResult(source=source, target=target, algorithm="Dijkstra")

        isolated, msg = self._check_isolated(source, target)
        if isolated:
            result.is_valid = False
            result.has_isolated_nodes = True
            result.error_message = msg
            return result

        if source == target:
            result.path = [source]
            result.total_weight = 0
            return result

        try:
            path = nx.dijkstra_path(self.G_clean, source, target, weight="weight")
            total_weight = nx.dijkstra_path_length(self.G_clean, source, target, weight="weight")
            result.path = path
            result.edges = self._get_edges_from_path(path)
            result.total_weight = total_weight
        except nx.NetworkXNoPath:
            result.is_valid = False
            result.error_message = f"从 {source} 到 {target} 没有可达路径"
        except nx.NodeNotFound as e:
            result.is_valid = False
            result.error_message = str(e)

        return result

    def bellman_ford(self, source: str, target: str) -> PathResult:
        result = PathResult(source=source, target=target, algorithm="Bellman-Ford")

        isolated, msg = self._check_isolated(source, target)
        if isolated:
            result.is_valid = False
            result.has_isolated_nodes = True
            result.error_message = msg
            return result

        if source == target:
            result.path = [source]
            result.total_weight = 0
            return result

        try:
            path = nx.bellman_ford_path(self.G_clean, source, target, weight="weight")
            total_weight = nx.bellman_ford_path_length(self.G_clean, source, target, weight="weight")
            result.path = path
            result.edges = self._get_edges_from_path(path)
            result.total_weight = total_weight
        except nx.NetworkXNoPath:
            result.is_valid = False
            result.error_message = f"从 {source} 到 {target} 没有可达路径"
        except nx.NodeNotFound as e:
            result.is_valid = False
            result.error_message = str(e)
        except nx.NetworkXUnbounded:
            result.is_valid = False
            result.has_negative_cycle = True
            result.error_message = "图中存在负权环，无法计算最短路径"
            cycles = self.detect_negative_cycles()
            if cycles:
                result.negative_cycle_path = cycles[0]

        return result

    def compute_shortest_path(self, source: str, target: str,
                              force_algorithm: Optional[str] = None) -> PathResult:
        has_neg = self.has_negative_edges()

        if force_algorithm:
            algorithm = force_algorithm.lower()
            if algorithm == "dijkstra":
                if has_neg:
                    logger.warning(f"检测到负权边，但强制使用Dijkstra算法，结果可能不正确")
                return self.dijkstra(source, target)
            elif algorithm == "bellman-ford" or algorithm == "bellman_ford":
                return self.bellman_ford(source, target)

        if has_neg:
            return self.bellman_ford(source, target)
        else:
            return self.dijkstra(source, target)

    def compute_path_with_forbidden(self, source: str, target: str,
                                    forbidden_edges: Optional[Set[Tuple[str, str]]] = None) -> PathResult:
        if forbidden_edges is None:
            forbidden_edges = self.graph_data.forbidden_edges

        G_temp = nx.DiGraph()
        for node in self.G_clean.nodes:
            G_temp.add_node(node)
        for u, v, data in self.G_with_forbidden.edges(data=True):
            if (u, v) not in forbidden_edges:
                G_temp.add_edge(u, v, **data)

        result = PathResult(source=source, target=target, algorithm="Filtered-Bellman-Ford")

        isolated, msg = self._check_isolated(source, target)
        if isolated:
            result.is_valid = False
            result.has_isolated_nodes = True
            result.error_message = msg
            return result

        if source == target:
            result.path = [source]
            result.total_weight = 0
            return result

        try:
            path = nx.bellman_ford_path(G_temp, source, target, weight="weight")
            total_weight = nx.bellman_ford_path_length(G_temp, source, target, weight="weight")
            result.path = path
            result.edges = self._get_edges_from_path(path)
            result.total_weight = total_weight
        except nx.NetworkXNoPath:
            result.is_valid = False
            result.error_message = f"从 {source} 到 {target} 没有可达路径（已应用禁行规则）"
        except nx.NodeNotFound as e:
            result.is_valid = False
            result.error_message = str(e)
        except nx.NetworkXUnbounded:
            result.is_valid = False
            result.has_negative_cycle = True
            result.error_message = "图中存在负权环，无法计算最短路径"

        return result

    def edge_sensitivity_analysis(self, source: str, target: str,
                                  base_result: PathResult) -> List[Dict[str, Any]]:
        if not base_result.is_valid or not base_result.path:
            return []

        analysis = []
        original_weight = base_result.total_weight

        path_edges = list(zip(base_result.path[:-1], base_result.path[1:]))

        for i, (u, v) in enumerate(path_edges):
            temp_forbidden = set(self.graph_data.forbidden_edges)
            temp_forbidden.add((u, v))

            temp_result = self.compute_path_with_forbidden(source, target, temp_forbidden)

            if temp_result.is_valid:
                diff = temp_result.total_weight - original_weight
                analysis.append({
                    "edge": f"{u}->{v}",
                    "edge_index": i,
                    "removed": True,
                    "new_path": temp_result.path_str,
                    "new_weight": temp_result.total_weight,
                    "weight_diff": diff,
                    "impact": "critical" if diff > original_weight * 0.5 else "high" if diff > 0 else "low",
                    "message": f"移除边 {u}->{v} 后，路径变为 {temp_result.path_str}，权重增加 {diff:.2f}"
                })
            else:
                analysis.append({
                    "edge": f"{u}->{v}",
                    "edge_index": i,
                    "removed": True,
                    "new_path": "无路径",
                    "new_weight": None,
                    "weight_diff": None,
                    "impact": "critical",
                    "message": f"移除边 {u}->{v} 后，{source} 到 {target} 无可达路径"
                })

        return analysis

    def compare_with_forbidden(self, source: str, target: str) -> Dict[str, Any]:
        result_without = self.compute_shortest_path(source, target)

        G_ignoring_forbidden = nx.DiGraph()
        for node in self.G_with_forbidden.nodes:
            G_ignoring_forbidden.add_node(node)
        for u, v, data in self.G_with_forbidden.edges(data=True):
            G_ignoring_forbidden.add_edge(u, v, **data)

        result_with = PathResult(source=source, target=target, algorithm="Bellman-Ford(忽略禁行)")
        if source in G_ignoring_forbidden.nodes and target in G_ignoring_forbidden.nodes:
            try:
                if source == target:
                    result_with.path = [source]
                    result_with.total_weight = 0
                else:
                    path = nx.bellman_ford_path(G_ignoring_forbidden, source, target, weight="weight")
                    total_weight = nx.bellman_ford_path_length(G_ignoring_forbidden, source, target, weight="weight")
                    result_with.path = path
                    result_with.edges = self._get_edges_from_path(path)
                    result_with.total_weight = total_weight

                used_forbidden = []
                for i in range(len(result_with.path) - 1):
                    u, v = result_with.path[i], result_with.path[i + 1]
                    if (u, v) in self.graph_data.forbidden_edges:
                        edge = self.graph_data.get_edge(u, v)
                        if edge:
                            used_forbidden.append(edge)
                result_with.used_forbidden_edges = used_forbidden
            except Exception as e:
                result_with.is_valid = False
                result_with.error_message = str(e)

        return {
            "with_forbidden": result_without,
            "without_forbidden": result_with,
            "forbidden_edges_used": result_with.used_forbidden_edges,
            "path_changed": result_without.path != result_with.path,
            "weight_diff": result_with.total_weight - result_without.total_weight if (result_with.is_valid and result_without.is_valid) else None
        }
