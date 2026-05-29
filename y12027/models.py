from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional, List, Dict
from enum import Enum


class VerificationStatus(Enum):
    PASS = "通过"
    WARNING = "警告"
    ERROR = "错误"
    PENDING = "待确认"


class DisputeType(Enum):
    DUPLICATE_DAYS = "人天重复"
    MISSING_ACCEPTANCE = "验收缺失"
    RATE_CHANGED = "费率变更"
    FIELD_MISSING = "字段缺失"
    MISMATCH = "数据不匹配"


@dataclass
class Staff:
    staff_id: str
    name: str
    role: str = ""
    department: str = ""
    remark: str = ""
    is_active: bool = True


@dataclass
class RateSnapshot:
    rate_id: str
    staff_id: str
    daily_rate: float
    effective_date: date
    end_date: Optional[date] = None
    version: int = 1
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class AttendanceRecord:
    attendance_id: str
    staff_id: str
    work_date: date
    hours: float = 8.0
    project_code: str = ""
    project_name: str = ""
    remark: str = ""
    is_approved: bool = False
    source: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class AcceptanceRecord:
    acceptance_id: str
    staff_id: str
    work_date: date
    accepted_days: float
    project_code: str = ""
    acceptance_note: str = ""
    accepted_by: str = ""
    accepted_at: Optional[datetime] = None
    is_overdue: bool = False


@dataclass
class Dispute:
    dispute_id: str
    dispute_type: DisputeType
    status: VerificationStatus
    attendance_ids: List[str]
    staff_id: str
    work_date: Optional[date] = None
    description: str = ""
    suggestion: str = ""
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolved_by: str = ""
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class VerificationResult:
    result_id: str
    version: int
    attendance_ids: List[str]
    total_days: float = 0.0
    total_amount: float = 0.0
    duplicate_days: float = 0.0
    duplicate_amount: float = 0.0
    missing_acceptance_count: int = 0
    rate_change_count: int = 0
    disputes: List[Dispute] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    created_by: str = "system"
    is_archived: bool = False


@dataclass
class VerificationSummary:
    summary_id: str
    period_start: date
    period_end: date
    total_staff: int = 0
    total_records: int = 0
    total_days: float = 0.0
    total_amount: float = 0.0
    pass_count: int = 0
    warning_count: int = 0
    error_count: int = 0
    pending_count: int = 0
    latest_result_id: str = ""
    previous_result_id: str = ""
