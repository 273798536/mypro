from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
import uuid


class OrderStatus(Enum):
    PAID = "paid"
    REFUNDED = "refunded"
    PARTIAL_REFUND = "partial_refund"


class AnomalyType(Enum):
    LINK_SPLIT = "link_split"
    REFUND_CROSS_GROUP = "refund_cross_group"
    SUBSIDY_RECOVERY = "subsidy_recovery"
    DUPLICATE_ATTRIBUTION = "duplicate_attribution"
    MISSING_GROUP_OWNER = "missing_group_owner"


class AnomalyStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


@dataclass
class GroupOwner:
    owner_id: str
    name: str
    group_id: str
    group_name: str
    commission_rate: float
    join_date: datetime
    is_active: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SubsidyRule:
    rule_id: str
    rule_name: str
    product_category: Optional[str]
    min_order_amount: float
    subsidy_type: str
    subsidy_value: float
    effective_date: datetime
    expiry_date: Optional[datetime]
    version: int = 1
    is_active: bool = True
    parent_rule_id: Optional[str] = None


@dataclass
class OrderItem:
    item_id: str
    product_id: str
    product_name: str
    product_category: str
    quantity: int
    unit_price: float
    subsidy_applied: float = 0.0
    trace_id: Optional[str] = None


@dataclass
class Order:
    order_id: str
    user_id: str
    group_id: str
    order_time: datetime
    total_amount: float
    status: OrderStatus
    items: List[OrderItem]
    trace_link: Optional[str] = None
    refund_amount: float = 0.0
    refund_time: Optional[datetime] = None
    original_group_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AttributionTrace:
    trace_id: str
    order_id: str
    item_id: str
    owner_id: str
    rule_id: Optional[str]
    commission_amount: float
    subsidy_amount: float
    attribution_time: datetime
    version: int = 1
    is_active: bool = True
    parent_trace_id: Optional[str] = None
    reason: Optional[str] = None


@dataclass
class AnomalyRecord:
    anomaly_id: str
    anomaly_type: AnomalyType
    order_id: str
    item_id: Optional[str]
    owner_id: Optional[str]
    description: str
    suggestion: str
    status: AnomalyStatus
    detected_time: datetime
    affected_amount: float = 0.0
    related_trace_ids: List[str] = field(default_factory=list)
    review_notes: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CommissionSettlement:
    settlement_id: str
    owner_id: str
    period_start: datetime
    period_end: datetime
    total_orders: int
    total_sales: float
    total_commission: float
    total_subsidy: float
    deduction_amount: float
    net_settlement: float
    trace_ids: List[str]
    anomaly_ids: List[str]
    settlement_time: datetime
    version: int = 1


@dataclass
class ProcessLog:
    log_id: str
    process_type: str
    order_id: Optional[str]
    item_id: Optional[str]
    trace_id: Optional[str]
    action: str
    before_value: Optional[str]
    after_value: Optional[str]
    reason: str
    operator: str
    timestamp: datetime


def generate_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"
