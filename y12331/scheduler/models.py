from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set, Tuple
from datetime import datetime
from enum import Enum


class Weekday(Enum):
    MONDAY = 1
    TUESDAY = 2
    WEDNESDAY = 3
    THURSDAY = 4
    FRIDAY = 5
    SATURDAY = 6
    SUNDAY = 7

    @classmethod
    def from_str(cls, s: str) -> 'Weekday':
        mapping = {
            '周一': cls.MONDAY,
            '周二': cls.TUESDAY,
            '周三': cls.WEDNESDAY,
            '周四': cls.THURSDAY,
            '周五': cls.FRIDAY,
            '周六': cls.SATURDAY,
            '周日': cls.SUNDAY,
        }
        return mapping.get(s, cls.MONDAY)

    def to_str(self) -> str:
        mapping = {
            self.MONDAY: '周一',
            self.TUESDAY: '周二',
            self.WEDNESDAY: '周三',
            self.THURSDAY: '周四',
            self.FRIDAY: '周五',
            self.SATURDAY: '周六',
            self.SUNDAY: '周日',
        }
        return mapping[self]


class ScheduleStatus(Enum):
    NORMAL = '正常'
    PENDING = '待确认'
    CONFLICT = '异常'


class ConflictType(Enum):
    TEACHER_CONFLICT = '教师冲突'
    CAPACITY_EXCEEDED = '容量超限'
    CONSECUTIVE_FAILED = '连堂失败'
    TIME_UNAVAILABLE = '时间不可用'


@dataclass
class TimeSlot:
    weekday: Weekday
    start_period: int
    end_period: int

    def __post_init__(self):
        if self.start_period > self.end_period:
            raise ValueError("起始节次不能大于结束节次")

    def overlaps(self, other: 'TimeSlot') -> bool:
        if self.weekday != other.weekday:
            return False
        return not (self.end_period < other.start_period or self.start_period > other.end_period)

    def is_consecutive(self, other: 'TimeSlot') -> bool:
        if self.weekday != other.weekday:
            return False
        return self.end_period + 1 == other.start_period or other.end_period + 1 == self.start_period

    def __str__(self) -> str:
        return f"{self.weekday.to_str()}第{self.start_period}-{self.end_period}节"

    def __hash__(self):
        return hash((self.weekday, self.start_period, self.end_period))


@dataclass
class Teacher:
    id: str
    name: str
    available_times: List[TimeSlot] = field(default_factory=list)
    preferred_times: List[TimeSlot] = field(default_factory=list)

    def is_available(self, time_slot: TimeSlot) -> bool:
        if not self.available_times:
            return True
        return any(t.overlaps(time_slot) for t in self.available_times)


@dataclass
class Class:
    id: str
    name: str
    student_count: int
    preferred_teachers: List[str] = field(default_factory=list)
    preferred_times: List[TimeSlot] = field(default_factory=list)


@dataclass
class Course:
    id: str
    name: str
    teacher_id: str
    class_id: str
    duration: int = 2
    need_consecutive: bool = False
    capacity: int = 0


@dataclass
class Conflict:
    type: ConflictType
    description: str
    related_courses: List[str] = field(default_factory=list)


@dataclass
class ScheduleEntry:
    course_id: str
    time_slot: TimeSlot
    classroom: str = ''
    status: ScheduleStatus = ScheduleStatus.NORMAL
    conflicts: List[Conflict] = field(default_factory=list)
    is_locked: bool = False
    version: int = 1

    def has_conflict(self) -> bool:
        return len(self.conflicts) > 0


@dataclass
class ScheduleVersion:
    version: int
    timestamp: datetime
    entries: Dict[str, ScheduleEntry]
    reason: str = ''

    def get_conflicts(self) -> List[Tuple[str, Conflict]]:
        result = []
        for course_id, entry in self.entries.items():
            for conflict in entry.conflicts:
                result.append((course_id, conflict))
        return result


