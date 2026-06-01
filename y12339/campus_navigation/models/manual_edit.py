from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class EditType(Enum):
    EDGE_WEIGHT_OVERRIDE = "edge_weight_override"
    EDGE_REMOVAL = "edge_removal"
    EDGE_ADDITION = "edge_addition"
    NODE_POSITION_ADJUST = "node_position_adjust"
    BARRIER_STATUS_CHANGE = "barrier_status_change"
    ROUTE_SEGMENT_OVERRIDE = "route_segment_override"
    ACCESSIBILITY_TAG_CHANGE = "accessibility_tag_change"
    OTHER = "other"


@dataclass
class ManualEdit:
    edit_id: str
    edit_type: EditType
    editor: str
    edit_time: datetime
    reason: str
    target_id: str
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    affected_node_ids: List[str] = field(default_factory=list)
    affected_edge_ids: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    source_file: Optional[str] = None
    source_line: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "edit_id": self.edit_id,
            "edit_type": self.edit_type.value,
            "editor": self.editor,
            "edit_time": self.edit_time.isoformat(),
            "reason": self.reason,
            "target_id": self.target_id,
            "old_value": self.old_value,
            "new_value": self.new_value,
            "affected_node_ids": self.affected_node_ids,
            "affected_edge_ids": self.affected_edge_ids,
            "metadata": self.metadata,
            "source_file": self.source_file,
            "source_line": self.source_line,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any], source_file: Optional[str] = None, source_line: Optional[int] = None) -> "ManualEdit":
        edit_type = EditType(data.get("edit_type", "other"))
        return cls(
            edit_id=data["edit_id"],
            edit_type=edit_type,
            editor=data["editor"],
            edit_time=datetime.fromisoformat(data["edit_time"]),
            reason=data["reason"],
            target_id=data["target_id"],
            old_value=data.get("old_value"),
            new_value=data.get("new_value"),
            affected_node_ids=data.get("affected_node_ids", []),
            affected_edge_ids=data.get("affected_edge_ids", []),
            metadata=data.get("metadata", {}),
            source_file=source_file or data.get("source_file"),
            source_line=source_line or data.get("source_line"),
        )

    def __hash__(self):
        return hash(self.edit_id)


@dataclass
class EditTrail:
    edits: List[ManualEdit] = field(default_factory=list)

    def add_edit(self, edit: ManualEdit) -> None:
        self.edits.append(edit)

    def get_edits_for_target(self, target_id: str) -> List[ManualEdit]:
        return [e for e in self.edits if e.target_id == target_id]

    def get_edits_by_type(self, edit_type: EditType) -> List[ManualEdit]:
        return [e for e in self.edits if e.edit_type == edit_type]

    def get_edits_by_editor(self, editor: str) -> List[ManualEdit]:
        return [e for e in self.edits if e.editor == editor]

    def to_dict(self) -> Dict[str, Any]:
        return {"edits": [e.to_dict() for e in self.edits]}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EditTrail":
        return cls(edits=[ManualEdit.from_dict(e) for e in data.get("edits", [])])
