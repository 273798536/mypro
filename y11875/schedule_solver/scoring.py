"""方案评分和冲突解释系统 - 提供可追溯的评分依据和详细原因"""

from typing import List, Dict, Tuple
from collections import defaultdict
from .models import (
    ScheduleSolution, ScheduledClass, Conflict, ConflictType,
    Course, Classroom, Teacher, TimeSlot
)
from .solver import ScheduleSolver, SchedulingStep


class ScoreInterpreter:
    """评分解释器 - 解释每个分数的含义和依据"""

    WEIGHTS = {
        "scheduled_rate": 40,
        "no_hard_conflict": 30,
        "soft_constraint": 15,
        "resource_utilization": 10,
        "teacher_satisfaction": 5,
    }

    CONFLICT_PENALTY = {
        ConflictType.TEACHER_OVERLAP: 100,
        ConflictType.CLASSROOM_OVERLAP: 80,
        ConflictType.CAPACITY_INSUFFICIENT: 90,
        ConflictType.TEACHER_UNAVAILABLE: 85,
        ConflictType.CLASSROOM_UNAVAILABLE: 75,
        ConflictType.EQUIPMENT_MISMATCH: 60,
        ConflictType.CONSECUTIVE_BROKEN: 70,
        ConflictType.PREFERRED_VIOLATION: 10,
    }

    def calculate_score(self, solution: ScheduleSolution,
                        solver: ScheduleSolver) -> Tuple[float, Dict[str, float]]:
        """计算方案总分和各项分数明细"""
        total_courses = len(solution.scheduled_classes) + len(solution.unscheduled_courses)
        if total_courses == 0:
            return 0.0, {}

        breakdown = {}

        scheduled_rate = (len(solution.scheduled_classes) / total_courses) * 100
        breakdown["已排课率"] = round(scheduled_rate, 2)

        actual_hard_conflicts = []
        scheduled_course_names = {sc.course.raw_name for sc in solution.scheduled_classes}

        for c in solution.conflicts:
            if c.conflict_type in [
                ConflictType.TEACHER_OVERLAP,
                ConflictType.CLASSROOM_OVERLAP
            ]:
                actual_hard_conflicts.append(c)
            elif c.conflict_type in [
                ConflictType.CAPACITY_INSUFFICIENT,
                ConflictType.TEACHER_UNAVAILABLE,
                ConflictType.CLASSROOM_UNAVAILABLE,
                ConflictType.EQUIPMENT_MISMATCH,
                ConflictType.CONSECUTIVE_BROKEN
            ]:
                for cls in c.classes:
                    if cls.course.raw_name in scheduled_course_names:
                        actual_hard_conflicts.append(c)
                        break

        hard_conflict_penalty = sum(
            self.CONFLICT_PENALTY.get(c.conflict_type, 50) * c.severity
            for c in actual_hard_conflicts
        )
        no_hard_conflict_score = max(0, 100 - min(hard_conflict_penalty, 100))
        breakdown["无硬冲突评分"] = round(no_hard_conflict_score, 2)

        soft_score = self._calculate_soft_constraint_score(solution)
        breakdown["软约束满足率"] = round(soft_score, 2)

        utilization_score = self._calculate_resource_utilization(solution)
        breakdown["资源利用率"] = round(utilization_score, 2)

        teacher_satisfaction = self._calculate_teacher_satisfaction(solution)
        breakdown["教师满意度"] = round(teacher_satisfaction, 2)

        weighted_score = (
            scheduled_rate * self.WEIGHTS["scheduled_rate"] / 100 +
            no_hard_conflict_score * self.WEIGHTS["no_hard_conflict"] / 100 +
            soft_score * self.WEIGHTS["soft_constraint"] / 100 +
            utilization_score * self.WEIGHTS["resource_utilization"] / 100 +
            teacher_satisfaction * self.WEIGHTS["teacher_satisfaction"] / 100
        )

        breakdown["综合评分"] = round(weighted_score, 2)
        breakdown["权重说明"] = self._get_weight_explanation()

        return weighted_score, breakdown

    def _get_weight_explanation(self) -> Dict[str, str]:
        """获取权重说明"""
        return {
            "已排课率 (40%)": "成功排定的课程占总课程的比例，直接反映排课完成度",
            "无硬冲突评分 (30%)": "教师重叠、容量不足、连堂拆分等硬约束违反的惩罚分数",
            "软约束满足率 (15%)": "教师偏好时间、课程偏好教室等软约束的满足程度",
            "资源利用率 (10%)": "教室容量使用效率、时间段分布均匀度",
            "教师满意度 (5%)": "教师日程分布的合理性，避免过度集中"
        }

    def _calculate_soft_constraint_score(self, solution: ScheduleSolution) -> float:
        """计算软约束满足分数"""
        if not solution.scheduled_classes:
            return 0.0

        total_possible = 0
        achieved = 0

        for sc in solution.scheduled_classes:
            course = sc.course
            classroom = sc.classroom
            slot = sc.slot

            if course.preferred_classrooms:
                total_possible += 20
                if classroom in course.preferred_classrooms:
                    achieved += 20

            if course.preferred_slots:
                total_possible += 15
                if slot in course.preferred_slots:
                    achieved += 15

            for teacher in course.teachers:
                if teacher.preferred_slots:
                    total_possible += 10
                    if slot in teacher.preferred_slots:
                        achieved += 10

        if total_possible == 0:
            return 100.0
        return (achieved / total_possible) * 100

    def _calculate_resource_utilization(self, solution: ScheduleSolution) -> float:
        """计算资源利用率分数"""
        if not solution.scheduled_classes:
            return 0.0

        scores = []
        for sc in solution.scheduled_classes:
            if sc.classroom.capacity > 0:
                ratio = sc.course.student_count / sc.classroom.capacity
                if 0.6 <= ratio <= 0.9:
                    scores.append(100)
                elif 0.4 <= ratio < 0.6:
                    scores.append(70)
                elif 0.2 <= ratio < 0.4:
                    scores.append(40)
                else:
                    scores.append(10)

        if not scores:
            return 0.0
        return sum(scores) / len(scores)

    def _calculate_teacher_satisfaction(self, solution: ScheduleSolution) -> float:
        """计算教师满意度分数"""
        if not solution.scheduled_classes:
            return 0.0

        teacher_slots = defaultdict(list)
        for sc in solution.scheduled_classes:
            for teacher in sc.teachers:
                teacher_slots[teacher.raw_name].append(sc.slot)

        scores = []
        for teacher, slots in teacher_slots.items():
            weekday_counts = defaultdict(int)
            for slot in slots:
                weekday_counts[slot.weekday.value] += 1

            if weekday_counts:
                max_per_day = max(weekday_counts.values())
                total = len(slots)
                avg_per_day = total / len(weekday_counts) if weekday_counts else 0

                if max_per_day <= 2 and avg_per_day <= 1.5:
                    scores.append(100)
                elif max_per_day <= 3 and avg_per_day <= 2:
                    scores.append(70)
                elif max_per_day <= 4:
                    scores.append(40)
                else:
                    scores.append(10)

        if not scores:
            return 100.0
        return sum(scores) / len(scores)


