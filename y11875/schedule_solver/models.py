"""数据模型定义 - 保留原始名称以便追溯"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set, Tuple
from enum import Enum


class Weekday(Enum):
    """星期枚举"""
    MONDAY = "周一"
    TUESDAY = "周二"
    WEDNESDAY = "周三"
    THURSDAY = "周四"
    FRIDAY = "周五"
    SATURDAY = "周六"
    SUNDAY = "周日"


@dataclass
class TimeSlot:
    """时间段 - 保留原始名称"""
    raw_name: str
    weekday: Weekday
    start_period: int
    end_period: int
    start_time: Optional[str] = None
    end_time: Optional[str] = None

    def __post_init__(self):
        if self.start_period > self.end_period:
            raise ValueError(
                f"时间段 '{self.raw_name}' 的开始节次 ({self.start_period}) 不能大于结束节次 ({self.end_period})"
            )

    @property
    def duration(self) -> int:
        """持续节数"""
        return self.end_period - self.start_period + 1

    def overlaps_with(self, other: "TimeSlot") -> bool:
        """判断两个时间段是否重叠"""
        if self.weekday != other.weekday:
            return False
        return not (self.end_period < other.start_period or other.end_period < self.start_period)

    def __hash__(self):
        return hash((self.raw_name, self.weekday, self.start_period, self.end_period))


@dataclass
class Teacher:
    """教师 - 保留原始名称"""
    raw_name: str
    teacher_id: Optional[str] = None
    unavailable_slots: Set[TimeSlot] = field(default_factory=set)
    preferred_slots: Set[TimeSlot] = field(default_factory=set)

    def is_available(self, slot: TimeSlot) -> bool:
        """检查教师在该时间段是否可用"""
        return slot not in self.unavailable_slots


@dataclass
class Classroom:
    """教室 - 保留原始名称"""
    raw_name: str
    capacity: int
    classroom_type: str = "普通教室"
    equipment: List[str] = field(default_factory=list)
    unavailable_slots: Set[TimeSlot] = field(default_factory=set)

    def can_accommodate(self, student_count: int) -> bool:
        """检查教室容量是否足够"""
        return self.capacity >= student_count

    def is_available(self, slot: TimeSlot) -> bool:
        """检查教室在该时间段是否可用"""
        return slot not in self.unavailable_slots


@dataclass
class Course:
    """课程 - 保留原始名称"""
    raw_name: str
    course_id: Optional[str] = None
    teachers: List[Teacher] = field(default_factory=list)
    student_count: int = 0
    duration_periods: int = 2
    is_experimental: bool = False
    required_equipment: List[str] = field(default_factory=list)
    preferred_classrooms: List[Classroom] = field(default_factory=list)
    preferred_slots: List[TimeSlot] = field(default_factory=list)
    requires_consecutive: bool = True
    department: Optional[str] = None
    comments: Optional[str] = None


@dataclass
class ScheduledClass:
    """已排定的课程"""
    course: Course
    classroom: Classroom
    slot: TimeSlot
    teachers: List[Teacher]

    def conflicts_with(self, other: "ScheduledClass") -> Optional["Conflict"]:
        """检查与另一个已排课程是否冲突"""
        if not self.slot.overlaps_with(other.slot):
            return None

        teacher_conflict = [
            t for t in self.teachers if t in other.teachers
        ]
        if teacher_conflict:
            return Conflict(
                conflict_type=ConflictType.TEACHER_OVERLAP,
                classes=[self, other],
                teachers=teacher_conflict,
                description=f"教师 {[t.raw_name for t in teacher_conflict]} 在 {self.slot.raw_name} 同时有课"
            )

        if self.classroom == other.classroom:
            return Conflict(
                conflict_type=ConflictType.CLASSROOM_OVERLAP,
                classes=[self, other],
                description=f"教室 {self.classroom.raw_name} 在 {self.slot.raw_name} 被重复使用"
            )

        return None


class ConflictType(Enum):
    """冲突类型"""
    TEACHER_OVERLAP = "教师时间冲突"
    CLASSROOM_OVERLAP = "教室使用冲突"
    CAPACITY_INSUFFICIENT = "教室容量不足"
    CONSECUTIVE_BROKEN = "连堂被拆分"
    EQUIPMENT_MISMATCH = "实验设备不匹配"
    TEACHER_UNAVAILABLE = "教师不可用"
    CLASSROOM_UNAVAILABLE = "教室不可用"
    PREFERRED_VIOLATION = "偏好违反"


@dataclass
class Conflict:
    """冲突详情 - 可追溯到原始数据"""
    conflict_type: ConflictType
    classes: List[ScheduledClass]
    teachers: List[Teacher] = field(default_factory=list)
    description: str = ""
    severity: int = 1

    def to_traceable_dict(self) -> Dict:
        """转换为可追溯的字典，保留所有原始名称"""
        return {
            "冲突类型": self.conflict_type.value,
            "严重程度": self.severity,
            "描述": self.description,
            "涉及课程": [
                {
                    "课程名称": c.course.raw_name,
                    "课程ID": c.course.course_id,
                    "教师": [t.raw_name for t in c.teachers],
                    "教室": c.classroom.raw_name,
                    "时间": c.slot.raw_name,
                    "星期": c.slot.weekday.value,
                    "节次": f"{c.slot.start_period}-{c.slot.end_period}"
                }
                for c in self.classes
            ],
            "涉及教师": [t.raw_name for t in self.teachers]
        }


@dataclass
class ScheduleSolution:
    """排课方案"""
    scheduled_classes: List[ScheduledClass] = field(default_factory=list)
    conflicts: List[Conflict] = field(default_factory=list)
    unscheduled_courses: List[Course] = field(default_factory=list)
    score: float = 0.0
    score_breakdown: Dict[str, float] = field(default_factory=dict)

    @property
    def total_conflicts(self) -> int:
        return len(self.conflicts)

    @property
    def scheduled_count(self) -> int:
        return len(self.scheduled_classes)

    @property
    def unscheduled_count(self) -> int:
        return len(self.unscheduled_courses)
