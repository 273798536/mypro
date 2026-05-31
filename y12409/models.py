from dataclasses import dataclass, field
from datetime import datetime, date
from typing import Optional, Dict, List, Tuple
from enum import Enum
import uuid


class RackStatus(Enum):
    ACTIVE = "active"
    MIGRATING = "migrating"
    INACTIVE = "inactive"


class ReadingSource(Enum):
    AUTO = "auto"
    MANUAL = "manual"
    SUPPLEMENT = "supplement"


@dataclass
class Rack:
    rack_id: str
    customer: str
    location: str
    power_capacity: float
    status: RackStatus
    effective_date: date
    end_date: Optional[date] = None
    migrated_from: Optional[str] = None
    migrated_to: Optional[str] = None

    def is_active_on(self, d: date) -> bool:
        if self.end_date:
            return self.effective_date <= d <= self.end_date
        return self.effective_date <= d


@dataclass
class PUEFactor:
    pue_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    date: date = None
    pue_value: float = None
    data_center: str = "DC-01"
    maintained_by: str = None
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class TimeOfUsePrice:
    period_name: str
    start_hour: int
    end_hour: int
    price_per_kwh: float
    is_peak: bool = False


@dataclass
class MeterReading:
    reading_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    rack_id: str = None
    reading_date: date = None
    start_kwh: float = None
    end_kwh: float = None
    read_at: datetime = None
    source: ReadingSource = ReadingSource.MANUAL
    version: int = 1
    is_supplement: bool = False
    replaced_by: Optional[str] = None
    recorded_by: str = None
    remarks: str = None

    @property
    def consumption(self) -> Optional[float]:
        if self.start_kwh is not None and self.end_kwh is not None:
            return max(0.0, self.end_kwh - self.start_kwh)
        return None

    def consumption_by_hour(self, hours: List[int]) -> Optional[Dict[int, float]]:
        total = self.consumption
        if total is None:
            return None
        per_hour = total / len(hours) if hours else 0
        return {h: per_hour for h in hours}


@dataclass
class ValidationIssue:
    issue_type: str
    severity: str
    message: str
    source_record: str
    related_records: List[str] = field(default_factory=list)
    details: Dict = field(default_factory=dict)


@dataclass
class BadRow:
    row_type: str
    row_id: str
    issues: List[ValidationIssue]
    data: Dict
    excluded_from_calc: bool = True


@dataclass
class CustomerCharge:
    customer: str
    date: date
    rack_id: str
    consumption_kwh: float
    pue_factor: float
    final_kwh: float
    peak_cost: float
    offpeak_cost: float
    total_cost: float
    reading_ids: List[str]
    pue_ids: List[str]
    price_details: List[Dict] = field(default_factory=list)


@dataclass
class MigrationRecord:
    migration_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    rack_id: str = None
    customer: str = None
    old_location: str = None
    new_location: str = None
    migration_date: date = None
    cross_day: bool = False
    affected_readings: List[str] = field(default_factory=list)
    gap_hours: int = 0


@dataclass
class MeterGap:
    gap_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    rack_id: str = None
    gap_start: datetime = None
    gap_end: datetime = None
    gap_hours: float = 0
    previous_reading_id: str = None
    next_reading_id: str = None
    estimated_consumption: Optional[float] = None
    is_resolved: bool = False
    resolve_note: str = None
