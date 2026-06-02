import json
from enum import Enum
from typing import List, Dict, Optional
from datetime import datetime

from models import (
    MealPlan, PlanComparison, SolverTrace,
    Constraint, ConstraintStatus, ConflictSeverity
)
from processing import CleanReport
from solver import ConflictDetector, ConflictAnalysis


class ReportFormat(Enum):
    MARKDOWN = "markdown"
    JSON = "json"
    TEXT = "text"


class MealReportGenerator:
    """
    可审计的配餐报告生成器
    包含：数据清洗过程、线性规划计算过程、约束冲突分析、修正历史
    """

    def __init__(self):
        self.conflict_detector = ConflictDetector()

    def generate_full_report(
        self,
        plan: MealPlan,
        clean_report: Optional[CleanReport] = None,
        comparison_plan: Optional[MealPlan] = None,
        format: ReportFormat = ReportFormat.MARKDOWN
    ) -> str:
        """生成完整报告"""
        if format == ReportFormat.MARKDOWN:
            return self._generate_markdown(plan, clean_report, comparison_plan)
        elif format == ReportFormat.JSON:
            return self._generate_json(plan, clean_report, comparison_plan)
        else:
            return self._generate_text(plan, clean_report, comparison_plan)

    def _generate_markdown(
        self, plan: MealPlan, clean_report: Optional[CleanReport],
        comparison_plan: Optional[MealPlan]
    ) -> str:
        lines = []

        lines.extend(self._header_section(plan))
        lines.extend(self._summary_section(plan))
        lines.extend(self._ingredients_section(plan))
        lines.extend(self._constraint_section(plan))

        if plan.conflict_chain:
            lines.extend(self._conflict_chain_section(plan))

        lines.extend(self._solver_trace_section(plan))

        if clean_report:
            lines.extend(self._clean_report_section(clean_report))

        if comparison_plan:
            lines.extend(self._comparison_section(plan, comparison_plan))

        lines.extend(self._footer_section(plan))

        return "\n".join(lines)

    def _header_section(self, plan: MealPlan) -> List[str]:
        status = "✅ 可行" if plan.is_feasible else "❌ 不可行"
        return [
            f"# 🍱 配餐报告：{plan.name}",
            "",
            f"| 项目 | 内容 |",
            f"|------|------|",
            f"| 方案ID | {plan.plan_id} |",
            f"| 餐次 | {plan.meal_type} |",
            f"| 可行性 | {status} |",
            f"| 生成时间 | {plan.created_at.strftime('%Y-%m-%d %H:%M:%S')} |",
            f"| 总成本 | ¥{plan.total_cost:.2f} |",
            f"| 修订说明 | {plan.revision_note or '-'} |",
            f"| 父方案 | {plan.parent_plan_id or '-'} |",
            ""
        ]

    def _summary_section(self, plan: MealPlan) -> List[str]:
        lines = [
            "## 📊 配餐概览",
            "",
            "### 营养汇总（每份 1kg 餐食）",
            "",
            "| 营养成分 | 实际值 | 单位 |",
            "|----------|--------|------|",
            f"| 热量 | {plan.total_nutrition.calories:.1f} | kcal |",
            f"| 蛋白质 | {plan.total_nutrition.protein:.1f} | g |",
            f"| 脂肪 | {plan.total_nutrition.fat:.1f} | g |",
            f"| 碳水化合物 | {plan.total_nutrition.carbs:.1f} | g |",
            f"| 钠 | {plan.total_nutrition.sodium:.1f} | mg |",
            f"| 膳食纤维 | {plan.total_nutrition.fiber:.1f} | g |",
            f"| 糖 | {plan.total_nutrition.sugar:.1f} | g |",
            ""
        ]

        allergens = plan.total_allergens()
        if allergens:
            lines.extend([
                "### 含过敏源",
                "",
                ", ".join(f"⚠️ {a}" for a in allergens),
                ""
            ])

        return lines

    def _ingredients_section(self, plan: MealPlan) -> List[str]:
        lines = [
            "## 🥗 食材清单",
            "",
            "| 食材ID | 名称 | 用量(kg) | 成本(¥) | 占比 |",
            "|--------|------|----------|---------|------|",
        ]

        ing_map = {}
        for trace in plan.solver_traces:
            if "ingredients" in trace.extra:
                for ing in trace.extra["ingredients"]:
                    ing_id = ing.id if hasattr(ing, 'id') else ing['id']
                    ing_map[ing_id] = ing

        total_cost = 0.0
        for ing_id, amount in sorted(plan.portions.items(), key=lambda x: -x[1]):
            ing = ing_map.get(ing_id)
            if ing:
                if hasattr(ing, 'cost_per_unit'):
                    cost = ing.cost_per_unit * amount
                    name = ing.name
                else:
                    cost = ing['cost'] * amount
                    name = ing['name']
            else:
                cost = 0
                name = ing_id
            total_cost += cost
            pct = amount * 100
            lines.append(
                f"| {ing_id} | {name} | {amount:.3f} | {cost:.2f} | {pct:.1f}% |"
            )

        lines.append(f"| **合计** | | **1.000 | **{total_cost:.2f}** | **100%** |")
        lines.append("")
        return lines

    def _constraint_section(self, plan: MealPlan) -> List[str]:
        lines = [
            "## ⚖️ 约束检查",
            "",
        ]

        active = [c for c in plan.constraints if c.status != ConstraintStatus.SATISFIED]
        satisfied = [c for c in plan.constraints if c.status == ConstraintStatus.SATISFIED]

        if not active:
            lines.append("✅ 所有约束均已满足！")
            lines.append("")
        else:
            lines.append(f"⚠️ **未满足约束（{len(active)} 项）：")
            lines.append("")
            lines.append("| 类型 | 名称 | 严重程度 | 状态 | 目标值 | 实际值 | 违反量 | 说明 |")
            lines.append("|------|------|----------|------|--------|--------|--------|------|")

            for c in sorted(active):
                status_icon = "❌" if c.severity == ConflictSeverity.BLOCKER else "⚠️" if c.severity == ConflictSeverity.CRITICAL else "⚪"
                status_text = {
                    ConstraintStatus.VIOLATED: "违反",
                    ConstraintStatus.RELAXED: "已放宽",
                    ConstraintStatus.CORRECTED: "已修正",
                }.get(c.status, c.status.value)
                target = f"{c.target_value:.2f}" if c.target_value is not None else "-"
                actual = f"{c.actual_value:.2f}" if c.actual_value is not None else "-"
                violation = f"{c.violation_amount:.2f}" if c.violation_amount else "-"
                lines.append(
                    f"| {status_icon} {c.type.value} | {c.name} | {c.severity.name} | "
                    f"{status_text} | {target} | {actual} | {violation} | {c.description} |"
                )
            lines.append("")

        if satisfied:
            lines.append(f"✅ **已满足约束（{len(satisfied)} 项）：")
            lines.append("")
            for c in sorted(satisfied):
                lines.append(f"- {c.name}: {c.description}")
            lines.append("")

        return lines

    def _conflict_chain_section(self, plan: MealPlan) -> List[str]:
        analysis = self.conflict_detector.analyze(plan)
        lines = [
            "## 🔗 冲突链分析",
            "",
            self.conflict_detector.explain_order(plan),
            ""
        ]

        if analysis.sorted_conflicts:
            lines.extend([
                "",
                "### 解决顺序（从上到下）",
                "",
            ])
            for i, c in enumerate(analysis.sorted_conflicts, 1):
                lines.append(f"{i}. **{c.name}**")
                lines.append(f"   - 类型: {c.type.value} | 严重: {c.severity.name}")
                lines.append(f"   - {c.description}")
                if c.affected_ingredients:
                    lines.append(f"   - 影响食材: {', '.join(c.affected_ingredients)}")
                if c.correction_note:
                    lines.append(f"   - 修正: {c.correction_note}")
                lines.append("")

        return lines

    def _solver_trace_section(self, plan: MealPlan) -> List[str]:
        lines = [
            "## 🔍 计算过程（线性规划）",
            "",
            "> 以下是求解器的完整执行轨迹，工程师可据此复现：",
            "",
            "| 步骤 | 描述 | 关键变量 | 目标值 |",
            "|------|------|----------|--------|",
        ]

        for trace in plan.solver_traces:
            vars_str = ", ".join(
                f"{k}={v}" for k, v in trace.variables.items()
            ) if trace.variables else "-"
            obj = f"¥{trace.objective_value:.2f}" if trace.objective_value is not None else "-"
            lines.append(
                f"| {trace.step} | {trace.description} | {vars_str} | {obj} |"
            )

        lines.append("")

        if plan.solver_traces:
            lp_step = next((t for t in plan.solver_traces if "构建LP问题" in t.description), None)
            if lp_step and "objective_coeffs" in lp_step.extra:
                lines.extend([
                    "### LP问题详情",
                    "",
                    "#### 目标函数系数（成本）：",
                    "",
                    "```",
                    "min Z = " + " + ".join(
                        f"{cost}·x{i+1}"
                        for i, (name, cost) in enumerate(lp_step.extra["objective_coeffs"].items())
                    ),
                    "```",
                    ""
                ])

                if "constraints" in lp_step.extra:
                    lines.extend([
                        "#### 约束条件：",
                        "",
                        "```",
                    ])
                    for i, c in enumerate(lp_step.extra["constraints"]):
                        lines.append(f"s.t.  ({i+1}) {c}")
                    lines.append("```")
                    lines.append("")

        return lines

    def _clean_report_section(self, clean_report: CleanReport) -> List[str]:
        return [
            "## 🧹 数据清洗记录",
            "",
            clean_report.to_markdown().split("## ", 1)[1] if "## " in clean_report.to_markdown() else clean_report.to_markdown(),
            ""
        ]

    def _comparison_section(self, plan_a: MealPlan, plan_b: MealPlan) -> List[str]:
        comparison = PlanComparison(plan_a, plan_b)
        return [
            "## 🆚 方案对比",
            "",
            comparison.to_markdown().split("## ", 1)[1] if "## " in comparison.to_markdown() else comparison.to_markdown(),
            ""
        ]

    def _footer_section(self, plan: MealPlan) -> List[str]:
        return [
            "---",
            "",
            f"*报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*",
            "",
            "> **审计说明：",
            "> 本报告包含完整的计算过程，包括：",
            "> 1. 数据清洗记录（原始数据中的空值、备注处理）",
            "> 2. 线性规划求解过程（每一步的变量和约束）",
            "> 3. 约束冲突链（为什么拦住、按什么顺序解决）",
            "> 4. 修正历史（如有关联方案）",
            ""
        ]

    def _generate_json(
        self, plan: MealPlan, clean_report: Optional[CleanReport],
        comparison_plan: Optional[MealPlan]
    ) -> str:
        data = {
            "report_version": "1.0",
            "generated_at": datetime.now().isoformat(),
            "plan": plan.summary(),
            "nutrition": {
                "calories": plan.total_nutrition.calories,
                "protein": plan.total_nutrition.protein,
                "fat": plan.total_nutrition.fat,
                "carbs": plan.total_nutrition.carbs,
                "sodium": plan.total_nutrition.sodium,
                "fiber": plan.total_nutrition.fiber,
                "sugar": plan.total_nutrition.sugar,
            },
            "portions": plan.portions,
            "constraints": [
                {
                    "type": c.type.value,
                    "name": c.name,
                    "severity": c.severity.name,
                    "status": c.status.value,
                    "target_value": c.target_value,
                    "actual_value": c.actual_value,
                    "violation_amount": c.violation_amount,
                    "description": c.description,
                    "affected_ingredients": c.affected_ingredients,
                    "correction_note": c.correction_note,
                    "priority": c.priority()
                }
                for c in plan.constraints
            ],
            "conflict_chain": plan.conflict_chain.to_dict() if plan.conflict_chain else None,
            "solver_traces": [
                {
                    "step": t.step,
                    "description": t.description,
                    "variables": t.variables,
                    "objective_value": t.objective_value,
                    "timestamp": t.timestamp.isoformat(),
                    "extra": t.extra
                }
                for t in plan.solver_traces
            ],
            "clean_report": clean_report.summary() if clean_report else None,
            "comparison": PlanComparison(plan, comparison_plan).compare() if comparison_plan else None,
        }
        return json.dumps(data, ensure_ascii=False, indent=2)

    def _generate_text(
        self, plan: MealPlan, clean_report: Optional[CleanReport],
        comparison_plan: Optional[MealPlan]
    ) -> str:
        md = self._generate_markdown(plan, clean_report, comparison_plan)
        import re
        text = re.sub(r'[#*_`|>\[\]]', '', md)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text
