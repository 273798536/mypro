from dataclasses import dataclass, field
from typing import List, Dict, Set, Tuple, Optional, Any
from collections import defaultdict
import uuid


@dataclass
class GraphNode:
    student_id: str
    attributes: Dict[str, Any] = field(default_factory=dict)
    degree: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "student_id": self.student_id,
            "attributes": self.attributes,
            "degree": self.degree
        }


@dataclass
class GraphEdge:
    source: str
    target: str
    weight: float = 1.0
    conflict_type: str = "explicit"
    attributes: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if self.source > self.target:
            self.source, self.target = self.target, self.source

    @property
    def key(self) -> Tuple[str, str]:
        return (self.source, self.target)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source": self.source,
            "target": self.target,
            "weight": self.weight,
            "conflict_type": self.conflict_type,
            "attributes": self.attributes
        }


@dataclass
class ConflictGraph:
    nodes: Dict[str, GraphNode] = field(default_factory=dict)
    edges: Dict[Tuple[str, str], GraphEdge] = field(default_factory=dict)
    adjacency: Dict[str, Set[Tuple[str, float]]] = field(default_factory=lambda: defaultdict(set))
    graph_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])

    def add_node(self, student_id: str, attributes: Optional[Dict[str, Any]] = None) -> GraphNode:
        if student_id not in self.nodes:
            self.nodes[student_id] = GraphNode(
                student_id=student_id,
                attributes=attributes or {}
            )
        return self.nodes[student_id]

    def add_edge(self, source: str, target: str, weight: float = 1.0,
                 conflict_type: str = "explicit", attributes: Optional[Dict[str, Any]] = None) -> Optional[GraphEdge]:
        if source == target:
            return None

        if source not in self.nodes:
            self.add_node(source)
        if target not in self.nodes:
            self.add_node(target)

        edge = GraphEdge(
            source=source,
            target=target,
            weight=weight,
            conflict_type=conflict_type,
            attributes=attributes or {}
        )

        if edge.key in self.edges:
            existing = self.edges[edge.key]
            existing.weight = max(existing.weight, weight)
            existing.attributes.update(edge.attributes)
            return existing

        self.edges[edge.key] = edge
        self.adjacency[source].add((target, weight))
        self.adjacency[target].add((source, weight))
        self.nodes[source].degree += 1
        self.nodes[target].degree += 1

        return edge

    def get_neighbors(self, student_id: str) -> List[Tuple[str, float]]:
        if student_id not in self.adjacency:
            return []
        return sorted(self.adjacency[student_id], key=lambda x: -x[1])

    def get_edge(self, a: str, b: str) -> Optional[GraphEdge]:
        key = (a, b) if a < b else (b, a)
        return self.edges.get(key)

    def has_edge(self, a: str, b: str) -> bool:
        key = (a, b) if a < b else (b, a)
        return key in self.edges

    def remove_edge(self, a: str, b: str) -> bool:
        key = (a, b) if a < b else (b, a)
        if key not in self.edges:
            return False

        edge = self.edges.pop(key)
        self.adjacency[edge.source].discard((edge.target, edge.weight))
        self.adjacency[edge.target].discard((edge.source, edge.weight))
        if edge.source in self.nodes:
            self.nodes[edge.source].degree = max(0, self.nodes[edge.source].degree - 1)
        if edge.target in self.nodes:
            self.nodes[edge.target].degree = max(0, self.nodes[edge.target].degree - 1)
        return True

    def remove_node(self, student_id: str) -> bool:
        if student_id not in self.nodes:
            return False

        neighbors = list(self.adjacency.get(student_id, set()))
        for neighbor, weight in neighbors:
            self.remove_edge(student_id, neighbor)

        if student_id in self.adjacency:
            del self.adjacency[student_id]
        del self.nodes[student_id]
        return True

    def get_nodes_sorted_by_degree(self) -> List[str]:
        return sorted(self.nodes.keys(), key=lambda x: -self.nodes[x].degree)

    def detect_cycles(self, min_cycle_length: int = 3) -> List[List[str]]:
        cycles = []
        seen_cycles = set()
        max_depth = min(min_cycle_length + 5, 8)

        def find_cycles_dfs(start: str, current: str, path: List[str], visited: Set[str], depth: int):
            if depth > max_depth:
                return

            for neighbor, _ in self.adjacency.get(current, set()):
                if neighbor == start and len(path) >= min_cycle_length:
                    cycle = path[:]
                    cycle_key = tuple(sorted(cycle))
                    if cycle_key not in seen_cycles:
                        seen_cycles.add(cycle_key)
                        cycles.append(cycle)
                elif neighbor not in visited and neighbor > start:
                    visited.add(neighbor)
                    path.append(neighbor)
                    find_cycles_dfs(start, neighbor, path, visited, depth + 1)
                    path.pop()
                    visited.remove(neighbor)

        for node in sorted(self.nodes.keys()):
            visited = set([node])
            path = [node]
            find_cycles_dfs(node, node, path, visited, 1)

        return cycles

    def get_subgraph(self, node_ids: List[str]) -> "ConflictGraph":
        subgraph = ConflictGraph()
        for nid in node_ids:
            if nid in self.nodes:
                subgraph.add_node(nid, self.nodes[nid].attributes.copy())

        for (a, b), edge in self.edges.items():
            if a in node_ids and b in node_ids:
                subgraph.add_edge(a, b, edge.weight, edge.conflict_type, edge.attributes.copy())

        return subgraph

    def summary(self) -> Dict[str, Any]:
        return {
            "graph_id": self.graph_id,
            "node_count": len(self.nodes),
            "edge_count": len(self.edges),
            "avg_degree": sum(n.degree for n in self.nodes.values()) / max(1, len(self.nodes)),
            "max_degree": max((n.degree for n in self.nodes.values()), default=0),
            "isolated_nodes": sum(1 for n in self.nodes.values() if n.degree == 0)
        }

    def to_dict(self) -> Dict[str, Any]:
        return {
            "graph_id": self.graph_id,
            "summary": self.summary(),
            "nodes": [n.to_dict() for n in self.nodes.values()],
            "edges": [e.to_dict() for e in self.edges.values()]
        }
