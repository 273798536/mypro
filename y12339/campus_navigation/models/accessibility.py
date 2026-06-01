from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class AccessibilityIssueType(Enum):
    MISSING_RAMP = "missing_ramp"
    MISSING_ELEVATOR = "missing_elevator"
    NARROW_PATH = "narrow_path"
    STEEP_SLOPE = "steep_slope"
    STAIRS_ONLY = "stairs_only"
    UNEVEN_SURFACE = "uneven_surface"
    OBSTACLE = "obstacle"
    BROKEN_TACTILE_PAVING = "broken_tactile_paving"
    OTHER = "other"


@dataclass
class AccessibilityIssue:
    issue_id: str
    edge_id: str
    issue_type: AccessibilityIssueType
    severity: int
    description: Optional[str] = None
    location_detail: Optional[str] = None
    reported_by: Optional[str] = None
    reported_date: Optional[datetime] = None
    resolved: bool = False
    resolved_date: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    source_file: Optional[str] = None
    source_line: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "issue_id": self.issue_id,
            "edge_id": self.edge_id,
            "issue_type": self.issue_type.value,
            "severity": self.severity,
            "description": self.description,
            "location_detail": self.location_detail,
            "reported_by": self.reported_by,
            "reported_date": self.reported_date.isoformat() if self.reported_date else None,
            "resolved": self.resolved,
            "resolved_date": self.resolved_date.isoformat() if self.resolved_date else None,
            "metadata": self.metadata,
            "source_file": self.source_file,
            "source_line": self.source_line,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any], source_file: Optional[str] = None, source_line: Optional[int] = None) -> "AccessibilityIssue":
        issue_type = AccessibilityIssueType(data.get("issue_type", "other"))
        return cls(
            issue_id=data["issue_id"],
            edge_id=data["edge_id"],
            issue_type=issue_type,
            severity=data["severity"],
            description=data.get("description"),
            location_detail=data.get("location_detail"),
            reported_by=data.get("reported_by"),
            reported_date=datetime.fromisoformat(data["reported_date"]) if data.get("reported_date") else None,
            resolved=data.get("resolved", False),
            resolved_date=datetime.fromisoformat(data["resolved_date"]) if data.get("resolved_date") else None,
            metadata=data.get("metadata", {}),
            source_file=source_file or data.get("source_file"),
            source_line=source_line or data.get("source_line"),
        )

    def __hash__(self):
        return hash(self.issue_id)


@dataclass
class AccessibilityProfile:
    requires_wheelchair: bool = False
    requires_elevator: bool = False
    requires_ramp: bool = False
    max_slope: Optional[float] = None
    min_width: Optional[float] = None
    avoids_stairs: bool = True
    avoids_uneven_surface: bool = False
    preferred_tags: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "requires_wheelchair": self.requires_wheelchair,
            "requires_elevator": self.requires_elevator,
            "requires_ramp": self.requires_ramp,
            "max_slope": self.max_slope,
            "min_width": self.min_width,
            "avoids_stairs": self.avoids_stairs,
            "avoids_uneven_surface": self.avoids_uneven_surface,
            "preferred_tags": self.preferred_tags,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AccessibilityProfile":
        return cls(
            requires_wheelchair=data.get("requires_wheelchair", False),
            requires_elevator=data.get("requires_elevator", False),
            requires_ramp=data.get("requires_ramp", False),
            max_slope=data.get("max_slope"),
            min_width=data.get("min_width"),
            avoids_stairs=data.get("avoids_stairs", True),
            avoids_uneven_surface=data.get("avoids_uneven_surface", False),
            preferred_tags=data.get("preferred_tags", []),
        )
