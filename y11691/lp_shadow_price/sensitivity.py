from __future__ import annotations

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

from .models import LPInput, LPOutput, ShadowPrice, ProductResult, SolutionStatus


@dataclass
class SensitivitySummary:
    binding_constraints: List[ShadowPrice]
    non_binding_constraints: List[ShadowPrice]
    profitable_products: List[ProductResult]
    unprofitable_products: List[ProductResult]
    bottleneck_resources: List[ShadowPrice]
    unused_resources: List[ShadowPrice]


class SensitivityAnalyzer:
    def __init__(self, shadow_price_threshold: float = 0.01):
        self.shadow_price_threshold = shadow_price_threshold

    def analyze(self, lp_input: LPInput, lp_output: LPOutput) -> SensitivitySummary:
        if lp_output.status != SolutionStatus.OPTIMAL:
            return SensitivitySummary([], [], [], [], [], [])

        binding = []
        non_binding = []
        bottleneck = []
        unused = []

        for sp in lp_output.shadow_prices:
            if abs(sp.shadow_price) > self.shadow_price_threshold:
                binding.append(sp)
                if sp.shadow_price > 0:
                    bottleneck.append(sp)
            else:
                non_binding.append(sp)
                unused.append(sp)

        profitable = []
        unprofitable = []

        for pr in lp_output.products:
            if pr.production_amount > 0:
                profitable.append(pr)
            else:
                if abs(pr.reduced_cost) > self.shadow_price_threshold:
                    unprofitable.append(pr)

        bottleneck.sort(key=lambda x: x.shadow_price, reverse=True)
        profitable.sort(key=lambda x: x.profit_contribution, reverse=True)
        unprofitable.sort(key=lambda x: x.reduced_cost)

        return SensitivitySummary(
            binding_constraints=binding,
            non_binding_constraints=non_binding,
            profitable_products=profitable,
            unprofitable_products=unprofitable,
            bottleneck_resources=bottleneck,
            unused_resources=unused,
        )

    def get_bottleneck_explanation(self, sp: ShadowPrice) -> str:
        if sp.shadow_price <= 0:
            return f"{sp.constraint_name} 不是瓶颈资源，当前有冗余"

        explanation = (
            f"{sp.constraint_name} 是瓶颈资源，影子价格为 {sp.shadow_price:.4f}\n"
            f"  - 每增加1{sp.unit}，总利润可增加 {sp.shadow_price:.4f}\n"
            f"  - 当前可用量: {sp.current_rhs:.2f}{sp.unit}\n"
        )

        if sp.allowable_increase is not None and sp.allowable_increase != float('inf'):
            explanation += f"  - 影子价格有效范围: 可增加 {sp.allowable_increase:.2f}{sp.unit}\n"
        else:
            explanation += f"  - 影子价格有效范围: 增加量无上限（只要其他约束允许）\n"

        if sp.allowable_decrease is not None and sp.allowable_decrease != float('inf'):
            explanation += f"  - 可减少 {sp.allowable_decrease:.2f}{sp.unit} 仍保持最优基不变"
        else:
            explanation += f"  - 减少量无上限（资源闲置时不影响利润）"

        return explanation

    def get_reduced_cost_explanation(self, pr: ProductResult) -> str:
        if pr.production_amount > 0:
            return f"{pr.product_name} 已纳入生产计划，每单位贡献利润正"

        if abs(pr.reduced_cost) < 1e-9:
            return f"{pr.product_name} 可选择性生产，不影响总利润"

        explanation = (
            f"{pr.product_name} 未纳入生产计划，检验成本（Reduced Cost）为 {pr.reduced_cost:.4f}\n"
            f"  - 单位利润需要提高 {-pr.reduced_cost:.4f} 才值得生产\n"
            f"  - 当前单位利润: {pr.profit_contribution / max(pr.production_amount, 1):.4f}"
        )

        return explanation

    def simulate_constraint_change(
        self,
        lp_input: LPInput,
        constraint_id: str,
        delta: float,
        solver,
    ) -> Optional[Tuple[float, float]]:
        modified_input = self._modify_constraint_rhs(lp_input, constraint_id, delta)
        if modified_input is None:
            return None

        new_output = solver.solve(modified_input)
        if new_output.status != SolutionStatus.OPTIMAL:
            return None

        return (new_output.total_profit, delta)

    def _modify_constraint_rhs(self, lp_input: LPInput, constraint_id: str, delta: float) -> Optional[LPInput]:
        import copy
        modified = copy.deepcopy(lp_input)

        for material in modified.materials:
            if material.id == constraint_id:
                material.available += delta
                return modified

        for cap in modified.capacity_constraints:
            if cap.id == constraint_id:
                cap.max_capacity += delta
                return modified

        return None
