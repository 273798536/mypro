from datetime import datetime
from enum import Enum
from typing import Optional, List
from dataclasses import dataclass, field


class SourceType(Enum):
    EXPORT_ORDER = "出口订单"
    INSURANCE_POLICY = "保单"
    CLAIM_RECORD = "赔付记录"
    RECOVERY_RECORD = "追偿记录"


class AbnormalType(Enum):
    DEDUCTION = "赔付扣减"
    LATE_RECOVERY = "追偿晚到"
    BUYER_MERGE = "买家合并"
    POLICY_OVERDUE = "保单逾期"
    CLAIM_DISPUTE = "赔付争议"


class VerificationStatus(Enum):
    PENDING = "待核销"
    PARTIAL = "部分核销"
    FULL = "全额核销"
    ABANDONED = "放弃核销"


@dataclass
class ExportOrder:
    order_id: str
    order_date: datetime
    buyer_name: str
    buyer_country: str
    product_name: str
    quantity: int
    unit_price: float
    currency: str
    total_amount: float
    shipment_date: Optional[datetime] = None
    payment_term: str = "OA90"
    source_tag: str = "SOURCE_ORDER"
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class InsurancePolicy:
    policy_id: str
    policy_number: str
    order_id: str
    insured_amount: float
    currency: str
    coverage_rate: float
    effective_date: datetime
    expiry_date: datetime
    insurer: str
    premium_amount: float
    is_valid: bool = True
    source_tag: str = "SOURCE_POLICY"
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class ClaimRecord:
    claim_id: str
    policy_id: str
    order_id: str
    claim_date: datetime
    claim_amount: float
    currency: str
    claim_reason: str
    approved_amount: float
    deduction_amount: float
    deduction_reason: Optional[str] = None
    payment_date: Optional[datetime] = None
    is_disputed: bool = False
    dispute_reason: Optional[str] = None
    source_tag: str = "SOURCE_CLAIM"
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class RecoveryRecord:
    recovery_id: str
    claim_id: str
    order_id: str
    recovery_date: datetime
    recovery_amount: float
    currency: str
    recovery_channel: str
    expected_date: Optional[datetime] = None
    is_late: bool = False
    late_days: int = 0
    verification_status: VerificationStatus = VerificationStatus.PENDING
    verified_amount: float = 0.0
    source_tag: str = "SOURCE_RECOVERY"
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class AbnormalRecord:
    abnormal_id: str
    abnormal_type: AbnormalType
    related_id: str
    related_type: SourceType
    description: str
    amount: float
    currency: str
    detected_date: datetime
    is_resolved: bool = False
    resolution: Optional[str] = None
    resolved_date: Optional[datetime] = None
    source_tag: str = "SOURCE_ABNORMAL"
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class VerificationCaliber:
    caliber_id: str
    name: str
    description: str
    formula: str
    example: str
    applicable_scenarios: List[str]
    created_at: datetime = field(default_factory=datetime.now)
