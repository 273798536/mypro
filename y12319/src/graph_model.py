import networkx as nx
import pandas as pd
from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum


class EdgeDirection(Enum):
    FORWARD = "forward"
    REVERSE = "reverse"
    BIDIRECTIONAL = "bidirectional"


class IssueType(Enum):
    ISOLATED_NODE = "孤立节点"
    CROSS_LAYER_MISMATCH = "跨层错连"
    DIRECTION_REVERSED = "方向边反"
    BROKEN_PATH = "路径中断"


@dataclass
class Node:
    id: str
    name: str
    layer: str
    attributes: Dict = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)


@dataclass
class Edge:
    id: str
    source: str
    target: str
    direction: EdgeDirection = EdgeDirection.FORWARD
    layer: str = ""
    attributes: Dict = field(default_factory=dict)


@dataclass
class Issue:
    type: IssueType
    severity: str
    message: str
    nodes: List[str] = field(default_factory=list)
    edges: List[str] = field(default_factory=list)
    details: Dict = field(default_factory=dict)


@dataclass
class PathResult:
    path: List[str]
    edges: List[str]
    layers: List[str]
    has_issues: bool = False
    issues: List[Issue] = field(default_factory=list)


class TopologyGraph:
    def __init__(self):
        self.G = nx.DiGraph()
        self.nodes: Dict[str, Node] = {}
        self.edges: Dict[str, Edge] = {}
        self.edge_by_nodes: Dict[Tuple[str, str], str] = {}
        
    def load_nodes_from_csv(self, filepath: str) -> int:
        df = pd.read_csv(filepath)
        for _, row in df.iterrows():
            node_id = str(row.get('id', row.get('node_id', '')))
            if not node_id:
                continue
            node = Node(
                id=node_id,
                name=str(row.get('name', node_id)),
                layer=str(row.get('layer', 'default')),
                attributes=row.to_dict(),
                tags=str(row.get('tags', '')).split(',') if pd.notna(row.get('tags')) else []
            )
            self.add_node(node)
        return len(self.nodes)
    
    def load_edges_from_csv(self, filepath: str) -> int:
        df = pd.read_csv(filepath)
        for idx, row in df.iterrows():
            edge_id = str(row.get('id', row.get('edge_id', f'edge_{idx}')))
            source = str(row.get('source', row.get('from', '')))
            target = str(row.get('target', row.get('to', '')))
            if not source or not target:
                continue
            direction_str = str(row.get('direction', 'forward')).lower()
            if direction_str == 'reverse':
                direction = EdgeDirection.REVERSE
            elif direction_str == 'bidirectional':
                direction = EdgeDirection.BIDIRECTIONAL
            else:
                direction = EdgeDirection.FORWARD
            edge = Edge(
                id=edge_id,
                source=source,
                target=target,
                direction=direction,
                layer=str(row.get('layer', '')),
                attributes=row.to_dict()
            )
            self.add_edge(edge)
        return len(self.edges)
    
    def add_node(self, node: Node):
        self.nodes[node.id] = node
        attrs = node.attributes.copy()
        attrs.pop('layer', None)
        attrs.pop('name', None)
        self.G.add_node(node.id, **attrs, layer=node.layer, name=node.name)
    
    def add_edge(self, edge: Edge):
        self.edges[edge.id] = edge
        self.edge_by_nodes[(edge.source, edge.target)] = edge.id
        if edge.direction == EdgeDirection.FORWARD:
            self.G.add_edge(edge.source, edge.target, edge_id=edge.id, **edge.attributes)
        elif edge.direction == EdgeDirection.REVERSE:
            self.G.add_edge(edge.target, edge.source, edge_id=edge.id, **edge.attributes)
        elif edge.direction == EdgeDirection.BIDIRECTIONAL:
            self.G.add_edge(edge.source, edge.target, edge_id=edge.id, **edge.attributes)
            self.G.add_edge(edge.target, edge.source, edge_id=edge.id + '_rev', **edge.attributes)
    
    def remove_edge(self, edge_id: str):
        if edge_id in self.edges:
            edge = self.edges[edge_id]
            if self.G.has_edge(edge.source, edge.target):
                self.G.remove_edge(edge.source, edge.target)
            if edge.direction == EdgeDirection.BIDIRECTIONAL:
                if self.G.has_edge(edge.target, edge.source):
                    self.G.remove_edge(edge.target, edge.source)
            del self.edges[edge_id]
            key = (edge.source, edge.target)
            if key in self.edge_by_nodes:
                del self.edge_by_nodes[key]
    
    def get_node(self, node_id: str) -> Optional[Node]:
        return self.nodes.get(node_id)
    
    def get_edge(self, edge_id: str) -> Optional[Edge]:
        return self.edges.get(edge_id)
    
    def get_edge_by_nodes(self, source: str, target: str) -> Optional[Edge]:
        edge_id = self.edge_by_nodes.get((source, target))
        return self.edges.get(edge_id) if edge_id else None
    
    def get_all_layers(self) -> Set[str]:
        return set(node.layer for node in self.nodes.values())
    
    def get_nodes_by_layer(self, layer: str) -> List[Node]:
        return [n for n in self.nodes.values() if n.layer == layer]
