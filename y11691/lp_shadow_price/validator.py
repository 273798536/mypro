from __future__ import annotations

from typing import Dict
from .models import (
    LPInput,
    ValidationResult,
    ValidationIssue,
    ValidationIssueType,
    Material,
    Product,
    Unit,
)


UNIT_CONVERSION: Dict[Unit, Dict[Unit, float]] = {
    Unit.KG: {Unit.TON: 0.001},
    Unit.TON: {Unit.KG: 1000.0},
    Unit.LITER: {},
    Unit.PIECE: {},
    Unit.HOUR: {},
    Unit.METER: {},
}


def is_unit_compatible(unit1: Unit, unit2: Unit) -> bool:
    if unit1 == unit2:
        return True
    return unit2 in UNIT_CONVERSION.get(unit1, {}) or unit1 in UNIT_CONVERSION.get(unit2, {})


def convert_units(value: float, from_unit: Unit, to_unit: Unit) -> float:
    if from_unit == to_unit:
        return value
    if to_unit in UNIT_CONVERSION.get(from_unit, {}):
        return value * UNIT_CONVERSION[from_unit][to_unit]
    if from_unit in UNIT_CONVERSION.get(to_unit, {}):
        return value / UNIT_CONVERSION[to_unit][from_unit]
    raise ValueError(f"无法从 {from_unit} 转换到 {to_unit}")


