from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from .algorithm import PathResult, ShortestPathAlgorithm
from .graph import Edge, GraphData

logger = logging.getLogger(__name__)


@dataclass
class AuditFinding:
    type: str
    severity: str
    message: str
    details: Dict[str, Any] = field(default_factory=dict)
    edge: Optional[str] = None
    node: Optional[str] = None


@dataclass
class PathAuditResult:
    query: Tuple[str, str]
    baseline_result: PathResult
    audit_findings: List[AuditFinding] = field(default_factory=list)
    edge_sensitivity: List[Dict[str, Any]] = field(default_factory=list)
    forbidden_comparison: Optional[Dict[str, Any]] = None
    alternative_paths: List[PathResult] = field(default_factory=list)

    @property
    def has_critical_issues(self) -> bool:
        return any(f.severity == "critical" for f in self.audit_findings)

    @property
    def has_warnings(self) -> bool:
        return any(f.severity == "warning" for f in self.audit_findings)


class PathAuditor:
    def __init__(self, graph_data: GraphData):
        self.graph_data = graph_data
        self.algorithm = ShortestPathAlgorithm(graph_data)

    def audit_path(self, source: str, target: str,
                   do_sensitivity: bool = True,
                   check_forbidden: bool = True) -> PathAuditResult:
        baseline = self.algorithm.compute_shortest_path(source, target)
        audit_result = PathAuditResult(query=(source, target), baseline_result=baseline)

        if not baseline.is_valid:
            if baseline.has_negative_cycle:
                audit_result.audit_findings.append(AuditFinding(
                    type="negative_cycle",
                    severity="critical",
                    message=f"检测到负权环，无法计算最短路径。环路径: {' -> '.join(baseline.negative_cycle_path)}",
                    details={"cycle_path": baseline.negative_cycle_path}
                ))
            elif baseline.has_isolated_nodes:
                audit_result.audit_findings.append(AuditFinding(
                    type="isolated_node",
                    severity="warning",
                    message=baseline.error_message,
                    details={"error": baseline.error_message}
                ))
            else:
                audit_result.audit_findings.append(AuditFinding(
                    type="no_path",
                    severity="warning",
                    message=baseline.error_message or f"从 {source} 到 {target} 没有可达路径",
                    details={"error": baseline.error_message}
                ))
            return audit_result

        for edge in baseline.edges:
            if edge.weight < 0:
                audit_result.audit_findings.append(AuditFinding(
                    type="negative_edge_in_path",
                    severity="warning",
                    message=f"路径使用了负权边: {edge.source}->{edge.target} (权重: {edge.weight})",
                    edge=f"{edge.source}->{edge.target}",
                    details={"weight": edge.weight, "source_file": edge.source_file}
                ))

            if edge.is_forbidden:
                audit_result.audit_findings.append(AuditFinding(
                    type="forbidden_edge_in_path",
                    severity="critical",
                    message=f"路径使用了禁行边: {edge.source}->{edge.target}。原因: {edge.forbidden_reason}",
                    edge=f"{edge.source}->{edge.target}",
                    details={"forbidden_reason": edge.forbidden_reason, "source_file": edge.source_file}
                ))

        if self.algorithm.has_negative_edges():
            neg_edges = [e for e in self.graph_data.edges if e.weight < 0 and not e.is_forbidden]
            audit_result.audit_findings.append(AuditFinding(
                type="negative_edges_exist",
                severity="info",
                message=f"图中存在 {len(neg_edges)} 条负权边，已使用 Bellman-Ford 算法",
                details={"negative_edges": [f"{e.source}->{e.target}({e.weight})" for e in neg_edges]}
            ))

        if do_sensitivity and baseline.is_valid and len(baseline.path) > 1:
            sensitivity = self.algorithm.edge_sensitivity_analysis(source, target, baseline)
            audit_result.edge_sensitivity = sensitivity

            for item in sensitivity:
                if item["impact"] == "critical":
                    audit_result.audit_findings.append(AuditFinding(
                        type="critical_edge",
                        severity="critical",
                        message=f"关键边检测: 移除 {item['edge']} 将导致路径中断或权重大幅增加",
                        edge=item["edge"],
                        details=item
                    ))

        if check_forbidden and self.graph_data.forbidden_edges:
            comparison = self.algorithm.compare_with_forbidden(source, target)
            audit_result.forbidden_comparison = comparison

            if comparison["forbidden_edges_used"]:
                edges_str = ", ".join(
                    [f"{e.source}->{e.target}({e.forbidden_reason})" for e in comparison["forbidden_edges_used"]]
                )
                audit_result.audit_findings.append(AuditFinding(
                    type="forbidden_edge_usage",
                    severity="critical",
                    message=f"忽略禁行规则时，路径使用了 {len(comparison['forbidden_edges_used'])} 条禁行边: {edges_str}",
                    details={
                        "forbidden_edges": [e.source + "->" + e.target for e in comparison["forbidden_edges_used"]],
                        "path_without_forbidden": comparison["without_forbidden"].path_str,
                        "path_with_forbidden": comparison["with_forbidden"].path_str
                    }
                ))

            if comparison["path_changed"]:
                weight_diff = comparison.get("weight_diff", 0)
                if weight_diff is not None and weight_diff != 0:
                    direction = "缩短" if weight_diff < 0 else "增加"
                    audit_result.audit_findings.append(AuditFinding(
                        type="path_changed_by_forbidden",
                        severity="info",
                        message=f"禁行规则导致路径变化，权重{direction} {abs(weight_diff):.2f}",
                        details={
                            "original_path": comparison["without_forbidden"].path_str,
                            "new_path": comparison["with_forbidden"].path_str,
                            "weight_diff": weight_diff
                        }
                    ))

        return audit_result

    def audit_batch(self, queries: List[Tuple[str, str]],
                    do_sensitivity: bool = True,
                    check_forbidden: bool = True) -> List[PathAuditResult]:
        results = []
        for source, target in queries:
            result = self.audit_path(source, target, do_sensitivity, check_forbidden)
            results.append(result)
        return results

    def generate_edge_explanation(self, audit_result: PathAuditResult) -> List[Dict[str, Any]]:
        if not audit_result.baseline_result.is_valid:
            return []

        explanations = []
        path = audit_result.baseline_result.path
        edges = audit_result.baseline_result.edges

        for i, edge in enumerate(edges):
            explanation = {
                "index": i,
                "edge": f"{edge.source}->{edge.target}",
                "weight": edge.weight,
                "source_file": edge.source_file,
                "is_forbidden": edge.is_forbidden,
                "forbidden_reason": edge.forbidden_reason,
                "is_negative": edge.weight < 0,
                "attributes": edge.attributes,
                "from_node": path[i],
                "to_node": path[i + 1],
                "cumulative_weight": sum(e.weight for e in edges[:i + 1])
            }
            explanations.append(explanation)

        return explanations

    def get_global_audit_summary(self) -> Dict[str, Any]:
        graph_data = self.graph_data
        G = self.algorithm.G_clean

        summary = {
            "total_nodes": len(graph_data.nodes),
            "total_edges": len(graph_data.edges),
            "forbidden_edges": len(graph_data.forbidden_edges),
            "connected_components": nx.number_weakly_connected_components(G) if G.nodes else 0,
            "negative_edges": [
                f"{e.source}->{e.target}({e.weight})"
                for e in graph_data.edges
                if e.weight < 0 and not e.is_forbidden
            ],
            "isolated_nodes": [
                node_id for node_id in graph_data.nodes
                if node_id in G.nodes and G.degree(node_id) == 0
            ],
            "nodes_missing_from_edges": [],
            "edges_with_missing_nodes": [],
            "duplicate_edges": []
        }

        node_ids = set(graph_data.nodes.keys())
        for edge in graph_data.edges:
            if edge.source not in node_ids:
                summary["edges_with_missing_nodes"].append(f"{edge.source}->{edge.target}(起点缺失)")
            if edge.target not in node_ids:
                summary["edges_with_missing_nodes"].append(f"{edge.source}->{edge.target}(终点缺失)")

        edge_counts = {}
        for edge in graph_data.edges:
            key = (edge.source, edge.target)
            edge_counts[key] = edge_counts.get(key, 0) + 1
        summary["duplicate_edges"] = [
            f"{k[0]}->{k[1]}({v}次)" for k, v in edge_counts.items() if v > 1
        ]

        return summary


import networkx as nx
