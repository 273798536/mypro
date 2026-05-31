from __future__ import annotations

import uuid
from datetime import date, datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class Phase(str, Enum):
    INITIAL = "initial"
    MONTHLY = "monthly"
    FINAL = "final"


class AlertLevel(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class SourceRef(BaseModel):
    entity_type: str
    entity_id: str
    field: str
    description: str = ""


class SharingRatioEntry(BaseModel):
    party: str
    percentage: float


class SharingRatioVersion(BaseModel):
    version: int
    effective_from: date
    entries: list[SharingRatioEntry]
    contract_ref: str = ""
    note: str = ""


class BaselineAdjustment(BaseModel):
    adjustment_id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    month: str
    original_kwh: float
    adjusted_kwh: float
    reason: str
    source_refs: list[SourceRef] = []
    created_at: datetime = Field(default_factory=datetime.now)


class ProjectContract(BaseModel):
    project_id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    name: str
    contract_start: date
    contract_end: date
    baseline_kwh: float
    baseline_source: str = ""
    unit_price: float = 0.0
    sharing_ratios: list[SharingRatioVersion] = []
    baseline_adjustments: list[BaselineAdjustment] = []
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class MeterReading(BaseModel):
    reading_id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    project_id: str
    meter_id: str = ""
    month: str
    kwh: float
    is_backfilled: bool = False
    backfill_reason: str = ""
    source_ref: str = ""
    created_at: datetime = Field(default_factory=datetime.now)


class MaintenanceRecord(BaseModel):
    record_id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    project_id: str
    start_date: date
    end_date: date
    description: str
    excluded_kwh: float = 0.0
    exclusion_reason: str = ""
    source_ref: str = ""
    created_at: datetime = Field(default_factory=datetime.now)


class ExclusionTrace(BaseModel):
    trace_id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    month: str
    reason: str
    source_refs: list[SourceRef] = []
    excluded_kwh: float = 0.0


class SavingsDetail(BaseModel):
    month: str
    baseline_kwh: float
    actual_kwh: float
    baseline_adjustment_kwh: float = 0.0
    baseline_adjustment_ref: Optional[SourceRef] = None
    maintenance_exclusion_kwh: float = 0.0
    maintenance_exclusion_refs: list[SourceRef] = []
    missing_reading: bool = False
    savings_kwh: float
    savings_revenue: float


class SharingResult(BaseModel):
    result_id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    project_id: str
    version: int
    calculation_time: datetime = Field(default_factory=datetime.now)
    period_start: str
    period_end: str
    ratio_version: int
    ratio_entries: list[SharingRatioEntry] = []
    exclusions: list[ExclusionTrace] = []
    savings_details: list[SavingsDetail] = []
    total_savings_kwh: float = 0.0
    total_revenue: float = 0.0
    sharing_breakdown: list[dict[str, Any]] = []
    trigger_reason: str = ""


class AuditEntry(BaseModel):
    audit_id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    timestamp: datetime = Field(default_factory=datetime.now)
    entity_type: str
    entity_id: str
    action: str
    old_value: Any = None
    new_value: Any = None
    reason: str = ""
    affected_results: list[str] = []
    operator: str = ""


class Alert(BaseModel):
    alert_id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    project_id: str
    phase: Phase
    level: AlertLevel
    title: str
    message: str
    source_refs: list[SourceRef] = []
    generated_at: datetime = Field(default_factory=datetime.now)
