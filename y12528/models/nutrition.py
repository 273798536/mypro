from dataclasses import dataclass, field
from typing import Dict, Optional


@dataclass
class NutritionInfo:
    """营养成分表（每单位食材）"""
    ingredient_id: str
    calories: float = 0.0
    protein: float = 0.0
    fat: float = 0.0
    carbs: float = 0.0
    sodium: float = 0.0
    fiber: float = 0.0
    sugar: float = 0.0
    raw_notes: str = ""
    extra: Dict = field(default_factory=dict)

    def scale(self, amount: float) -> "NutritionInfo":
        """按用量缩放营养值"""
        return NutritionInfo(
            ingredient_id=self.ingredient_id,
            calories=self.calories * amount,
            protein=self.protein * amount,
            fat=self.fat * amount,
            carbs=self.carbs * amount,
            sodium=self.sodium * amount,
            fiber=self.fiber * amount,
            sugar=self.sugar * amount,
            raw_notes=self.raw_notes,
            extra=self.extra
        )


@dataclass
class NutritionTarget:
    """营养目标约束"""
    calories_min: Optional[float] = None
    calories_max: Optional[float] = None
    protein_min: Optional[float] = None
    protein_max: Optional[float] = None
    fat_min: Optional[float] = None
    fat_max: Optional[float] = None
    carbs_min: Optional[float] = None
    carbs_max: Optional[float] = None
    sodium_max: Optional[float] = None
    fiber_min: Optional[float] = None
    sugar_max: Optional[float] = None

    def get_fields(self) -> Dict[str, tuple]:
        """获取所有约束字段及其上下限"""
        return {
            "calories": (self.calories_min, self.calories_max),
            "protein": (self.protein_min, self.protein_max),
            "fat": (self.fat_min, self.fat_max),
            "carbs": (self.carbs_min, self.carbs_max),
            "sodium": (None, self.sodium_max),
            "fiber": (self.fiber_min, None),
            "sugar": (None, self.sugar_max),
        }

    def check_violation(self, nutrition: NutritionInfo) -> Dict[str, float]:
        """检查营养超标情况，返回各字段的违反值（正数表示超标/不足多少）"""
        violations = {}
        fields = self.get_fields()
        actual = {
            "calories": nutrition.calories,
            "protein": nutrition.protein,
            "fat": nutrition.fat,
            "carbs": nutrition.carbs,
            "sodium": nutrition.sodium,
            "fiber": nutrition.fiber,
            "sugar": nutrition.sugar,
        }
        for field, (min_val, max_val) in fields.items():
            val = actual.get(field, 0)
            if min_val is not None and val < min_val:
                violations[field] = min_val - val
            if max_val is not None and val > max_val:
                violations[field] = val - max_val
        return violations
