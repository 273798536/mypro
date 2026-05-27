from __future__ import annotations

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal, Dict, Any


class SKU(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sku_id: str
    name: str
    length: float = Field(gt=0, description="cm")
    width: float = Field(gt=0, description="cm")
    height: float = Field(gt=0, description="cm")
    weight: float = Field(ge=0, description="kg")
    fragile: bool = False
    bearing_capacity_kg: Optional[float] = Field(
        default=None,
        description="承重上限(kg)；易碎品若上面堆重不得超过该值；None 表示不允许堆叠",
    )
    rotation_allowed: bool = True
    source: str = Field(default="manual", description="数据来源标记，用于溯源")
    note: Optional[str] = None


class OrderLine(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sku_id: str
    qty: int = Field(ge=1)
    source: str = Field(default="order")
    note: Optional[str] = None


class BoxType(BaseModel):
    model_config = ConfigDict(extra="forbid")
    box_id: str
    name: str
    length: float = Field(gt=0, description="cm")
    width: float = Field(gt=0, description="cm")
    height: float = Field(gt=0, description="cm")
    max_weight: float = Field(ge=0, description="kg")
    cost: float = Field(ge=0, description="元/箱")
    source: str = Field(default="boxlib")
    note: Optional[str] = None


class PackingConstraints(BaseModel):
    max_boxes_per_order: Optional[int] = Field(default=None, ge=1)
    forbid_mix_fragile: bool = False
    split_penalty: float = Field(
        default=1.0,
        ge=0,
        description="每多开一箱附加的拆箱成本/惩罚，单位元",
    )
    time_limit_sec: int = 10
    gap_tol: float = 0.02
    source: str = Field(default="rules")


class RecommendRequest(BaseModel):
    order_id: str
    lines: List[OrderLine]
    catalog: List[SKU]
    boxes: List[BoxType]
    constraints: PackingConstraints = Field(default_factory=PackingConstraints)


class BoxAssignment(BaseModel):
    box_id: str
    box_name: str
    sku_id: str
    qty: int
    orientation: Literal["LxWxH", "LxHxW", "WxHxL"]
    packed_volume_cm3: float
    box_used_volume_cm3: float
    box_total_volume_cm3: float
    weight_in_box_kg: float
    warnings: List[str] = Field(default_factory=list)


class ConstraintExplanation(BaseModel):
    constraint: str
    description: str
    active: bool
    detail: str


class RecommendReport(BaseModel):
    order_id: str
    feasible: bool
    objective_value: float
    boxes_opened: int
    total_cost: float
    split_penalty_total: float
    assignments: List[BoxAssignment]
    explanations: List[ConstraintExplanation]
    issues: List[str]
    trace: Dict[str, Any] = Field(default_factory=dict)
