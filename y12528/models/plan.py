from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime
from .nutrition import NutritionInfo
from .constraint import Constraint, ConflictChain


@dataclass
class SolverTrace:
    """求解器追踪记录，用于审计"""
    step: int
    description: str
    variables: Dict[str, float] = field(default_factory=dict)
    constraints_checked: List[str] = field(default_factory=list)
    objective_value: Optional[float] = None
    timestamp: datetime = field(default_factory=datetime.now)
    extra: Dict[str, Any] = field(default_factory=dict)

    def __str__(self) -> str:
        var_str = ", ".join(f"{k}={v:.2f}" for k, v in self.variables.items())
        return f"[Step {self.step}] {self.description} | {var_str} | obj={self.objective_value}"


@dataclass
class MealPlan:
    """配餐方案"""
    plan_id: str
    name: str
    meal_type: str
    portions: Dict[str, float]
    total_cost: float
    total_nutrition: NutritionInfo
    constraints: List[Constraint] = field(default_factory=list)
    conflict_chain: Optional[ConflictChain] = None
    solver_traces: List[SolverTrace] = field(default_factory=list)
    is_feasible: bool = True
    created_at: datetime = field(default_factory=datetime.now)
    parent_plan_id: Optional[str] = None
    revision_note: str = ""

    def get_active_constraints(self) -> List[Constraint]:
        from models.constraint import ConstraintStatus
        return [c for c in self.constraints if c.status != ConstraintStatus.SATISFIED]

    def total_allergens(self) -> List[str]:
        allergens = set()
        for ing_id in self.portions.keys():
            ing = self._get_ingredient(ing_id)
            if ing:
                if hasattr(ing, 'allergens'):
                    allergens.update(ing.allergens)
                elif isinstance(ing, dict) and 'allergens' in ing:
                    allergens.update(ing['allergens'])
        return sorted(allergens)

    def _get_ingredient(self, ing_id: str):
        for trace in self.solver_traces:
            if "ingredients" in trace.extra:
                for ing in trace.extra["ingredients"]:
                    ing_id_val = ing.id if hasattr(ing, 'id') else ing['id']
                    if ing_id_val == ing_id:
                        return ing
        return None

    def summary(self) -> Dict:
        return {
            "plan_id": self.plan_id,
            "name": self.name,
            "meal_type": self.meal_type,
            "total_cost": round(self.total_cost, 2),
            "is_feasible": self.is_feasible,
            "portions": {k: round(v, 3) for k, v in self.portions.items()},
            "nutrition": {
                "calories": round(self.total_nutrition.calories, 1),
                "protein": round(self.total_nutrition.protein, 1),
                "fat": round(self.total_nutrition.fat, 1),
                "carbs": round(self.total_nutrition.carbs, 1),
                "sodium": round(self.total_nutrition.sodium, 1),
            },
            "conflicts": len(self.get_active_constraints()),
            "revision_note": self.revision_note,
        }


@dataclass
class PlanComparison:
    """方案对比"""
    plan_a: MealPlan
    plan_b: MealPlan
    comparison_fields: List[str] = field(default_factory=lambda: [
        "total_cost", "calories", "protein", "fat", "carbs", "sodium"
    ])

    def compare(self) -> Dict:
        result = {}
        a_sum = self.plan_a.summary()
        b_sum = self.plan_b.summary()

        result["plan_a"] = {"id": self.plan_a.plan_id, "name": self.plan_a.name, "is_feasible": self.plan_a.is_feasible}
        result["plan_b"] = {"id": self.plan_b.plan_id, "name": self.plan_b.name, "is_feasible": self.plan_b.is_feasible}
        result["differences"] = {}

        if "total_cost" in self.comparison_fields:
            diff = b_sum["total_cost"] - a_sum["total_cost"]
            pct = (diff / a_sum["total_cost"] * 100) if a_sum["total_cost"] > 0 else 0
            result["differences"]["total_cost"] = {
                "a": a_sum["total_cost"], "b": b_sum["total_cost"],
                "diff": round(diff, 2), "pct": round(pct, 1),
                "better": "B" if diff < 0 else "A" if diff > 0 else "equal"
            }

        for field in ["calories", "protein", "fat", "carbs", "sodium"]:
            if field in self.comparison_fields:
                a_val = a_sum["nutrition"][field]
                b_val = b_sum["nutrition"][field]
                diff = b_val - a_val
                pct = (diff / a_val * 100) if a_val > 0 else 0
                result["differences"][field] = {
                    "a": a_val, "b": b_val,
                    "diff": round(diff, 2), "pct": round(pct, 1),
                }

        result["portions_diff"] = {}
        all_ings = set(self.plan_a.portions.keys()) | set(self.plan_b.portions.keys())
        for ing in all_ings:
            a_p = self.plan_a.portions.get(ing, 0)
            b_p = self.plan_b.portions.get(ing, 0)
            if abs(a_p - b_p) > 1e-6:
                result["portions_diff"][ing] = {
                    "a": round(a_p, 3), "b": round(b_p, 3),
                    "diff": round(b_p - a_p, 3)
                }

        return result

    def to_markdown(self) -> str:
        data = self.compare()
        lines = [
            f"# 方案对比报告",
            "",
            f"## 基本信息",
            f"| 方案 | ID | 名称 | 可行性 |",
            f"|------|----|------|--------|",
            f"| A | {data['plan_a']['id']} | {data['plan_a']['name']} | {'✓ 可行' if data['plan_a']['is_feasible'] else '✗ 不可行'} |",
            f"| B | {data['plan_b']['id']} | {data['plan_b']['name']} | {'✓ 可行' if data['plan_b']['is_feasible'] else '✗ 不可行'} |",
            "",
            f"## 指标对比",
            f"| 指标 | 方案A | 方案B | 差异 | 变化率 |",
            f"|------|-------|-------|------|--------|",
        ]

        for field, info in data["differences"].items():
            unit = "元" if field == "total_cost" else "kcal" if field == "calories" else "g" if field != "sodium" else "mg"
            sign = "+" if info["diff"] > 0 else ""
            pct_sign = "+" if info["pct"] > 0 else ""
            lines.append(
                f"| {field} | {info['a']}{unit} | {info['b']}{unit} | {sign}{info['diff']}{unit} | {pct_sign}{info['pct']}% |"
            )

        if data["portions_diff"]:
            lines.extend([
                "",
                f"## 用量调整",
                f"| 食材 | 方案A(kg) | 方案B(kg) | 调整量(kg) |",
                f"|------|-----------|-----------|------------|",
            ])
            for ing, p in data["portions_diff"].items():
                sign = "+" if p["diff"] > 0 else ""
                lines.append(f"| {ing} | {p['a']} | {p['b']} | {sign}{p['diff']} |")

        return "\n".join(lines)
