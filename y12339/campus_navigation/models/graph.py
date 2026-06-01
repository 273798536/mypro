from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple
from collections import defaultdict
from .node import Node
from .edge import Edge, EdgeDirection
from .barrier import Barrier
from .accessibility import AccessibilityIssue
from .manual_edit import ManualEdit, EditTrail


@dataclass
class CampusGraph:
    nodes: Dict[str, Node] = field(default_factory=dict)
    edges: Dict[str, Edge] = field(default_factory=dict)
    barriers: Dict[str, Barrier] = field(default_factory=dict)
    accessibility_issues: Dict[str, AccessibilityIssue] = field(default_factory=dict)
    edit_trail: EditTrail = field(default_factory=EditTrail)
    _adjacency: Dict[str, List[Tuple[str, str]]] = field(default_factory=lambda: defaultdict(list))

    def add_node(self, node: Node) -> None:
        self.nodes[node.node_id] = node

    def add_edge(self, edge: Edge) -> None:
        self.edges[edge.edge_id] = edge
        if edge.direction in (EdgeDirection.BIDIRECTIONAL, EdgeDirection.FORWARD):
            self._adjacency[edge.from_node].append((edge.to_node, edge.edge_id))
        if edge.direction in (EdgeDirection.BIDIRECTIONAL, EdgeDirection.BACKWARD):
            self._adjacency[edge.to_node].append((edge.from_node, edge.edge_id))

    def add_barrier(self, barrier: Barrier) -> None:
        self.barriers[barrier.barrier_id] = barrier

    def add_accessibility_issue(self, issue: AccessibilityIssue) -> None:
        self.accessibility_issues[issue.issue_id] = issue

    def add_manual_edit(self, edit: ManualEdit) -> None:
        self.edit_trail.add_edit(edit)

    def get_node(self, node_id: str) -> Optional[Node]:
        return self.nodes.get(node_id)

    def get_edge(self, edge_id: str) -> Optional[Edge]:
        return self.edges.get(edge_id)

    def get_barriers_on_edge(self, edge_id: str) -> List[Barrier]:
        return [b for b in self.barriers.values() if b.edge_id == edge_id]

    def get_accessibility_issues_on_edge(self, edge_id: str) -> List[AccessibilityIssue]:
        return [a for a in self.accessibility_issues.values() if a.edge_id == edge_id]

    def get_neighbors(self, node_id: str) -> List[Tuple[str, str]]:
        return list(self._adjacency.get(node_id, []))

    def get_edges_from_node(self, node_id: str) -> List[Edge]:
        result = []
        for _, edge_id in self._adjacency.get(node_id, []):
            edge = self.edges.get(edge_id)
            if edge and edge.can_traverse_from(node_id):
                result.append(edge)
        return result

    def get_edges_between(self, from_node: str, to_node: str) -> List[Edge]:
        result = []
        for edge in self.edges.values():
            if edge.from_node == from_node and edge.to_node == to_node:
                if edge.direction in (EdgeDirection.BIDIRECTIONAL, EdgeDirection.FORWARD):
                    result.append(edge)
            elif edge.from_node == to_node and edge.to_node == from_node:
                if edge.direction in (EdgeDirection.BIDIRECTIONAL, EdgeDirection.BACKWARD):
                    result.append(edge)
        return result

    def is_edge_blocked(self, edge_id: str, direction: Optional[str] = None) -> bool:
        for barrier in self.get_barriers_on_edge(edge_id):
            if barrier.is_active():
                if barrier.affected_direction is None or barrier.affected_direction == direction:
                    return True
        return False

    def get_all_node_ids(self) -> Set[str]:
        return set(self.nodes.keys())

    def get_all_edge_ids(self) -> Set[str]:
        return set(self.edges.keys())

    def to_dict(self) -> Dict:
        return {
            "nodes": [n.to_dict() for n in self.nodes.values()],
            "edges": [e.to_dict() for e in self.edges.values()],
            "barriers": [b.to_dict() for b in self.barriers.values()],
            "accessibility_issues": [a.to_dict() for a in self.accessibility_issues.values()],
            "edit_trail": self.edit_trail.to_dict(),
        }

    def rebuild_adjacency(self) -> None:
        self._adjacency = defaultdict(list)
        for edge in self.edges.values():
            if edge.direction in (EdgeDirection.BIDIRECTIONAL, EdgeDirection.FORWARD):
                self._adjacency[edge.from_node].append((edge.to_node, edge.edge_id))
            if edge.direction in (EdgeDirection.BIDIRECTIONAL, EdgeDirection.BACKWARD):
                self._adjacency[edge.to_node].append((edge.from_node, edge.edge_id))