class ConflictExplainer:
    """冲突解释器 - 提供详细的冲突原因和追溯信息"""

    def __init__(self, solver: ScheduleSolver):
        self.solver = solver

    def explain_conflict(self, conflict: Conflict) -> Dict:
        """详细解释单个冲突"""
        result = conflict.to_traceable_dict()
        result["影响分析"] = self._analyze_conflict_impact(conflict)
        result["建议解决方案"] = self._suggest_solutions(conflict)
        return result

    def explain_all_conflicts(self, solution: ScheduleSolution) -> Dict:
        """解释所有冲突，按类型分组"""
        conflict_by_type = defaultdict(list)
        for conflict in solution.conflicts:
            conflict_by_type[conflict.conflict_type.value].append(
                self.explain_conflict(conflict)
            )

        summary = {
            "冲突总数": len(solution.conflicts),
            "按类型统计": {
                ctype: len(conflicts)
                for ctype, conflicts in conflict_by_type.items()
            },
            "详细冲突": conflict_by_type
        }
        return summary

    def explain_unscheduled_course(self, course: Course) -> Dict:
        """解释某门课无法排课的原因"""
        steps = [s for s in self.solver.scheduling_steps if s.course == course]
        if not steps:
            return {
                "课程": course.raw_name,
                "原因": ["未找到排课记录"]
            }

        step = steps[0]
        reasons = []
        conflict_analysis = defaultdict(list)

        for conflict in step.conflicts_found:
            reasons.append(conflict.description)
            conflict_analysis[conflict.conflict_type.value].append(
                self._get_conflict_context(conflict)
            )

        return {
            "课程": course.raw_name,
            "课程ID": course.course_id,
            "学生人数": course.student_count,
            "授课教师": [t.raw_name for t in course.teachers],
            "需要连堂": f"{course.duration_periods}节",
            "是否实验课": "是" if course.is_experimental else "否",
            "排课状态": step.action,
            "失败原因摘要": list(dict.fromkeys(reasons)),
            "按冲突类型分析": dict(conflict_analysis),
            "考虑的备选方案数": step.alternatives_considered,
            "追溯链接": f"查看排课步骤 #{self.solver.scheduling_steps.index(step) + 1}"
        }

    def _get_conflict_context(self, conflict: Conflict) -> Dict:
        """获取冲突的上下文信息"""
        context = {
            "描述": conflict.description,
            "严重程度": "高" if conflict.severity >= 3 else "中" if conflict.severity >= 2 else "低",
        }
        if conflict.classes:
            context["涉及课程"] = [c.course.raw_name for c in conflict.classes]
        if conflict.teachers:
            context["涉及教师"] = [t.raw_name for t in conflict.teachers]
        return context

    def _analyze_conflict_impact(self, conflict: Conflict) -> Dict:
        """分析冲突的影响范围"""
        impact = {
            "影响课程数": len(conflict.classes),
            "影响教师数": len(conflict.teachers),
            "严重等级": "紧急" if conflict.severity >= 3 else "重要" if conflict.severity >= 2 else "一般",
            "是否阻碍排课": conflict.conflict_type in [
                ConflictType.TEACHER_OVERLAP,
                ConflictType.CLASSROOM_OVERLAP,
                ConflictType.CAPACITY_INSUFFICIENT,
                ConflictType.TEACHER_UNAVAILABLE,
                ConflictType.CLASSROOM_UNAVAILABLE,
            ],
            "与课程清单的关系": self._relate_to_course_list(conflict),
            "与教师时间的关系": self._relate_to_teacher_schedule(conflict),
        }
        return impact

    def _relate_to_course_list(self, conflict: Conflict) -> str:
        """解释冲突与课程清单的关系"""
        if conflict.conflict_type == ConflictType.CAPACITY_INSUFFICIENT:
            for cls in conflict.classes:
                return f"课程 '{cls.course.raw_name}' 有 {cls.course.student_count} 名学生，但分配的教室容量不足"
        elif conflict.conflict_type == ConflictType.CONSECUTIVE_BROKEN:
            for cls in conflict.classes:
                return f"课程 '{cls.course.raw_name}' 要求 {cls.course.duration_periods} 节连堂，但时间段无法满足"
        elif conflict.conflict_type == ConflictType.EQUIPMENT_MISMATCH:
            for cls in conflict.classes:
                return f"实验课 '{cls.course.raw_name}' 需要设备 {cls.course.required_equipment}，但教室不具备"
        elif conflict.conflict_type == ConflictType.TEACHER_OVERLAP:
            courses = [c.course.raw_name for c in conflict.classes]
            return f"课程 {courses} 共享同一教师，在时间上发生重叠"
        return "多门课程在资源分配上产生冲突"

    def _relate_to_teacher_schedule(self, conflict: Conflict) -> str:
        """解释冲突与教师时间的关系"""
        if not conflict.teachers:
            return "该冲突不涉及教师时间安排"

        teachers = [t.raw_name for t in conflict.teachers]
        if conflict.conflict_type == ConflictType.TEACHER_OVERLAP:
            return f"教师 {teachers} 在同一时间段被分配到多门课程"
        elif conflict.conflict_type == ConflictType.TEACHER_UNAVAILABLE:
            return f"教师 {teachers} 在该时间段标记为不可用"
        return f"涉及教师 {teachers} 的时间安排冲突"

    def _suggest_solutions(self, conflict: Conflict) -> List[str]:
        """提出解决冲突的建议"""
        suggestions = []

        if conflict.conflict_type == ConflictType.TEACHER_OVERLAP:
            suggestions.append("将其中一门课程调整到其他时间段")
            suggestions.append("为其中一门课程安排其他教师")
            suggestions.append("检查教师不可用时间设置是否正确")
        elif conflict.conflict_type == ConflictType.CLASSROOM_OVERLAP:
            suggestions.append("将其中一门课程调整到其他时间段")
            suggestions.append("为其中一门课程安排其他教室")
            suggestions.append("检查教室不可用时间设置是否正确")
        elif conflict.conflict_type == ConflictType.CAPACITY_INSUFFICIENT:
            suggestions.append("更换容量更大的教室")
            suggestions.append("如果可能，将班级拆分为多个小班")
            suggestions.append("核实学生人数统计是否准确")
        elif conflict.conflict_type == ConflictType.CONSECUTIVE_BROKEN:
            suggestions.append("查找更长的连续时间段")
            suggestions.append("考虑放宽连堂要求（如课程允许）")
            suggestions.append("调整其他课程释放连续时间段")
        elif conflict.conflict_type == ConflictType.EQUIPMENT_MISMATCH:
            suggestions.append("更换具备所需设备的实验室")
            suggestions.append("考虑为教室添置必要设备")
            suggestions.append("核实实验设备需求清单")
        elif conflict.conflict_type == ConflictType.TEACHER_UNAVAILABLE:
            suggestions.append("调整到教师可用的时间段")
            suggestions.append("安排其他可用教师")
            suggestions.append("与教师协商调整不可用时间")
        elif conflict.conflict_type == ConflictType.CLASSROOM_UNAVAILABLE:
            suggestions.append("调整到教室可用的时间段")
            suggestions.append("安排其他可用教室")
            suggestions.append("核实教室占用安排")

        suggestions.append("使用 '--trace' 参数查看完整的排课决策过程")
        return suggestions

    def get_scheduling_trace(self) -> List[Dict]:
        """获取完整的排课过程追溯"""
        return [step.to_traceable_dict() for step in self.solver.scheduling_steps]
