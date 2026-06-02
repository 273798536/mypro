"""约束过滤层。

按优先级执行校验：
1. 重复计数拦截（最高优先级，直接拦住）
2. 容量校验
3. 教师时间冲突
4. 教室占用冲突

所有校验过程均记录追溯信息。
"""

from __future__ import annotations

import time
import uuid
from collections import defaultdict
from typing import List, Dict, Tuple, Optional

from .models import (
    ScheduleCombination,
    ValidationResult,
    ValidationStatus,
    ConflictType,
    TraceStep,
    ScheduleReport,
)
from .conflict_interpreter import ConflictInterpreter


class ConstraintFilter:
    """约束过滤器。"""

    def __init__(self, trace_steps: Optional[List[TraceStep]] = None):
        self._seen_duplicate_keys: Dict[Tuple, List[ScheduleCombination]] = defaultdict(list)
        self._teacher_schedule: Dict[str, List[ScheduleCombination]] = defaultdict(list)
        self._classroom_schedule: Dict[str, List[ScheduleCombination]] = defaultdict(list)
        self._trace_steps: List[TraceStep] = trace_steps or []
        self._current_trace: List[TraceStep] = []
        self._interpreter = ConflictInterpreter()
        self._combination_iteration: Dict[str, int] = {}

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
        self._current_trace.append(step)
        self._trace_steps.append(step)

    def _check_duplicate(self, combination: ScheduleCombination) -> Optional[ValidationResult]:
        """检查重复计数。这是最高优先级的检查，必须拦住。"""
        dup_key = combination.get_duplicate_key()
        existing = self._seen_duplicate_keys.get(dup_key, [])

        if existing:
            self._seen_duplicate_keys[dup_key].append(combination)

            result = ValidationResult(
                status=ValidationStatus.BLOCKED,
                conflict_type=ConflictType.DUPLICATE,
                message=(
                    f"重复计数拦截: {combination.course.course_name} "
                    f"与已有组合在同一时间 [{combination.time_slot}] "
                    f"使用 {combination.classroom.room_name} 重复"
                ),
                suggestion=self._interpreter.get_suggestion(
                    ConflictType.DUPLICATE, combination, existing
                ),
                conflicting_combinations=existing + [combination],
                trace_path=list(self._current_trace),
                duplicate_key=dup_key,
            )

            self._trace(
                "约束过滤",
                "重复拦截",
                f"组合 {combination.combination_id} 因重复被拦住: "
                f"course={combination.course.course_id}, "
                f"teacher={combination.teacher.teacher_name}, "
                f"room={combination.classroom.room_id}, "
                f"slot={combination.time_slot}",
                combination_ref=combination.combination_id,
            )

            return result

        self._seen_duplicate_keys[dup_key].append(combination)
        return None

    def _check_capacity(self, combination: ScheduleCombination) -> Optional[ValidationResult]:
        """检查教室容量。"""
        course = combination.course
        classroom = combination.classroom

        if not classroom.can_accommodate(course.student_count):
            result = ValidationResult(
                status=ValidationStatus.FAIL,
                conflict_type=ConflictType.CAPACITY_EXCEEDED,
                message=(
                    f"容量超限: {classroom.room_name}({classroom.capacity}人) "
                    f"无法容纳 {course.course_name}({course.student_count}人)"
                ),
                suggestion=self._interpreter.get_suggestion(
                    ConflictType.CAPACITY_EXCEEDED, combination
                ),
                conflicting_combinations=[combination],
                trace_path=list(self._current_trace),
            )

            self._trace(
                "约束过滤",
                "容量告警",
                f"组合 {combination.combination_id} 容量不足: "
                f"需要{course.student_count}人, 教室容量{classroom.capacity}人",
                combination_ref=combination.combination_id,
            )

            return result
        return None

    def _check_teacher_conflict(self, combination: ScheduleCombination) -> Optional[ValidationResult]:
        """检查教师时间冲突。"""
        teacher_name = combination.teacher.teacher_name
        existing_slots = self._teacher_schedule.get(teacher_name, [])

        for existing in existing_slots:
            if combination.time_slot.overlaps_with(existing.time_slot):
                result = ValidationResult(
                    status=ValidationStatus.FAIL,
                    conflict_type=ConflictType.TIME_CONFLICT,
                    message=(
                        f"教师时间冲突: {teacher_name} 在 [{combination.time_slot}] "
                        f"已排课 {existing.course.course_name} @ {existing.classroom.room_name}"
                    ),
                    suggestion=self._interpreter.get_suggestion(
                        ConflictType.TIME_CONFLICT, combination, [existing]
                    ),
                    conflicting_combinations=[existing, combination],
                    trace_path=list(self._current_trace),
                )

                self._trace(
                    "约束过滤",
                    "时间冲突",
                    f"组合 {combination.combination_id} 教师 {teacher_name} 时间冲突: "
                    f"与 {existing.combination_id} 在 {combination.time_slot} 重叠",
                    combination_ref=combination.combination_id,
                )

                return result
        return None

    def _check_classroom_conflict(self, combination: ScheduleCombination) -> Optional[ValidationResult]:
        """检查教室占用冲突。"""
        room_id = combination.classroom.room_id
        existing_slots = self._classroom_schedule.get(room_id, [])

        for existing in existing_slots:
            if combination.time_slot.overlaps_with(existing.time_slot):
                result = ValidationResult(
                    status=ValidationStatus.WARNING,
                    conflict_type=ConflictType.CLASSROOM_UNAVAILABLE,
                    message=(
                        f"教室被占: {combination.classroom.room_name} 在 [{combination.time_slot}] "
                        f"已排课 {existing.course.course_name} by {existing.teacher.teacher_name}"
                    ),
                    suggestion=self._interpreter.get_suggestion(
                        ConflictType.CLASSROOM_UNAVAILABLE, combination, [existing]
                    ),
                    conflicting_combinations=[existing, combination],
                    trace_path=list(self._current_trace),
                )

                self._trace(
                    "约束过滤",
                    "教室冲突",
                    f"组合 {combination.combination_id} 教室 {room_id} 被占用: "
                    f"与 {existing.combination_id} 在 {combination.time_slot} 重叠",
                    combination_ref=combination.combination_id,
                )

                return result
        return None

    def _commit_combination(self, combination: ScheduleCombination) -> None:
        """将通过校验的组合提交到调度表。"""
        self._teacher_schedule[combination.teacher.teacher_name].append(combination)
        self._classroom_schedule[combination.classroom.room_id].append(combination)

        self._trace(
            "约束过滤",
            "通过",
            f"组合 {combination.combination_id} 通过所有校验，已加入排课表",
            combination_ref=combination.combination_id,
        )

    def validate(self, combination: ScheduleCombination) -> ValidationResult:
        """按优先级执行所有校验。"""
        self._current_trace = []

        self._trace(
            "约束过滤",
            "开始校验",
            f"开始校验组合 {combination.combination_id}: {combination}",
            combination_ref=combination.combination_id,
        )

        check_order = [
            ("重复计数", self._check_duplicate),
            ("容量校验", self._check_capacity),
            ("教师冲突", self._check_teacher_conflict),
            ("教室冲突", self._check_classroom_conflict),
        ]

        for check_name, check_func in check_order:
            self._trace(
                "约束过滤",
                f"执行{check_name}",
                f"执行{check_name}检查",
                combination_ref=combination.combination_id,
            )

            result = check_func(combination)
            if result:
                return result

        self._commit_combination(combination)

        return ValidationResult(
            status=ValidationStatus.PASS,
            message=f"组合 {combination.combination_id} 通过所有校验",
            trace_path=list(self._current_trace),
        )

    def validate_all(self, combinations: List[ScheduleCombination]) -> ScheduleReport:
        """批量校验所有组合。"""
        self._trace(
            "约束过滤",
            "批量校验开始",
            f"开始批量校验 {len(combinations)} 个组合"
        )

        results: List[ValidationResult] = []
        valid_schedules: List[ScheduleCombination] = []
        blocked = 0
        failed = 0
        warned = 0
        passed = 0

        for combo in combinations:
            result = self.validate(combo)
            results.append(result)

            if result.status == ValidationStatus.PASS:
                valid_schedules.append(combo)
                passed += 1
            elif result.status == ValidationStatus.BLOCKED:
                blocked += 1
            elif result.status == ValidationStatus.FAIL:
                failed += 1
            elif result.status == ValidationStatus.WARNING:
                warned += 1

        self._trace(
            "约束过滤",
            "批量校验完成",
            f"批量校验完成: 通过{passed}, 拦截{blocked}, 失败{failed}, 警告{warned}"
        )

        return ScheduleReport(
            total_courses=len(set(c.course.course_id for c in combinations)),
            total_combinations_generated=len(combinations),
            valid_combinations=passed,
            blocked_count=blocked,
            failed_count=failed,
            warning_count=warned,
            results=results,
            valid_schedules=valid_schedules,
        )

    def get_trace_for_combination(self, combination_id: str) -> List[TraceStep]:
        """获取指定组合的完整追溯路径。"""
        return [
            step for step in self._trace_steps
            if step.combination_ref == combination_id
        ]

    def get_duplicate_groups(self) -> Dict[Tuple, List[ScheduleCombination]]:
        """获取所有重复计数的组合组。"""
        return {
            key: combos for key, combos in self._seen_duplicate_keys.items()
            if len(combos) > 1
        }

    def get_all_trace_steps(self) -> List[TraceStep]:
        """获取所有追溯步骤。"""
        return list(self._trace_steps)
