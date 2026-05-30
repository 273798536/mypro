from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from datetime import date, datetime
from collections import defaultdict


@dataclass
class LeaveSlot:
    slot_date: date
    absent_students: List[str] = field(default_factory=list)
    available_substitutes: List[str] = field(default_factory=list)
    capacity_shortage: int = 0
    notes: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "slot_date": self.slot_date.isoformat(),
            "absent_students": self.absent_students,
            "available_substitutes": self.available_substitutes,
            "capacity_shortage": self.capacity_shortage,
            "notes": self.notes
        }


@dataclass
class ClassCapacity:
    class_id: str
    class_name: str
    grade: str
    max_capacity: int
    min_capacity: int = 20
    current_count: int = 0
    students: List[str] = field(default_factory=list)
    special_needs_count: int = 0
    leave_overrides: List[str] = field(default_factory=list)

    def add_student(self, student_id: str) -> bool:
        if self.current_count >= self.max_capacity:
            return False
        self.students.append(student_id)
        self.current_count += 1
        return True

    def remove_student(self, student_id: str) -> bool:
        if student_id in self.students:
            self.students.remove(student_id)
            self.current_count -= 1
            return True
        return False

    def has_capacity(self) -> bool:
        return self.current_count < self.max_capacity

    def get_utilization(self) -> float:
        return self.current_count / self.max_capacity if self.max_capacity > 0 else 0

    def meets_minimum(self) -> bool:
        return self.current_count >= self.min_capacity

    def to_dict(self) -> Dict[str, Any]:
        return {
            "class_id": self.class_id,
            "class_name": self.class_name,
            "grade": self.grade,
            "max_capacity": self.max_capacity,
            "min_capacity": self.min_capacity,
            "current_count": self.current_count,
            "utilization": self.get_utilization(),
            "meets_minimum": self.meets_minimum(),
            "students": self.students,
            "special_needs_count": self.special_needs_count,
            "leave_overrides": self.leave_overrides
        }


@dataclass
class SeatAssignment:
    student_id: str
    class_id: str
    class_name: str
    grade: str
    seat_number: Optional[int] = None
    color_group: int = -1
    assigned_at: datetime = field(default_factory=datetime.now)
    is_leave_override: bool = False
    override_reason: str = ""
    assignment_type: str = "normal"
    source_trace: List[str] = field(default_factory=list)
    capacity_warning: bool = False
    conflict_warnings: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "student_id": self.student_id,
            "class_id": self.class_id,
            "class_name": self.class_name,
            "grade": self.grade,
            "seat_number": self.seat_number,
            "color_group": self.color_group,
            "assigned_at": self.assigned_at.isoformat(),
            "is_leave_override": self.is_leave_override,
            "override_reason": self.override_reason,
            "assignment_type": self.assignment_type,
            "source_trace": self.source_trace,
            "capacity_warning": self.capacity_warning,
            "conflict_warnings": self.conflict_warnings
        }


@dataclass
class SeatingPlan:
    grade: str
    classes: Dict[str, ClassCapacity] = field(default_factory=dict)
    assignments: Dict[str, SeatAssignment] = field(default_factory=dict)
    unassigned_students: List[str] = field(default_factory=list)
    leave_slots: Dict[str, LeaveSlot] = field(default_factory=dict)
    capacity_warnings: List[Dict[str, Any]] = field(default_factory=list)
    conflict_violations: List[Dict[str, Any]] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)

    def get_class_for_student(self, student_id: str) -> Optional[ClassCapacity]:
        if student_id not in self.assignments:
            return None
        class_id = self.assignments[student_id].class_id
        return self.classes.get(class_id)

    def get_classmates(self, student_id: str) -> List[str]:
        cls = self.get_class_for_student(student_id)
        if cls is None:
            return []
        return [s for s in cls.students if s != student_id]

    def check_conflicts(self, graph: Any) -> List[Dict[str, Any]]:
        violations = []
        for class_id, cls in self.classes.items():
            for i, s1 in enumerate(cls.students):
                for s2 in cls.students[i + 1:]:
                    edge = graph.get_edge(s1, s2)
                    if edge and edge.weight > 0:
                        violations.append({
                            "class_id": class_id,
                            "student_a": s1,
                            "student_b": s2,
                            "conflict_type": edge.conflict_type,
                            "weight": edge.weight
                        })
        self.conflict_violations = violations
        return violations

    def get_utilization_report(self) -> Dict[str, Any]:
        report = defaultdict(dict)
        total_students = sum(cls.current_count for cls in self.classes.values())
        total_capacity = sum(cls.max_capacity for cls in self.classes.values())

        for class_id, cls in self.classes.items():
            report[class_id] = {
                "class_name": cls.class_name,
                "current": cls.current_count,
                "max": cls.max_capacity,
                "min": cls.min_capacity,
                "utilization": cls.get_utilization(),
                "meets_minimum": cls.meets_minimum()
            }

        return {
            "total_students": total_students,
            "total_capacity": total_capacity,
            "overall_utilization": total_students / max(1, total_capacity),
            "unassigned": len(self.unassigned_students),
            "by_class": dict(report)
        }

    def to_dict(self) -> Dict[str, Any]:
        return {
            "grade": self.grade,
            "created_at": self.created_at.isoformat(),
            "classes": {cid: cls.to_dict() for cid, cls in self.classes.items()},
            "assignments": {sid: sa.to_dict() for sid, sa in self.assignments.items()},
            "unassigned_students": self.unassigned_students,
            "leave_slots": {date_str: ls.to_dict() for date_str, ls in self.leave_slots.items()},
            "capacity_warnings": self.capacity_warnings,
            "conflict_violations": self.conflict_violations,
            "utilization": self.get_utilization_report()
        }
