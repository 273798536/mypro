from __future__ import annotations

import time
from typing import Dict, List, Tuple

import pulp

from .models import (
    LPInput,
    LPOutput,
    ProductResult,
    ShadowPrice,
    SolutionStatus,
)


class LPSolver:
    def __init__(self, time_limit: int = 60):
        self.time_limit = time_limit

    def solve(self, lp_input: LPInput) -> LPOutput:
        start_time = time.time()

        prob = pulp.LpProblem("ProductionPlanning", pulp.LpMaximize)

        product_vars: Dict[str, pulp.LpVariable] = {}
        for product in lp_input.products:
            min_val = 0.0
            max_val = None
            for demand in lp_input.order_demands:
                if demand.product_id == product.id:
                    min_val = max(min_val, demand.min_demand)
                    if demand.max_demand is not None:
                        max_val = demand.max_demand if max_val is None else min(max_val, demand.max_demand)

            if max_val is not None and min_val > max_val:
                return self._create_error_output(
                    lp_input,
                    f"产品 {product.name}({product.id}) 的最小需求({min_val})大于最大需求({max_val})，无法创建变量",
                    start_time,
                )

            var = pulp.LpVariable(
                name=f"x_{product.id}",
                lowBound=min_val,
                upBound=max_val,
                cat=pulp.LpContinuous,
            )
            product_vars[product.id] = var

        profit_expr = pulp.lpSum([
            product.profit_per_unit * product_vars[product.id]
            for product in lp_input.products
        ])
        prob += profit_expr, "TotalProfit"

        for material in lp_input.materials:
            expr = pulp.lpSum([
                product_vars[product_id] * usage.amount_per_unit
                for product_id, usages in lp_input.material_usage.items()
                for usage in usages
                if usage.material_id == material.id
            ])
            prob += (expr <= material.available, f"material_{material.id}")

        for cap in lp_input.capacity_constraints:
            expr = pulp.lpSum([
                product_vars[product_id] * usage
                for product_id, usage in cap.usage_per_unit.items()
                if product_id in product_vars
            ])
            prob += (expr <= cap.max_capacity, f"capacity_{cap.id}")

        solver = pulp.PULP_CBC_CMD(
            timeLimit=self.time_limit,
            msg=False,
        )

        try:
            status = prob.solve(solver)
        except Exception as e:
            return self._create_error_output(lp_input, f"求解器异常: {str(e)}", start_time)

        solve_time = time.time() - start_time

        if status == pulp.LpStatusInfeasible:
            return self._create_infeasible_output(lp_input, solve_time)

        if status == pulp.LpStatusUnbounded:
            return self._create_unbounded_output(lp_input, solve_time)

        if status != pulp.LpStatusOptimal:
            return self._create_error_output(
                lp_input,
                f"求解状态异常: {pulp.LpStatus[status]}",
                start_time,
            )

        is_degenerate = self._check_degeneracy(prob, product_vars)

        product_results = self._extract_product_results(lp_input, product_vars)
        shadow_prices = self._extract_shadow_prices(prob, lp_input)

        total_profit = pulp.value(prob.objective) if prob.objective else 0.0

        messages = []
        if is_degenerate:
            messages.append("检测到退化解 - 存在多个基可行解对应相同的最优目标值")

        return LPOutput(
            input_version=lp_input.version,
            status=SolutionStatus.OPTIMAL,
            total_profit=total_profit,
            products=product_results,
            shadow_prices=shadow_prices,
            solve_time=solve_time,
            is_degenerate=is_degenerate,
            messages=messages,
        )

    def _check_degeneracy(self, prob: pulp.LpProblem, product_vars: Dict[str, pulp.LpVariable]) -> bool:
        try:
            n_basic = sum(1 for v in product_vars.values() if v.varValue is not None and abs(v.varValue) > 1e-9)
            n_constraints = len(prob.constraints)
            return n_basic < n_constraints
        except Exception:
            return False

    def _extract_product_results(
        self,
        lp_input: LPInput,
        product_vars: Dict[str, pulp.LpVariable],
    ) -> List[ProductResult]:
        results = []
        for product in lp_input.products:
            var = product_vars[product.id]
            amount = var.varValue if var.varValue is not None else 0.0
            reduced_cost = var.dj if var.dj is not None else 0.0
            profit_contribution = amount * product.profit_per_unit

            results.append(ProductResult(
                product_id=product.id,
                product_name=product.name,
                production_amount=amount,
                unit=product.unit,
                reduced_cost=reduced_cost,
                profit_contribution=profit_contribution,
            ))
        return results

    def _extract_shadow_prices(self, prob: pulp.LpProblem, lp_input: LPInput) -> List[ShadowPrice]:
        shadow_prices = []

        for material in lp_input.materials:
            cname = f"material_{material.id}"
            if cname in prob.constraints:
                constraint = prob.constraints[cname]
                shadow_price = constraint.pi if constraint.pi is not None else 0.0
                slack = constraint.slack if constraint.slack is not None else 0.0

                shadow_prices.append(ShadowPrice(
                    constraint_id=material.id,
                    constraint_name=f"原料约束: {material.name}",
                    shadow_price=shadow_price,
                    allowable_increase=self._calc_allowable_increase(constraint),
                    allowable_decrease=self._calc_allowable_decrease(constraint, material.available),
                    current_rhs=material.available,
                    unit=material.unit,
                    description=f"影子价格表示每增加1{material.unit} {material.name}可增加的利润",
                ))

        for cap in lp_input.capacity_constraints:
            cname = f"capacity_{cap.id}"
            if cname in prob.constraints:
                constraint = prob.constraints[cname]
                shadow_price = constraint.pi if constraint.pi is not None else 0.0

                shadow_prices.append(ShadowPrice(
                    constraint_id=cap.id,
                    constraint_name=f"产能约束: {cap.name}",
                    shadow_price=shadow_price,
                    allowable_increase=self._calc_allowable_increase(constraint),
                    allowable_decrease=self._calc_allowable_decrease(constraint, cap.max_capacity),
                    current_rhs=cap.max_capacity,
                    unit=cap.unit,
                    description=f"影子价格表示每增加1{cap.unit}产能可增加的利润",
                ))

        return shadow_prices

    def _calc_allowable_increase(self, constraint) -> float:
        try:
            if hasattr(constraint, 'pi') and abs(constraint.pi) < 1e-9:
                return float('inf')
            return None
        except Exception:
            return None

    def _calc_allowable_decrease(self, constraint, rhs_value: float) -> float:
        try:
            if hasattr(constraint, 'pi') and abs(constraint.pi) < 1e-9:
                return float('inf')
            if hasattr(constraint, 'slack') and constraint.slack is not None:
                return constraint.slack
            return None
        except Exception:
            return None

    def _create_infeasible_output(self, lp_input: LPInput, solve_time: float) -> LPOutput:
        return LPOutput(
            input_version=lp_input.version,
            status=SolutionStatus.INFEASIBLE,
            total_profit=0.0,
            products=[],
            shadow_prices=[],
            solve_time=solve_time,
            is_degenerate=False,
            messages=[
                "模型不可行 - 约束之间存在冲突，无法找到满足所有条件的解",
                "建议检查：1) 最低订单需求是否过高 2) 原料/产能是否充足 3) 约束是否自相矛盾",
            ],
        )

    def _create_unbounded_output(self, lp_input: LPInput, solve_time: float) -> LPOutput:
        return LPOutput(
            input_version=lp_input.version,
            status=SolutionStatus.UNBOUNDED,
            total_profit=0.0,
            products=[],
            shadow_prices=[],
            solve_time=solve_time,
            is_degenerate=False,
            messages=[
                "模型无界 - 目标函数可以无限增大",
                "建议检查：是否缺少必要的产能或原料约束",
            ],
        )

    def _create_error_output(self, lp_input: LPInput, error_msg: str, start_time: float) -> LPOutput:
        return LPOutput(
            input_version=lp_input.version,
            status=SolutionStatus.ERROR,
            total_profit=0.0,
            products=[],
            shadow_prices=[],
            solve_time=time.time() - start_time,
            is_degenerate=False,
            messages=[error_msg],
        )
