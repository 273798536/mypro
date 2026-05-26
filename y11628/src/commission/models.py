from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Optional, Any
from enum import Enum


class OrderStatus(str, Enum):
    NORMAL = "normal"
    CROSS_REGION = "cross_region"
    PAYMENT_PENDING = "payment_pending"
    RATE_VERSION_MISMATCH = "rate_version_mismatch"
    MISSING_DATA = "missing_data"
    MANUAL_REVIEW = "manual_review"
    CORRECTED = "corrected"
    ERROR = "error"


class CorrectionType(str, Enum):
    REGION_FIX = "region_fix"
    RATE_VERSION_FIX = "rate_version_fix"
    PAYMENT_STATUS_FIX = "payment_status_fix"
    AMOUNT_FIX = "amount_fix"
    MANUAL_OVERRIDE = "manual_override"


@dataclass
class SalesOrder:
    order_id: str
    salesperson: str
    region: str
    product_line: str
    amount: float
    order_date: str
    payment_status: str
    payment_amount: float
    payment_date: Optional[str] = None
    rate_version: Optional[str] = None
    source_file: str = ""
    raw_data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RegionRule:
    region: str
    allowed_product_lines: List[str]
    payment_requirement_days: int
    rate_table: str
    cross_region_allowed: bool = False
    cross_region_penalty: float = 0.0


@dataclass
class TierRate:
    rate_version: str
    product_line: str
    min_amount: float
    max_amount: Optional[float]
    rate: float
    effective_date: str
    expiry_date: Optional[str] = None


@dataclass
class CalculationResult:
    order_id: str
    salesperson: str
    base_amount: float
    applicable_rate: float
    commission_before_adjustment: float
    adjustment: float
    final_commission: float
    status: OrderStatus
    messages: List[str] = field(default_factory=list)
    tier_level: str = ""
    rate_version_used: str = ""


@dataclass
class CorrectionRecord:
    order_id: str
    correction_type: CorrectionType
    field_name: str
    old_value: Any
    new_value: Any
    reason: str
    corrected_by: str
    corrected_at: datetime
    source: str = ""


@dataclass
class ValidationIssue:
    order_id: str
    issue_type: str
    severity: str
    message: str
    suggested_fix: Optional[str] = None


@dataclass
class ReportSummary:
    total_orders: int = 0
    normal_count: int = 0
    corrected_count: int = 0
    pending_review_count: int = 0
    error_count: int = 0
    total_commission: float = 0.0
    corrections_count: int = 0
    cross_region_count: int = 0
    payment_pending_count: int = 0
    rate_mismatch_count: int = 0
