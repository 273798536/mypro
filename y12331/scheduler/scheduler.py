from typing import Dict, List, Optional, Tuple
from copy import deepcopy
from .models import (
    ScheduleContext, ScheduleEntry, ScheduleStatus,
    TimeSlot, Weekday, Course
)
from .constraints import ConstraintValidator


class DPScheduler:
    def __init__(self, context: ScheduleContext):
        self.context = context
        self.validator = ConstraintValidator(context)
        self.max_periods = 8
        self.workdays = [Weekday.MONDAY, Weekday.TUESDAY, Weekday.WEDNESDAY,
                         Weekday.THURSDAY, Weekday.FRIDAY]

    def generate_all_time_slots(self, duration: int = 2) -> List[TimeSlot]:
        slots = []
        for weekday in self.workdays:
            for start in range(1, self.max_periods - duration + 2):
                end = start + duration - 1
                slots.append(TimeSlot(weekday=weekday, start_period=start, end_period=end))
        return slots

    def _quick_check_conflict(self, course_id: str, time_slot: TimeSlot, 
                                current_entries: Dict[str, ScheduleEntry]) -> bool:
        course = self.context.courses[course_id]
        
        for cid, entry in current_entries.items():
            if cid == course_id:
                continue
            other_course = self.context.courses.get(cid)
            if not other_course:
                continue
            
            if other_course.teacher_id == course.teacher_id:
                if time_slot.overlaps(entry.time_slot):
                    return True
        
        return False

    def schedule(self, existing_entries: Optional[Dict[str, ScheduleEntry]] = None,
                 reason: str = '') -> Dict[str, ScheduleEntry]:
        if existing_entries is None:
            existing_entries = {}

        locked_entries = {}
        unscheduled_courses = []

        for course_id, course in self.context.courses.items():
            if course_id in existing_entries and existing_entries[course_id].is_locked:
                locked_entries[course_id] = deepcopy(existing_entries[course_id])
            else:
                unscheduled_courses.append(course_id)

        sorted_courses = sorted(
            unscheduled_courses,
            key=lambda cid: (
                -self.context.courses[cid].need_consecutive,
                -self.context.courses[cid].duration
            )
        )

        final_entries = deepcopy(locked_entries)
        max_attempts = 5

        for course_id in sorted_courses:
            course = self.context.courses[course_id]
            time_slots = self.generate_all_time_slots(course.duration)
            
            scored_slots = []
            for time_slot in time_slots:
                test_entry = ScheduleEntry(course_id=course_id, time_slot=time_slot)
                temp_entries = deepcopy(final_entries)
                temp_entries[course_id] = test_entry
                
                validated = self.validator.validate_all(temp_entries)
                score = self._calculate_single_score(course_id, validated[course_id])
                scored_slots.append((score, time_slot, validated[course_id].conflicts))
            
            scored_slots.sort(key=lambda x: (-x[0], str(x[1])))
            
            best_slot = scored_slots[0][1]
            final_entries[course_id] = ScheduleEntry(
                course_id=course_id,
                time_slot=best_slot
            )

        final_entries = self.validator.validate_all(final_entries)

        for cid, entry in final_entries.items():
            if cid in existing_entries:
                entry.is_locked = existing_entries[cid].is_locked
                entry.version = existing_entries[cid].version + (0 if entry.time_slot == existing_entries[cid].time_slot else 1)

        self.context.create_new_version(final_entries, reason)

        return final_entries

    def _calculate_single_score(self, course_id: str, entry: ScheduleEntry) -> int:
        score = 100
        if entry.conflicts:
            score -= len(entry.conflicts) * 50
        
        course = self.context.courses.get(course_id)
        if course:
            teacher = self.context.teachers.get(course.teacher_id)
            if teacher:
                if any(t.overlaps(entry.time_slot) for t in teacher.preferred_times):
                    score += 10
                if teacher.available_times and not teacher.is_available(entry.time_slot):
                    score -= 30

            cls = self.context.classes.get(course.class_id)
            if cls:
                if any(t.overlaps(entry.time_slot) for t in cls.preferred_times):
                    score += 5
        
        return score

    def _calculate_score(self, entries: Dict[str, ScheduleEntry]) -> int:
        score = 0
        for entry in entries.values():
            if not entry.conflicts:
                score += 10

            course = self.context.courses.get(entry.course_id)
            if course:
                teacher = self.context.teachers.get(course.teacher_id)
                if teacher:
                    if any(t.overlaps(entry.time_slot) for t in teacher.preferred_times):
                        score += 5

                cls = self.context.classes.get(course.class_id)
                if cls:
                    if any(t.overlaps(entry.time_slot) for t in cls.preferred_times):
                        score += 3

        return score

    def reschedule_with_changes(self, reason: str = '') -> Dict[str, ScheduleEntry]:
        current = self.context.get_current_schedule()
        existing = current.entries if current else {}
        return self.schedule(existing_entries=existing, reason=reason)
