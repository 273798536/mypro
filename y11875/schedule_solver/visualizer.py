"""可视化工具 - 生成ASCII图表，解释与原始数据的关系"""

from typing import Dict, List, Tuple
from collections import defaultdict
from .models import ScheduleSolution, ScheduledClass, ConflictType
from .scoring import ScoreInterpreter


class AsciiChart:
    """ASCII图表生成器"""

    @staticmethod
    def bar_chart(data: Dict[str, float], title: str,
                  max_width: int = 60, show_values: bool = True) -> str:
        """生成柱状图"""
        lines = [f"\n📊 {title}"]
        lines.append("─" * max_width)

        if not data:
            lines.append("  无数据")
            return "\n".join(lines)

        max_value = max(data.values()) if data else 1
        if max_value == 0:
            max_value = 1

        for label, value in data.items():
            bar_length = int((value / max_value) * (max_width - 20))
            bar = "█" * bar_length
            value_str = f"{value:.1f}" if show_values else ""
            lines.append(f"  {label:<12} | {bar:<{max_width - 20}} | {value_str}")

        lines.append("─" * max_width)
        return "\n".join(lines)

    @staticmethod
    def pie_chart(data: Dict[str, int], title: str) -> str:
        """生成饼图（用百分比表示）"""
        lines = [f"\n🥧 {title}"]
        lines.append("─" * 60)

        total = sum(data.values()) if data else 0
        if total == 0:
            lines.append("  无数据")
            return "\n".join(lines)

        symbols = ["█", "▓", "▒", "░", "■", "□", "◆", "◇"]
        for i, (label, value) in enumerate(data.items()):
            percent = (value / total) * 100
            symbol = symbols[i % len(symbols)]
            bar_length = int(percent / 2)
            bar = symbol * bar_length
            lines.append(f"  {symbol} {label:<15} | {bar} {percent:.1f}% ({value})")

        lines.append("─" * 60)
        return "\n".join(lines)

    @staticmethod
    def heatmap(data: Dict[Tuple[str, str], int], title: str,
                row_labels: List[str], col_labels: List[str]) -> str:
        """生成热力图"""
        lines = [f"\n🔥 {title}"]
        lines.append("─" * (len(col_labels) * 6 + 15))

        header = " " * 12 + "".join(f"{col:>5}" for col in col_labels)
        lines.append(header)

        for row in row_labels:
            row_str = f"{row:<10} |"
            for col in col_labels:
                value = data.get((row, col), 0)
                if value == 0:
                    cell = "   . "
                elif value <= 1:
                    cell = "   ░ "
                elif value <= 2:
                    cell = "   ▒ "
                elif value <= 3:
                    cell = "   ▓ "
                else:
                    cell = "   █ "
                row_str += cell
            lines.append(row_str)

        lines.append("─" * (len(col_labels) * 6 + 15))
        lines.append("  图例: . 无课  ░ 1节  ▒ 2节  ▓ 3节  █ 4节以上")
        return "\n".join(lines)


