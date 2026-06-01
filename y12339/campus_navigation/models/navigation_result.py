from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class RouteStatus(Enum):
    SUCCESS = "success"
    NO_PATH = "no_path"
    PARTIAL_PATH = "partial_path"
    HAS_WARNINGS = "has_warnings"


@dataclass
class RouteSegment:
    edge_id: str
    from_node: str
    to_node: str
    length: float
    direction: str
    accessibility_tags: List[str] = field(default_factory=list)
    has_barrier: bool = False
    barrier_id: Optional[str] = None
    has_accessibility_issue: bool = False
    accessibility_issue_ids: List[str] = field(default_factory=list)
    has_manual_edit: bool = False
    edit_ids: List[str] = field(default_factory=list)
    edge_source_file: Optional[str] = None
    edge_source_line: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "edge_id": self.edge_id,
            "from_node": self.from_node,
            "to_node": self.to_node,
            "length": self.length,
            "direction": self.direction,
            "accessibility_tags": self.accessibility_tags,
            "has_barrier": self.has_barrier,
            "barrier_id": self.barrier_id,
            "has_accessibility_issue": self.has_accessibility_issue,
            "accessibility_issue_ids": self.accessibility_issue_ids,
            "has_manual_edit": self.has_manual_edit,
            "edit_ids": self.edit_ids,
            "edge_source_file": self.edge_source_file,
            "edge_source_line": self.edge_source_line,
        }


@dataclass
class TraceEntry:
    source_type: str
    source_id: str
    source_name: str
    target_type: str
    target_id: str
    target_name: str
    relationship: str
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_type": self.source_type,
            "source_id": self.source_id,
            "source_name": self.source_name,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "target_name": self.target_name,
            "relationship": self.relationship,
            "metadata": self.metadata,
        }


@dataclass
class NavigationResult:
    request_id: str
    status: RouteStatus
    start_node: str
    end_node: str
    total_distance: float
    estimated_time: float
    route_segments: List[RouteSegment] = field(default_factory=list)
    node_sequence: List[str] = field(default_factory=list)
    edge_length_trace: List[Dict[str, Any]] = field(default_factory=list)
    accessibility_breakpoints: List[Dict[str, Any]] = field(default_factory=list)
    barrier_issues: List[Dict[str, Any]] = field(default_factory=list)
    direction_errors: List[Dict[str, Any]] = field(default_factory=list)
    manual_edit_impacts: List[Dict[str, Any]] = field(default_factory=list)
    trace_entries: List[TraceEntry] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    accessibility_profile: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "request_id": self.request_id,
            "status": self.status.value,
            "start_node": self.start_node,
            "end_node": self.end_node,
            "total_distance": self.total_distance,
            "estimated_time": self.estimated_time,
            "route_segments": [s.to_dict() for s in self.route_segments],
            "node_sequence": self.node_sequence,
            "edge_length_trace": self.edge_length_trace,
            "accessibility_breakpoints": self.accessibility_breakpoints,
            "barrier_issues": self.barrier_issues,
            "direction_errors": self.direction_errors,
            "manual_edit_impacts": self.manual_edit_impacts,
            "trace_entries": [t.to_dict() for t in self.trace_entries],
            "warnings": self.warnings,
            "errors": self.errors,
            "created_at": self.created_at.isoformat(),
            "accessibility_profile": self.accessibility_profile,
        }
