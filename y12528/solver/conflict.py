from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from collections import defaultdict

from models import (
    Constraint, ConstraintType, ConstraintStatus, ConflictSeverity,
    MealPlan, Ingredient, NutritionTarget, ConflictChain
)


@dataclass
class ConflictAnalysis:
    """冲突分析结果"""
    total_conflicts: int = 0
    by_type: Dict[ConstraintType, List[Constraint]] = field(default_factory=lambda: defaultdict(list))
    by_severity: Dict[ConflictSeverity, List[Constraint]] = field(default_factory=lambda: defaultdict(list))
    sorted_conflicts: List[Constraint] = field(default_factory=list)
    resolution_priority: List[str] = field(default_factory=list)
    blocker_count: int = 0
    critical_count: int = 0
    warning_count: int = 0

    def has_blockers(self) -> bool:
        return self.blocker_count > 0

    def requires_stock_action(self) -> bool:
        return any(c.type == ConstraintType.STOCKOUT for c in self.sorted_conflicts)


class ConflictDetector:
    """
    约束冲突检测器
    优先级：缺货 > 过敏源 > 营养超标 > 成本 > 其他
    """

    def analyze(self, plan: MealPlan) -> ConflictAnalysis:
        """分析配餐方案中的所有冲突"""
        analysis = ConflictAnalysis()
        all_constraints = plan.constraints

        for c in all_constraints:
            if c.status != ConstraintStatus.SATISFIED:
                analysis.total_conflicts += 1
                analysis.by_type[c.type].append(c)
                analysis.by_severity[c.severity].append(c)

                if c.severity == ConflictSeverity.BLOCKER:
                    analysis.blocker_count += 1
                elif c.severity == ConflictSeverity.CRITICAL:
                    analysis.critical_count += 1
                elif c.severity == ConflictSeverity.WARNING:
                    analysis.warning_count += 1

        analysis.sorted_conflicts = sorted(
            [c for c in all_constraints if c.status != ConstraintStatus.SATISFIED],
            key=lambda x: (x.priority(), x.severity.value)
        )

        analysis.resolution_priority = [
            f"[{c.severity.name}] {c.type.value}: {c.name} - 违反{c.violation_amount:.2f}"
            for c in analysis.sorted_conflicts
        ]

        return analysis

    def detect_stock_conflicts(
        self, ingredients: List[Ingredient], required_portions: Dict[str, float]
    ) -> List[Constraint]:
        """检测库存冲突"""
        conflicts = []
        for ing_id, required in required_portions.items():
            ing = next((i for i in ingredients if i.id == ing_id), None)
            if not ing:
                continue

            if not ing.is_in_stock(required):
                shortage = required - ing.stock_available
                constraint = Constraint(
                    type=ConstraintType.STOCKOUT,
                    name=f"缺货: {ing.name}",
                    description=f"{ing.name} 需求 {required:.3f}kg，库存 {ing.stock_available:.3f}kg，缺货 {shortage:.3f}kg",
                    severity=ConflictSeverity.BLOCKER,
                    status=ConstraintStatus.VIOLATED,
                    target_value=ing.stock_available,
                    actual_value=required,
                    violation_amount=shortage,
                    affected_ingredients=[ing_id],
                    metadata={"shortage_kg": shortage}
                )
                conflicts.append(constraint)

        return sorted(conflicts)

    def detect_nutrition_conflicts(
        self, target: NutritionTarget, total_nutrition, tolerance: float = 0.05
    ) -> List[Constraint]:
        """检测营养冲突，考虑容差"""
        conflicts = []
        violations = target.check_violation(total_nutrition)

        for field, amount in violations.items():
            min_val, max_val = target.get_fields()[field]
            actual = getattr(total_nutrition, field)

            if max_val and actual > max_val * (1 + tolerance):
                constraint = Constraint(
                    type=ConstraintType.NUTRITION,
                    name=f"营养超标: {field}",
                    description=f"{field} 上限 {max_val}，实际 {actual:.2f}，超标 {amount:.2f} ({(actual/max_val-1)*100:.1f}%)",
                    severity=ConflictSeverity.CRITICAL,
                    status=ConstraintStatus.VIOLATED,
                    target_value=max_val,
                    actual_value=actual,
                    violation_amount=amount,
                    metadata={"field": field, "direction": "over"}
                )
                conflicts.append(constraint)
            elif min_val and actual < min_val * (1 - tolerance):
                constraint = Constraint(
                    type=ConstraintType.NUTRITION,
                    name=f"营养不足: {field}",
                    description=f"{field} 下限 {min_val}，实际 {actual:.2f}，不足 {amount:.2f} ({(1-actual/min_val)*100:.1f}%)",
                    severity=ConflictSeverity.WARNING,
                    status=ConstraintStatus.VIOLATED,
                    target_value=min_val,
                    actual_value=actual,
                    violation_amount=amount,
                    metadata={"field": field, "direction": "under"}
                )
                conflicts.append(constraint)

        return sorted(conflicts)

    def detect_allergen_conflicts(
        self, ingredients: List[Ingredient], portions: Dict[str, float],
        excluded_allergens: List[str]
    ) -> List[Constraint]:
        """检测过敏源冲突"""
        conflicts = []
        for ing_id, amount in portions.items():
            if amount <= 1e-6:
                continue
            ing = next((i for i in ingredients if i.id == ing_id), None)
            if not ing:
                continue

            for allergen in excluded_allergens:
                if ing.has_allergen(allergen):
                    constraint = Constraint(
                        type=ConstraintType.ALLERGEN,
                        name=f"过敏源: {ing.name} 含 {allergen}",
                        description=f"{ing.name} 用量 {amount:.3f}kg，含禁止过敏源 {allergen}",
                        severity=ConflictSeverity.BLOCKER,
                        status=ConstraintStatus.VIOLATED,
                        violation_amount=amount,
                        affected_ingredients=[ing_id],
                        metadata={"allergen": allergen}
                    )
                    conflicts.append(constraint)

        return sorted(conflicts)

    def check_stockout_before_nutrition(
        self, plan: MealPlan
    ) -> Tuple[bool, List[Constraint], List[Constraint]]:
        """
        检查冲突顺序：缺货优先于营养超标
        返回：(是否有缺货优先, 缺货冲突列表, 营养冲突列表)
        """
        stock_conflicts = []
        nutrition_conflicts = []

        for c in plan.constraints:
            if c.status == ConstraintStatus.SATISFIED:
                continue
            if c.type == ConstraintType.STOCKOUT and c.severity == ConflictSeverity.BLOCKER:
                stock_conflicts.append(c)
            elif c.type == ConstraintType.NUTRITION:
                nutrition_conflicts.append(c)

        stock_conflicts.sort()
        nutrition_conflicts.sort()

        has_priority = len(stock_conflicts) > 0 and len(nutrition_conflicts) > 0

        return has_priority, stock_conflicts, nutrition_conflicts

    def explain_order(self, plan: MealPlan) -> str:
        """解释冲突解决顺序"""
        has_priority, stock, nutrition = self.check_stockout_before_nutrition(plan)

        lines = ["## 冲突解决优先级说明"]

        if not stock and not nutrition:
            lines.append("✓ 无需要解决的冲突")
            return "\n".join(lines)

        lines.append("")
        lines.append("### 优先级规则")
        lines.append("1. **缺货冲突** (BLOCKER) - 必须首先解决，没有食材无法配餐")
        lines.append("2. **过敏源冲突** (BLOCKER) - 安全优先")
        lines.append("3. **营养超标** (CRITICAL) - 健康次之")
        lines.append("4. **营养不足** (WARNING) - 可调整")
        lines.append("5. **成本问题** (INFO) - 最后优化")
        lines.append("")

        if has_priority:
            lines.append("### 本次冲突顺序")
            lines.append("")
            lines.append("#### 第一优先级：缺货（先补货/换食材）")
            for c in stock:
                lines.append(f"- ❌ {c.description}")
            lines.append("")
            lines.append("#### 第二优先级：营养（缺货解决后再调整）")
            for c in nutrition:
                lines.append(f"- ⚠️ {c.description}")
            lines.append("")
            lines.append(f"> **为什么先拦缺货？** 缺货是硬约束，不补货无法出餐；")
            lines.append(f"> 营养超标可以通过调整用量或换食材解决，但前提是有可用食材。")
        elif stock:
            lines.append("### 本次仅缺货冲突")
            for c in stock:
                lines.append(f"- ❌ {c.description}")
        elif nutrition:
            lines.append("### 本次仅营养冲突")
            for c in nutrition:
                lines.append(f"- ⚠️ {c.description}")

        return "\n".join(lines)
