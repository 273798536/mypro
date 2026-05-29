"""约束求解和冲突检测引擎 - 提供可追溯的排课过程"""

from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
from .models import (
    Course, Classroom, Teacher, TimeSlot, ScheduledClass,
    Conflict, ConflictType, ScheduleSolution
)


@dataclass
class SchedulingStep:
    """排课步骤记录 - 用于追溯排课过程"""
    course: Course
    action: str
    classroom: Optional[Classroom] = None
    slot: Optional[TimeSlot] = None
    reason: str = ""
    conflicts_found: List[Conflict] = field(default_factory=list)
    alternatives_considered: int = 0

    def to_traceable_dict(self) -> Dict:
        return {
            "课程": self.course.raw_name,
            "课程ID": self.course.course_id,
            "操作": self.action,
            "教室": self.classroom.raw_name if self.classroom else None,
            "时间": self.slot.raw_name if self.slot else None,
            "原因": self.reason,
            "发现冲突数": len(self.conflicts_found),
            "考虑的备选方案数": self.alternatives_considered
        }


class ScheduleSolver:
    """排课求解器 - 使用贪心算法，优先处理约束多的课程"""

    def __init__(self,
                 courses: List[Course],
                 classrooms: List[Classroom],
                 teachers: List[Teacher],
                 timeslots: List[TimeSlot]):
        self.courses = courses
        self.classrooms = classrooms
        self.teachers = teachers
        self.timeslots = timeslots
        self.scheduling_steps: List[SchedulingStep] = []
        self.constraint_violations: List[Dict] = []

    def _calculate_course_priority(self, course: Course) -> int:
        """计算课程优先级 - 约束越多优先级越高"""
        priority = 0
        priority += course.student_count // 10
        priority += len(course.teachers) * 5
        priority += course.duration_periods * 3
        priority += len(course.required_equipment) * 10
        if course.is_experimental:
            priority += 15
        if course.requires_consecutive:
            priority += 5
        if course.preferred_slots:
            priority += 3
        if course.preferred_classrooms:
            priority += 3
        return priority

    def _find_consecutive_slots(self, duration: int) -> List[TimeSlot]:
        """查找满足连堂要求的时间段组合"""
        valid_slots = []
        for slot in self.timeslots:
            if slot.duration >= duration:
                valid_slots.append(slot)
        return valid_slots

    def _check_hard_constraints(self,
                                course: Course,
                                classroom: Classroom,
                                slot: TimeSlot,
                                scheduled: List[ScheduledClass]) -> Tuple[bool, List[Conflict]]:
        """检查硬约束，返回是否可行和发现的冲突"""
        conflicts = []

        if not classroom.is_available(slot):
            conflicts.append(Conflict(
                conflict_type=ConflictType.CLASSROOM_UNAVAILABLE,
                classes=[],
                description=f"教室 {classroom.raw_name} 在 {slot.raw_name} 不可用",
                severity=3
            ))

        if not classroom.can_accommodate(course.student_count):
            conflicts.append(Conflict(
                conflict_type=ConflictType.CAPACITY_INSUFFICIENT,
                classes=[],
                description=f"教室 {classroom.raw_name} 容量 ({classroom.capacity}) 不足以容纳 {course.student_count} 名学生",
                severity=3
            ))

        if course.is_experimental and course.required_equipment:
            missing_equip = [e for e in course.required_equipment if e not in classroom.equipment]
            if missing_equip:
                conflicts.append(Conflict(
                    conflict_type=ConflictType.EQUIPMENT_MISMATCH,
                    classes=[],
                    description=f"教室 {classroom.raw_name} 缺少实验设备: {missing_equip}",
                    severity=2
                ))

        if course.requires_consecutive and slot.duration < course.duration_periods:
            conflicts.append(Conflict(
                conflict_type=ConflictType.CONSECUTIVE_BROKEN,
                classes=[],
                description=f"课程 {course.raw_name} 需要 {course.duration_periods} 节连堂，但 {slot.raw_name} 只有 {slot.duration} 节",
                severity=2
            ))

        for teacher in course.teachers:
            if not teacher.is_available(slot):
                conflicts.append(Conflict(
                    conflict_type=ConflictType.TEACHER_UNAVAILABLE,
                    classes=[],
                    teachers=[teacher],
                    description=f"教师 {teacher.raw_name} 在 {slot.raw_name} 不可用",
                    severity=3
                ))

        for scheduled_class in scheduled:
            new_scheduled = ScheduledClass(
                course=course,
                classroom=classroom,
                slot=slot,
                teachers=course.teachers
            )
            conflict = new_scheduled.conflicts_with(scheduled_class)
            if conflict:
                conflicts.append(conflict)

        has_hard_conflict = any(
            c.conflict_type in [
                ConflictType.TEACHER_OVERLAP,
                ConflictType.CLASSROOM_OVERLAP,
                ConflictType.CAPACITY_INSUFFICIENT,
                ConflictType.TEACHER_UNAVAILABLE,
                ConflictType.CLASSROOM_UNAVAILABLE,
                ConflictType.EQUIPMENT_MISMATCH,
                ConflictType.CONSECUTIVE_BROKEN
            ] for c in conflicts
        )

        return not has_hard_conflict, conflicts

    def _evaluate_soft_constraints(self,
                                   course: Course,
                                   classroom: Classroom,
                                   slot: TimeSlot) -> int:
        """评估软约束满足程度，分数越高越好"""
        score = 0

        if classroom in course.preferred_classrooms:
            score += 20

        if slot in course.preferred_slots:
            score += 15

        for teacher in course.teachers:
            if slot in teacher.preferred_slots:
                score += 10

        if course.is_experimental and classroom.classroom_type == "实验室":
            score += 15

        capacity_ratio = course.student_count / classroom.capacity if classroom.capacity > 0 else 1
        if 0.6 <= capacity_ratio <= 0.9:
            score += 10
        elif 0.4 <= capacity_ratio < 0.6:
            score += 5

        return score

    def _find_best_assignment(self,
                              course: Course,
                              scheduled: List[ScheduledClass]) -> Optional[Tuple[Classroom, TimeSlot, int, List[Conflict]]]:
        """为课程找到最佳的排课方案"""
        best_assignment = None
        best_score = -1
        best_conflicts = []

        valid_slots = self._find_consecutive_slots(course.duration_periods) if course.requires_consecutive else self.timeslots

        alternatives_considered = 0

        for slot in valid_slots:
            for classroom in self.classrooms:
                alternatives_considered += 1
                is_feasible, conflicts = self._check_hard_constraints(course, classroom, slot, scheduled)

                if is_feasible:
                    score = self._evaluate_soft_constraints(course, classroom, slot)
                    if score > best_score:
                        best_score = score
                        best_assignment = (classroom, slot)
                        best_conflicts = conflicts

        if best_assignment:
            return best_assignment[0], best_assignment[1], best_score, best_conflicts, alternatives_considered
        return None

    def solve(self, max_iterations: int = 100) -> ScheduleSolution:
        """执行排课求解"""
        scheduled_classes: List[ScheduledClass] = []
        unscheduled_courses: List[Course] = []
        all_conflicts: List[Conflict] = []

        sorted_courses = sorted(
            self.courses,
            key=lambda c: self._calculate_course_priority(c),
            reverse=True
        )

        for course in sorted_courses:
            result = self._find_best_assignment(course, scheduled_classes)

            if result:
                classroom, slot, score, conflicts, alternatives = result
                scheduled = ScheduledClass(
                    course=course,
                    classroom=classroom,
                    slot=slot,
                    teachers=course.teachers
                )
                scheduled_classes.append(scheduled)
                all_conflicts.extend(conflicts)

                self.scheduling_steps.append(SchedulingStep(
                    course=course,
                    action="排课成功",
                    classroom=classroom,
                    slot=slot,
                    reason=f"软约束评分 {score}，考虑了 {alternatives} 个备选方案",
                    conflicts_found=conflicts,
                    alternatives_considered=alternatives
                ))
            else:
                unscheduled_courses.append(course)
                step = SchedulingStep(
                    course=course,
                    action="排课失败",
                    reason="无法找到满足所有硬约束的时间和教室组合"
                )
                self.scheduling_steps.append(step)

                unique_conflicts = {}
                for classroom in self.classrooms:
                    for slot in self.timeslots:
                        _, conflicts = self._check_hard_constraints(course, classroom, slot, scheduled_classes)
                        for conflict in conflicts:
                            key = (conflict.conflict_type, conflict.description)
                            if key not in unique_conflicts:
                                conflict.classes.append(ScheduledClass(
                                    course=course,
                                    classroom=classroom,
                                    slot=slot,
                                    teachers=course.teachers
                                ))
                                unique_conflicts[key] = conflict

                step.conflicts_found = list(unique_conflicts.values())
                all_conflicts.extend(step.conflicts_found)
                step.reason += f"，发现 {len(step.conflicts_found)} 类约束冲突"

        for i, sc1 in enumerate(scheduled_classes):
            for sc2 in scheduled_classes[i+1:]:
                conflict = sc1.conflicts_with(sc2)
                if conflict:
                    all_conflicts.append(conflict)

        solution = ScheduleSolution(
            scheduled_classes=scheduled_classes,
            conflicts=all_conflicts,
            unscheduled_courses=unscheduled_courses
        )

        return solution

    def get_detailed_reason_for_unscheduled(self, course: Course) -> List[str]:
        """获取某门课无法排课的详细原因"""
        reasons = []
        scheduled = [sc for sc in self.scheduling_steps if sc.course == course]
        if not scheduled:
            return ["未找到排课记录"]

        step = scheduled[0]
        for conflict in step.conflicts_found:
            reasons.append(conflict.description)

        return reasons
