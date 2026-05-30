"""多目标优化核心算法"""
import pulp
import itertools
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass, field
import numpy as np

from .models import (
    DepartmentEmission, BudgetLimit, ReductionProject,
    BusinessIndicator, OptimizationConstraint, OptimizationResult,
    ObjectiveType, ProjectStatus
)


class MultiObjectiveOptimizer:
    """多目标减碳配额优化器"""

    def __init__(self,
                 emissions: List[DepartmentEmission],
                 budgets: List[BudgetLimit],
                 projects: List[ReductionProject],
                 indicators: Optional[List[BusinessIndicator]] = None):
        self.emissions = emissions
        self.budgets = budgets
        self.projects = projects
        self.indicators = indicators or []

        self.total_emission = sum(e.emission for e in emissions)
        self.total_budget = self._calculate_total_budget()
        self.project_map = {p.project_id: p for p in projects}

    def _calculate_total_budget(self) -> float:
        """计算总预算 - 优先使用公司级预算，否则汇总部门预算"""
        company_budget = [b for b in self.budgets if not b.department_id]
        if company_budget:
            return sum(b.budget_amount for b in company_budget)
        return sum(b.budget_amount for b in self.budgets)

    def _get_department_budget(self, department_id: str) -> float:
        """获取特定部门的预算"""
        dept_budget = [b for b in self.budgets if b.department_id == department_id]
        if dept_budget:
            return sum(b.budget_amount for b in dept_budget)
        return 0.0

    def _check_constraints(self,
                           selected_ids: List[str],
                           constraint: OptimizationConstraint) -> Tuple[bool, List[str], float]:
        """检查约束条件，返回(是否可行, 违规列表, 超预算金额)"""
        violations = []
        selected_projects = [self.project_map[pid] for pid in selected_ids if pid in self.project_map]

        total_cost = sum(p.cost for p in selected_projects)
        total_reduction = sum(p.reduction_potential for p in selected_projects)

        over_budget = max(0, total_cost - self.total_budget * constraint.max_budget_utilization)

        if over_budget > 0 and not constraint.allow_over_budget:
            violations.append(f"预算超限 {over_budget:.2f} 元，预算上限 {self.total_budget * constraint.max_budget_utilization:.2f} 元")

        reduction_ratio = total_reduction / self.total_emission if self.total_emission > 0 else 0
        if reduction_ratio < constraint.min_reduction_ratio:
            violations.append(f"减排比例 {reduction_ratio:.2%} 低于最低要求 {constraint.min_reduction_ratio:.2%}")

        if constraint.max_project_count and len(selected_projects) > constraint.max_project_count:
            violations.append(f"项目数量 {len(selected_projects)} 超过上限 {constraint.max_project_count}")

        for dept_id in constraint.required_departments:
            dept_projects = [p for p in selected_projects if p.department_id == dept_id]
            if not dept_projects:
                violations.append(f"必须包含部门 {dept_id} 的项目")

        for dept_id in constraint.excluded_departments:
            dept_projects = [p for p in selected_projects if p.department_id == dept_id]
            if dept_projects:
                violations.append(f"不能包含部门 {dept_id} 的项目")

        for proj in selected_projects:
            for dep_id in proj.dependencies:
                if dep_id not in selected_ids:
                    violations.append(f"项目 {proj.project_name} 依赖项目 {dep_id}，但该项目未被选中")

            for me_id in proj.mutually_exclusive:
                if me_id in selected_ids:
                    violations.append(f"项目 {proj.project_name} 与项目 {me_id} 互斥，不能同时选中")

        is_feasible = len(violations) == 0 or constraint.allow_over_budget
        return is_feasible, violations, over_budget

    def _calculate_objective_scores(self,
                                    selected_projects: List[ReductionProject],
                                    total_cost: float,
                                    total_reduction: float) -> Dict[ObjectiveType, float]:
        """计算各目标的得分（归一化，越小越好）"""
        net_emission = self.total_emission - total_reduction

        max_cost = max(p.cost for p in self.projects) * len(self.projects) if self.projects else 1
        max_reduction = sum(p.reduction_potential for p in self.projects) if self.projects else 1

        scores = {}

        cost_norm = total_cost / max_cost if max_cost > 0 else 0
        scores[ObjectiveType.MINIMIZE_COST] = cost_norm

        emission_norm = net_emission / self.total_emission if self.total_emission > 0 else 0
        scores[ObjectiveType.MINIMIZE_EMISSION] = emission_norm

        reduction_norm = 1 - (total_reduction / max_reduction) if max_reduction > 0 else 1
        scores[ObjectiveType.MAXIMIZE_REDUCTION] = reduction_norm

        scores[ObjectiveType.BALANCE] = (
            0.3 * scores[ObjectiveType.MINIMIZE_COST] +
            0.4 * scores[ObjectiveType.MINIMIZE_EMISSION] +
            0.3 * scores[ObjectiveType.MAXIMIZE_REDUCTION]
        )

        return scores

    def _solve_with_pulp(self,
                         constraint: OptimizationConstraint,
                         objective_type: ObjectiveType,
                         weights: Optional[Dict[ObjectiveType, float]] = None) -> Optional[OptimizationResult]:
        """使用PuLP进行线性规划求解"""
        available_projects = [p for p in self.projects if p.status != ProjectStatus.COMPLETED]
        if not available_projects:
            return None

        prob = pulp.LpProblem("CarbonOptimization", pulp.LpMinimize)

        x = pulp.LpVariable.dicts("project",
                                  [p.project_id for p in available_projects],
                                  cat='Binary')

        total_cost = pulp.lpSum([p.cost * x[p.project_id] for p in available_projects])
        total_reduction = pulp.lpSum([p.reduction_potential * x[p.project_id] for p in available_projects])
        net_emission = self.total_emission - total_reduction

        max_cost = max(p.cost for p in available_projects) * len(available_projects)
        max_reduction = sum(p.reduction_potential for p in available_projects)

        if weights is None:
            weights = {
                ObjectiveType.MINIMIZE_COST: 0.3,
                ObjectiveType.MINIMIZE_EMISSION: 0.4,
                ObjectiveType.MAXIMIZE_REDUCTION: 0.3
            }

        if objective_type == ObjectiveType.MINIMIZE_COST:
            prob += total_cost / max_cost
        elif objective_type == ObjectiveType.MINIMIZE_EMISSION:
            prob += net_emission / self.total_emission if self.total_emission > 0 else net_emission
        elif objective_type == ObjectiveType.MAXIMIZE_REDUCTION:
            prob += -total_reduction / max_reduction if max_reduction > 0 else -total_reduction
        else:
            prob += (
                weights[ObjectiveType.MINIMIZE_COST] * (total_cost / max_cost) +
                weights[ObjectiveType.MINIMIZE_EMISSION] * (net_emission / self.total_emission if self.total_emission > 0 else net_emission) +
                weights[ObjectiveType.MAXIMIZE_REDUCTION] * (-total_reduction / max_reduction if max_reduction > 0 else -total_reduction)
            )

        budget_limit = self.total_budget * constraint.max_budget_utilization
        if constraint.allow_over_budget:
            prob += total_cost <= budget_limit * 2
        else:
            prob += total_cost <= budget_limit

        min_reduction = self.total_emission * constraint.min_reduction_ratio
        prob += total_reduction >= min_reduction

        if constraint.max_project_count:
            prob += pulp.lpSum([x[p.project_id] for p in available_projects]) <= constraint.max_project_count

        for dept_id in constraint.required_departments:
            dept_projects = [p for p in available_projects if p.department_id == dept_id]
            if dept_projects:
                prob += pulp.lpSum([x[p.project_id] for p in dept_projects]) >= 1

        for dept_id in constraint.excluded_departments:
            dept_projects = [p for p in available_projects if p.department_id == dept_id]
            if dept_projects:
                prob += pulp.lpSum([x[p.project_id] for p in dept_projects]) == 0

        for proj in available_projects:
            for dep_id in proj.dependencies:
                if dep_id in x:
                    prob += x[proj.project_id] <= x[dep_id]

            for me_id in proj.mutually_exclusive:
                if me_id in x:
                    prob += x[proj.project_id] + x[me_id] <= 1

        try:
            prob.solve(pulp.PULP_CBC_CMD(msg=False))
        except Exception:
            try:
                prob.solve()
            except Exception:
                return None

        if pulp.LpStatus[prob.status] != 'Optimal':
            return None

        selected_ids = [p.project_id for p in available_projects if x[p.project_id].value() > 0.5]
        selected_projs = [p for p in available_projects if x[p.project_id].value() > 0.5]

        total_cost_val = sum(p.cost for p in selected_projs)
        total_reduction_val = sum(p.reduction_potential for p in selected_projs)
        net_emission_val = self.total_emission - total_reduction_val
        budget_util = total_cost_val / self.total_budget if self.total_budget > 0 else 0

        is_feasible, violations, over_budget = self._check_constraints(selected_ids, constraint)

        scores = self._calculate_objective_scores(selected_projs, total_cost_val, total_reduction_val)

        return OptimizationResult(
            selected_projects=selected_ids,
            total_cost=total_cost_val,
            total_reduction=total_reduction_val,
            net_emission=net_emission_val,
            budget_utilization=budget_util,
            objective_scores=scores,
            is_feasible=is_feasible,
            over_budget_amount=over_budget,
            constraint_violations=violations
        )

    def _generate_pareto_front(self,
                               constraint: OptimizationConstraint,
                               num_points: int = 10) -> List[OptimizationResult]:
        """生成帕累托前沿 - 多种权重组合"""
        results = []
        weight_combinations = []

        for alpha in np.linspace(0, 1, num_points):
            for beta in np.linspace(0, 1 - alpha, max(2, int(num_points / 2))):
                gamma = 1 - alpha - beta
                if gamma >= 0:
                    weight_combinations.append({
                        ObjectiveType.MINIMIZE_COST: alpha,
                        ObjectiveType.MINIMIZE_EMISSION: beta,
                        ObjectiveType.MAXIMIZE_REDUCTION: gamma
                    })

        unique_results = {}
        for weights in weight_combinations:
            result = self._solve_with_pulp(constraint, ObjectiveType.BALANCE, weights)
            if result:
                key = tuple(sorted(result.selected_projects))
                if key not in unique_results:
                    unique_results[key] = result

        results = list(unique_results.values())
        results.sort(key=lambda r: r.objective_scores[ObjectiveType.BALANCE])

        for i, r in enumerate(results):
            r.rank = i + 1

        return results

    def optimize(self,
                 constraint: Optional[OptimizationConstraint] = None,
                 objective_type: ObjectiveType = ObjectiveType.BALANCE,
                 generate_pareto: bool = True) -> Dict[str, Any]:
        """
        执行多目标优化

        Args:
            constraint: 约束条件，默认使用标准约束
            objective_type: 主要优化目标
            generate_pareto: 是否生成帕累托前沿

        Returns:
            包含优化结果的字典
        """
        if constraint is None:
            constraint = OptimizationConstraint()

        primary_result = self._solve_with_pulp(constraint, objective_type)

        pareto_results = []
        if generate_pareto:
            pareto_results = self._generate_pareto_front(constraint)
            if pareto_results and (primary_result is None or not pareto_results):
                primary_result = pareto_results[0]

        return {
            "primary_objective": objective_type.value,
            "constraint": constraint.to_dict(),
            "primary_result": primary_result.to_dict() if primary_result else None,
            "pareto_front": [r.to_dict() for r in pareto_results],
            "summary": {
                "total_emission": self.total_emission,
                "total_budget": self.total_budget,
                "available_projects": len([p for p in self.projects if p.status != ProjectStatus.COMPLETED]),
                "pareto_solutions": len(pareto_results)
            }
        }

    def get_budget_breakdown(self, selected_projects: List[str]) -> Dict[str, Any]:
        """获取预算使用明细"""
        dept_costs = {}
        for proj_id in selected_projects:
            proj = self.project_map.get(proj_id)
            if proj:
                dept_id = proj.department_id
                dept_costs[dept_id] = dept_costs.get(dept_id, 0) + proj.cost

        dept_budgets = {}
        for dept_id, cost in dept_costs.items():
            budget = self._get_department_budget(dept_id)
            utilization = cost / budget if budget > 0 else None
            dept_budgets[dept_id] = {
                "used": cost,
                "budget": budget,
                "utilization": utilization,
                "over_budget": max(0, cost - budget)
            }

        return dept_budgets

    def check_budget_overrun(self, result: OptimizationResult) -> Dict[str, Any]:
        """
        明确检查预算超限情况
        返回明确的结论，不模糊
        """
        total_cost = result.total_cost
        budget_limit = self.total_budget

        over_amount = total_cost - budget_limit
        over_ratio = over_amount / budget_limit if budget_limit > 0 else 0

        if over_amount <= 0:
            status = "within_budget"
            conclusion = f"预算使用合规，剩余预算 {abs(over_amount):.2f} 元 ({abs(over_ratio):.2%})"
        else:
            status = "over_budget"
            conclusion = f"预算超限 {over_amount:.2f} 元 ({over_ratio:.2%})，需调整方案或申请追加预算"

        return {
            "status": status,
            "total_cost": total_cost,
            "budget_limit": budget_limit,
            "over_amount": over_amount,
            "over_ratio": over_ratio,
            "conclusion": conclusion,
            "is_over_budget": over_amount > 0
        }
