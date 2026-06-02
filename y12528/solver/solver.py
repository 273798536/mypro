import uuid
import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from scipy.optimize import linprog

from models import (
    Ingredient, NutritionInfo, NutritionTarget,
    Constraint, ConstraintType, ConstraintStatus, ConflictSeverity,
    MealPlan, SolverTrace, ConflictChain
)


@dataclass
class SolverConfig:
    """求解器配置"""
    meal_total_weight: float = 1.0
    min_portion_per_ingredient: float = 0.02
    max_portion_per_ingredient: float = 0.4
    excluded_allergens: List[str] = field(default_factory=list)
    relax_nutrition_on_fail: bool = True
    relax_step: float = 0.1
    max_relax_iterations: int = 5
    require_variety: bool = True
    min_ingredient_count: int = 3


@dataclass
class SolverResult:
    """求解结果"""
    success: bool
    message: str
    plan: Optional[MealPlan] = None
    cost: float = 0.0
    portions: Dict[str, float] = field(default_factory=dict)
    iterations: int = 0


class MealPlanner:
    """
    线性规划配餐引擎
    目标：最小化成本
    约束：热量范围、营养成分、库存、过敏源、用量范围
    """

    def __init__(self, config: Optional[SolverConfig] = None):
        self.config = config or SolverConfig()

    def plan(
        self,
        ingredients: List[Ingredient],
        nutrition_map: Dict[str, NutritionInfo],
        target: NutritionTarget,
        meal_type: str = "午餐",
        plan_name: str = "标准配餐",
        parent_plan_id: Optional[str] = None,
        revision_note: str = ""
    ) -> SolverResult:
        """执行配餐规划"""
        traces: List[SolverTrace] = []
        step_counter = 0

        step_counter += 1
        traces.append(SolverTrace(
            step=step_counter,
            description="开始配餐规划",
            extra={
                "ingredient_count": len(ingredients),
                "meal_type": meal_type,
                "target": {
                    "calories": (target.calories_min, target.calories_max),
                    "protein": (target.protein_min, target.protein_max),
                    "fat": (target.fat_min, target.fat_max),
                }
            }
        ))

        step_counter, active_ings, excluded_ings, excluded_reasons = self._filter_ingredients(
            ingredients, nutrition_map, step_counter, traces
        )

        if len(active_ings) < self.config.min_ingredient_count:
            return self._build_failure_result(
                f"可用食材不足，需要至少{self.config.min_ingredient_count}种，仅{len(active_ings)}种",
                traces, ingredients, nutrition_map, step_counter,
                excluded_reasons, meal_type, plan_name, parent_plan_id, revision_note
            )

        result = self._solve_lp(active_ings, nutrition_map, target, step_counter, traces)

        if result.success:
            return self._build_success_result(
                result, active_ings, nutrition_map, target, traces,
                excluded_reasons, meal_type, plan_name, parent_plan_id, revision_note
            )

        if self.config.relax_nutrition_on_fail:
            relaxed_result = self._relax_and_solve(
                active_ings, nutrition_map, target, step_counter, traces
            )
            if relaxed_result.success:
                return self._build_success_result(
                    relaxed_result, active_ings, nutrition_map, target, traces,
                    excluded_reasons, meal_type, plan_name, parent_plan_id,
                    revision_note + f" | 已放宽{len(relaxed_result.relaxed_constraints)}项约束"
                )

        return self._build_failure_result(
            f"无法找到可行解: {result.message}",
            traces, ingredients, nutrition_map, step_counter,
            excluded_reasons, meal_type, plan_name, parent_plan_id, revision_note
        )

    def _filter_ingredients(
        self, ingredients: List[Ingredient], nutrition_map: Dict[str, NutritionInfo],
        step_counter: int, traces: List[SolverTrace]
    ) -> Tuple[int, List[Ingredient], List[Ingredient], List[Constraint]]:
        """过滤食材：排除缺货、含过敏源、无营养数据的"""
        active_ings = []
        excluded_ings = []
        excluded_reasons = []

        for ing in ingredients:
            reasons = []

            if not ing.is_active:
                reasons.append(("已停用", ConflictSeverity.INFO))

            if ing.stock_available <= 0:
                reasons.append(("库存为0", ConflictSeverity.BLOCKER))

            for allergen in self.config.excluded_allergens:
                if ing.has_allergen(allergen):
                    reasons.append((f"含过敏源{allergen}", ConflictSeverity.CRITICAL))

            if ing.id not in nutrition_map:
                reasons.append(("无营养数据", ConflictSeverity.WARNING))

            if reasons:
                excluded_ings.append(ing)
                for reason_text, severity in reasons:
                    constraint = Constraint(
                        type=ConstraintType.STOCKOUT if "库存" in reason_text else
                             ConstraintType.ALLERGEN if "过敏源" in reason_text else
                             ConstraintType.NUTRITION,
                        name=f"食材排除: {ing.name}",
                        description=f"{ing.name}({ing.id}) 因{reason_text}被排除",
                        severity=severity,
                        status=ConstraintStatus.VIOLATED,
                        affected_ingredients=[ing.id],
                        violation_amount=ing.stock_available if "库存" in reason_text else 1.0,
                        metadata={"reason": reason_text, "ingredient_name": ing.name}
                    )
                    excluded_reasons.append(constraint)
            else:
                active_ings.append(ing)

        step_counter += 1
        traces.append(SolverTrace(
            step=step_counter,
            description="过滤食材",
            extra={
                "total": len(ingredients),
                "active": len(active_ings),
                "excluded": len(excluded_ings),
                "excluded_details": [
                    {"id": ing.id, "name": ing.name, "reasons": [c.metadata["reason"] for c in excluded_reasons if c.affected_ingredients[0] == ing.id]}
                    for ing in excluded_ings
                ]
            }
        ))

        return step_counter, active_ings, excluded_ings, excluded_reasons

    def _build_lp_problem(
        self, ingredients: List[Ingredient], nutrition_map: Dict[str, NutritionInfo],
        target: NutritionTarget, step_counter: int, traces: List[SolverTrace]
    ) -> Dict:
        """构建线性规划问题"""
        n = len(ingredients)
        ing_ids = [ing.id for ing in ingredients]

        c = np.array([ing.cost_per_unit for ing in ingredients])

        A_ub = []
        b_ub = []
        A_eq = []
        b_eq = []
        bounds = []
        constraint_names = []

        for ing in ingredients:
            lb = self.config.min_portion_per_ingredient
            ub = min(self.config.max_portion_per_ingredient, ing.stock_available)
            bounds.append((lb, ub))

            constraint_names.append(f"用量下限: {ing.name}")
            constraint_names.append(f"用量上限: {ing.name}(库存{ing.stock_available:.3f})")

        A_eq.append([1.0] * n)
        b_eq.append(self.config.meal_total_weight)
        constraint_names.append("总重量 = 1kg")

        for field, (min_val, max_val) in target.get_fields().items():
            coeffs = []
            for ing in ingredients:
                nutr = nutrition_map[ing.id]
                coeffs.append(getattr(nutr, field))

            if min_val is not None:
                A_ub.append([-x for x in coeffs])
                b_ub.append(-min_val)
                constraint_names.append(f"{field} >= {min_val}")

            if max_val is not None:
                A_ub.append(coeffs)
                b_ub.append(max_val)
                constraint_names.append(f"{field} <= {max_val}")

        for i, ing in enumerate(ingredients):
            coeffs = [0.0] * n
            coeffs[i] = 1.0
            A_ub.append(coeffs)
            b_ub.append(ing.stock_available)
            constraint_names.append(f"库存约束: {ing.name} <= {ing.stock_available:.3f}")

        step_counter += 1
        traces.append(SolverTrace(
            step=step_counter,
            description="构建LP问题",
            variables={"变量数": n, "不等式约束": len(A_ub), "等式约束": len(A_eq)},
            extra={
                "objective_coeffs": {ing.name: round(cost, 2) for ing, cost in zip(ingredients, c)},
                "constraints": constraint_names,
                "ingredients": [{"id": ing.id, "name": ing.name, "stock": ing.stock_available, "cost": ing.cost_per_unit, "allergens": ing.allergens} for ing in ingredients]
            }
        ))

        return {
            "c": c,
            "A_ub": np.array(A_ub) if A_ub else None,
            "b_ub": np.array(b_ub) if b_ub else None,
            "A_eq": np.array(A_eq) if A_eq else None,
            "b_eq": np.array(b_eq) if b_eq else None,
            "bounds": bounds,
            "constraint_names": constraint_names,
            "ingredient_ids": ing_ids,
            "step_counter": step_counter
        }

    def _solve_lp(
        self, ingredients: List[Ingredient], nutrition_map: Dict[str, NutritionInfo],
        target: NutritionTarget, step_counter: int, traces: List[SolverTrace]
    ) -> SolverResult:
        """求解线性规划"""
        problem = self._build_lp_problem(ingredients, nutrition_map, target, step_counter, traces)
        step_counter = problem["step_counter"]

        try:
            res = linprog(
                problem["c"],
                A_ub=problem["A_ub"],
                b_ub=problem["b_ub"],
                A_eq=problem["A_eq"],
                b_eq=problem["b_eq"],
                bounds=problem["bounds"],
                method="highs"
            )

            step_counter += 1
            traces.append(SolverTrace(
                step=step_counter,
                description="LP求解完成",
                objective_value=res.fun if res.success else None,
                extra={
                    "success": res.success,
                    "status": res.status,
                    "message": res.message,
                    "iterations": res.nit if hasattr(res, "nit") else 0,
                }
            ))

            if res.success:
                portions = {}
                for ing_id, x in zip(problem["ingredient_ids"], res.x):
                    if x > 1e-6:
                        portions[ing_id] = float(x)

                total_cost = float(res.fun)

                step_counter += 1
                traces.append(SolverTrace(
                    step=step_counter,
                    description="计算营养汇总",
                    variables=portions,
                    objective_value=total_cost,
                ))

                return SolverResult(
                    success=True,
                    message="求解成功",
                    cost=total_cost,
                    portions=portions,
                    iterations=res.nit if hasattr(res, "nit") else 0
                )
            else:
                return SolverResult(
                    success=False,
                    message=res.message,
                    iterations=res.nit if hasattr(res, "nit") else 0
                )

        except Exception as e:
            step_counter += 1
            traces.append(SolverTrace(
                step=step_counter,
                description="LP求解异常",
                extra={"error": str(e)}
            ))
            return SolverResult(success=False, message=f"求解异常: {str(e)}")

    def _relax_and_solve(
        self, ingredients: List[Ingredient], nutrition_map: Dict[str, NutritionInfo],
        target: NutritionTarget, step_counter: int, traces: List[SolverTrace]
    ) -> SolverResult:
        """逐步放宽约束，重新求解"""
        relaxed_constraints = []
        current_target = NutritionTarget(**{
            k: v for k, v in target.__dict__.items()
        })

        for iteration in range(self.config.max_relax_iterations):
            step_counter += 1
            traces.append(SolverTrace(
                step=step_counter,
                description=f"放宽约束迭代 {iteration + 1}",
                extra={"relaxed_count": len(relaxed_constraints)}
            ))

            for field, (min_val, max_val) in target.get_fields().items():
                if min_val is not None:
                    new_min = min_val * (1 - self.config.relax_step * (iteration + 1))
                    setattr(current_target, f"{field}_min", max(0, new_min))
                    if f"{field}_min" not in relaxed_constraints:
                        relaxed_constraints.append(f"{field}_min")

                if max_val is not None:
                    new_max = max_val * (1 + self.config.relax_step * (iteration + 1))
                    setattr(current_target, f"{field}_max", new_max)
                    if f"{field}_max" not in relaxed_constraints:
                        relaxed_constraints.append(f"{field}_max")

            result = self._solve_lp(ingredients, nutrition_map, current_target, step_counter, traces)
            if result.success:
                result.relaxed_constraints = relaxed_constraints
                return result

        return SolverResult(success=False, message="放宽约束后仍无法求解")

    def _calculate_total_nutrition(
        self, portions: Dict[str, float], nutrition_map: Dict[str, NutritionInfo]
    ) -> NutritionInfo:
        """计算总营养"""
        total = NutritionInfo(ingredient_id="total")
        for ing_id, amount in portions.items():
            if ing_id in nutrition_map:
                scaled = nutrition_map[ing_id].scale(amount)
                total.calories += scaled.calories
                total.protein += scaled.protein
                total.fat += scaled.fat
                total.carbs += scaled.carbs
                total.sodium += scaled.sodium
                total.fiber += scaled.fiber
                total.sugar += scaled.sugar
        return total

    def _build_success_result(
        self, result: SolverResult, ingredients: List[Ingredient],
        nutrition_map: Dict[str, NutritionInfo], target: NutritionTarget,
        traces: List[SolverTrace], excluded_reasons: List[Constraint],
        meal_type: str, plan_name: str, parent_plan_id: Optional[str],
        revision_note: str
    ) -> SolverResult:
        """构建成功结果"""
        total_nutrition = self._calculate_total_nutrition(result.portions, nutrition_map)
        constraints = list(excluded_reasons)

        nutr_violations = target.check_violation(total_nutrition)
        for field, amount in nutr_violations.items():
            min_val, max_val = target.get_fields()[field]
            actual = getattr(total_nutrition, field)
            if max_val is not None and actual > max_val:
                target_val = max_val
                direction = "超上限"
            elif min_val is not None and actual < min_val:
                target_val = min_val
                direction = "不足下限"
            else:
                target_val = None
                direction = ""
            constraint = Constraint(
                type=ConstraintType.NUTRITION,
                name=f"营养约束: {field}{direction}",
                description=f"{field} 实际{actual:.2f}",
                severity=ConflictSeverity.WARNING,
                status=ConstraintStatus.RELAXED if hasattr(result, 'relaxed_constraints') else ConstraintStatus.VIOLATED,
                target_value=target_val,
                actual_value=actual,
                violation_amount=amount,
                metadata={"field": field}
            )
            constraints.append(constraint)

        for ing_id, amount in result.portions.items():
            ing = next((i for i in ingredients if i.id == ing_id), None)
            if ing and not ing.is_in_stock(amount):
                constraint = Constraint(
                    type=ConstraintType.STOCKOUT,
                    name=f"库存不足: {ing.name}",
                    description=f"{ing.name} 需要{amount:.3f}kg，库存{ing.stock_available:.3f}kg",
                    severity=ConflictSeverity.BLOCKER,
                    status=ConstraintStatus.VIOLATED,
                    target_value=ing.stock_available,
                    actual_value=amount,
                    violation_amount=amount - ing.stock_available,
                    affected_ingredients=[ing_id]
                )
                constraints.append(constraint)

        cost_constraint = Constraint(
            type=ConstraintType.COST,
            name="总成本",
            description=f"配餐总成本 {result.cost:.2f} 元",
            severity=ConflictSeverity.INFO,
            status=ConstraintStatus.SATISFIED,
            actual_value=result.cost
        )
        constraints.append(cost_constraint)

        conflict_chain = ConflictChain(conflicts=constraints)
        for c in conflict_chain.sorted_conflicts():
            conflict_chain.resolution_order.append(c.name)

        plan = MealPlan(
            plan_id=str(uuid.uuid4())[:8],
            name=plan_name,
            meal_type=meal_type,
            portions=result.portions,
            total_cost=result.cost,
            total_nutrition=total_nutrition,
            constraints=constraints,
            conflict_chain=conflict_chain,
            solver_traces=traces,
            is_feasible=True,
            parent_plan_id=parent_plan_id,
            revision_note=revision_note
        )

        result.plan = plan
        return result

    def _build_failure_result(
        self, message: str, traces: List[SolverTrace],
        ingredients: List[Ingredient], nutrition_map: Dict[str, NutritionInfo],
        step_counter: int, excluded_reasons: List[Constraint],
        meal_type: str, plan_name: str, parent_plan_id: Optional[str],
        revision_note: str
    ) -> SolverResult:
        """构建失败结果"""
        step_counter += 1
        traces.append(SolverTrace(
            step=step_counter,
            description="配餐失败",
            extra={"reason": message}
        ))

        total_nutrition = NutritionInfo(ingredient_id="total")
        plan = MealPlan(
            plan_id=str(uuid.uuid4())[:8],
            name=plan_name + "(不可行)",
            meal_type=meal_type,
            portions={},
            total_cost=0.0,
            total_nutrition=total_nutrition,
            constraints=excluded_reasons,
            conflict_chain=ConflictChain(conflicts=excluded_reasons),
            solver_traces=traces,
            is_feasible=False,
            parent_plan_id=parent_plan_id,
            revision_note=revision_note + f" | 失败原因: {message}"
        )

        return SolverResult(
            success=False,
            message=message,
            plan=plan,
            iterations=0
        )
