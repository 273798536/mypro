from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class ApprovalStatus(str, Enum):
    PENDING = "待审批"
    APPROVED = "已通过"
    REJECTED = "已驳回"
    ESCALATED = "已升级"


class ExceptionType(str, Enum):
    TIER_OVERLAP = "阶梯重叠"
    APPROVAL_OVERREACH = "审批越权"
    ROUNDING_ERROR = "四舍五入误差"
    NO_MATCHING_TIER = "无匹配阶梯"
    DISCOUNT_EXCEEDS_LIMIT = "折扣超限"
    INVALID_DATA = "数据无效"
    BOUNDARY_CONDITION = "边界条件"


class DataSource(str, Enum):
    QUOTATION_SHEET = "报价单"
    PRICE_LIST = "原价表"
    DISCOUNT_TIER = "折扣阶梯"
    APPROVAL_LEVEL = "审批级别"
    CUSTOMER_LEVEL = "客户等级"
    REVERSE_REPORT = "反推报告"
    MANUAL_CORRECTION = "人工修正"


@dataclass
class DataSourceInfo:
    source: DataSource
    file_name: str
    record_id: str
    loaded_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source": self.source.value,
            "file_name": self.file_name,
            "record_id": self.record_id,
            "loaded_at": self.loaded_at.isoformat()
        }


@dataclass
class AuditTrail:
    timestamp: datetime
    action: str
    before_value: Optional[Any] = None
    after_value: Optional[Any] = None
    operator: str = "system"
    reason: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "action": self.action,
            "before_value": str(self.before_value) if self.before_value else None,
            "after_value": str(self.after_value) if self.after_value else None,
            "operator": self.operator,
            "reason": self.reason
        }


@dataclass
class DiscountTier:
    tier_id: str
    tier_name: str
    min_quantity: float
    max_quantity: Optional[float]
    discount_rate: float
    approval_level_required: int
    description: str = ""

    def covers_quantity(self, qty: float) -> bool:
        if self.max_quantity is None:
            return qty >= self.min_quantity
        return self.min_quantity <= qty <= self.max_quantity

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tier_id": self.tier_id,
            "tier_name": self.tier_name,
            "min_quantity": self.min_quantity,
            "max_quantity": self.max_quantity,
            "discount_rate": self.discount_rate,
            "approval_level_required": self.approval_level_required,
            "description": self.description
        }


@dataclass
class ApprovalLevel:
    level: int
    name: str
    max_discount_allowed: float
    approvers: List[str]
    description: str = ""

    def can_approve(self, discount_rate: float) -> bool:
        return discount_rate <= self.max_discount_allowed

    def to_dict(self) -> Dict[str, Any]:
        return {
            "level": self.level,
            "name": self.name,
            "max_discount_allowed": self.max_discount_allowed,
            "approvers": self.approvers,
            "description": self.description
        }


@dataclass
class CustomerLevel:
    level_id: str
    level_name: str
    base_discount_rate: float
    priority: int = 0
    description: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "level_id": self.level_id,
            "level_name": self.level_name,
            "base_discount_rate": self.base_discount_rate,
            "priority": self.priority,
            "description": self.description
        }


@dataclass
class Product:
    product_id: str
    product_name: str
    standard_price: float
    unit: str = "个"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "product_id": self.product_id,
            "product_name": self.product_name,
            "standard_price": self.standard_price,
            "unit": self.unit
        }


@dataclass
class QuotationItem:
    quotation_id: str
    product_id: str
    product_name: str
    quantity: float
    final_unit_price: float
    standard_price: float
    customer_id: str
    customer_level_id: str
    approval_level: Optional[int] = None
    approver: Optional[str] = None
    approval_status: ApprovalStatus = ApprovalStatus.PENDING
    remark: str = ""

    @property
    def actual_discount_rate(self) -> float:
        if self.standard_price <= 0:
            return 0.0
        return 1 - (self.final_unit_price / self.standard_price)

    @property
    def final_total_amount(self) -> float:
        return self.final_unit_price * self.quantity

    @property
    def standard_total_amount(self) -> float:
        return self.standard_price * self.quantity

    @property
    def total_discount_amount(self) -> float:
        return self.standard_total_amount - self.final_total_amount

    def to_dict(self) -> Dict[str, Any]:
        return {
            "quotation_id": self.quotation_id,
            "product_id": self.product_id,
            "product_name": self.product_name,
            "quantity": self.quantity,
            "final_unit_price": self.final_unit_price,
            "standard_price": self.standard_price,
            "customer_id": self.customer_id,
            "customer_level_id": self.customer_level_id,
            "approval_level": self.approval_level,
            "approver": self.approver,
            "approval_status": self.approval_status.value,
            "actual_discount_rate": round(self.actual_discount_rate, 6),
            "final_total_amount": round(self.final_total_amount, 2),
            "standard_total_amount": round(self.standard_total_amount, 2),
            "total_discount_amount": round(self.total_discount_amount, 2),
            "remark": self.remark
        }


