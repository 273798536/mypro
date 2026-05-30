from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from datetime import datetime
import uuid


@dataclass
class ConstraintExplanation:
    student_id: str
    constraint_type: str
    description: str
    source: str
    constraint_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    weight: float = 1.0
    affected_students: List[str] = field(default_factory=list)
    evidence: List[Dict[str, Any]] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "constraint_id": self.constraint_id,
            "student_id": self.student_id,
            "constraint_type": self.constraint_type,
            "description": self.description,
            "source": self.source,
            "weight": self.weight,
            "affected_students": self.affected_students,
            "evidence": self.evidence,
            "created_at": self.created_at.isoformat()
        }


@dataclass
class SeatChangeHistory:
    student_id: str
    change_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    old_class_id: Optional[str] = None
    new_class_id: Optional[str] = None
    old_seat_number: Optional[int] = None
    new_seat_number: Optional[int] = None
    change_reason: str = ""
    triggered_by: str = ""
    related_changes: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.now)
    operator: str = "system"
    notes: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "change_id": self.change_id,
            "student_id": self.student_id,
            "old_class_id": self.old_class_id,
            "new_class_id": self.new_class_id,
            "old_seat_number": self.old_seat_number,
            "new_seat_number": self.new_seat_number,
            "change_reason": self.change_reason,
            "triggered_by": self.triggered_by,
            "related_changes": self.related_changes,
            "timestamp": self.timestamp.isoformat(),
            "operator": self.operator,
            "notes": self.notes
        }


@dataclass
class TraceRecord:
    student_id: str
    trace_type: str
    action: str
    description: str
    source_module: str
    trace_id: str = field(default_factory=lambda: str(uuid.uuid4())[:12])
    data_hash: str = ""
    input_state: Dict[str, Any] = field(default_factory=dict)
    output_state: Dict[str, Any] = field(default_factory=dict)
    constraints: List[ConstraintExplanation] = field(default_factory=list)
    related_changes: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.now)
    sequence_number: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "trace_id": self.trace_id,
            "student_id": self.student_id,
            "trace_type": self.trace_type,
            "action": self.action,
            "description": self.description,
            "source_module": self.source_module,
            "data_hash": self.data_hash,
            "input_state": self.input_state,
            "output_state": self.output_state,
            "constraints": [c.to_dict() for c in self.constraints],
            "related_changes": self.related_changes,
            "timestamp": self.timestamp.isoformat(),
            "sequence_number": self.sequence_number
        }


@dataclass
class TraceChain:
    student_id: str
    records: List[TraceRecord] = field(default_factory=list)
    change_history: List[SeatChangeHistory] = field(default_factory=list)
    constraints: List[ConstraintExplanation] = field(default_factory=list)

    def add_record(self, record: TraceRecord):
        record.sequence_number = len(self.records) + 1
        self.records.append(record)

    def add_change(self, change: SeatChangeHistory):
        self.change_history.append(change)

    def add_constraint(self, constraint: ConstraintExplanation):
        self.constraints.append(constraint)

    def get_full_trace(self) -> List[Dict[str, Any]]:
        full_trace = []
        for record in sorted(self.records, key=lambda r: r.timestamp):
            full_trace.append({
                "type": "trace",
                "timestamp": record.timestamp.isoformat(),
                "data": record.to_dict()
            })
        for change in sorted(self.change_history, key=lambda c: c.timestamp):
            full_trace.append({
                "type": "change",
                "timestamp": change.timestamp.isoformat(),
                "data": change.to_dict()
            })
        return sorted(full_trace, key=lambda x: x["timestamp"])

    def to_dict(self) -> Dict[str, Any]:
        return {
            "student_id": self.student_id,
            "records": [r.to_dict() for r in self.records],
            "record_count": len(self.records),
            "change_count": len(self.change_history),
            "constraint_count": len(self.constraints),
            "full_trace": self.get_full_trace(),
            "constraints": [c.to_dict() for c in self.constraints],
            "change_history": [c.to_dict() for c in self.change_history]
        }
