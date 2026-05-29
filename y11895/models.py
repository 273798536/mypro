from dataclasses import dataclass, field
from typing import List, Dict, Set, Optional
from enum import Enum


class SpecialNeedType(Enum):
    WHEELCHAIR = "轮椅"
    VISUAL_IMPAIRMENT = "视力障碍"
    HEARING_IMPAIRMENT = "听力障碍"
    EXTRA_TIME = "延时"
    ALONE_ROOM = "单独考场"
    FRONT_SEAT = "前排座位"


class ConflictType(Enum):
    SAME_COURSE = "同课冲突"
    SAME_CLASS_ADJACENT = "同班相邻"
    CAPACITY_OVERFLOW = "容量超限"
    SPECIAL_NEED_MISSING = "特殊需求遗漏"
    STUDENT_TIMESLOT_CONFLICT = "学生时段冲突"


@dataclass
class SpecialNeed:
    need_type: SpecialNeedType
    description: str = ""


@dataclass
class Student:
    student_id: str
    name: str
    class_name: str
    course_ids: List[str] = field(default_factory=list)
    special_needs: List[SpecialNeed] = field(default_factory=list)
    import_order: int = 0

    def has_special_need(self, need_type: SpecialNeedType) -> bool:
        return any(need.need_type == need_type for need in self.special_needs)


@dataclass
class Course:
    course_id: str
    name: str
    student_ids: List[str] = field(default_factory=list)
    import_order: int = 0


@dataclass
class ExamHall:
    hall_id: str
    name: str
    capacity: int
    special_capacity: Dict[SpecialNeedType, int] = field(default_factory=dict)
    import_order: int = 0


@dataclass
class Conflict:
    conflict_type: ConflictType
    description: str
    student_ids: List[str] = field(default_factory=list)
    course_id: Optional[str] = None
    hall_id: Optional[str] = None
    timeslot: Optional[int] = None


@dataclass
class ExamAssignment:
    student_id: str
    course_id: str
    hall_id: str
    timeslot: int
    seat_number: int
    import_order: int = 0
    trace_info: Dict = field(default_factory=dict)


@dataclass
class PendingItem:
    item_type: ConflictType
    description: str
    details: Dict = field(default_factory=dict)
    confirmed: bool = False


@dataclass
class SchedulingResult:
    assignments: List[ExamAssignment] = field(default_factory=list)
    conflicts: List[Conflict] = field(default_factory=list)
    pending_items: List[PendingItem] = field(default_factory=list)
    import_errors: List[Dict] = field(default_factory=list)
    graph_coloring_trace: Dict = field(default_factory=dict)
