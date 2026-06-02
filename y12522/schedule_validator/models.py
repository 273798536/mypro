"""数据模型定义。"""

from __future__ import annotations

from datetime import time
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class Weekday(str, Enum):
    """星期枚举。"""
    MONDAY = "周一"
    TUESDAY = "周二"
    WEDNESDAY = "周三"
    THURSDAY = "周四"
    FRIDAY = "周五"
    SATURDAY = "周六"
    SUNDAY = "周日"


class ValidationStatus(str, Enum):
    """校验状态。"""
    PASS = "通过"
    FAIL = "失败"
    WARNING = "警告"
    BLOCKED = "拦截"


class ConflictType(str, Enum):
    """冲突类型。"""
    DUPLICATE = "重复计数"
    TIME_CONFLICT = "时间冲突"
    CAPACITY_EXCEEDED = "容量超限"
    TEACHER_UNAVAILABLE = "教师无空"
    CLASSROOM_UNAVAILABLE = "教室被占"


class TimeSlot(BaseModel):
    """时间槽。"""
    weekday: Weekday
    start_time: time
    end_time: time
    section: Optional[str] = None

    @field_validator('end_time')
    def end_must_be_after_start(cls, v: time, info: Any) -> time:
        if v <= info.data['start_time']:
            raise ValueError("结束时间必须晚于开始时间")
        return v

    def overlaps_with(self, other: 'TimeSlot') -> bool:
        """判断两个时间槽是否重叠。"""
        if self.weekday != other.weekday:
            return False
        return not (self.end_time <= other.start_time or self.start_time >= other.end_time)

    def __str__(self) -> str:
        sec = f"({self.section})" if self.section else ""
        return f"{self.weekday.value} {self.start_time.strftime('%H:%M')}-{self.end_time.strftime('%H:%M')}{sec}"

    def __hash__(self) -> int:
        return hash((self.weekday, self.start_time, self.end_time))


class Course(BaseModel):
    """课程。"""
    course_id: str
    course_name: str
    teacher_name: str
    student_count: int = Field(gt=0)
    duration_minutes: int = Field(gt=0)
    required_weekdays: List[Weekday] = Field(default_factory=list)
    preferred_sections: List[str] = Field(default_factory=list)

    def __str__(self) -> str:
        return f"[{self.course_id}] {self.course_name} ({self.teacher_name}, {self.student_count}人)"


class TeacherAvailability(BaseModel):
    """教师可用时间。"""
    teacher_name: str
    available_slots: List[TimeSlot] = Field(default_factory=list)
    max_courses_per_week: int = Field(default=10, gt=0)
    assigned_course_ids: List[str] = Field(default_factory=list)

    def is_available_at(self, slot: TimeSlot) -> bool:
        """检查教师在指定时间是否可用。"""
        return any(s.overlaps_with(slot) for s in self.available_slots)

    def __str__(self) -> str:
        return f"{self.teacher_name} (可用: {len(self.available_slots)}个时段)"


class Classroom(BaseModel):
    """教室。"""
    room_id: str
    room_name: str
    capacity: int = Field(gt=0)
    equipment: List[str] = Field(default_factory=list)

    def can_accommodate(self, student_count: int) -> bool:
        """检查教室容量是否足够。"""
        return student_count <= self.capacity

    def __str__(self) -> str:
        return f"[{self.room_id}] {self.room_name} (容量: {self.capacity}人)"


class ScheduleCombination(BaseModel):
    """排课组合。"""
    combination_id: str
    course: Course
    teacher: TeacherAvailability
    classroom: Classroom
    time_slot: TimeSlot
    iteration: int = 0

    def __str__(self) -> str:
        return (
            f"组合#{self.iteration}: {self.course.course_name} "
            f"@ {self.classroom.room_name} "
            f"[{self.time_slot}] "
            f"by {self.teacher.teacher_name}"
        )

    def get_duplicate_key(self) -> tuple:
        """生成用于检测重复计数的键。"""
        return (
            self.course.course_id,
            self.teacher.teacher_name,
            self.classroom.room_id,
            hash(self.time_slot),
        )


class TraceStep(BaseModel):
    """追溯步骤。"""
    step_id: str
    phase: str
    action: str
    detail: str
    timestamp: float
    combination_ref: Optional[str] = None


class ValidationResult(BaseModel):
    """校验结果。"""
    status: ValidationStatus
    conflict_type: Optional[ConflictType] = None
    message: str
    suggestion: str = ""
    conflicting_combinations: List[ScheduleCombination] = Field(default_factory=list)
    trace_path: List[TraceStep] = Field(default_factory=list)
    duplicate_key: Optional[tuple] = None

    class Config:
        arbitrary_types_allowed = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status.value,
            "conflict_type": self.conflict_type.value if self.conflict_type else None,
            "message": self.message,
            "suggestion": self.suggestion,
            "trace_path_length": len(self.trace_path),
        }


class ScheduleReport(BaseModel):
    """排课报告。"""
    total_courses: int
    total_combinations_generated: int
    valid_combinations: int
    blocked_count: int
    failed_count: int
    warning_count: int
    results: List[ValidationResult] = Field(default_factory=list)
    valid_schedules: List[ScheduleCombination] = Field(default_factory=list)

    def summary(self) -> str:
        return (
            f"排课报告: 共{self.total_courses}门课程, "
            f"生成{self.total_combinations_generated}个组合, "
            f"有效{self.valid_combinations}个, "
            f"拦截{self.blocked_count}个, "
            f"失败{self.failed_count}个, "
            f"警告{self.warning_count}个"
        )


class InputData(BaseModel):
    """输入数据集合。"""
    courses: List[Course] = Field(default_factory=list)
    teachers: List[TeacherAvailability] = Field(default_factory=list)
    classrooms: List[Classroom] = Field(default_factory=list)
    fixed_assignments: List[ScheduleCombination] = Field(default_factory=list)
