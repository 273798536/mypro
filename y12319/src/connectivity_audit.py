import networkx as nx
from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass, field
from collections import defaultdict
from .graph_model import (
    TopologyGraph, Node, Edge, Issue, IssueType, 
    PathResult, EdgeDirection
)


@dataclass
class AuditReport:
    total_nodes: int = 0
    total_edges: int = 0
    isolated_nodes: List[Issue] = field(default_factory=list)
    cross_layer_mismatches: List[Issue] = field(default_factory=list)
    direction_reversals: List[Issue] = field(default_factory=list)
    broken_paths: List[Issue] = field(default_factory=list)
    path_results: List[PathResult] = field(default_factory=list)
    layer_summary: Dict[str, Dict] = field(default_factory=dict)
    source_file_nodes: str = ""
    source_file_edges: str = ""
    
    @property
    def total_issues(self) -> int:
        return (len(self.isolated_nodes) + 
                len(self.cross_layer_mismatches) + 
                len(self.direction_reversals) + 
                len(self.broken_paths))
    
    def get_issues_by_type(self, issue_type: IssueType) -> List[Issue]:
        mapping = {
            IssueType.ISOLATED_NODE: self.isolated_nodes,
            IssueType.CROSS_LAYER_MISMATCH: self.cross_layer_mismatches,
            IssueType.DIRECTION_REVERSED: self.direction_reversals,
            IssueType.BROKEN_PATH: self.broken_paths
        }
        return mapping.get(issue_type, [])


