from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any


class FreezeType(Enum):
    COMPLAINT = "complaint"
    SUBSIDY_RECOVERY = "subsidy_recovery"
    BANK_FAILED = "bank_failed"


class FreezeStatus(Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    PARTIAL = "partial"
    RESOLVED = "resolved"


class PaymentStatus(Enum):
    INIT = "init"
    CHECKING = "checking"
    FROZEN = "frozen"
    READY = "ready"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    RETRY = "retry"


@dataclass
class FreezeRecord:
    rider_id: str
    freeze_type: FreezeType
    amount: float
    reason: str
    status: FreezeStatus = FreezeStatus.PENDING
    complaint_id: Optional[str] = None
    operator: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    remark: Optional[str] = None
    batch_id: Optional[str] = None
    sequence: int = 0


@dataclass
class RiderPayment:
    rider_id: str
    rider_name: str
    total_amount: float
    base_salary: float = 0.0
    subsidies: Dict[str, float] = field(default_factory=dict)
    deductions: Dict[str, float] = field(default_factory=dict)
    bank_account: str = ""
    bank_name: str = ""
    id_card: str = ""
    phone: str = ""
    freezes: List[FreezeRecord] = field(default_factory=list)
    payment_status: PaymentStatus = PaymentStatus.INIT
    status_history: List[Dict[str, Any]] = field(default_factory=list)
    final_amount: float = 0.0
    batch_id: Optional[str] = None


@dataclass
class DiffResult:
    rider_id: str
    field_name: str
    ticket_value: Any
    salary_value: Any
    resolved: bool = False
    resolved_by: Optional[str] = None
    final_value: Any = None


@dataclass
class BatchReport:
    batch_id: str
    created_at: datetime
    total_riders: int = 0
    total_amount: float = 0.0
    frozen_count: int = 0
    frozen_amount: float = 0.0
    success_count: int = 0
    success_amount: float = 0.0
    failed_count: int = 0
    failed_amount: float = 0.0
    duplicate_freezes: List[Dict[str, Any]] = field(default_factory=list)
    negative_subsidies: List[Dict[str, Any]] = field(default_factory=list)
    bank_failures: List[Dict[str, Any]] = field(default_factory=list)
    inconsistencies: List[Dict[str, Any]] = field(default_factory=list)
    diffs: List[DiffResult] = field(default_factory=list)