class ScheduleVisualizer:
    """排课结果可视化器"""

    def __init__(self, solution: ScheduleSolution, score_breakdown: Dict):
        self.solution = solution
        self.score_breakdown = score_breakdown
        self.chart = AsciiChart()

    def generate_all_charts(self) -> str:
        """生成所有图表"""
        output = []

        output.append(self.score_breakdown_chart())
        output.append(self.conflict_type_chart())
        output.append(self.teacher_schedule_chart())
        output.append(self.classroom_utilization_chart())
        output.append(self.weekly_schedule_heatmap())
        output.append(self.score_relation_explanation())

        return "\n".join(output)

    def score_breakdown_chart(self) -> str:
        """生成分项评分柱状图"""
        data = {}
        for key in ["已排课率", "无硬冲突评分", "软约束满足率", "资源利用率", "教师满意度"]:
            if key in self.score_breakdown:
                data[key] = self.score_breakdown[key]

        output = self.chart.bar_chart(data, "评分明细 (满分100)")

        output += "\n\n📖 图表解读:"
        output += "\n  - 已排课率: 反映原始课程清单的覆盖程度"
        output += f"\n    共 {len(self.solution.scheduled_classes) + len(self.solution.unscheduled_courses)} 门课"
        output += f"，已排定 {self.solution.scheduled_count} 门"
        output += "\n  - 无硬冲突评分: 硬约束（教师重叠、容量不足等）违反的惩罚"
        output += f"\n    当前有 {self.solution.total_conflicts} 个冲突"
        output += "\n  - 软约束满足率: 教师/课程偏好的满足程度"
        output += "\n  - 资源利用率: 教室容量使用效率（理想60%-90%）"
        output += "\n  - 教师满意度: 教师日程分布均匀度（理想每天≤2节）"

        return output

    def conflict_type_chart(self) -> str:
        """生成冲突类型分布图"""
        conflict_counts = defaultdict(int)
        for c in self.solution.conflicts:
            conflict_counts[c.conflict_type.value] += 1

        if not conflict_counts:
            return "\n✅ 无冲突检测到！"

        data = dict(sorted(conflict_counts.items(), key=lambda x: -x[1]))
        output = self.chart.pie_chart(data, "冲突类型分布")

        output += "\n\n📖 图表解读:"
        output += "\n  - 教师时间冲突: 同一教师在同一时间段有多门课"
        output += "\n  - 教室容量不足: 学生人数超过教室容量"
        output += "\n  - 连堂被拆分: 实验课或需要连堂的课程无法安排连续时间"
        output += "\n  - 教室使用冲突: 同一教室在同一时间段被多门课占用"
        output += "\n  - 实验设备不匹配: 实验室缺少所需设备"

        return output

    def teacher_schedule_chart(self) -> str:
        """生成教师课程分布柱状图"""
        teacher_courses = defaultdict(int)
        for sc in self.solution.scheduled_classes:
            for teacher in sc.teachers:
                teacher_courses[teacher.raw_name] += 1

        if not teacher_courses:
            return ""

        top_teachers = dict(sorted(teacher_courses.items(),
                                   key=lambda x: -x[1])[:10])

        output = self.chart.bar_chart(top_teachers, "教师课程数分布 (前10位)")

        avg = sum(teacher_courses.values()) / len(teacher_courses) if teacher_courses else 0
        output += f"\n\n📖 图表解读:"
        output += f"\n  - 平均每位教师承担 {avg:.1f} 门课"
        output += "\n  - 理想状态: 每位教师每天不超过2节课"
        output += "\n  - 课程过于集中可能影响教学质量和教师满意度"
        output += "\n  - 该数据直接来自原始教师清单和课程清单"

        return output

    def classroom_utilization_chart(self) -> str:
        """生成教室利用率柱状图"""
        room_data = {}
        for sc in self.solution.scheduled_classes:
            room = sc.classroom
            if room.raw_name not in room_data:
                room_data[room.raw_name] = {
                    "courses": 0,
                    "total_students": 0,
                    "total_capacity": 0
                }
            room_data[room.raw_name]["courses"] += 1
            room_data[room.raw_name]["total_students"] += sc.course.student_count
            room_data[room.raw_name]["total_capacity"] += room.capacity

        if not room_data:
            return ""

        utilization = {}
        for room, data in room_data.items():
            if data["total_capacity"] > 0:
                utilization[room] = (data["total_students"] / data["total_capacity"]) * 100

        top_rooms = dict(sorted(utilization.items(),
                                key=lambda x: -x[1])[:10])

        output = self.chart.bar_chart(top_rooms, "教室容量利用率 (%) (前10位)")

        avg_util = sum(utilization.values()) / len(utilization) if utilization else 0
        output += f"\n\n📖 图表解读:"
        output += f"\n  - 平均容量利用率: {avg_util:.1f}%"
        output += "\n  - 理想区间: 60%-90%（既不浪费也不拥挤）"
        output += "\n  - >90%: 教室过于拥挤，可能影响安全和体验"
        output += "\n  - <40%: 教室资源浪费，可考虑更换小教室"
        output += "\n  - 该数据来自原始教室容量和课程学生人数"

        return output

    def weekly_schedule_heatmap(self) -> str:
        """生成周课程热力图"""
        weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
        periods = ["1-2节", "3-4节", "5-6节", "7-8节", "9-10节"]

        data = {}
        for sc in self.solution.scheduled_classes:
            weekday = sc.slot.weekday.value
            period_key = self._get_period_key(sc.slot.start_period, sc.slot.end_period)
            key = (weekday, period_key)
            data[key] = data.get(key, 0) + 1

        output = self.chart.heatmap(data, "周课程分布热力图", weekdays, periods)

        output += "\n\n📖 图表解读:"
        output += "\n  - 颜色越深表示该时段课程越集中"
        output += "\n  - 过于集中的时段可能造成换教室压力"
        output += "\n  - 空白时段可考虑安排后续新增课程"
        output += "\n  - 该图反映原始时间段和课程的匹配结果"

        return output

    def _get_period_key(self, start: int, end: int) -> str:
        """获取时间段的key"""
        if start <= 2 and end >= 2:
            return "1-2节"
        elif start <= 4 and end >= 3:
            return "3-4节"
        elif start <= 6 and end >= 5:
            return "5-6节"
        elif start <= 8 and end >= 7:
            return "7-8节"
        else:
            return "9-10节"

    def score_relation_explanation(self) -> str:
        """生成分数与原始数据关系的详细说明"""
        output = "\n" + "=" * 80
        output += "\n📚 评分与原始数据关系详解"
        output += "\n" + "=" * 80

        output += "\n\n## 1. 已排课率 ↔ 课程清单"
        total = len(self.solution.scheduled_classes) + len(self.solution.unscheduled_courses)
        output += f"\n   公式: 已排定课程数 ({self.solution.scheduled_count}) / 课程清单总数 ({total})"
        output += "\n   含义: 直接反映对原始课程清单的覆盖程度"
        output += "\n   影响因素: 课程数量、教室数量、时间段数量、教师可用性"

        output += "\n\n## 2. 无硬冲突评分 ↔ 约束条件"
        hard_conflicts = [c for c in self.solution.conflicts if c.conflict_type in [
            ConflictType.TEACHER_OVERLAP,
            ConflictType.CLASSROOM_OVERLAP,
            ConflictType.CAPACITY_INSUFFICIENT,
            ConflictType.TEACHER_UNAVAILABLE,
            ConflictType.CLASSROOM_UNAVAILABLE,
            ConflictType.EQUIPMENT_MISMATCH,
            ConflictType.CONSECUTIVE_BROKEN
        ]]
        output += f"\n   当前硬冲突数: {len(hard_conflicts)}"
        output += "\n   惩罚规则:"
        output += "\n     - 教师时间冲突: -100分/次"
        output += "\n     - 教室容量不足: -90分/次"
        output += "\n     - 连堂被拆分: -70分/次"
        output += "\n     - 教室使用冲突: -80分/次"
        output += "\n     - 实验设备不匹配: -60分/次"
        output += "\n   数据来源: 教师不可用时间、教室容量、实验课要求等原始数据"

        output += "\n\n## 3. 软约束满足率 ↔ 偏好设置"
        output += "\n   计算方式: 已满足的软约束 / 总软约束数"
        output += "\n   包括: 教师偏好时间、课程偏好教室"
        output += "\n   数据来源: 输入文件中的'偏好时间'、'偏好教室'字段"

        output += "\n\n## 4. 资源利用率 ↔ 教室/学生数据"
        output += "\n   理想区间: 60%-90%"
        output += "\n   计算依据: 课程学生人数 / 教室容量"
        output += "\n   数据来源: 课程清单的'学生人数'、教室清单的'容量'"

        output += "\n\n## 5. 教师满意度 ↔ 时间分布"
        output += "\n   评估标准: 教师每天课程数是否均匀"
        output += "\n   理想状态: 每位教师每天≤2节课"
        output += "\n   数据来源: 教师清单、课程分配结果"

        output += "\n\n## 综合评分计算"
        output += "\n   综合评分 = Σ(分项评分 × 权重)"
        output += "\n   权重: 已排课率40% + 无硬冲突30% + 软约束15% + 资源利用10% + 教师满意5%"

        output += "\n" + "=" * 80

        return output
