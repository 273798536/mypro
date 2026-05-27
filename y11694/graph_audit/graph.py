from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple

import networkx as nx
import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class Node:
    id: str
    attributes: Dict[str, Any] = field(default_factory=dict)
    source: str = ""

    def __hash__(self):
        return hash(self.id)


@dataclass
class Edge:
    source: str
    target: str
    weight: float
    attributes: Dict[str, Any] = field(default_factory=dict)
    source_file: str = ""
    is_forbidden: bool = False
    forbidden_reason: str = ""

    @property
    def key(self) -> Tuple[str, str]:
        return (self.source, self.target)

    def __hash__(self):
        return hash(self.key)


@dataclass
class GraphData:
    nodes: Dict[str, Node] = field(default_factory=dict)
    edges: List[Edge] = field(default_factory=list)
    forbidden_edges: Set[Tuple[str, str]] = field(default_factory=set)
    raw_data: Dict[str, pd.DataFrame] = field(default_factory=dict)
    issues: List[Dict[str, Any]] = field(default_factory=list)

    def add_node(self, node_id: str, attributes: Dict[str, Any] = None, source: str = ""):
        if node_id not in self.nodes:
            self.nodes[node_id] = Node(id=node_id, attributes=attributes or {}, source=source)
        return self.nodes[node_id]

    def add_edge(self, source: str, target: str, weight: float,
                 attributes: Dict[str, Any] = None, source_file: str = "",
                 is_forbidden: bool = False, forbidden_reason: str = ""):
        edge = Edge(
            source=source,
            target=target,
            weight=weight,
            attributes=attributes or {},
            source_file=source_file,
            is_forbidden=is_forbidden,
            forbidden_reason=forbidden_reason
        )
        self.edges.append(edge)
        if is_forbidden:
            self.forbidden_edges.add((source, target))
        return edge

    def get_edge(self, source: str, target: str) -> Optional[Edge]:
        for edge in self.edges:
            if edge.source == source and edge.target == target:
                return edge
        return None

    def to_networkx(self, include_forbidden: bool = False) -> nx.DiGraph:
        G = nx.DiGraph()
        for node_id, node in self.nodes.items():
            G.add_node(node_id, **node.attributes)
        for edge in self.edges:
            if not include_forbidden and edge.is_forbidden:
                continue
            G.add_edge(edge.source, edge.target, weight=edge.weight, **edge.attributes)
        return G

    def validate(self) -> List[Dict[str, Any]]:
        issues = []
        node_ids = set(self.nodes.keys())

        isolated_nodes = set()
        connected_nodes = set()
        for edge in self.edges:
            connected_nodes.add(edge.source)
            connected_nodes.add(edge.target)
        isolated_nodes = node_ids - connected_nodes
        for node_id in sorted(isolated_nodes):
            issues.append({
                "type": "isolated_node",
                "severity": "warning",
                "node": node_id,
                "message": f"节点 {node_id} 是孤立点，没有任何连接边"
            })

        for edge in self.edges:
            if edge.source not in node_ids:
                issues.append({
                    "type": "missing_node",
                    "severity": "error",
                    "edge": f"{edge.source}->{edge.target}",
                    "message": f"边起点 {edge.source} 不存在于节点表"
                })
            if edge.target not in node_ids:
                issues.append({
                    "type": "missing_node",
                    "severity": "error",
                    "edge": f"{edge.source}->{edge.target}",
                    "message": f"边终点 {edge.target} 不存在于节点表"
                })

        negative_edges = [e for e in self.edges if e.weight < 0 and not e.is_forbidden]
        for edge in negative_edges:
            issues.append({
                "type": "negative_weight",
                "severity": "warning",
                "edge": f"{edge.source}->{edge.target}",
                "weight": edge.weight,
                "message": f"边 {edge.source}->{edge.target} 权重为负 ({edge.weight})"
            })

        for edge in self.edges:
            if edge.is_forbidden and (edge.source, edge.target) in self.forbidden_edges:
                issues.append({
                    "type": "forbidden_edge_info",
                    "severity": "info",
                    "edge": f"{edge.source}->{edge.target}",
                    "message": f"边 {edge.source}->{edge.target} 已被禁行: {edge.forbidden_reason}"
                })

        duplicate_edges = {}
        for edge in self.edges:
            key = (edge.source, edge.target)
            if key not in duplicate_edges:
                duplicate_edges[key] = []
            duplicate_edges[key].append(edge)
        for key, edges in duplicate_edges.items():
            if len(edges) > 1:
                issues.append({
                    "type": "duplicate_edge",
                    "severity": "warning",
                    "edge": f"{key[0]}->{key[1]}",
                    "count": len(edges),
                    "message": f"边 {key[0]}->{key[1]} 存在 {len(edges)} 条重复记录"
                })

        self.issues = issues
        return issues


