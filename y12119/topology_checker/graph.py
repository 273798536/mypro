from dataclasses import dataclass, field
from typing import Dict, List, Set, Tuple, Optional
from enum import Enum
from collections import defaultdict
import hashlib
import json


class EdgeDirection(Enum):
    UNDIRECTED = "undirected"
    FORWARD = "forward"
    REVERSE = "reverse"


class NodeType(Enum):
    NORMAL = "normal"
    CROSS_LAYER = "cross_layer"


@dataclass
class Node:
    node_id: str
    name: str
    layer: str = "default"
    node_type: NodeType = NodeType.NORMAL
    accessible: Optional[bool] = None
    metadata: Dict = field(default_factory=dict)
    is_accessible_updated: bool = False

    def to_dict(self):
        return {
            "node_id": self.node_id,
            "name": self.name,
            "layer": self.layer,
            "node_type": self.node_type.value,
            "accessible": self.accessible,
            "metadata": self.metadata
        }


@dataclass
class Edge:
    edge_id: str
    from_node: str
    to_node: str
    direction: EdgeDirection = EdgeDirection.UNDIRECTED
    accessible: Optional[bool] = None
    is_accessible_updated: bool = False

    def to_dict(self):
        return {
            "edge_id": self.edge_id,
            "from_node": self.from_node,
            "to_node": self.to_node,
            "direction": self.direction.value,
            "accessible": self.accessible
        }


class TopologyGraph:
    def __init__(self):
        self.nodes: Dict[str, Node] = {}
        self.edges: Dict[str, Edge] = {}
        self.adj_list: Dict[str, List] = defaultdict(list)
        self.rev_adj_list: Dict[str, List] = defaultdict(list)
        self._snapshot_hash: Optional[str] = None

    def add_node(self, node: Node) -> None:
        if node.node_id in self.nodes:
            existing = self.nodes[node.node_id]
            if node.accessible is not None:
                existing.accessible = node.accessible
                existing.is_accessible_updated = True
            existing.metadata.update(node.metadata)
        else:
            self.nodes[node.node_id] = node

    def add_edge(self, edge: Edge) -> None:
        if edge.edge_id in self.edges:
            existing = self.edges[edge.edge_id]
            if edge.accessible is not None:
                existing.accessible = edge.accessible
                existing.is_accessible_updated = True
        else:
            self.edges[edge.edge_id] = edge
            self._update_adjacency(edge)

    def _update_adjacency(self, edge: Edge) -> None:
        self.adj_list[edge.from_node].append((edge.to_node, edge.edge_id, edge.direction))
        self.rev_adj_list[edge.to_node].append((edge.from_node, edge.edge_id, edge.direction))

    def get_isolated_nodes(self) -> List[Node]:
        isolated = []
        for node_id, node in self.nodes.items():
            has_out = any(e.from_node == node_id or e.to_node == node_id for e in self.edges.values())
            if not has_out:
                isolated.append(node)
        return isolated

    def get_reversed_edges(self) -> List[Edge]:
        reversed_edges = []
        for edge in self.edges.values():
            if edge.direction == EdgeDirection.REVERSE:
                reversed_edges.append(edge)
        return reversed_edges

    def get_cross_layer_edges(self) -> List[Tuple]:
        cross_edges = []
        for edge in self.edges.values():
            from_node = self.nodes.get(edge.from_node)
            to_node = self.nodes.get(edge.to_node)
            if from_node and to_node and from_node.layer != to_node.layer:
                cross_edges.append((edge, from_node.layer, to_node.layer))
        return cross_edges

    def is_reachable(self, start: str, end: str, use_accessible: bool = False) -> Tuple[bool, List[str], List[str]]:
        if start not in self.nodes or end not in self.nodes:
            return False, [], []
        
        visited = set()
        path = []
        queue = [(start, [start])]
        
        while queue:
            current, current_path = queue.pop(0)
            if current == end:
                return True, current_path, []
            
            if current in visited:
                continue
            visited.add(current)
            
            for neighbor, edge_id, direction in self.adj_list.get(current, []):
                edge = self.edges.get(edge_id)
                if use_accessible and edge.accessible is False:
                    continue
                if direction == EdgeDirection.REVERSE:
                    continue
                if neighbor not in visited:
                    queue.append((neighbor, current_path + [neighbor]))
        
        return False, [], []

    def get_connected_components(self, use_accessible: bool = False) -> List[Set[str]]:
        visited = set()
        components = []
        
        for node_id in self.nodes:
            if node_id not in visited:
                component = set()
                stack = [node_id]
                while stack:
                    current = stack.pop()
                    if current in visited:
                        continue
                    visited.add(current)
                    component.add(current)
                    for neighbor, edge_id, direction in self.adj_list.get(current, []):
                        edge = self.edges.get(edge_id)
                        if use_accessible and edge.accessible is False:
                            continue
                        if direction == EdgeDirection.REVERSE:
                            continue
                        if neighbor not in visited:
                            stack.append(neighbor)
                components.append(component)
        return components

    def compute_hash(self) -> str:
        state = {
            "nodes": sorted([n.to_dict() for n in self.nodes.values()], key=lambda x: x["node_id"]),
            "edges": sorted([e.to_dict() for e in self.edges.values()], key=lambda x: x["edge_id"])
        }
        return hashlib.md5(json.dumps(state, sort_keys=True).encode()).hexdigest()

    def save_snapshot(self) -> None:
        self._snapshot_hash = self.compute_hash()

    def has_changed(self) -> bool:
        if self._snapshot_hash is None:
            return True
        return self._snapshot_hash != self.compute_hash()

    def get_accessibility_changes(self) -> Dict[str, List[str]]:
        changed_nodes = [n.node_id for n in self.nodes.values() if n.is_accessible_updated]
        changed_edges = [e.edge_id for e in self.edges.values() if e.is_accessible_updated]
        return {
            "nodes": changed_nodes,
            "edges": changed_edges
        }

    def reset_update_flags(self) -> None:
        for node in self.nodes.values():
            node.is_accessible_updated = False
        for edge in self.edges.values():
            edge.is_accessible_updated = False
