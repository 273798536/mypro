from dataclasses import dataclass, field
from datetime import datetime, date, time, timedelta
from typing import Optional, List, Dict, Any
from enum import Enum


class BillingType(str, Enum):
    HOURLY = "按小时计费"
    SHIFT = "按班次计费"
    DOWNTIME = "按停机原因计费"


class DowntimeReason(str, Enum):
    NORMAL_MAINTENANCE = "正常保养"
    BREAKDOWN = "故障停机"
    SCHEDULED_REPAIR = "计划检修"
    CLIENT_CAUSED = "客户原因"
    OPERATOR_ERROR = "操作失误"
    POWER_OUTAGE = "停电"
    OTHER = "其他"


class ShiftType(str, Enum):
    MORNING = "早班"
    AFTERNOON = "中班"
    NIGHT = "夜班"
    DAY = "白班"


@dataclass
class RawSourceInfo:
    source_file: str
    original_name: str
    imported_at: datetime = field(default_factory=datetime.now)


@dataclass
class Device:
    raw_source: RawSourceInfo
    device_id: str
    device_name: str
    device_type: str
    model: str
    serial_number: str
    customer: str
    mining_site: str
    billing_type: BillingType
    hourly_rate: float = 0.0
    shift_rate: float = 0.0
    free_downtime_reasons: List[DowntimeReason] = field(default_factory=list)
    free_downtime_minutes: int = 0
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: str = ""

    def is_free_downtime(self, reason: DowntimeReason) -> bool:
        return reason in self.free_downtime_reasons


@dataclass
class ShiftRecord:
    raw_source: RawSourceInfo
    device_id: str
    shift_date: date
    shift_type: ShiftType
    start_time: datetime
    end_time: datetime
    operator: str = ""
    working_hours: float = 0.0
    meter_start: float = 0.0
    meter_end: float = 0.0
    has_signature: bool = False
    signature_image_ref: str = ""
    notes: str = ""

    def is_cross_day(self) -> bool:
        return self.start_time.date() != self.end_time.date()

    def get_duration_hours(self) -> float:
        delta = self.end_time - self.start_time
        return delta.total_seconds() / 3600


@dataclass
class DowntimeRecord:
    raw_source: RawSourceInfo
    device_id: str
    start_time: datetime
    end_time: datetime
    reason: DowntimeReason
    description: str = ""
    reported_by: str = ""
    is_approved: bool = False
    notes: str = ""

    def get_duration_minutes(self) -> int:
        delta = self.end_time - self.start_time
        return int(delta.total_seconds() / 60)


@dataclass
class SignatureSheet:
    raw_source: RawSourceInfo
    sheet_id: str
    sheet_date: date
    page_number: int
    total_pages: int
    device_id: str
    signed_by: str
    signed_at: Optional[datetime] = None
    shift_records_ref: List[str] = field(default_factory=list)
    image_ref: str = ""
    notes: str = ""


@dataclass
class BillingCalendarDay:
    bill_date: date
    device_id: str
    shift_records: List[ShiftRecord] = field(default_factory=list)
    downtime_records: List[DowntimeRecord] = field(default_factory=list)
    signature_sheets: List[SignatureSheet] = field(default_factory=list)
    billable_hours: float = 0.0
    billable_shifts: int = 0
    free_hours: float = 0.0
    total_amount: float = 0.0
    issues: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


@dataclass
class BillingPeriod:
    period_start: date
    period_end: date
    customer: str
    mining_site: str
    calendar_days: Dict[date, BillingCalendarDay] = field(default_factory=dict)
    total_billable_hours: float = 0.0
    total_billable_shifts: int = 0
    total_free_hours: float = 0.0
    total_amount: float = 0.0
    unmatched_signatures: List[SignatureSheet] = field(default_factory=list)
    unmatched_shifts: List[ShiftRecord] = field(default_factory=list)
    missing_shifts_dates: List[date] = field(default_factory=list)
    missing_signature_pages: List[str] = field(default_factory=list)
    issues: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


@dataclass
class BillItem:
    device_id: str
    device_name: str
    description: str
    quantity: float
    unit: str
    unit_price: float
    amount: float
    source_refs: List[str] = field(default_factory=list)
    billing_date: Optional[date] = None


@dataclass
class ExportableBill:
    bill_id: str
    customer: str
    mining_site: str
    period_start: date
    period_end: date
    issue_date: date
    items: List[BillItem] = field(default_factory=list)
    total_amount: float = 0.0
    issues_summary: List[str] = field(default_factory=list)
    warnings_summary: List[str] = field(default_factory=list)
    evidence_files: List[str] = field(default_factory=list)
