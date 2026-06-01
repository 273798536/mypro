import json
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
import numpy as np


class ChainNodeType(Enum):
    CHARGE_CONFIG = "charge_config"
    COIL_CONFIG = "coil_config"
    FIELD_SAMPLE = "field_sample"
    PARTICLE_CONFIG = "particle_config"
    SIMULATION_STEP = "simulation_step"
    READING_ANNOTATION = "reading_annotation"
    SCREENSHOT = "screenshot"
    REVIEW_COMMENT = "review_comment"


@dataclass
class ChainNode:
    node_id: str
    node_type: ChainNodeType
    timestamp: float
    data: Dict[str, Any]
    parent_ids: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "node_id": self.node_id,
            "node_type": self.node_type.value,
            "timestamp": self.timestamp,
            "data": self._serialize_data(self.data),
            "parent_ids": self.parent_ids,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat()
        }

    def _serialize_data(self, data: Any) -> Any:
        if isinstance(data, np.ndarray):
            return data.tolist()
        elif isinstance(data, dict):
            return {k: self._serialize_data(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self._serialize_data(item) for item in data]
        elif hasattr(data, 'to_dict'):
            return data.to_dict()
        else:
            return data


class ChainTracker:
    def __init__(self, tracking_id: Optional[str] = None):
        self.tracking_id = tracking_id or str(uuid.uuid4())
        self.nodes: Dict[str, ChainNode] = {}
        self.node_order: List[str] = []
        self.head_nodes: List[str] = []
        self.current_timestamp = 0.0

    def _generate_id(self) -> str:
        return str(uuid.uuid4())

    def add_node(self, node_type: ChainNodeType, data: Dict[str, Any],
                 parent_ids: Optional[List[str]] = None,
                 metadata: Optional[Dict[str, Any]] = None,
                 timestamp: Optional[float] = None) -> str:
        node_id = self._generate_id()
        ts = timestamp if timestamp is not None else self.current_timestamp

        node = ChainNode(
            node_id=node_id,
            node_type=node_type,
            timestamp=ts,
            data=data,
            parent_ids=parent_ids or [],
            metadata=metadata or {}
        )

        self.nodes[node_id] = node
        self.node_order.append(node_id)

        if not parent_ids:
            self.head_nodes.append(node_id)

        return node_id

    def add_charge_config(self, charge_id: str, position: np.ndarray, charge: float,
                          charge_type: str, parent_ids: Optional[List[str]] = None) -> str:
        data = {
            "charge_id": charge_id,
            "position": position,
            "charge": charge,
            "charge_type": charge_type
        }
        return self.add_node(ChainNodeType.CHARGE_CONFIG, data, parent_ids)

    def add_coil_config(self, coil_id: str, center: np.ndarray, normal: np.ndarray,
                        radius: float, current: float, turns: int = 1,
                        parent_ids: Optional[List[str]] = None) -> str:
        data = {
            "coil_id": coil_id,
            "center": center,
            "normal": normal,
            "radius": radius,
            "current": current,
            "turns": turns
        }
        return self.add_node(ChainNodeType.COIL_CONFIG, data, parent_ids)

    def add_field_sample(self, position: np.ndarray, e_field: np.ndarray, b_field: np.ndarray,
                         e_magnitude: float, b_magnitude: float,
                         has_explosion: bool = False, explosion_reason: Optional[str] = None,
                         parent_ids: Optional[List[str]] = None) -> str:
        data = {
            "position": position,
            "e_field": e_field,
            "b_field": b_field,
            "e_magnitude": e_magnitude,
            "b_magnitude": b_magnitude,
            "has_explosion": has_explosion,
            "explosion_reason": explosion_reason
        }
        return self.add_node(ChainNodeType.FIELD_SAMPLE, data, parent_ids)

    def add_particle_config(self, particle_id: str, position: np.ndarray, velocity: np.ndarray,
                            charge: Optional[float] = None, mass: Optional[float] = None,
                            name: str = "", parent_ids: Optional[List[str]] = None) -> str:
        data = {
            "particle_id": particle_id,
            "position": position,
            "velocity": velocity,
            "charge": charge,
            "mass": mass,
            "name": name
        }
        return self.add_node(ChainNodeType.PARTICLE_CONFIG, data, parent_ids)

    def add_simulation_step(self, step_index: int, particle_id: str, position: np.ndarray,
                            velocity: np.ndarray, acceleration: np.ndarray,
                            e_field: np.ndarray, b_field: np.ndarray,
                            lorentz_force: np.ndarray, status: str,
                            parent_ids: Optional[List[str]] = None) -> str:
        data = {
            "step_index": step_index,
            "particle_id": particle_id,
            "position": position,
            "velocity": velocity,
            "acceleration": acceleration,
            "e_field": e_field,
            "b_field": b_field,
            "lorentz_force": lorentz_force,
            "status": status
        }
        return self.add_node(ChainNodeType.SIMULATION_STEP, data, parent_ids)

    def add_reading_annotation(self, annotator: str, value: float, unit: str,
                               description: str, confidence: float = 1.0,
                               parent_ids: Optional[List[str]] = None) -> str:
        data = {
            "annotator": annotator,
            "value": value,
            "unit": unit,
            "description": description,
            "confidence": confidence
        }
        return self.add_node(ChainNodeType.READING_ANNOTATION, data, parent_ids)

    def add_screenshot(self, screenshot_path: str, view_params: Dict[str, Any],
                       description: str = "", parent_ids: Optional[List[str]] = None) -> str:
        data = {
            "screenshot_path": screenshot_path,
            "view_params": view_params,
            "description": description
        }
        return self.add_node(ChainNodeType.SCREENSHOT, data, parent_ids)

    def add_review_comment(self, reviewer: str, comment: str, decision: str,
                           parent_ids: Optional[List[str]] = None) -> str:
        data = {
            "reviewer": reviewer,
            "comment": comment,
            "decision": decision
        }
        return self.add_node(ChainNodeType.REVIEW_COMMENT, data, parent_ids)

    def get_node(self, node_id: str) -> Optional[ChainNode]:
        return self.nodes.get(node_id)

    def get_nodes_by_type(self, node_type: ChainNodeType) -> List[ChainNode]:
        return [n for n in self.nodes.values() if n.node_type == node_type]

    def get_chain(self, node_id: str) -> List[ChainNode]:
        chain = []
        visited = set()

        def traverse(nid: str):
            if nid in visited:
                return
            visited.add(nid)
            node = self.nodes.get(nid)
            if node:
                for pid in node.parent_ids:
                    traverse(pid)
                chain.append(node)

        traverse(node_id)
        return chain

    def get_full_chain(self) -> List[ChainNode]:
        return [self.nodes[nid] for nid in self.node_order if nid in self.nodes]

    def get_children(self, node_id: str) -> List[ChainNode]:
        return [n for n in self.nodes.values() if node_id in n.parent_ids]

    def find_path(self, start_node_id: str, end_node_id: str) -> Optional[List[ChainNode]]:
        if start_node_id not in self.nodes or end_node_id not in self.nodes:
            return None

        from collections import deque
        queue = deque([(start_node_id, [self.nodes[start_node_id]])])
        visited = set()

        while queue:
            current_id, path = queue.popleft()
            if current_id == end_node_id:
                return path

            if current_id in visited:
                continue
            visited.add(current_id)

            for child in self.get_children(current_id):
                if child.node_id not in visited:
                    queue.append((child.node_id, path + [child]))

        return None

    def get_charge_to_screenshot_chain(self, screenshot_node_id: str) -> Dict[str, List[ChainNode]]:
        chains = {}
        charge_nodes = self.get_nodes_by_type(ChainNodeType.CHARGE_CONFIG)
        coil_nodes = self.get_nodes_by_type(ChainNodeType.COIL_CONFIG)

        for charge in charge_nodes:
            path = self.find_path(charge.node_id, screenshot_node_id)
            if path:
                chains[f"charge_{charge.data['charge_id']}"] = path

        for coil in coil_nodes:
            path = self.find_path(coil.node_id, screenshot_node_id)
            if path:
                chains[f"coil_{coil.data['coil_id']}"] = path

        return chains

    def export_chain(self, filepath: str) -> None:
        chain_data = {
            "tracking_id": self.tracking_id,
            "exported_at": datetime.now().isoformat(),
            "nodes": [node.to_dict() for node in self.get_full_chain()],
            "head_nodes": self.head_nodes
        }

        os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(chain_data, f, indent=2, ensure_ascii=False)

    @classmethod
    def load_chain(cls, filepath: str) -> 'ChainTracker':
        with open(filepath, 'r', encoding='utf-8') as f:
            chain_data = json.load(f)

        tracker = cls(tracking_id=chain_data["tracking_id"])

        for node_data in chain_data["nodes"]:
            node = ChainNode(
                node_id=node_data["node_id"],
                node_type=ChainNodeType(node_data["node_type"]),
                timestamp=node_data["timestamp"],
                data=node_data["data"],
                parent_ids=node_data["parent_ids"],
                metadata=node_data["metadata"],
                created_at=datetime.fromisoformat(node_data["created_at"])
            )
            tracker.nodes[node.node_id] = node
            tracker.node_order.append(node.node_id)

        tracker.head_nodes = chain_data["head_nodes"]
        return tracker

    def advance_time(self, delta: float = 1.0) -> None:
        self.current_timestamp += delta

    def set_time(self, timestamp: float) -> None:
        self.current_timestamp = timestamp

    def generate_provenance_report(self, node_id: str) -> Dict[str, Any]:
        chain = self.get_chain(node_id)
        target_node = self.get_node(node_id)

        if not target_node:
            return {"error": "Node not found"}

        charge_ancestors = [n for n in chain if n.node_type == ChainNodeType.CHARGE_CONFIG]
        coil_ancestors = [n for n in chain if n.node_type == ChainNodeType.COIL_CONFIG]
        simulation_steps = [n for n in chain if n.node_type == ChainNodeType.SIMULATION_STEP]
        annotations = [n for n in chain if n.node_type == ChainNodeType.READING_ANNOTATION]

        return {
            "target_node": target_node.to_dict(),
            "chain_length": len(chain),
            "charge_configs": [c.to_dict() for c in charge_ancestors],
            "coil_configs": [c.to_dict() for c in coil_ancestors],
            "simulation_steps_count": len(simulation_steps),
            "annotations_count": len(annotations),
            "has_field_explosion": any(
                n.data.get("has_explosion", False)
                for n in chain
                if n.node_type in [ChainNodeType.FIELD_SAMPLE, ChainNodeType.SIMULATION_STEP]
            ),
            "direction_reversals_detected": sum(
                1 for n in simulation_steps
                if n.data.get("status") == "direction_reversed"
            ),
            "out_of_bounds_detected": sum(
                1 for n in simulation_steps
                if n.data.get("status") == "out_of_bounds"
            )
        }
