from dataclasses import dataclass, field
from typing import Optional, Dict, List
from enum import Enum


class IngredientSource(Enum):
    """食材来源"""
    LOCAL = "本地采购"
    CENTRAL = "中央厨房"
    IMPORTED = "进口"
    UNKNOWN = "未知"


@dataclass
class Ingredient:
    """食材数据模型"""
    id: str
    name: str
    category: str = ""
    unit: str = "kg"
    cost_per_unit: float = 0.0
    stock_available: float = 0.0
    allergens: List[str] = field(default_factory=list)
    source: IngredientSource = IngredientSource.UNKNOWN
    raw_notes: str = ""
    is_active: bool = True
    extra: Dict = field(default_factory=dict)

    def has_allergen(self, allergen: str) -> bool:
        """检查是否含过敏源"""
        return any(a.lower() == allergen.lower() for a in self.allergens)

    def is_in_stock(self, required_amount: float) -> bool:
        """检查库存是否充足"""
        return self.stock_available >= required_amount - 1e-9

    def __post_init__(self):
        self.allergens = [a.strip() for a in self.allergens if a and str(a).strip()]
