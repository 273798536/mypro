"""冲突解释器。

为每种冲突类型生成可操作的复核建议，
帮助教务老师理解问题并快速调整排课方案。
"""

from __future__ import annotations

from typing import List, Optional

from .models import (
    ConflictType,
    ScheduleCombination,
)


class ConflictInterpreter:
    """冲突解释器。"""

    def get_suggestion(
        self,
        conflict_type: ConflictType,
        combination: ScheduleCombination,
        conflicting_combos: Optional[List[ScheduleCombination]] = None,
    ) -> str:
        """根据冲突类型生成复核建议。"""
        conflicting_combos = conflicting_combos or []

        suggestion_handlers = {
            ConflictType.DUPLICATE: self._suggest_duplicate,
            ConflictType.TIME_CONFLICT: self._suggest_time_conflict,
            ConflictType.CAPACITY_EXCEEDED: self._suggest_capacity,
            ConflictType.TEACHER_UNAVAILABLE: self._suggest_teacher_unavailable,
            ConflictType.CLASSROOM_UNAVAILABLE: self._suggest_classroom_unavailable,
        }

        handler = suggestion_handlers.get(conflict_type)
        if handler:
            return handler(combination, conflicting_combos)
        return "建议复核排课数据。"

    def _suggest_duplicate(
        self,
        combination: ScheduleCombination,
        conflicting_combos: List[ScheduleCombination],
    ) -> str:
        """重复计数的复核建议。"""
        existing = conflicting_combos[0] if conflicting_combos else None

        if not existing:
            return "检测到重复排课，请核对课程清单是否重复导入。"

        return (
            f"【复核建议】重复计数拦截：\n"
            f"  1. 请确认是否为同一课程的重复导入\n"
            f"  2. 若为不同班级的同一门课，请使用不同的 course_id 区分\n"
            f"  3. 已有组合: {existing.combination_id} - {existing.course.course_name}\n"
            f"  4. 冲突组合: {combination.combination_id} - {combination.course.course_name}\n"
            f"  5. 重复键: course={combination.course.course_id}, "
            f"teacher={combination.teacher.teacher_name}, "
            f"room={combination.classroom.room_id}, "
            f"slot={combination.time_slot}"
        )

    def _suggest_time_conflict(
        self,
        combination: ScheduleCombination,
        conflicting_combos: List[ScheduleCombination],
    ) -> str:
        """时间冲突的复核建议。"""
        existing = conflicting_combos[0] if conflicting_combos else None

        if not existing:
            return "教师时间冲突，请调整课程时间或更换授课教师。"

        return (
            f"【复核建议】教师时间冲突：\n"
            f"  1. 教师 {combination.teacher.teacher_name} 在 {combination.time_slot} 已有安排\n"
            f"  2. 已有课程: {existing.course.course_name} @ {existing.classroom.room_name}\n"
            f"  3. 可选方案:\n"
            f"     a. 将 {combination.course.course_name} 调整到其他时段\n"
            f"     b. 为 {combination.course.course_name} 更换授课教师\n"
            f"     c. 与教师协商调整 {existing.course.course_name} 的时间\n"
            f"  4. 请检查教师 {combination.teacher.teacher_name} 的周课时是否已达上限"
        )

    def _suggest_capacity(
        self,
        combination: ScheduleCombination,
        conflicting_combos: List[ScheduleCombination],
    ) -> str:
        """容量超限的复核建议。"""
        course = combination.course
        classroom = combination.classroom
        overflow = course.student_count - classroom.capacity

        return (
            f"【复核建议】教室容量不足：\n"
            f"  1. {classroom.room_name} 容量 {classroom.capacity} 人，"
            f"选课人数 {course.student_count} 人，超员 {overflow} 人\n"
            f"  2. 可选方案:\n"
            f"     a. 更换容量 ≥ {course.student_count} 人的教室\n"
            f"     b. 考虑将课程拆分为多个小班授课\n"
            f"     c. 与选课学生协商调整课程选择\n"
            f"  3. 请确认选课人数统计是否准确，是否包含旁听生"
        )

    def _suggest_teacher_unavailable(
        self,
        combination: ScheduleCombination,
        conflicting_combos: List[ScheduleCombination],
    ) -> str:
        """教师无空的复核建议。"""
        return (
            f"【复核建议】教师无可用时间：\n"
            f"  1. 教师 {combination.teacher.teacher_name} 在可选时段内均有安排\n"
            f"  2. 可选方案:\n"
            f"     a. 与教师协商调整个人时间安排\n"
            f"     b. 为 {combination.course.course_name} 更换授课教师\n"
            f"     c. 调整课程的上课时间段要求\n"
            f"  3. 请检查教师的可用时间配置是否完整"
        )

    def _suggest_classroom_unavailable(
        self,
        combination: ScheduleCombination,
        conflicting_combos: List[ScheduleCombination],
    ) -> str:
        """教室被占的复核建议。"""
        existing = conflicting_combos[0] if conflicting_combos else None

        if not existing:
            return "教室已被占用，请更换教室或调整时间。"

        return (
            f"【复核建议】教室已被占用（警告）：\n"
            f"  1. {combination.classroom.room_name} 在 {combination.time_slot} "
            f"已排课: {existing.course.course_name} by {existing.teacher.teacher_name}\n"
            f"  2. 可选方案:\n"
            f"     a. 更换其他可用教室\n"
            f"     b. 将 {combination.course.course_name} 调整到其他时段\n"
            f"     c. 与 {existing.teacher.teacher_name} 老师协商调换教室\n"
            f"  3. 注: 此为警告级冲突，如确有必要可手动调整"
        )

    def generate_conflict_report(
        self,
        combination: ScheduleCombination,
        conflict_type: ConflictType,
        conflicting_combos: Optional[List[ScheduleCombination]] = None,
    ) -> str:
        """生成完整的冲突报告。"""
        conflicting_combos = conflicting_combos or []

        report_lines = [
            "=" * 60,
            "冲突详细报告",
            "=" * 60,
            f"冲突类型: {conflict_type.value}",
            f"冲突等级: {'拦截' if conflict_type == ConflictType.DUPLICATE else '失败' if conflict_type in [ConflictType.TIME_CONFLICT, ConflictType.CAPACITY_EXCEEDED] else '警告'}",
            "",
            "待排组合:",
            f"  ID: {combination.combination_id}",
            f"  课程: {combination.course.course_name} ({combination.course.course_id})",
            f"  教师: {combination.teacher.teacher_name}",
            f"  教室: {combination.classroom.room_name} (容量: {combination.classroom.capacity})",
            f"  时间: {combination.time_slot}",
            f"  选课人数: {combination.course.student_count}",
        ]

        if conflicting_combos:
            report_lines.extend([
                "",
                "冲突组合:",
            ])
            for i, combo in enumerate(conflicting_combos, 1):
                report_lines.extend([
                    f"  {i}. ID: {combo.combination_id}",
                    f"     课程: {combo.course.course_name}",
                    f"     教师: {combo.teacher.teacher_name}",
                    f"     教室: {combo.classroom.room_name}",
                    f"     时间: {combo.time_slot}",
                ])

        report_lines.extend([
            "",
            self.get_suggestion(conflict_type, combination, conflicting_combos),
            "=" * 60,
        ])

        return "\n".join(report_lines)
