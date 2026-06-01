from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class EdgeDirection(Enum):
    BIDIRECTIONAL = "bidirectional"
    FORWARD = "forward"
    BACKWARD = "backward"


@dataclass
class Edge:
    edge_id: str
    from_node: str
    to_node: str
    length: float
    direction: EdgeDirection = EdgeDirection.BIDIRECTIONAL
    accessibility_tags: List[str] = field(default_factory=list)
    surface_type: Optional[str] = None
    width: Optional[float] = None
    slope: Optional[float] = None
    has_stairs: bool = False
    has_elevator: bool = False
    has_ramp: bool = False
    description: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    source_file: Optional[str] = None
    source_line: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "edge_id": self.edge_id,
            "from_node": self.from_node,
            "to_node": self.to_node,
            "length": self.length,
            "direction": self.direction.value,
            "accessibility_tags": self.accessibility_tags,
            "surface_type": self.surface_type,
            "width": self.width,
            "slope": self.slope,
            "has_stairs": self.has_stairs,
            "has_elevator": self.has_elevator,
            "has_ramp": self.has_ramp,
            "description": self.description,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "source_file": self.source_file,
            "source_line": self.source_line,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any], source_file: Optional[str] = None, source_line: Optional[int] = None) -> "Edge":
        direction = EdgeDirection(data.get("direction", "bidirectional"))
        return cls(
            edge_id=data["edge_id"],
            from_node=data["from_node"],
            to_node=data["to_node"],
            length=data["length"],
            direction=direction,
            accessibility_tags=data.get("accessibility_tags", []),
            surface_type=data.get("surface_type"),
            width=data.get("width"),
            slope=data.get("slope"),
            has_stairs=data.get("has_stairs", False),
            has_elevator=data.get("has_elevator", False),
            has_ramp=data.get("has_ramp", False),
            description=data.get("description"),
            metadata=data.get("metadata", {}),
            created_at=datetime.fromisoformat(data["created_at"]) if data.get("created_at") else datetime.now(),
            source_file=source_file or data.get("source_file"),
            source_line=source_line or data.get("source_line"),
        )

    def is_accessible_for(self, requirements: List[str]) -> bool:
        if not requirements:
            return True
        return all(tag in self.accessibility_tags for tag in requirements)

    def can_traverse_from(self, node_id: str) -> bool:
        if self.direction == EdgeDirection.BIDIRECTIONAL:
            return node_id in (self.from_node, self.to_node)
        elif self.direction == EdgeDirection.FORWARD:
            return node_id == self.from_node
        elif self.direction == EdgeDirection.BACKWARD:
            return node_id == self.to_node
        return False

    def get_other_node(self, node_id: str) -> str:
        if node_id == self.from_node:
            return self.to_node
        elif node_id == self.to_node:
            return self.from_node
        raise ValueError(f"Node {node_id} not in edge {self.edge_id}")

    def __hash__(self):
        return hash(self.edge_id)