class ConstraintValidator:
    def __init__(self, auto_correct: bool = True):
        self.auto_correct = auto_correct

    def validate(self, lp_input: LPInput) -> ValidationResult:
        result = ValidationResult()

        self._validate_unit_consistency(lp_input, result)
        self._validate_material_usage_references(lp_input, result)
        self._validate_order_demands(lp_input, result)
        self._validate_capacity_constraints(lp_input, result)
        self._validate_feasibility(lp_input, result)

        return result

    def _validate_unit_consistency(self, lp_input: LPInput, result: ValidationResult):
        material_units: Dict[str, Unit] = {m.id: m.unit for m in lp_input.materials}

        for product_id, usages in lp_input.material_usage.items():
            product = lp_input.get_product(product_id)
            if not product:
                result.issues.append(ValidationIssue(
                    type=ValidationIssueType.NEEDS_HUMAN_REVIEW,
                    category="数据引用",
                    message=f"原料消耗表中引用了不存在的产品: {product_id}",
                    field=f"material_usage.{product_id}",
                ))
                continue

            for usage in usages:
                material = lp_input.get_material(usage.material_id)
                if not material:
                    result.issues.append(ValidationIssue(
                        type=ValidationIssueType.NEEDS_HUMAN_REVIEW,
                        category="数据引用",
                        message=f"产品 {product.name}({product_id}) 引用了不存在的原料: {usage.material_id}",
                        field=f"material_usage.{product_id}",
                    ))
                    continue

    def _validate_material_usage_references(self, lp_input: LPInput, result: ValidationResult):
        product_ids = {p.id for p in lp_input.products}
        material_ids = {m.id for m in lp_input.materials}

        for product_id, usages in lp_input.material_usage.items():
            if product_id not in product_ids:
                result.issues.append(ValidationIssue(
                    type=ValidationIssueType.NEEDS_HUMAN_REVIEW,
                    category="数据引用",
                    message=f"原料消耗表中引用了不存在的产品ID: {product_id}",
                    field=f"material_usage.{product_id}",
                ))
                continue

            for usage in usages:
                if usage.material_id not in material_ids:
                    result.issues.append(ValidationIssue(
                        type=ValidationIssueType.NEEDS_HUMAN_REVIEW,
                        category="数据引用",
                        message=f"产品 {product_id} 引用了不存在的原料ID: {usage.material_id}",
                        field=f"material_usage.{product_id}",
                    ))

                if usage.amount_per_unit < 0:
                    result.issues.append(ValidationIssue(
                        type=ValidationIssueType.NEEDS_HUMAN_REVIEW,
                        category="数值合理性",
                        message=f"产品 {product_id} 对原料 {usage.material_id} 的消耗量为负数",
                        field=f"material_usage.{product_id}.{usage.material_id}",
                        details={"amount": usage.amount_per_unit},
                    ))

    def _validate_order_demands(self, lp_input: LPInput, result: ValidationResult):
        product_ids = {p.id for p in lp_input.products}

        for demand in lp_input.order_demands:
            if demand.product_id not in product_ids:
                result.issues.append(ValidationIssue(
                    type=ValidationIssueType.NEEDS_HUMAN_REVIEW,
                    category="数据引用",
                    message=f"订单需求引用了不存在的产品ID: {demand.product_id}",
                    field="order_demands",
                ))
                continue

            if demand.min_demand < 0:
                if self.auto_correct:
                    old_val = demand.min_demand
                    demand.min_demand = 0.0
                    result.issues.append(ValidationIssue(
                        type=ValidationIssueType.CORRECTED,
                        category="数值修正",
                        message=f"产品 {demand.product_id} 的最小需求为负，已修正为0",
                        field=f"order_demands.{demand.product_id}.min_demand",
                        details={"old_value": old_val, "new_value": 0.0},
                    ))
                else:
                    result.issues.append(ValidationIssue(
                        type=ValidationIssueType.NEEDS_HUMAN_REVIEW,
                        category="数值合理性",
                        message=f"产品 {demand.product_id} 的最小需求为负",
                        field=f"order_demands.{demand.product_id}.min_demand",
                        details={"min_demand": demand.min_demand},
                    ))

            if demand.max_demand is not None:
                if demand.max_demand < 0:
                    result.issues.append(ValidationIssue(
                        type=ValidationIssueType.NEEDS_HUMAN_REVIEW,
                        category="数值合理性",
                        message=f"产品 {demand.product_id} 的最大需求为负",
                        field=f"order_demands.{demand.product_id}.max_demand",
                        details={"max_demand": demand.max_demand},
                    ))
                elif demand.max_demand < demand.min_demand:
                    result.issues.append(ValidationIssue(
                        type=ValidationIssueType.NEEDS_HUMAN_REVIEW,
                        category="逻辑一致性",
                        message=f"产品 {demand.product_id} 的最大需求小于最小需求",
                        field=f"order_demands.{demand.product_id}",
                        details={"min": demand.min_demand, "max": demand.max_demand},
                    ))

    def _validate_capacity_constraints(self, lp_input: LPInput, result: ValidationResult):
        product_ids = {p.id for p in lp_input.products}

        for cap in lp_input.capacity_constraints:
            if cap.max_capacity < 0:
                result.issues.append(ValidationIssue(
                    type=ValidationIssueType.NEEDS_HUMAN_REVIEW,
                    category="数值合理性",
                    message=f"产能约束 {cap.name}({cap.id}) 的上限为负",
                    field=f"capacity_constraints.{cap.id}.max_capacity",
                    details={"max_capacity": cap.max_capacity},
                ))

            for product_id, usage in cap.usage_per_unit.items():
                if product_id not in product_ids:
                    result.issues.append(ValidationIssue(
                        type=ValidationIssueType.NEEDS_HUMAN_REVIEW,
                        category="数据引用",
                        message=f"产能约束 {cap.name} 引用了不存在的产品ID: {product_id}",
                        field=f"capacity_constraints.{cap.id}.usage_per_unit",
                    ))

                if usage < 0:
                    result.issues.append(ValidationIssue(
                        type=ValidationIssueType.NEEDS_HUMAN_REVIEW,
                        category="数值合理性",
                        message=f"产能约束 {cap.name} 中产品 {product_id} 的单位消耗为负",
                        field=f"capacity_constraints.{cap.id}.usage_per_unit.{product_id}",
                        details={"usage": usage},
                    ))

    def _validate_feasibility(self, lp_input: LPInput, result: ValidationResult):
        for demand in lp_input.order_demands:
            if demand.min_demand <= 0:
                continue

            product = lp_input.get_product(demand.product_id)
            if not product:
                continue

            usages = lp_input.material_usage.get(demand.product_id, [])
            for usage in usages:
                material = lp_input.get_material(usage.material_id)
                if not material:
                    continue

                required = demand.min_demand * usage.amount_per_unit
                if required > material.available:
                    result.issues.append(ValidationIssue(
                        type=ValidationIssueType.NEEDS_HUMAN_REVIEW,
                        category="可行性预警",
                        message=(f"仅满足产品 {product.name} 的最低需求就需要 "
                                 f"{required:.2f}{material.unit} {material.name}，"
                                 f"但可用量只有 {material.available:.2f}{material.unit}"),
                        field=f"materials.{material.id}.available",
                        details={
                            "product": product.name,
                            "material": material.name,
                            "required": required,
                            "available": material.available,
                            "min_demand": demand.min_demand,
                            "usage_per_unit": usage.amount_per_unit,
                        },
                    ))