@dataclass
class ReverseStep:
    step_order: int
    step_name: str
    description: str
    value_before: Optional[Any] = None
    value_after: Optional[Any] = None
    formula: Optional[str] = None
    is_exception: bool = False
    exception_type: Optional[ExceptionType] = None
    exception_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_order": self.step_order,
            "step_name": self.step_name,
            "description": self.description,
            "value_before": str(self.value_before) if self.value_before is not None else None,
            "value_after": str(self.value_after) if self.value_after is not None else None,
            "formula": self.formula,
            "is_exception": self.is_exception,
            "exception_type": self.exception_type.value if self.exception_type else None,
            "exception_message": self.exception_message
        }


@dataclass
class ReverseResult:
    quotation_item: QuotationItem
    matched_tier: Optional[DiscountTier] = None
    applied_customer_discount: float = 0.0
    applied_tier_discount: float = 0.0
    total_calculated_discount: float = 0.0
    calculated_unit_price: float = 0.0
    rounding_tolerance: float = 0.01
    price_difference: float = 0.0
    steps: List[ReverseStep] = field(default_factory=list)
    exceptions: List[ReverseStep] = field(default_factory=list)
    approval_validation: Optional["ApprovalValidationResult"] = None
    data_sources: List[DataSourceInfo] = field(default_factory=list)
    audit_trails: List[AuditTrail] = field(default_factory=list)
    is_valid: bool = True
    conclusion: str = ""
    suggestions: List[str] = field(default_factory=list)

    @property
    def has_exceptions(self) -> bool:
        return len(self.exceptions) > 0

    @property
    def price_difference_percent(self) -> float:
        if self.quotation_item.standard_price <= 0:
            return 0.0
        return abs(self.price_difference) / self.quotation_item.standard_price * 100

    def to_dict(self) -> Dict[str, Any]:
        return {
            "quotation": self.quotation_item.to_dict(),
            "matched_tier": self.matched_tier.to_dict() if self.matched_tier else None,
            "applied_customer_discount": round(self.applied_customer_discount, 6),
            "applied_tier_discount": round(self.applied_tier_discount, 6),
            "total_calculated_discount": round(self.total_calculated_discount, 6),
            "calculated_unit_price": round(self.calculated_unit_price, 4),
            "rounding_tolerance": self.rounding_tolerance,
            "price_difference": round(self.price_difference, 4),
            "price_difference_percent": round(self.price_difference_percent, 4),
            "steps": [s.to_dict() for s in self.steps],
            "exceptions": [e.to_dict() for e in self.exceptions],
            "approval_validation": self.approval_validation.to_dict() if self.approval_validation else None,
            "data_sources": [s.to_dict() for s in self.data_sources],
            "audit_trails": [a.to_dict() for a in self.audit_trails],
            "is_valid": self.is_valid,
            "has_exceptions": self.has_exceptions,
            "conclusion": self.conclusion,
            "suggestions": self.suggestions
        }


@dataclass
class ApprovalValidationResult:
    is_valid: bool
    required_level: int
    required_level_name: str
    actual_level: Optional[int]
    actual_level_name: Optional[str]
    max_discount_at_actual_level: Optional[float]
    requested_discount: float
    issues: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "required_level": self.required_level,
            "required_level_name": self.required_level_name,
            "actual_level": self.actual_level,
            "actual_level_name": self.actual_level_name,
            "max_discount_at_actual_level": self.max_discount_at_actual_level,
            "requested_discount": round(self.requested_discount, 6),
            "issues": self.issues
        }
