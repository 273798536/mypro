"""冲突检测和修正建议模块"""
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass, field
import itertools

from .models import (
    DepartmentEmission, BudgetLimit, ReductionProject,
    BusinessIndicator, OptimizationConstraint, OptimizationResult,
    ObjectiveType, Conflict, ProjectStatus
)


class ConflictDetector:
    """冲突检测器 - 检测目标冲突和项目互斥"""

    def __init__(self,
                 emissions: List[DepartmentEmission],
                 budgets: List[BudgetLimit],
                 projects: List[ReductionProject],
                 indicators: Optional[List[BusinessIndicator]] = None):
        self.emissions = emissions
        self.budgets = budgets
        self.projects = projects
        self.indicators = indicators or []
        self.project_map = {p.project_id: p for p in projects}

    def detect_objective_conflicts(self,
                                   result: OptimizationResult,
                                   constraint: OptimizationConstraint) -> List[Conflict]:
        """检测目标之间的冲突"""
        conflicts = []
        scores = result.objective_scores

        if ObjectiveType.MINIMIZE_COST in scores and ObjectiveType.MAXIMIZE_REDUCTION in scores:
            cost_score = scores[ObjectiveType.MINIMIZE_COST]
            reduction_score = scores[ObjectiveType.MAXIMIZE_REDUCTION]

            if cost_score < 0.3 and reduction_score > 0.7:
                conflicts.append(Conflict(
                    conflict_type="objective_conflict",
                    involved_items=["minimize_cost", "maximize_reduction"],
                    description="当前方案成本很低但减排效果不佳，存在成本与减排目标的冲突",
                    suggestions=[
                        "方案1: 增加预算投入，选择减排效果更好的项目（预计增加成本10-20%）",
                        "方案2: 分阶段实施，先启动低成本项目，后续追加高减排项目",
                        "方案3: 申请专项减碳资金，不占用常规运营预算"
                    ]
                ))
            elif cost_score > 0.7 and reduction_score < 0.3:
                conflicts.append(Conflict(
                    conflict_type="objective_conflict",
                    involved_items=["minimize_cost", "maximize_reduction"],
                    description="当前方案减排效果很好但成本过高，存在减排与成本目标的冲突",
                    suggestions=[
                        "方案1: 优先选择性价比高的项目（减排量/成本比最高）",
                        "方案2: 与供应商谈判降低项目实施成本",
                        "方案3: 申请政府碳减排补贴或税收优惠",
                        "方案4: 延长项目实施周期，分摊成本压力"
                    ]
                ))

        if ObjectiveType.MINIMIZE_EMISSION in scores and ObjectiveType.MINIMIZE_COST in scores:
            emission_score = scores[ObjectiveType.MINIMIZE_EMISSION]
            cost_score = scores[ObjectiveType.MINIMIZE_COST]

            if emission_score > 0.6 and cost_score < 0.4:
                conflicts.append(Conflict(
                    conflict_type="objective_conflict",
                    involved_items=["minimize_emission", "minimize_cost"],
                    description="成本控制较好但净排放量仍然较高，存在排放控制与成本控制的冲突",
                    suggestions=[
                        "方案1: 针对高排放部门制定专项减排计划",
                        "方案2: 考虑碳交易市场购买配额作为过渡方案",
                        "方案3: 优化生产工艺，从源头降低排放"
                    ]
                ))

        if result.over_budget_amount > 0:
            conflicts.append(Conflict(
                conflict_type="budget_conflict",
                involved_items=["total_budget", "selected_projects"],
                description=f"当前方案超出预算 {result.over_budget_amount:.2f} 元",
                suggestions=self._generate_budget_adjustment_suggestions(result)
            ))

        if result.constraint_violations:
            for violation in result.constraint_violations:
                if "减排比例" in violation:
                    conflicts.append(Conflict(
                        conflict_type="reduction_constraint",
                        involved_items=["min_reduction_ratio", "selected_projects"],
                        description=violation,
                        suggestions=[
                            "增加更多减排项目",
                            "优先选择减排潜力大的项目",
                            "适当降低最低减排比例要求"
                        ]
                    ))
                elif "依赖" in violation:
                    conflicts.append(Conflict(
                        conflict_type="dependency_conflict",
                        involved_items=["dependencies", "selected_projects"],
                        description=violation,
                        suggestions=[
                            "补充选中被依赖的项目",
                            "移除有未满足依赖的项目",
                            "调整项目依赖关系"
                        ]
                    ))
                elif "互斥" in violation:
                    conflicts.append(Conflict(
                        conflict_type="mutex_conflict",
                        involved_items=["mutually_exclusive", "selected_projects"],
                        description=violation,
                        suggestions=[
                            "只保留互斥项目中的一个",
                            "重新评估项目互斥关系是否合理",
                            "考虑分阶段实施互斥项目"
                        ]
                    ))

        return conflicts

    def detect_project_conflicts(self) -> List[Conflict]:
        """检测项目之间的冲突（互斥、依赖环等）"""
        conflicts = []

        for proj in self.projects:
            if proj.mutually_exclusive:
                for me_id in proj.mutually_exclusive:
                    if me_id in self.project_map:
                        other_proj = self.project_map[me_id]
                        if proj.department_id != other_proj.department_id:
                            conflicts.append(Conflict(
                                conflict_type="cross_department_mutex",
                                involved_items=[proj.project_id, me_id],
                                description=f"项目 {proj.project_name} 与 {other_proj.project_name} 分属不同部门但定义为互斥",
                                suggestions=[
                                    "确认跨部门项目互斥的合理性",
                                    "建立跨部门协调机制决策",
                                    "考虑由公司层面统一决策"
                                ]
                            ))

        dependency_graph = {p.project_id: p.dependencies for p in self.projects}
        cycles = self._detect_cycles(dependency_graph)
        for cycle in cycles:
            conflicts.append(Conflict(
                conflict_type="dependency_cycle",
                involved_items=cycle,
                description=f"项目依赖关系存在循环: {' -> '.join(cycle)}",
                suggestions=[
                    "重新梳理项目依赖关系，打破循环",
                    "将循环中的项目合并为一个大项目",
                    "调整项目实施顺序"
                ]
            ))

        for proj in self.projects:
            for dep_id in proj.dependencies:
                if dep_id not in self.project_map:
                    conflicts.append(Conflict(
                        conflict_type="missing_dependency",
                        involved_items=[proj.project_id, dep_id],
                        description=f"项目 {proj.project_name} 依赖不存在的项目 {dep_id}",
                        suggestions=[
                            f"补充项目 {dep_id} 的数据",
                            f"移除对 {dep_id} 的依赖",
                            f"确认依赖项目ID是否正确"
                        ]
                    ))

        for proj in self.projects:
            for me_id in proj.mutually_exclusive:
                if me_id not in self.project_map:
                    conflicts.append(Conflict(
                        conflict_type="missing_mutex_project",
                        involved_items=[proj.project_id, me_id],
                        description=f"项目 {proj.project_name} 的互斥项目 {me_id} 不存在",
                        suggestions=[
                            f"补充项目 {me_id} 的数据",
                            f"移除对 {me_id} 的互斥关系",
                            f"确认互斥项目ID是否正确"
                        ]
                    ))

        return conflicts

    def _detect_cycles(self, graph: Dict[str, List[str]]) -> List[List[str]]:
        """检测有向图中的循环"""
        cycles = []
        visited = set()
        recursion_stack = set()
        path = []

        def dfs(node):
            visited.add(node)
            recursion_stack.add(node)
            path.append(node)

            for neighbor in graph.get(node, []):
                if neighbor not in visited:
                    dfs(neighbor)
                elif neighbor in recursion_stack:
                    cycle_start = path.index(neighbor)
                    cycle = path[cycle_start:] + [neighbor]
                    cycles.append(cycle)

            path.pop()
            recursion_stack.remove(node)

        for node in graph:
            if node not in visited:
                dfs(node)

        return cycles

    def _generate_budget_adjustment_suggestions(self, result: OptimizationResult) -> List[str]:
        """生成预算调整的具体建议"""
        suggestions = []
        over_amount = result.over_budget_amount

        selected_projs = [self.project_map[pid] for pid in result.selected_projects
                          if pid in self.project_map]

        if not selected_projs:
            return ["当前未选择任何项目"]

        cost_per_reduction = [(p, p.cost / p.reduction_potential if p.reduction_potential > 0 else float('inf'))
                              for p in selected_projs]
        cost_per_reduction.sort(key=lambda x: x[1], reverse=True)

        if cost_per_reduction:
            worst_project, worst_ratio = cost_per_reduction[0]
            suggestions.append(
                f"方案1: 移除性价比最低的项目 '{worst_project.project_name}' "
                f"(成本 {worst_project.cost:.2f} 元，减排 {worst_project.reduction_potential:.2f} 吨CO2e)，"
                f"可节省预算 {worst_project.cost:.2f} 元"
            )

        low_priority = [p for p in selected_projs if p.priority >= 4]
        if low_priority:
            low_priority.sort(key=lambda p: p.priority, reverse=True)
            lp = low_priority[0]
            suggestions.append(
                f"方案2: 延迟低优先级项目 '{lp.project_name}' (优先级 {lp.priority})，"
                f"可节省预算 {lp.cost:.2f} 元"
            )

        suggestions.append(
            f"方案3: 申请追加预算 {over_amount:.2f} 元，当前方案减排效果最优"
        )

        high_cost = [p for p in selected_projs if p.cost > over_amount * 0.5]
        if high_cost:
            hc = high_cost[0]
            suggestions.append(
                f"方案4: 拆分高成本项目 '{hc.project_name}' 分阶段实施，"
                f"首期投入可减少约 {hc.cost * 0.5:.2f} 元"
            )

        return suggestions

    def generate_correction_plan(self,
                                 conflicts: List[Conflict],
                                 result: OptimizationResult) -> Dict[str, Any]:
        """生成可操作的修正方案"""
        plan = {
            "conflict_count": len(conflicts),
            "by_type": {},
            "action_items": [],
            "estimated_impact": {}
        }

        for conflict in conflicts:
            ctype = conflict.conflict_type
            plan["by_type"][ctype] = plan["by_type"].get(ctype, 0) + 1

            for i, suggestion in enumerate(conflict.suggestions, 1):
                plan["action_items"].append({
                    "conflict_type": ctype,
                    "involved_items": conflict.involved_items,
                    "conflict_description": conflict.description,
                    "suggestion_number": i,
                    "suggestion": suggestion,
                    "priority": self._assess_suggestion_priority(ctype, suggestion)
                })

        plan["action_items"].sort(key=lambda x: x["priority"])

        budget_conflicts = [c for c in conflicts if c.conflict_type == "budget_conflict"]
        objective_conflicts = [c for c in conflicts if c.conflict_type == "objective_conflict"]

        plan["estimated_impact"] = {
            "budget_adjustment_needed": len(budget_conflicts) > 0,
            "objective_tradeoff_needed": len(objective_conflicts) > 0,
            "recommended_first_step": plan["action_items"][0]["suggestion"] if plan["action_items"] else "无冲突"
        }

        return plan

    def _assess_suggestion_priority(self, conflict_type: str, suggestion: str) -> int:
        """评估建议的优先级（1最高）"""
        if "申请追加预算" in suggestion or "降低" in suggestion:
            return 3
        if "移除" in suggestion or "优先选择" in suggestion:
            return 1
        if "分阶段" in suggestion or "延迟" in suggestion:
            return 2
        return 2

    def get_all_conflicts(self,
                          result: Optional[OptimizationResult] = None,
                          constraint: Optional[OptimizationConstraint] = None) -> List[Conflict]:
        """获取所有冲突"""
        all_conflicts = []

        all_conflicts.extend(self.detect_project_conflicts())

        if result and constraint:
            all_conflicts.extend(self.detect_objective_conflicts(result, constraint))

        return all_conflicts
