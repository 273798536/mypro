"""计算口径管理 - 记录每次计算的口径和假设"""

from typing import Dict, List, Any
from datetime import datetime
from .models import CalculationRule, CalculationContext


class CalculationSpecManager:
    def __init__(self):
        self._rules: Dict[str, CalculationRule] = {}
        self._contexts: Dict[str, CalculationContext] = {}
        self._init_default_rules()

    def _init_default_rules(self):
        rules = [
            CalculationRule(
                formula_id="F001",
                formula_expression="total_price = quantity * unit_price",
                description="合价 = 工程量 × 单价",
                input_fields=["quantity", "unit_price"],
                output_field="total_price",
                target_unit="元",
                created_by="系统默认",
                version=1,
            ),
            CalculationRule(
                formula_id="F002",
                formula_expression="tax_amount = total_price * tax_rate",
                description="税额 = 合价 × 税率",
                input_fields=["total_price", "tax_rate"],
                output_field="tax_amount",
                target_unit="元",
                created_by="系统默认",
                version=1,
            ),
            CalculationRule(
                formula_id="F003",
                formula_expression="price_with_tax = total_price + tax_amount",
                description="含税金额 = 合价 + 税额",
                input_fields=["total_price", "tax_amount"],
                output_field="price_with_tax",
                target_unit="元",
                created_by="系统默认",
                version=1,
            ),
            CalculationRule(
                formula_id="F004",
                formula_expression="unit_cost = total_price / quantity",
                description="单位成本 = 合价 / 工程量（处理除零边界）",
                input_fields=["total_price", "quantity"],
                output_field="unit_cost",
                target_unit="元/单位",
                created_by="系统默认",
                version=1,
            ),
        ]
        for r in rules:
            self._rules[r.formula_id] = r

    def add_rule(self, rule: CalculationRule):
        if rule.formula_id in self._rules:
            existing = self._rules[rule.formula_id]
            rule.version = existing.version + 1
        self._rules[rule.formula_id] = rule

    def get_rule(self, formula_id: str) -> CalculationRule:
        if formula_id not in self._rules:
            raise KeyError(f"未找到计算规则: {formula_id}")
        return self._rules[formula_id]

    def get_all_rules(self) -> List[CalculationRule]:
        return list(self._rules.values())

    def create_context(
        self,
        reviewer: str,
        description: str,
        source_documents: List[str],
        assumptions: Dict[str, Any]
    ) -> CalculationContext:
        ctx = CalculationContext(
            reviewer=reviewer,
            description=description,
            source_documents=source_documents,
            assumptions=assumptions,
        )
        self._contexts[ctx.context_id] = ctx
        return ctx

    def get_context(self, context_id: str) -> CalculationContext:
        return self._contexts[context_id]

    def get_context_trace(self, context_id: str) -> Dict[str, Any]:
        ctx = self._contexts[context_id]
        return {
            "context_id": ctx.context_id,
            "calculation_date": ctx.calculation_date.isoformat(),
            "reviewer": ctx.reviewer,
            "description": ctx.description,
            "source_documents": ctx.source_documents,
            "assumptions": ctx.assumptions,
            "applied_rules": [
                {
                    "formula_id": r.formula_id,
                    "description": r.description,
                    "version": r.version,
                    "created_by": r.created_by,
                }
                for r in self._rules.values()
            ],
        }
