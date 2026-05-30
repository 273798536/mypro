import json
import os
from typing import Dict, List, Any
from .graph import TopologyGraph, Node, Edge, EdgeDirection, NodeType


class IOHandler:
    def __init__(self, data_dir: str = "./data"):
        self.data_dir = data_dir
        self.graph = TopologyGraph()
        self._ensure_dirs()

    def _ensure_dirs(self):
        os.makedirs(self.data_dir, exist_ok=True)
        os.makedirs(os.path.join(self.data_dir, "snapshots"), exist_ok=True)

    def import_nodes(self, nodes_data: List[Dict[str, Any]]) -> None:
        for node_dict in nodes_data:
            node = Node(
                node_id=node_dict["node_id"],
                name=node_dict["name"],
                layer=node_dict.get("layer", "default"),
                node_type=NodeType(node_dict.get("node_type", "normal")),
                accessible=node_dict.get("accessible"),
                metadata=node_dict.get("metadata", {})
            )
            self.graph.add_node(node)

    def import_edges(self, edges_data: List[Dict[str, Any]]) -> None:
        for edge_dict in edges_data:
            edge_id = edge_dict["edge_id"]
            if edge_id in self.graph.edges and "from_node" not in edge_dict:
                existing = self.graph.edges[edge_id]
                if edge_dict.get("accessible") is not None:
                    existing.accessible = edge_dict["accessible"]
                    existing.is_accessible_updated = True
            else:
                edge = Edge(
                    edge_id=edge_dict["edge_id"],
                    from_node=edge_dict.get("from_node", ""),
                    to_node=edge_dict.get("to_node", ""),
                    direction=EdgeDirection(edge_dict.get("direction", "undirected")),
                    accessible=edge_dict.get("accessible")
                )
                self.graph.add_edge(edge)

    def load_from_file(self, filename: str) -> Dict:
        filepath = os.path.join(self.data_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)

    def save_to_file(self, data: Dict, filename: str) -> None:
        filepath = os.path.join(self.data_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def save_snapshot(self, name: str) -> None:
        snapshot = {
            "nodes": [n.to_dict() for n in self.graph.nodes.values()],
            "edges": [e.to_dict() for e in self.graph.edges.values()],
            "hash": self.graph.compute_hash()
        }
        filepath = os.path.join(self.data_dir, "snapshots", f"{name}.json")
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(snapshot, f, ensure_ascii=False, indent=2)

    def load_snapshot(self, name: str) -> bool:
        filepath = os.path.join(self.data_dir, "snapshots", f"{name}.json")
        if not os.path.exists(filepath):
            return False
        with open(filepath, 'r', encoding='utf-8') as f:
            snapshot = json.load(f)
            self.import_nodes(snapshot["nodes"])
            self.import_edges(snapshot["edges"])
            return True

    def get_result_path(self, name: str) -> str:
        return os.path.join(self.data_dir, f"{name}_result.json")
