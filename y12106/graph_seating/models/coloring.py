from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from datetime import datetime


@dataclass
class ColorAssignment:
    student_id: str
    color: int
    color_label: str = ""
    confidence: float = 1.0
    assigned_at: datetime = field(default_factory=datetime.now)
    constraints: List[Dict[str, Any]] = field(default_factory=list)
    backtrack_count: int = 0
    is_override: bool = False
    override_reason: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "student_id": self.student_id,
            "color": self.color,
            "color_label": self.color_label,
            "confidence": self.confidence,
            "assigned_at": self.assigned_at.isoformat(),
            "constraints": self.constraints,
            "backtrack_count": self.backtrack_count,
            "is_override": self.is_override,
            "override_reason": self.override_reason
        }


@dataclass
class ColoringResult:
    algorithm: str
    assignments: Dict[str, ColorAssignment] = field(default_factory=dict)
    color_classes: Dict[int, List[str]] = field(default_factory=dict)
    colors_used: int = 0
    total_nodes: int = 0
    uncolored_nodes: List[str] = field(default_factory=list)
    backtrack_count: int = 0
    max_backtrack_depth: int = 0
    cycles_found: List[List[str]] = field(default_factory=list)
    isolated_cycles: List[List[str]] = field(default_factory=list)
    trace_log: List[Dict[str, Any]] = field(default_factory=list)
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    success: bool = False

    def get_color_for(self, student_id: str) -> Optional[int]:
        if student_id not in self.assignments:
            return None
        return self.assignments[student_id].color

    def get_students_in_color(self, color: int) -> List[str]:
        return self.color_classes.get(color, [])

    def get_conflict_count(self, graph: Any) -> int:
        conflicts = 0
        for (a, b), edge in graph.edges.items():
            if a in self.assignments and b in self.assignments:
                if self.assignments[a].color == self.assignments[b].color:
                    conflicts += 1
        return conflicts

    def get_color_distribution(self) -> Dict[int, int]:
        return {color: len(students) for color, students in self.color_classes.items()}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "algorithm": self.algorithm,
            "success": self.success,
            "total_nodes": self.total_nodes,
            "colors_used": self.colors_used,
            "uncolored_nodes": self.uncolored_nodes,
            "backtrack_count": self.backtrack_count,
            "max_backtrack_depth": self.max_backtrack_depth,
            "conflict_count": 0,
            "color_distribution": self.get_color_distribution(),
            "cycles_found": self.cycles_found,
            "isolated_cycles": self.isolated_cycles,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "assignments": {sid: ca.to_dict() for sid, ca in self.assignments.items()},
            "trace_log_sample": self.trace_log[:100] if len(self.trace_log) > 100 else self.trace_log
        }
