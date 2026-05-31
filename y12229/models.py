from dataclasses import dataclass, field
from datetime import date
from typing import List, Optional, Dict
from enum import Enum


class ContainerType(Enum):
    TE20 = "20GP"
    TE40 = "40GP"
    TE40HQ = "40HQ"
    TE45 = "45HQ"


class IssueType(Enum):
    PRICE_EXPIRED = "锁价过期"
    CONTAINER_CHANGED = "箱型替换"
    BAF_ADJUSTMENT = "燃油追补"
    QUOTE_VERSION_MISMATCH = "报价版本不符"
    OTHER = "其他"


class IssueSeverity(Enum):
    CRITICAL = "严重"
    WARNING = "警告"
    INFO = "提示"


@dataclass
class PriceLockAgreement:
    agreement_id: str
    customer_name: str
    trade_lane: str
    origin: str
    destination: str
    carrier: str
    container_type: ContainerType
    base_rate: float
    baf_rate: float
    effective_date: date
    expiry_date: date
    quote_version: str
    currency: str = "USD"
    remarks: Optional[str] = None


@dataclass
class BookingOrder:
    booking_no: str
    agreement_id: str
    customer_name: str
    trade_lane: str
    origin: str
    destination: str
    carrier: str
    container_type: ContainerType
    container_count: int
    etd: date
    quote_version: str
    agreed_base_rate: Optional[float] = None
    agreed_baf_rate: Optional[float] = None
    remarks: Optional[str] = None


@dataclass
class AmendmentRecord:
    amendment_id: str
    booking_no: str
    amendment_date: date
    amendment_type: str
    field_changed: str
    old_value: str
    new_value: str
    reason: Optional[str] = None


@dataclass
class BAFRate:
    rate_id: str
    carrier: str
    trade_lane: str
    effective_date: date
    expiry_date: date
    baf_20gp: float
    baf_40gp: float
    baf_40hq: float
    currency: str = "USD"


@dataclass
class CostReport:
    report_id: str
    booking_no: str
    container_type: ContainerType
    container_count: int
    actual_base_rate: float
    actual_baf_rate: float
    other_charges: float
    total_amount: float
    report_date: date
    currency: str = "USD"
    source: str = ""


@dataclass
class Issue:
    issue_id: str
    issue_type: IssueType
    severity: IssueSeverity
    booking_no: str
    title: str
    description: str
    source_records: List[str]
    amount_diff: Optional[float] = None
    currency: str = "USD"
    details: Dict = field(default_factory=dict)


@dataclass
class VerificationResult:
    booking_no: str
    agreement_id: str
    is_match: bool
    issues: List[Issue]
    expected_base_rate: float
    expected_baf_rate: float
    actual_base_rate: float
    actual_baf_rate: float
    base_rate_diff: float
    baf_diff: float
    total_diff: float
    quote_version: str
    container_type: ContainerType
    audit_trail: Dict = field(default_factory=dict)


@dataclass
class ExportBill:
    bill_no: str
    booking_no: str
    agreement_id: str
    customer_name: str
    trade_lane: str
    container_type: ContainerType
    container_count: int
    etd: date
    base_rate: float
    baf_rate: float
    other_charges: float
    total_amount: float
    currency: str
    issues_summary: List[str]
    has_discrepancy: bool
    discrepancy_amount: float
