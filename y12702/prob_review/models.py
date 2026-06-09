from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime
import hashlib
import json
import os
import uuid


class RecordStatus(str, Enum):
    PENDING = "pending"
    PROCESSED = "processed"
    REVIEWED = "reviewed"
    FLAGGED = "flagged"


class ErrorSeverity(str, Enum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class TreeNode:
    id: str
    label: str
    probability: float
    children: List["TreeNode"] = field(default_factory=list)
    parent_id: Optional[str] = None
    source_ref: Optional[str] = None
    calc_note: Optional[str] = None
    raw_value: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "probability": self.probability,
            "parent_id": self.parent_id,
            "source_ref": self.source_ref,
            "calc_note": self.calc_note,
            "raw_value": self.raw_value,
            "children": [c.to_dict() for c in self.children],
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "TreeNode":
        node = cls(
            id=d["id"],
            label=d["label"],
            probability=float(d["probability"]),
            parent_id=d.get("parent_id"),
            source_ref=d.get("source_ref"),
            calc_note=d.get("calc_note"),
            raw_value=d.get("raw_value"),
        )
        node.children = [cls.from_dict(c) for c in d.get("children", [])]
        return node


@dataclass
class ErrorRecord:
    record_id: str
    node_id: str
    node_label: str
    expected_prob: float
    actual_prob: float
    absolute_error: float
    relative_error: float
    severity: ErrorSeverity
    error_type: str
    explanation_zh: str
    suggestion_zh: str
    calc_draft_ref: Optional[str] = None
    processing_note: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record_id,
            "node_id": self.node_id,
            "node_label": self.node_label,
            "expected_prob": self.expected_prob,
            "actual_prob": self.actual_prob,
            "absolute_error": self.absolute_error,
            "relative_error": self.relative_error,
            "severity": self.severity.value,
            "error_type": self.error_type,
            "explanation_zh": self.explanation_zh,
            "suggestion_zh": self.suggestion_zh,
            "calc_draft_ref": self.calc_draft_ref,
            "processing_note": self.processing_note,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "ErrorRecord":
        return cls(
            record_id=d["record_id"],
            node_id=d["node_id"],
            node_label=d["node_label"],
            expected_prob=float(d["expected_prob"]),
            actual_prob=float(d["actual_prob"]),
            absolute_error=float(d["absolute_error"]),
            relative_error=float(d["relative_error"]),
            severity=ErrorSeverity(d["severity"]),
            error_type=d["error_type"],
            explanation_zh=d["explanation_zh"],
            suggestion_zh=d["suggestion_zh"],
            calc_draft_ref=d.get("calc_draft_ref"),
            processing_note=d.get("processing_note"),
        )


@dataclass
class ProcessingRecord:
    id: str
    source_file: str
    source_hash: str
    batch_id: str
    status: RecordStatus
    tree_root: Optional[TreeNode] = None
    errors: List[ErrorRecord] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    review_notes: List[Dict[str, Any]] = field(default_factory=list)
    overall_summary_zh: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "source_file": self.source_file,
            "source_hash": self.source_hash,
            "batch_id": self.batch_id,
            "status": self.status.value,
            "tree_root": self.tree_root.to_dict() if self.tree_root else None,
            "errors": [e.to_dict() for e in self.errors],
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "review_notes": self.review_notes,
            "overall_summary_zh": self.overall_summary_zh,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "ProcessingRecord":
        return cls(
            id=d["id"],
            source_file=d["source_file"],
            source_hash=d["source_hash"],
            batch_id=d["batch_id"],
            status=RecordStatus(d["status"]),
            tree_root=TreeNode.from_dict(d["tree_root"]) if d.get("tree_root") else None,
            errors=[ErrorRecord.from_dict(e) for e in d.get("errors", [])],
            created_at=d.get("created_at", datetime.now().isoformat()),
            updated_at=d.get("updated_at", datetime.now().isoformat()),
            review_notes=d.get("review_notes", []),
            overall_summary_zh=d.get("overall_summary_zh"),
        )

    def touch(self):
        self.updated_at = datetime.now().isoformat()


def generate_id(prefix: str = "rec") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def file_hash(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def find_node_by_id(node: TreeNode, target_id: str) -> Optional[TreeNode]:
    if node.id == target_id:
        return node
    for child in node.children:
        found = find_node_by_id(child, target_id)
        if found:
            return found
    return None
