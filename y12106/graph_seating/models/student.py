from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime, date
import hashlib


@dataclass
class LeaveRecord:
    student_id: str
    start_date: date
    end_date: date
    leave_type: str = "general"
    reason: str = ""
    approved: bool = False
    record_id: str = field(default_factory=lambda: "")

    def __post_init__(self):
        if not self.record_id:
            raw = f"{self.student_id}_{self.start_date}_{self.end_date}"
            self.record_id = hashlib.md5(raw.encode()).hexdigest()[:12]

    def overlaps_with(self, other: "LeaveRecord") -> bool:
        return not (self.end_date < other.start_date or self.start_date > other.end_date)

    def duration_days(self) -> int:
        return (self.end_date - self.start_date).days + 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record_id,
            "student_id": self.student_id,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "leave_type": self.leave_type,
            "reason": self.reason,
            "approved": self.approved,
            "duration_days": self.duration_days()
        }


@dataclass
class ConflictRelation:
    student_a_id: str
    student_b_id: str
    conflict_type: str
    weight: float = 1.0
    description: str = ""
    source: str = "explicit"
    active: bool = True
    created_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "student_a_id": self.student_a_id,
            "student_b_id": self.student_b_id,
            "conflict_type": self.conflict_type,
            "weight": self.weight,
            "description": self.description,
            "source": self.source,
            "active": self.active,
            "created_at": self.created_at.isoformat()
        }


@dataclass
class Student:
    student_id: str
    name: str
    grade: str
    class_name: str = ""
    gender: str = ""
    interest_tags: List[str] = field(default_factory=list)
    leave_records: List[LeaveRecord] = field(default_factory=list)
    conflict_with: List[str] = field(default_factory=list)
    seat_preference: str = ""
    special_needs: str = ""
    notes: str = ""
    raw_data: Dict[str, Any] = field(default_factory=dict)
    data_line_number: int = -1
    is_valid: bool = True
    validation_errors: List[str] = field(default_factory=list)
    is_leave_override: bool = False

    def __post_init__(self):
        if not self.student_id:
            self.is_valid = False
            self.validation_errors.append("student_id is required")
        if not self.name:
            self.is_valid = False
            self.validation_errors.append("name is required")
        if not self.grade:
            self.is_valid = False
            self.validation_errors.append("grade is required")

    def has_leave_on(self, check_date: date) -> bool:
        return any(
            record.start_date <= check_date <= record.end_date and record.approved
            for record in self.leave_records
        )

    def get_active_leaves(self, as_of: Optional[date] = None) -> List[LeaveRecord]:
        as_of = as_of or date.today()
        return [
            record for record in self.leave_records
            if record.approved and record.start_date <= as_of <= record.end_date
        ]

    def get_conflict_partners(self) -> List[str]:
        return list(set(self.conflict_with))

    def add_leave_record(self, record: LeaveRecord):
        self.leave_records.append(record)

    def add_conflict(self, other_student_id: str):
        if other_student_id not in self.conflict_with and other_student_id != self.student_id:
            self.conflict_with.append(other_student_id)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "student_id": self.student_id,
            "name": self.name,
            "grade": self.grade,
            "class_name": self.class_name,
            "gender": self.gender,
            "interest_tags": self.interest_tags,
            "leave_records": [lr.to_dict() for lr in self.leave_records],
            "conflict_with": self.conflict_with,
            "seat_preference": self.seat_preference,
            "special_needs": self.special_needs,
            "notes": self.notes,
            "data_line_number": self.data_line_number,
            "is_valid": self.is_valid,
            "validation_errors": self.validation_errors,
            "is_leave_override": self.is_leave_override
        }

    def get_data_hash(self) -> str:
        raw = f"{self.student_id}|{self.name}|{self.grade}|{self.class_name}|{sorted(self.interest_tags)}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]