class GraphParser:
    @staticmethod
    def parse_nodes(file_path: str) -> Tuple[List[Node], List[Dict[str, Any]]]:
        issues = []
        nodes = []
        try:
            df = pd.read_csv(file_path)
            required_cols = ["node_id"]
            for col in required_cols:
                if col not in df.columns:
                    issues.append({
                        "type": "missing_column",
                        "severity": "error",
                        "file": file_path,
                        "column": col,
                        "message": f"节点表缺少必需列: {col}"
                    })
            if not issues:
                for _, row in df.iterrows():
                    node_id = str(row["node_id"]).strip()
                    attrs = row.drop("node_id").to_dict()
                    nodes.append(Node(id=node_id, attributes=attrs, source=file_path))
        except Exception as e:
            issues.append({
                "type": "parse_error",
                "severity": "error",
                "file": file_path,
                "message": f"解析节点表失败: {str(e)}"
            })
        return nodes, issues

    @staticmethod
    def parse_edges(file_path: str) -> Tuple[List[Edge], List[Dict[str, Any]]]:
        issues = []
        edges = []
        try:
            df = pd.read_csv(file_path)
            required_cols = ["source", "target", "weight"]
            for col in required_cols:
                if col not in df.columns:
                    issues.append({
                        "type": "missing_column",
                        "severity": "error",
                        "file": file_path,
                        "column": col,
                        "message": f"边表缺少必需列: {col}"
                    })
            if not issues:
                for _, row in df.iterrows():
                    source = str(row["source"]).strip()
                    target = str(row["target"]).strip()
                    weight = float(row["weight"])
                    attrs = row.drop(required_cols).to_dict()
                    edges.append(Edge(source=source, target=target, weight=weight,
                                      attributes=attrs, source_file=file_path))
        except Exception as e:
            issues.append({
                "type": "parse_error",
                "severity": "error",
                "file": file_path,
                "message": f"解析边表失败: {str(e)}"
            })
        return edges, issues

    @staticmethod
    def parse_forbidden(file_path: str) -> Tuple[Set[Tuple[str, str]], Dict[Tuple[str, str], str], List[Dict[str, Any]]]:
        issues = []
        forbidden = set()
        reasons = {}
        try:
            df = pd.read_csv(file_path)
            required_cols = ["source", "target"]
            for col in required_cols:
                if col not in df.columns:
                    issues.append({
                        "type": "missing_column",
                        "severity": "error",
                        "file": file_path,
                        "column": col,
                        "message": f"禁行边表缺少必需列: {col}"
                    })
            if not issues:
                for _, row in df.iterrows():
                    source = str(row["source"]).strip()
                    target = str(row["target"]).strip()
                    reason = str(row.get("reason", "未指定原因")).strip()
                    forbidden.add((source, target))
                    reasons[(source, target)] = reason
        except Exception as e:
            issues.append({
                "type": "parse_error",
                "severity": "error",
                "file": file_path,
                "message": f"解析禁行边表失败: {str(e)}"
            })
        return forbidden, reasons, issues

    @staticmethod
    def parse_queries(file_path: str) -> Tuple[List[Tuple[str, str]], List[Dict[str, Any]]]:
        issues = []
        queries = []
        try:
            df = pd.read_csv(file_path)
            required_cols = ["source", "target"]
            for col in required_cols:
                if col not in df.columns:
                    issues.append({
                        "type": "missing_column",
                        "severity": "error",
                        "file": file_path,
                        "column": col,
                        "message": f"查询表缺少必需列: {col}"
                    })
            if not issues:
                for _, row in df.iterrows():
                    source = str(row["source"]).strip()
                    target = str(row["target"]).strip()
                    queries.append((source, target))
        except Exception as e:
            issues.append({
                "type": "parse_error",
                "severity": "error",
                "file": file_path,
                "message": f"解析查询表失败: {str(e)}"
            })
        return queries, issues

    @classmethod
    def parse_all(cls, nodes_file: str = None, edges_file: str = None,
                  forbidden_file: str = None) -> Tuple[GraphData, List[Dict[str, Any]]]:
        graph_data = GraphData()
        all_issues = []
        raw_data = {}

        if nodes_file:
            nodes, issues = cls.parse_nodes(nodes_file)
            all_issues.extend(issues)
            for node in nodes:
                graph_data.nodes[node.id] = node
            try:
                raw_data["nodes"] = pd.read_csv(nodes_file)
            except:
                pass

        if edges_file:
            edges, issues = cls.parse_edges(edges_file)
            all_issues.extend(issues)
            try:
                raw_data["edges"] = pd.read_csv(edges_file)
            except:
                pass

            if forbidden_file:
                forbidden_set, forbidden_reasons, issues = cls.parse_forbidden(forbidden_file)
                all_issues.extend(issues)
                try:
                    raw_data["forbidden"] = pd.read_csv(forbidden_file)
                except:
                    pass
            else:
                forbidden_set = set()
                forbidden_reasons = {}

            for edge in edges:
                key = (edge.source, edge.target)
                is_forbidden = key in forbidden_set
                forbidden_reason = forbidden_reasons.get(key, "") if is_forbidden else ""
                graph_data.add_edge(
                    source=edge.source,
                    target=edge.target,
                    weight=edge.weight,
                    attributes=edge.attributes,
                    source_file=edge.source_file,
                    is_forbidden=is_forbidden,
                    forbidden_reason=forbidden_reason
                )

        graph_data.raw_data = raw_data

        validate_issues = graph_data.validate()
        all_issues.extend(validate_issues)

        return graph_data, all_issues
