from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
from typing import Optional


class DataSource(str, Enum):
    ORIGINAL = "original"
    BACKFILL = "backfill"


class AnomalySource(str, Enum):
    BACKFILL = "backfill"
    ORIGINAL = "original"


class FlagType(str, Enum):
    MISSING_SAMPLE = "missing_sample"
    ANOMALY_SPIKE = "anomaly_spike"
    MODEL_BACKFILL = "model_backfill"


class CurveType(str, Enum):
    EXPONENTIAL = "exponential"
    LINEAR = "linear"
    POLYNOMIAL = "polynomial"
    WEIBULL = "weibull"


@dataclass
class VibrationSample:
    equipment_id: str
    timestamp: datetime
    value: float
    is_missing_sample: bool = False
    anomaly_source: Optional[AnomalySource] = None
    is_anomaly_spike: bool = False
    source: DataSource = DataSource.ORIGINAL
    note: str = ""


@dataclass
class MaintenanceRecord:
    equipment_id: str
    date: datetime
    maintenance_type: str
    description: str
    source: DataSource = DataSource.ORIGINAL
    note: str = ""


@dataclass
class EquipmentInfo:
    equipment_id: str
    model: str = ""
    model_backfilled: bool = False
    model_backfill_time: Optional[datetime] = None
    installation_date: Optional[datetime] = None
    location: str = ""


@dataclass
class PredictionDetail:
    equipment_id: str
    predicted_remaining_life_hours: float
    confidence_lower: float
    confidence_upper: float
    curve_type: CurveType
    sample_count: int
    missing_sample_count: int
    affected_by_model_backfill: bool = False
    r_squared: float = 0.0
    prediction_timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class InspectionFlag:
    equipment_id: str
    flag_type: FlagType
    source: AnomalySource
    message: str
    sample_timestamp: Optional[datetime] = None
    detail_id: Optional[str] = None


@dataclass
class SampleReviewEntry:
    equipment_id: str
    sample_timestamp: datetime
    original_value: Optional[float]
    imputed_value: Optional[float]
    was_missing: bool
    anomaly_spike: bool
    anomaly_source: Optional[AnomalySource]
    affected_by_model_backfill: bool


@dataclass
class PredictionReport:
    report_id: str
    generated_at: datetime
    summary: ReportSummary
    vibration_details: list[VibrationSample]
    maintenance_details: list[MaintenanceRecord]
    prediction_details: list[PredictionDetail]
    flags: list[InspectionFlag]
    sample_review: list[SampleReviewEntry]


@dataclass
class ReportSummary:
    total_equipment: int
    total_samples: int
    missing_sample_count: int
    missing_sample_ids: list[str]
    anomaly_spike_count: int
    anomaly_spike_from_backfill: int
    anomaly_spike_from_original: int
    model_backfill_affected_equipment: list[str]
    avg_predicted_life: float
    avg_confidence_lower: float
    avg_confidence_upper: float