@dataclass
class ScheduleContext:
    teachers: Dict[str, Teacher] = field(default_factory=dict)
    classes: Dict[str, Class] = field(default_factory=dict)
    courses: Dict[str, Course] = field(default_factory=dict)
    versions: List[ScheduleVersion] = field(default_factory=list)
    current_version: int = 0

    def get_current_schedule(self) -> Optional[ScheduleVersion]:
        if not self.versions:
            return None
        return self.versions[-1]

    def create_new_version(self, entries: Dict[str, ScheduleEntry], reason: str = '') -> ScheduleVersion:
        self.current_version += 1
        version = ScheduleVersion(
            version=self.current_version,
            timestamp=datetime.now(),
            entries=entries,
            reason=reason
        )
        self.versions.append(version)
        return version

    def to_dict(self) -> dict:
        return {
            'teachers': [
                {
                    'id': t.id,
                    'name': t.name,
                    'available_times': [
                        {'weekday': ts.weekday.to_str(), 'start_period': ts.start_period, 'end_period': ts.end_period}
                        for ts in t.available_times
                    ],
                    'preferred_times': [
                        {'weekday': ts.weekday.to_str(), 'start_period': ts.start_period, 'end_period': ts.end_period}
                        for ts in t.preferred_times
                    ]
                } for t in self.teachers.values()
            ],
            'classes': [
                {
                    'id': c.id,
                    'name': c.name,
                    'student_count': c.student_count,
                    'preferred_teachers': c.preferred_teachers,
                    'preferred_times': [
                        {'weekday': ts.weekday.to_str(), 'start_period': ts.start_period, 'end_period': ts.end_period}
                        for ts in c.preferred_times
                    ]
                } for c in self.classes.values()
            ],
            'courses': [
                {
                    'id': c.id,
                    'name': c.name,
                    'teacher_id': c.teacher_id,
                    'class_id': c.class_id,
                    'duration': c.duration,
                    'need_consecutive': c.need_consecutive,
                    'capacity': c.capacity
                } for c in self.courses.values()
            ],
            'versions': [
                {
                    'version': v.version,
                    'timestamp': v.timestamp.isoformat(),
                    'reason': v.reason,
                    'entries': [
                        {
                            'course_id': e.course_id,
                            'time_slot': {
                                'weekday': e.time_slot.weekday.to_str(),
                                'start_period': e.time_slot.start_period,
                                'end_period': e.time_slot.end_period
                            },
                            'classroom': e.classroom,
                            'status': e.status.value,
                            'conflicts': [
                                {
                                    'type': c.type.value,
                                    'description': c.description,
                                    'related_courses': c.related_courses
                                } for c in e.conflicts
                            ],
                            'is_locked': e.is_locked,
                            'version': e.version
                        } for e in v.entries.values()
                    ]
                } for v in self.versions
            ],
            'current_version': self.current_version
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'ScheduleContext':
        ctx = cls()

        for t_data in data.get('teachers', []):
            ctx.teachers[t_data['id']] = Teacher(
                id=t_data['id'],
                name=t_data['name'],
                available_times=[
                    TimeSlot(
                        weekday=Weekday.from_str(t['weekday']),
                        start_period=t['start_period'],
                        end_period=t['end_period']
                    ) for t in t_data.get('available_times', [])
                ],
                preferred_times=[
                    TimeSlot(
                        weekday=Weekday.from_str(t['weekday']),
                        start_period=t['start_period'],
                        end_period=t['end_period']
                    ) for t in t_data.get('preferred_times', [])
                ]
            )

        for c_data in data.get('classes', []):
            ctx.classes[c_data['id']] = Class(
                id=c_data['id'],
                name=c_data['name'],
                student_count=c_data['student_count'],
                preferred_teachers=c_data.get('preferred_teachers', []),
                preferred_times=[
                    TimeSlot(
                        weekday=Weekday.from_str(t['weekday']),
                        start_period=t['start_period'],
                        end_period=t['end_period']
                    ) for t in c_data.get('preferred_times', [])
                ]
            )

        for c_data in data.get('courses', []):
            ctx.courses[c_data['id']] = Course(
                id=c_data['id'],
                name=c_data['name'],
                teacher_id=c_data['teacher_id'],
                class_id=c_data['class_id'],
                duration=c_data.get('duration', 2),
                need_consecutive=c_data.get('need_consecutive', False),
                capacity=c_data.get('capacity', 0)
            )

        ctx.current_version = data.get('current_version', 0)

        for v_data in data.get('versions', []):
            entries = {}
            for e_data in v_data['entries']:
                ts = e_data['time_slot']
                conflicts = [
                    Conflict(
                        type=ConflictType(c['type']),
                        description=c['description'],
                        related_courses=c.get('related_courses', [])
                    ) for c in e_data.get('conflicts', [])
                ]
                entries[e_data['course_id']] = ScheduleEntry(
                    course_id=e_data['course_id'],
                    time_slot=TimeSlot(
                        weekday=Weekday.from_str(ts['weekday']),
                        start_period=ts['start_period'],
                        end_period=ts['end_period']
                    ),
                    classroom=e_data.get('classroom', ''),
                    status=ScheduleStatus(e_data['status']),
                    conflicts=conflicts,
                    is_locked=e_data.get('is_locked', False),
                    version=e_data.get('version', 1)
                )
            ctx.versions.append(ScheduleVersion(
                version=v_data['version'],
                timestamp=datetime.fromisoformat(v_data['timestamp']),
                entries=entries,
                reason=v_data.get('reason', '')
            ))

        return ctx

    def save(self, file_path: str):
        import json
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)

    @classmethod
    def load(cls, file_path: str) -> Optional['ScheduleContext']:
        import json
        from pathlib import Path
        if not Path(file_path).exists():
            return None
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return cls.from_dict(data)
        except Exception as e:
            print(f"警告: 加载状态文件失败: {e}，将使用空状态")
            return None
