from dataclasses import dataclass, field
from typing import Optional, Dict, Any
from datetime import datetime


@dataclass
class Node:
    node_id: str
    name: str
    x: float
    y: float
    building: Optional[str] = None
    floor: Optional[int] = None
    description: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    source_file: Optional[str] = None
    source_line: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "node_id": self.node_id,
            "name": self.name,
            "x": self.x,
            "y": self.y,
            "building": self.building,
            "floor": self.floor,
            "description": self.description,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "source_file": self.source_file,
            "source_line": self.source_line,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any], source_file: Optional[str] = None, source_line: Optional[int] = None) -> "Node":
        return cls(
            node_id=data["node_id"],
            name=data["name"],
            x=data["x"],
            y=data["y"],
            building=data.get("building"),
            floor=data.get("floor"),
            description=data.get("description"),
            metadata=data.get("metadata", {}),
            created_at=datetime.fromisoformat(data["created_at"]) if data.get("created_at") else datetime.now(),
            source_file=source_file or data.get("source_file"),
            source_line=source_line or data.get("source_line"),
        )

    def __hash__(self):
        return hash(self.node_id)