class ConnectivityAuditor:
    def __init__(self, graph: TopologyGraph):
        self.graph = graph
        self.report = AuditReport()
        self.report.total_nodes = len(graph.nodes)
        self.report.total_edges = len(graph.edges)
    
    def run_full_audit(self, 
                       start_nodes: Optional[List[str]] = None,
                       end_nodes: Optional[List[str]] = None,
                       layer_order: Optional[List[str]] = None) -> AuditReport:
        self._audit_isolated_nodes()
        self._audit_cross_layer_mismatches(layer_order)
        self._audit_direction_issues()
        self._audit_path_connectivity(start_nodes, end_nodes)
        self._build_layer_summary()
        return self.report
    
    def _audit_isolated_nodes(self):
        G = self.graph.G
        for node_id in self.graph.nodes:
            in_degree = G.in_degree(node_id)
            out_degree = G.out_degree(node_id)
            if in_degree == 0 and out_degree == 0:
                node = self.graph.get_node(node_id)
                issue = Issue(
                    type=IssueType.ISOLATED_NODE,
                    severity="warning",
                    message=f"节点 [{node.name}] ({node_id}) 是孤立节点，无任何连接关系",
                    nodes=[node_id],
                    details={
                        "node_name": node.name,
                        "layer": node.layer,
                        "in_degree": in_degree,
                        "out_degree": out_degree,
                        "source": "节点列表分析"
                    }
                )
                self.report.isolated_nodes.append(issue)
    
    def _audit_cross_layer_mismatches(self, layer_order: Optional[List[str]] = None):
        layers = self.graph.get_all_layers()
        layer_to_idx = {layer: idx for idx, layer in enumerate(layer_order or layers)}
        
        for edge in self.graph.edges.values():
            source_node = self.graph.get_node(edge.source)
            target_node = self.graph.get_node(edge.target)
            
            if not source_node or not target_node:
                continue
            
            source_layer_idx = layer_to_idx.get(source_node.layer, -1)
            target_layer_idx = layer_to_idx.get(target_node.layer, -1)
            
            if layer_order and source_layer_idx >= 0 and target_layer_idx >= 0:
                if source_layer_idx > target_layer_idx:
                    issue = Issue(
                        type=IssueType.CROSS_LAYER_MISMATCH,
                        severity="error",
                        message=f"边 [{edge.id}] 跨层顺序错误: {source_node.layer} → {target_node.layer}",
                        edges=[edge.id],
                        nodes=[edge.source, edge.target],
                        details={
                            "edge_id": edge.id,
                            "source_layer": source_node.layer,
                            "target_layer": target_node.layer,
                            "expected_order": "从高层到低层",
                            "source": f"边关系 {edge.id}"
                        }
                    )
                    self.report.cross_layer_mismatches.append(issue)
            
            if edge.layer and edge.layer != source_node.layer and edge.layer != target_node.layer:
                issue = Issue(
                    type=IssueType.CROSS_LAYER_MISMATCH,
                    severity="warning",
                    message=f"边 [{edge.id}] 的层级标签与两端节点不匹配",
                    edges=[edge.id],
                    nodes=[edge.source, edge.target],
                    details={
                        "edge_id": edge.id,
                        "edge_layer": edge.layer,
                        "source_layer": source_node.layer,
                        "target_layer": target_node.layer,
                        "source": f"边关系 {edge.id}"
                    }
                )
                self.report.cross_layer_mismatches.append(issue)
    
    def _audit_direction_issues(self):
        for edge in self.graph.edges.values():
            if edge.direction == EdgeDirection.REVERSE:
                source_node = self.graph.get_node(edge.source)
                target_node = self.graph.get_node(edge.target)
                issue = Issue(
                    type=IssueType.DIRECTION_REVERSED,
                    severity="warning",
                    message=f"边 [{edge.id}] 方向为反向，实际流向: {target_node.name if target_node else edge.target} → {source_node.name if source_node else edge.source}",
                    edges=[edge.id],
                    nodes=[edge.source, edge.target],
                    details={
                        "edge_id": edge.id,
                        "defined_direction": "reverse",
                        "actual_flow": f"{edge.target} → {edge.source}",
                        "source": f"边关系 {edge.id}"
                    }
                )
                self.report.direction_reversals.append(issue)
    
    def _audit_path_connectivity(self, 
                                 start_nodes: Optional[List[str]] = None,
                                 end_nodes: Optional[List[str]] = None):
        G = self.graph.G
        
        if start_nodes is None:
            start_nodes = [n for n in G.nodes() if G.in_degree(n) == 0 and G.out_degree(n) > 0]
        if end_nodes is None:
            end_nodes = [n for n in G.nodes() if G.out_degree(n) == 0 and G.in_degree(n) > 0]
        
        for start in start_nodes:
            for end in end_nodes:
                if start == end:
                    continue
                self._analyze_single_path(start, end)
    
    def _analyze_single_path(self, start: str, end: str):
        G = self.graph.G
        path_result = PathResult(
            path=[],
            edges=[],
            layers=[],
            has_issues=False,
            issues=[]
        )
        
        try:
            path = nx.shortest_path(G, start, end)
            path_result.path = path
            
            for i in range(len(path) - 1):
                u, v = path[i], path[i + 1]
                edge = self.graph.get_edge_by_nodes(u, v)
                if edge:
                    path_result.edges.append(edge.id)
            
            for node_id in path:
                node = self.graph.get_node(node_id)
                if node:
                    path_result.layers.append(node.layer)
            
            path_issues = self._check_path_issues(path)
            if path_issues:
                path_result.has_issues = True
                path_result.issues = path_issues
                for issue in path_issues:
                    if issue not in self.report.broken_paths:
                        self.report.broken_paths.append(issue)
        
        except nx.NetworkXNoPath:
            start_node = self.graph.get_node(start)
            end_node = self.graph.get_node(end)
            issue = Issue(
                type=IssueType.BROKEN_PATH,
                severity="error",
                message=f"从 {start_node.name if start_node else start} 到 {end_node.name if end_node else end} 没有连通路径",
                nodes=[start, end],
                details={
                    "start_node": start,
                    "end_node": end,
                    "start_name": start_node.name if start_node else start,
                    "end_name": end_node.name if end_node else end,
                    "source": f"路径查询 {start} → {end}"
                }
            )
            path_result.has_issues = True
            path_result.issues = [issue]
            self.report.broken_paths.append(issue)
        
        self.report.path_results.append(path_result)
    
    def _check_path_issues(self, path: List[str]) -> List[Issue]:
        issues = []
        layers = []
        
        for node_id in path:
            node = self.graph.get_node(node_id)
            if node:
                layers.append(node.layer)
        
        layer_changes = []
        for i in range(len(layers) - 1):
            if layers[i] != layers[i + 1]:
                layer_changes.append((i, layers[i], layers[i + 1]))
        
        return issues
    
    def _build_layer_summary(self):
        layers = self.graph.get_all_layers()
        for layer in layers:
            nodes = self.graph.get_nodes_by_layer(layer)
            node_ids = [n.id for n in nodes]
            
            edges_in_layer = []
            edges_cross_layer = []
            for edge in self.graph.edges.values():
                source_node = self.graph.get_node(edge.source)
                target_node = self.graph.get_node(edge.target)
                if source_node and target_node:
                    if source_node.layer == layer and target_node.layer == layer:
                        edges_in_layer.append(edge.id)
                    elif source_node.layer == layer or target_node.layer == layer:
                        edges_cross_layer.append(edge.id)
            
            isolated_in_layer = [
                n for n in node_ids 
                if any(issue.nodes and issue.nodes[0] == n for issue in self.report.isolated_nodes)
            ]
            
            self.report.layer_summary[layer] = {
                "node_count": len(nodes),
                "nodes": node_ids,
                "edges_in_layer": edges_in_layer,
                "edges_cross_layer": edges_cross_layer,
                "isolated_nodes": isolated_in_layer,
                "source": "层级汇总分析"
            }
