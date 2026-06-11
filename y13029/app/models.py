from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class WarningStatus(str, Enum):
    IMPORTED = "imported"
    PENDING_CONFIRM = "pending_confirm"
    CONFIRMED = "confirmed"
    WITHDRAWN = "withdrawn"
    CONFLICT = "conflict"
    BAD_DATA = "bad_data"


class ConfirmReason(str, Enum):
    CURRENCY_MISMATCH = "currency_mismatch"
    DOUBLE_COUNTING = "double_counting"
    LATE_ATTACHMENT = "late_attachment"
    NORMAL = "normal"
    OTHER = "other"


@dataclass
class CustodyReceipt:
    id: Optional[int] = None
    batch_id: str = ""
    source_file: str = ""
    row_number: int = 0
    trade_date: str = ""
    fund_code: str = ""
    fund_name: str = ""
    investor_id: str = ""
    investor_name: str = ""
    amount: float = 0.0
    currency: str = ""
    business_type: str = ""
    risk_level: str = ""
    investor_risk_level: str = ""
    calibre: str = ""
    raw_content: str = ""
    import_round: int = 1
    source_sha1: str = ""
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class RiskWarning:
    id: Optional[int] = None
    receipt_id: int = 0
    batch_id: str = ""
    warning_code: str = ""
    warning_type: str = ""
    description: str = ""
    status: WarningStatus = WarningStatus.IMPORTED
    confirm_reason: Optional[ConfirmReason] = None
    confirm_note: str = ""
    confirmed_by: str = ""
    confirmed_at: Optional[datetime] = None
    conclusion: str = ""
    late_attachment_ref: str = ""
    remark: str = ""
    import_round: int = 1
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class WarningHistory:
    id: Optional[int] = None
    warning_id: int = 0
    action: str = ""
    action_by: str = ""
    old_status: str = ""
    new_status: str = ""
    detail: str = ""
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class ConflictRecord:
    id: Optional[int] = None
    batch_id: str = ""
    amount: float = 0.0
    investor_id: str = ""
    investor_name: str = ""
    warning_ids: List[int] = field(default_factory=list)
    calibres: List[str] = field(default_factory=list)
    resolved: bool = False
    resolution: str = ""
    import_round: int = 1
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class BadDataRecord:
    id: Optional[int] = None
    source_file: str = ""
    row_number: int = 0
    field_name: str = ""
    raw_value: str = ""
    error_message: str = ""
    raw_content: str = ""
    import_round: int = 1
    created_at: datetime = field(default_factory=datetime.now)
