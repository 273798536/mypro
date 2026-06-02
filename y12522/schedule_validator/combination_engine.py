"""组合枚举引擎。

生成课程、教师、教室、时间的所有可能组合，
并记录每一步的枚举过程以便后续追溯。
"""

from __future__ import annotations

import time
import uuid
from itertools import product
from typing import List, Iterator, Optional
from datetime import timedelta, time as dt_time

from .models import (
    Course,
    TeacherAvailability,
    Classroom,
    TimeSlot,
    ScheduleCombination,
    TraceStep,
    Weekday,
    InputData,
)


class CombinationEngine:
    """组合枚举引擎。"""

    def __init__(self, input_data: InputData):
        self.input_data = input_data
        self._iteration_counter = 0
        self._trace_steps: List[TraceStep] = []

    def _trace(self, phase: str, action: str, detail: str,
               combination_ref: Optional[str] = None) -> None:
        """记录追溯步骤。"""
        step = TraceStep(
            step_id=str(uuid.uuid4())[:8],
            phase=phase,
            action=action,
            detail=detail,
            timestamp=time.time(),
            combination_ref=combination_ref,
        )
        self._trace_steps.append(step)

    def _generate_time_slots(self, course: Course, teacher: TeacherAvailability) -> List[TimeSlot]:
        """为课程和教师生成匹配的时间槽。"""
        slots: List[TimeSlot] = []
        duration = timedelta(minutes=course.duration_minutes)

        for available_slot in teacher.available_slots:
            if course.required_weekdays and available_slot.weekday not in course.required_weekdays:
                continue

            slot_start = available_slot.start_time
            while True:
                start_dt = dt_time(slot_start.hour, slot_start.minute)
                end_minutes = start_dt.hour * 60 + start_dt.minute + duration.total_seconds() / 60
                end_hour = int(end_minutes // 60)
                end_minute = int(end_minutes % 60)

                if end_hour > 23:
                    break

                end_dt = dt_time(end_hour, end_minute)
                if end_dt > available_slot.end_time:
                    break

                section = self._get_section_name(start_dt, end_dt)
                slot = TimeSlot(
                    weekday=available_slot.weekday,
                    start_time=start_dt,
                    end_time=end_dt,
                    section=section,
                )
                slots.append(slot)

                next_start = end_dt
                if next_start >= available_slot.end_time:
                    break
                slot_start = next_start

        return slots

    def _get_section_name(self, start: dt_time, end: dt_time) -> str:
        """根据时间段获取节次名称。"""
        start_minutes = start.hour * 60 + start.minute

        if 8 * 60 <= start_minutes < 9 * 60 + 40:
            return "第1-2节"
        elif 10 * 60 <= start_minutes < 11 * 60 + 40:
            return "第3-4节"
        elif 14 * 60 <= start_minutes < 15 * 60 + 40:
            return "第5-6节"
        elif 16 * 60 <= start_minutes < 17 * 60 + 40:
            return "第7-8节"
        elif 19 * 60 <= start_minutes < 20 * 60 + 40:
            return "第9-10节"
        else:
            return f"{start.strftime('%H%M')}-{end.strftime('%H%M')}"

    def _match_teacher(self, course: Course) -> Optional[TeacherAvailability]:
        """为课程匹配教师。"""
        for teacher in self.input_data.teachers:
            if teacher.teacher_name == course.teacher_name:
                return teacher
        return None

    def generate_combinations(self) -> Iterator[ScheduleCombination]:
        """生成所有可能的排课组合。"""
        self._trace("组合枚举", "开始", f"共{len(self.input_data.courses)}门课程待排")

        for course in self.input_data.courses:
            self._trace("组合枚举", "处理课程", f"开始处理 {course}")

            teacher = self._match_teacher(course)
            if not teacher:
                self._trace("组合枚举", "跳过", f"未找到教师: {course.teacher_name}")
                continue

            time_slots = self._generate_time_slots(course, teacher)
            if not time_slots:
                self._trace("组合枚举", "跳过", f"无可用时间槽: {course.course_name}")
                continue

            self._trace(
                "组合枚举",
                "生成时间槽",
                f"课程 {course.course_name} 生成 {len(time_slots)} 个时间槽"
            )

            for classroom, time_slot in product(self.input_data.classrooms, time_slots):
                self._iteration_counter += 1
                comb_id = f"COMB-{self._iteration_counter:04d}"

                combination = ScheduleCombination(
                    combination_id=comb_id,
                    course=course,
                    teacher=teacher,
                    classroom=classroom,
                    time_slot=time_slot,
                    iteration=self._iteration_counter,
                )

                self._trace(
                    "组合枚举",
                    "生成组合",
                    str(combination),
                    combination_ref=comb_id,
                )

                yield combination

        self._trace(
            "组合枚举",
            "完成",
            f"共生成 {self._iteration_counter} 个排课组合"
        )

    def get_trace_steps(self) -> List[TraceStep]:
        """获取所有追溯步骤。"""
        return list(self._trace_steps)
