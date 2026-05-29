"""报告生成器 - 生成三种格式的输出：终端摘要、人读报告、机器可读JSON"""

import json
from typing import Dict, List, Optional
from collections import defaultdict
from pathlib import Path
from .models import (
    ScheduleSolution, ScheduledClass, ConflictType,
    Course, Classroom, Teacher
)
from .solver import ScheduleSolver
from .scoring import ScoreInterpreter, ConflictExplainer
from .loader import DataLoader


class Reporter:
    """报告生成器"""

    def __init__(self,
                 solution: ScheduleSolution,
                 solver: ScheduleSolver,
                 loader: DataLoader,
                 score: float,
                 score_breakdown: Dict):
        self.solution = solution
        self.solver = solver
        self.loader = loader
        self.score = score
        self.score_breakdown = score_breakdown
        self.explainer = ConflictExplainer(solver)

    def generate_terminal_summary(self) -> str:
        """生成终端摘要 - 简洁明了，适合快速查看"""
        lines = []

        lines.append("=" * 80)
        lines.append("  排课冲突最小化 - 执行摘要")
        lines.append("=" * 80)

        lines.append("")
        lines.append(f"📊 综合评分: {self.score:.2f}/100")
        lines.append("")

        lines.append("📈 基本统计:")
        lines.append(f"  总课程数: {len(self.solution.scheduled_classes) + len(self.solution.unscheduled_courses)}")
        lines.append(f"  已排定: {self.solution.scheduled_count} ({self.score_breakdown.get('已排课率', 0):.1f}%)")
        lines.append(f"  未排定: {self.solution.unscheduled_count}")
        lines.append(f"  冲突总数: {self.solution.total_conflicts}")
        lines.append("")

        if self.solution.total_conflicts > 0:
            lines.append("⚠️  冲突类型统计:")
            conflict_stats = defaultdict(int)
            for c in self.solution.conflicts:
                conflict_stats[c.conflict_type.value] += 1
            for ctype, count in sorted(conflict_stats.items(), key=lambda x: -x[1]):
                severity = "🔴" if count >= 3 else "🟡" if count >= 1 else "🟢"
                lines.append(f"  {severity} {ctype}: {count} 处")
            lines.append("")

        if self.solution.unscheduled_courses:
            lines.append("❌ 未排定课程 (前5项):")
            for i, course in enumerate(self.solution.unscheduled_courses[:5]):
                lines.append(f"  {i+1}. {course.raw_name}")
                reasons = self.solver.get_detailed_reason_for_unscheduled(course)
                if reasons:
                    lines.append(f"     原因: {reasons[0]}")
            if len(self.solution.unscheduled_courses) > 5:
                lines.append(f"  ... 还有 {len(self.solution.unscheduled_courses) - 5} 门课程未排定")
            lines.append("")

        lines.append("📋 评分明细:")
        for key in ["已排课率", "无硬冲突评分", "软约束满足率", "资源利用率", "教师满意度"]:
            if key in self.score_breakdown:
                value = self.score_breakdown[key]
                bar = "█" * int(value / 5) + "░" * (20 - int(value / 5))
                lines.append(f"  {bar} {key}: {value:.1f}")
        lines.append(f"  {'─' * 20}")
        lines.append(f"  综合评分: {self.score:.2f}/100")
        lines.append("")

        lines.append("📌 快速操作:")
        lines.append("  查看完整报告: --format report --output report.md")
        lines.append("  查看机器可读结果: --format json --output result.json")
        lines.append("  追溯排课过程: --trace")
        lines.append("  查看某门课详情: --explain <课程名称>")
        lines.append("")

        lines.append("=" * 80)
        lines.append("  数据来源 (保留原始名称):")
        for source_type, files in self.loader.source_info.items():
            lines.append(f"  {source_type}: {', '.join(files)}")
        lines.append("=" * 80)

        return "\n".join(lines)

    def generate_human_readable_report(self) -> str:
        """生成人读报告 - Markdown格式，详细完整，便于打印和分享"""
        lines = []

        lines.append("# 排课冲突最小化 - 完整报告")
        lines.append("")
        lines.append(f"> 生成时间: {self._get_current_time()}")
        lines.append(f"> 综合评分: **{self.score:.2f}/100**")
        lines.append("")

        lines.append("## 📊 评分详情")
        lines.append("")
        lines.append("| 评分项 | 分数 | 权重 | 说明 |")
        lines.append("|--------|------|------|------|")
        weights = self.score_breakdown.get("权重说明", {})
        for key, weight_desc in weights.items():
            score_key = key.split(" ")[0]
            value = self.score_breakdown.get(score_key, 0)
            weight = weight_desc.split("%")[0].split("(")[-1]
            lines.append(f"| {score_key} | {value:.1f} | {weight}% | {weight_desc.split(': ')[-1]} |")
        lines.append(f"| **综合评分** | **{self.score:.2f}** | **100%** | **加权总分** |")
        lines.append("")

        lines.append("### 评分与原始数据的关系说明")
        lines.append("")
        lines.append("- **已排课率** 直接反映课程清单的覆盖程度，未排定的课程会降低此项分数")
        lines.append("- **无硬冲突评分** 根据教师时间、教室容量等硬约束违反情况计算惩罚")
        lines.append("- **软约束满足率** 基于教师偏好时间和课程偏好教室的满足程度")
        lines.append("- **资源利用率** 评估教室容量使用效率（理想状态：60%-90%）")
        lines.append("- **教师满意度** 基于教师日程分布均匀度（理想状态：每天不超过2节课）")
        lines.append("")

        lines.append("## 📈 执行统计")
        lines.append("")
        lines.append("| 指标 | 数值 |")
        lines.append("|------|------|")
        total = len(self.solution.scheduled_classes) + len(self.solution.unscheduled_courses)
        lines.append(f"| 总课程数 | {total} |")
        lines.append(f"| 已排定课程 | {self.solution.scheduled_count} ({self.score_breakdown.get('已排课率', 0):.1f}%) |")
        lines.append(f"| 未排定课程 | {self.solution.unscheduled_count} |")
        lines.append(f"| 冲突总数 | {self.solution.total_conflicts} |")
        lines.append(f"| 教师总数 | {len(self.solver.teachers)} |")
        lines.append(f"| 教室总数 | {len(self.solver.classrooms)} |")
        lines.append(f"| 时间段总数 | {len(self.solver.timeslots)} |")
        lines.append("")

        if self.solution.conflicts:
            lines.append("## ⚠️  冲突详情")
            lines.append("")

            conflict_explanation = self.explainer.explain_all_conflicts(self.solution)
            for ctype, conflicts in conflict_explanation["详细冲突"].items():
                count = len(conflicts)
                lines.append(f"### {ctype} ({count} 处)")
                lines.append("")
                for i, conflict in enumerate(conflicts, 1):
                    lines.append(f"#### 冲突 #{i}: {conflict['描述']}")
                    lines.append("")
                    lines.append(f"- **严重程度**: {conflict['严重程度']}")
                    lines.append(f"- **涉及课程**: {', '.join([c['课程名称'] for c in conflict['涉及课程']])}")
                    if conflict.get("涉及教师"):
                        lines.append(f"- **涉及教师**: {', '.join(conflict['涉及教师'])}")
                    if "影响分析" in conflict:
                        impact = conflict["影响分析"]
                        lines.append(f"- **与课程清单的关系**: {impact.get('与课程清单的关系', 'N/A')}")
                        lines.append(f"- **与教师时间的关系**: {impact.get('与教师时间的关系', 'N/A')}")
                    if "建议解决方案" in conflict:
                        lines.append("- **建议解决方案**:")
                        for suggestion in conflict["建议解决方案"]:
                            lines.append(f"  - {suggestion}")
                    lines.append("")

        if self.solution.unscheduled_courses:
            lines.append("## ❌ 未排定课程分析")
            lines.append("")
            for course in self.solution.unscheduled_courses:
                explanation = self.explainer.explain_unscheduled_course(course)
                lines.append(f"### {explanation['课程']}")
                lines.append("")
                lines.append("| 属性 | 值 |")
                lines.append("|------|-----|")
                lines.append(f"| 课程ID | {explanation.get('课程ID', 'N/A')} |")
                lines.append(f"| 学生人数 | {explanation.get('学生人数', 'N/A')} |")
                lines.append(f"| 授课教师 | {', '.join(explanation.get('授课教师', []))} |")
                lines.append(f"| 需要连堂 | {explanation.get('需要连堂', 'N/A')} |")
                lines.append(f"| 是否实验课 | {explanation.get('是否实验课', 'N/A')} |")
                lines.append(f"| 考虑的备选方案数 | {explanation.get('考虑的备选方案数', 0)} |")
                lines.append("")
                lines.append("**失败原因**:")
                for reason in explanation.get("失败原因摘要", []):
                    lines.append(f"- {reason}")
                lines.append("")
                if "按冲突类型分析" in explanation:
                    lines.append("**按冲突类型分析**:")
                    for ctype, details in explanation["按冲突类型分析"].items():
                        lines.append(f"- **{ctype}**:")
                        for detail in details[:3]:
                            lines.append(f"  - {detail['描述']}")
                lines.append("")

        lines.append("## 📅 已排定课程表")
        lines.append("")
        lines.append("| 课程名称 | 教师 | 教室 | 时间 | 星期 | 节次 | 学生数 | 教室容量 |")
        lines.append("|----------|------|------|------|------|------|--------|----------|")
        for sc in self.solution.scheduled_classes:
            teachers = ", ".join([t.raw_name for t in sc.teachers])
            lines.append(
                f"| {sc.course.raw_name} | {teachers} | "
                f"{sc.classroom.raw_name} | {sc.slot.raw_name} | "
                f"{sc.slot.weekday.value} | {sc.slot.start_period}-{sc.slot.end_period} | "
                f"{sc.course.student_count} | {sc.classroom.capacity} |"
            )
        lines.append("")

        lines.append("## 🔍 数据来源追溯")
        lines.append("")
        lines.append("所有数据均保留原始名称，便于与原始材料核对：")
        lines.append("")
        for source_type, files in self.loader.source_info.items():
            lines.append(f"- **{source_type}**: {', '.join(files)}")
        lines.append("")

        lines.append("### 数据字段映射说明")
        lines.append("")
        lines.append("为了支持不同格式的输入文件，系统会自动识别以下字段名：")
        lines.append("")
        lines.append("| 数据类型 | 支持的字段名 |")
        lines.append("|----------|--------------|")
        lines.append("| 课程名称 | 名称, name |")
        lines.append("| 课程ID | 课程号, course_id, id |")
        lines.append("| 教师姓名 | 姓名, name |")
        lines.append("| 教师工号 | 工号, teacher_id, id |")
        lines.append("| 教室名称 | 名称, name |")
        lines.append("| 教室容量 | 容量, capacity |")
        lines.append("| 星期 | 周一, 周二, ..., 周一, Tuesday, ... |")
        lines.append("| 节次 | 1-2, 第1-2节, 1,2 等格式 |")
        lines.append("")

        return "\n".join(lines)

    def generate_machine_readable_json(self,
                                       include_trace: bool = False,
                                       explain_course: Optional[str] = None) -> Dict:
        """生成机器可读JSON - 结构化完整，便于程序处理"""
        result = {
            "schema_version": "1.0",
            "generation_time": self._get_current_time(),
            "score": {
                "total": round(self.score, 2),
                "breakdown": {
                    k: v for k, v in self.score_breakdown.items()
                    if k != "权重说明"
                },
                "weight_explanation": self.score_breakdown.get("权重说明", {})
            },
            "statistics": {
                "total_courses": len(self.solution.scheduled_classes) + len(self.solution.unscheduled_courses),
                "scheduled_count": self.solution.scheduled_count,
                "unscheduled_count": self.solution.unscheduled_count,
                "total_conflicts": self.solution.total_conflicts,
                "teachers_count": len(self.solver.teachers),
                "classrooms_count": len(self.solver.classrooms),
                "timeslots_count": len(self.solver.timeslots)
            },
            "data_sources": self.loader.source_info,
            "conflict_summary": self._get_conflict_summary(),
            "scheduled_classes": self._get_scheduled_classes_json(),
            "unscheduled_courses": self._get_unscheduled_courses_json(),
            "conflicts": self._get_conflicts_json(),
            "score_relation_explanation": self._get_score_relation_explanation()
        }

        if include_trace:
            result["scheduling_trace"] = self.explainer.get_scheduling_trace()

        if explain_course:
            course = next(
                (c for c in self.solution.unscheduled_courses if c.raw_name == explain_course),
                None
            )
            if course:
                result["course_explanation"] = self.explainer.explain_unscheduled_course(course)
            else:
                scheduled = next(
                    (sc for sc in self.solution.scheduled_classes if sc.course.raw_name == explain_course),
                    None
                )
                if scheduled:
                    result["course_explanation"] = self._explain_scheduled_course(scheduled)

        return result

    def _get_conflict_summary(self) -> Dict:
        """获取冲突摘要"""
        summary = defaultdict(int)
        for c in self.solution.conflicts:
            summary[c.conflict_type.value] += 1
        return dict(summary)

    def _get_scheduled_classes_json(self) -> List[Dict]:
        """获取已排定课程的JSON表示"""
        result = []
        for sc in self.solution.scheduled_classes:
            result.append({
                "course": {
                    "raw_name": sc.course.raw_name,
                    "course_id": sc.course.course_id,
                    "student_count": sc.course.student_count,
                    "is_experimental": sc.course.is_experimental,
                    "department": sc.course.department
                },
                "teachers": [
                    {"raw_name": t.raw_name, "teacher_id": t.teacher_id}
                    for t in sc.teachers
                ],
                "classroom": {
                    "raw_name": sc.classroom.raw_name,
                    "capacity": sc.classroom.capacity,
                    "classroom_type": sc.classroom.classroom_type
                },
                "timeslot": {
                    "raw_name": sc.slot.raw_name,
                    "weekday": sc.slot.weekday.value,
                    "start_period": sc.slot.start_period,
                    "end_period": sc.slot.end_period,
                    "start_time": sc.slot.start_time,
                    "end_time": sc.slot.end_time
                }
            })
        return result

    def _get_unscheduled_courses_json(self) -> List[Dict]:
        """获取未排定课程的JSON表示"""
        result = []
        for course in self.solution.unscheduled_courses:
            explanation = self.explainer.explain_unscheduled_course(course)
            result.append(explanation)
        return result

    def _get_conflicts_json(self) -> List[Dict]:
        """获取冲突的JSON表示"""
        result = []
        for conflict in self.solution.conflicts:
            result.append(self.explainer.explain_conflict(conflict))
        return result

    def _get_score_relation_explanation(self) -> Dict:
        """解释分数与原始数据的关系"""
        return {
            "scheduled_rate_vs_course_list": (
                "已排课率 = 已排定课程数 / 课程清单总数。"
                "该分数直接反映对原始课程清单的覆盖程度。"
                f"当前课程清单共 {len(self.solution.scheduled_classes) + len(self.solution.unscheduled_courses)} 门课，"
                f"已排定 {self.solution.scheduled_count} 门。"
            ),
            "hard_conflict_vs_constraints": (
                "无硬冲突评分基于硬约束违反情况计算惩罚。"
                "教师重叠扣100分/次，容量不足扣90分/次，连堂拆分扣70分/次。"
                "这些约束来自教师不可用时间、教室容量和实验课要求等原始数据。"
            ),
            "soft_constraint_vs_preferences": (
                "软约束满足率基于教师偏好时间、课程偏好教室等偏好设置。"
                "这些偏好数据在原始输入文件中以'偏好时间'、'偏好教室'等字段提供。"
            ),
            "utilization_vs_classroom_capacity": (
                "资源利用率评估教室容量使用效率。"
                "理想状态是学生人数占教室容量的60%-90%，既不浪费也不拥挤。"
                "该指标与原始数据中的'学生人数'和'教室容量'直接相关。"
            ),
            "teacher_satisfaction_vs_schedule": (
                "教师满意度基于教师日程分布均匀度计算。"
                "理想状态是每位教师每天不超过2节课，避免过度集中。"
                "该指标反映对教师时间安排的合理性。"
            )
        }

    def _explain_scheduled_course(self, scheduled: ScheduledClass) -> Dict:
        """解释一门已排定的课程"""
        steps = [s for s in self.solver.scheduling_steps
                 if s.course == scheduled.course and s.action == "排课成功"]
        step = steps[0] if steps else None

        return {
            "课程": scheduled.course.raw_name,
            "课程ID": scheduled.course.course_id,
            "排课状态": "排课成功",
            "分配的教室": scheduled.classroom.raw_name,
            "分配的时间": scheduled.slot.raw_name,
            "软约束评分": step.reason if step else "N/A",
            "考虑的备选方案数": step.alternatives_considered if step else 0,
            "容量使用率": f"{scheduled.course.student_count / scheduled.classroom.capacity * 100:.1f}%"
            if scheduled.classroom.capacity > 0 else "N/A"
        }

    def _get_current_time(self) -> str:
        """获取当前时间字符串"""
        from datetime import datetime
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def save_report(self, output_path: str, format_type: str = "terminal",
                    include_trace: bool = False,
                    explain_course: Optional[str] = None) -> None:
        """保存报告到文件"""
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        if format_type == "json":
            data = self.generate_machine_readable_json(include_trace, explain_course)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        else:
            content = self.generate_human_readable_report()
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
