from typing import Dict, List, Set, Tuple
from .models import (
    ScheduleContext, ScheduleEntry, Conflict, ConflictType,
    ScheduleStatus, TimeSlot, Course, Teacher, Class
)


class ConstraintValidator:
    def __init__(self, context: ScheduleContext):
        self.context = context

    def validate_all(self, entries: Dict[str, ScheduleEntry]) -> Dict[str, ScheduleEntry]:
        for course_id, entry in entries.items():
            entry.conflicts = []
            entry.status = ScheduleStatus.NORMAL

        self._check_teacher_conflicts(entries)
        self._check_capacity(entries)
        self._check_consecutive(entries)
        self._check_teacher_availability(entries)

        for entry in entries.values():
            if entry.conflicts:
                has_hard_conflict = any(
                    c.type in [ConflictType.TEACHER_CONFLICT, ConflictType.CAPACITY_EXCEEDED]
                    for c in entry.conflicts
                )
                entry.status = ScheduleStatus.CONFLICT if has_hard_conflict else ScheduleStatus.PENDING

        return entries

    def _check_teacher_conflicts(self, entries: Dict[str, ScheduleEntry]):
        teacher_schedules: Dict[str, List[Tuple[str, TimeSlot]]] = {}

        for course_id, entry in entries.items():
            course = self.context.courses.get(course_id)
            if not course:
                continue
            teacher_id = course.teacher_id
            if teacher_id not in teacher_schedules:
                teacher_schedules[teacher_id] = []
            teacher_schedules[teacher_id].append((course_id, entry.time_slot))

        for teacher_id, schedules in teacher_schedules.items():
            for i, (cid1, ts1) in enumerate(schedules):
                for cid2, ts2 in schedules[i+1:]:
                    if ts1.overlaps(ts2):
                        teacher = self.context.teachers.get(teacher_id)
                        teacher_name = teacher.name if teacher else teacher_id
                        conflict = Conflict(
                            type=ConflictType.TEACHER_CONFLICT,
                            description=f"教师[{teacher_name}]在{ts1}与{ts2}时间冲突",
                            related_courses=[cid1, cid2]
                        )
                        entries[cid1].conflicts.append(conflict)
                        entries[cid2].conflicts.append(Conflict(
                            type=ConflictType.TEACHER_CONFLICT,
                            description=f"教师[{teacher_name}]在{ts2}与{ts1}时间冲突",
                            related_courses=[cid2, cid1]
                        ))

    def _check_capacity(self, entries: Dict[str, ScheduleEntry]):
        for course_id, entry in entries.items():
            course = self.context.courses.get(course_id)
            if not course or course.capacity <= 0:
                continue

            cls = self.context.classes.get(course.class_id)
            if not cls:
                continue

            if cls.student_count > course.capacity:
                conflict = Conflict(
                    type=ConflictType.CAPACITY_EXCEEDED,
                    description=f"班级[{cls.name}]人数({cls.student_count})超出课程容量({course.capacity})",
                    related_courses=[course_id]
                )
                entry.conflicts.append(conflict)

    def _check_consecutive(self, entries: Dict[str, ScheduleEntry]):
        for course_id, entry in entries.items():
            course = self.context.courses.get(course_id)
            if not course or not course.need_consecutive:
                continue

            duration = entry.time_slot.end_period - entry.time_slot.start_period + 1
            if duration < course.duration:
                conflict = Conflict(
                    type=ConflictType.CONSECUTIVE_FAILED,
                    description=f"课程需要{course.duration}连堂，但仅安排了{duration}节",
                    related_courses=[course_id]
                )
                entry.conflicts.append(conflict)

    def _check_teacher_availability(self, entries: Dict[str, ScheduleEntry]):
        for course_id, entry in entries.items():
            course = self.context.courses.get(course_id)
            if not course:
                continue

            teacher = self.context.teachers.get(course.teacher_id)
            if not teacher:
                continue

            if not teacher.is_available(entry.time_slot):
                conflict = Conflict(
                    type=ConflictType.TIME_UNAVAILABLE,
                    description=f"教师[{teacher.name}]在{entry.time_slot}时间不可用",
                    related_courses=[course_id]
                )
                entry.conflicts.append(conflict)
