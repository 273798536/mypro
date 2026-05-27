from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, field_validator


class Unit(str, Enum):
    KG = "kg"
    TON = "ton"
    PIECE = "piece"
    HOUR = "hour"
    LITER = "liter"
    METER = "meter"


class Product(BaseModel):
    id: str
    name: str
    profit_per_unit: float
    unit: Unit
    description: Optional[str] = None


class Material(BaseModel):
    id: str
    name: str
    unit: Unit
    available: float
    description: Optional[str] = None


class MaterialUsage(BaseModel):
    material_id: str
    amount_per_unit: float


class CapacityConstraint(BaseModel):
    id: str
    name: str
    max_capacity: float
    unit: Unit
    usage_per_unit: Dict[str, float]
    description: Optional[str] = None


class OrderDemand(BaseModel):
    product_id: str
    min_demand: float = 0.0
    max_demand: Optional[float] = None
    description: Optional[str] = None


class SourceInfo(BaseModel):
    name: str
    file: Optional[str] = None
    sheet: Optional[str] = None
    row: Optional[int] = None
    note: Optional[str] = None


class CorrectionTrace(BaseModel):
    id: str
    timestamp: datetime
    operator: str
    description: str
    field: str
    old_value: Any
    new_value: Any


class LPInput(BaseModel):
    version: str
    description: str
    products: List[Product]
    materials: List[Material]
    material_usage: Dict[str, List[MaterialUsage]]
    capacity_constraints: List[CapacityConstraint]
    order_demands: List[OrderDemand]
    sources: List[SourceInfo] = Field(default_factory=list)
    corrections: List[CorrectionTrace] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)

    @field_validator("products")
    def check_unique_product_ids_unique(cls, v):
        ids = [p.id for p in v]
        if len(ids) != len(set(ids)):
            raise ValueError("产品ID不能重复")
        return v

    @field_validator("materials")
    def check_material_ids_unique(cls, v):
        ids = [m.id for m in v]
        if len(ids) != len(set(ids)):
            raise ValueError("原料ID不能重复")
        return v

    def get_product(self, product_id: str) -> Optional[Product]:
        for p in self.products:
            if p.id == product_id:
                return p
        return None

    def get_material(self, material_id: str) -> Optional[Material]:
        for m in self.materials:
            if m.id == material_id:
                return m
        return None


class SolutionStatus(str, Enum):
    OPTIMAL = "optimal"
    INFEASIBLE = "infeasible"
    UNBOUNDED = "unbounded"
    DEGENERATE = "degenerate"
    ERROR = "error"


class ShadowPrice(BaseModel):
    constraint_id: str
    constraint_name: str
    shadow_price: float
    allowable_increase: Optional[float]
    allowable_decrease: Optional[float]
    current_rhs: float
    unit: Unit
    description: Optional[str] = None


class ProductResult(BaseModel):
    product_id: str
    product_name: str
    production_amount: float
    unit: Unit
    reduced_cost: float
    profit_contribution: float


class LPOutput(BaseModel):
    input_version: str
    status: SolutionStatus
    total_profit: float
    products: List[ProductResult]
    shadow_prices: List[ShadowPrice]
    solve_time: float
    is_degenerate: bool = False
    messages: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)


class ValidationIssueType(str, Enum):
    UNPROCESSED = "unprocessed"
    CORRECTED = "corrected"
    NEEDS_HUMAN_REVIEW = "needs_human_review"


class ValidationIssue(BaseModel):
    type: ValidationIssueType
    category: str
    message: str
    details: Optional[Dict[str, Any]] = None
    field: Optional[str] = None


class ValidationResult(BaseModel):
    issues: List[ValidationIssue] = Field(default_factory=list)

    @property
    def has_errors(self) -> bool:
        return any(i.type == ValidationIssueType.NEEDS_HUMAN_REVIEW for i in self.issues)

    @property
    def unprocessed(self) -> List[ValidationIssue]:
        return [i for i in self.issues if i.type == ValidationIssueType.UNPROCESSED]

    @property
    def corrected(self) -> List[ValidationIssue]:
        return [i for i in self.issues if i.type == ValidationIssueType.CORRECTED]

    @property
    def needs_review(self) -> List[ValidationIssue]:
        return [i for i in self.issues if i.type == ValidationIssueType.NEEDS_HUMAN_REVIEW]
