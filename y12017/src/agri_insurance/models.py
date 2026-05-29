from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from enum import Enum
import hashlib
import json


class OrderStatus(str, Enum):
    NORMAL = "normal"
    CANCELLED = "cancelled"
    AMENDED = "amended"


class PremiumStatus(str, Enum):
    UNPAID = "unpaid"
    PAID = "paid"
    REFUNDED = "refunded"
    SUBSIDIZED = "subsidized"


class VerifyResult(str, Enum):
    PASSED = "passed"
    FAILED = "failed"
    PENDING = "pending"
    NEEDS_REVIEW = "needs_review"


@dataclass
class SourceRef:
    file_name: str
    sheet_name: Optional[str] = None
    row_number: Optional[int] = None
    raw_value: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "file_name": self.file_name,
            "sheet_name": self.sheet_name,
            "row_number": self.row_number,
            "raw_value": self.raw_value,
        }


@dataclass
class Farmer:
    farmer_id: str
    name: str
    id_card: str
    village: str
    phone: Optional[str] = None
    source: Optional[SourceRef] = None

    def record_id(self) -> str:
        return f"FARMER:{self.farmer_id}"


@dataclass
class PurchaseOrder:
    order_id: str
    farmer_id: str
    crop_type: str
    area_mu: float
    order_date: date
    status: OrderStatus = OrderStatus.NORMAL
    expected_yield_kg: Optional[float] = None
    contract_price: Optional[float] = None
    cancellation_reason: Optional[str] = None
    cancellation_date: Optional[date] = None
    amendment_note: Optional[str] = None
    source: Optional[SourceRef] = None

    def record_id(self) -> str:
        return f"ORDER:{self.order_id}"

    def is_active(self) -> bool:
        return self.status == OrderStatus.NORMAL or self.status == OrderStatus.AMENDED


@dataclass
class PremiumRecord:
    premium_id: str
    order_id: str
    farmer_id: str
    total_premium: float
    farmer_payable: float
    subsidy_amount: float
    premium_date: date
    status: PremiumStatus = PremiumStatus.UNPAID
    policy_number: Optional[str] = None
    insurance_company: Optional[str] = None
    subsidy_tracing: Optional[str] = None
    source: Optional[SourceRef] = None

    def record_id(self) -> str:
        return f"PREMIUM:{self.premium_id}"


@dataclass
class VerificationRecord:
    verify_id: str
    order_id: str
    farmer_id: str
    reported_area: float
    verified_area: float
    area_diff: float
    area_diff_pct: float
    result: VerifyResult
    check_items: Dict[str, Any] = field(default_factory=dict)
    notes: Optional[str] = None
    verify_date: Optional[date] = None
    sources: List[SourceRef] = field(default_factory=list)

    def record_id(self) -> str:
        return f"VERIFY:{self.verify_id}"


@dataclass
class PremiumSplit:
    split_id: str
    order_id: str
    farmer_id: str
    crop_type: str
    area_mu: float
    total_premium: float
    farmer_payable: float
    subsidy_amount: float
    subsidy_rate: float
    unit_premium: float
    calculation_details: Dict[str, Any] = field(default_factory=dict)
    sources: List[SourceRef] = field(default_factory=list)

    def record_id(self) -> str:
        return f"SPLIT:{self.split_id}"


@dataclass
class ReviewItem:
    item_id: str
    category: str
    order_id: str
    farmer_id: str
    farmer_name: str
    issue_description: str
    severity: str
    related_records: List[str] = field(default_factory=list)
    suggestion: Optional[str] = None
    sources: List[SourceRef] = field(default_factory=list)

    def record_id(self) -> str:
        return f"REVIEW:{self.item_id}"


@dataclass
class ProcessResult:
    batch_id: str
    process_time: datetime
    farmer_count: int
    order_count: int
    premium_count: int
    verification_count: int
    split_count: int
    review_count: int
    cancelled_order_count: int
    amended_order_count: int
    total_farmer_payable: float
    total_subsidy: float
    total_premium: float
    data_hash: str
    output_files: Dict[str, str] = field(default_factory=dict)


def compute_data_hash(data: Any) -> str:
    json_str = json.dumps(data, sort_keys=True, default=str, ensure_ascii=False)
    return hashlib.sha256(json_str.encode("utf-8")).hexdigest()[:16]
