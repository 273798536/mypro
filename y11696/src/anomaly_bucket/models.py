from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
from typing import Optional


class BucketCategory(str, Enum):
    QUANTILE = 'quantile'
    SEASONAL = 'seasonal'
    BUSINESS_TAG = 'business_tag'


class AnomalyLevel(str, Enum):
    NORMAL = 'normal'
    MILD = 'mild'
    MODERATE = 'moderate'
    SEVERE = 'severe'


class WarningType(str, Enum):
    HOLIDAY_FP = 'holiday_false_positive'
    SHORT_SERIES = 'short_series'
    TAG_CONFLICT = 'tag_conflict'
    MISSING_DATA = 'missing_data'


@dataclass
class MetricRecord:
    date: date
    metric_name: str
    value: float
    tags: list[str] = field(default_factory=list)
    source: str = ''
    remark: str = ''

    def __post_init__(self):
        if isinstance(self.date, str):
            self.date = datetime.strptime(self.date, '%Y-%m-%d').date()
        if isinstance(self.value, str):
            self.value = float(self.value)


@dataclass
class HolidayRecord:
    date: date
    name: str = ''
    impact: str = 'normal'

    def __post_init__(self):
        if isinstance(self.date, str):
            self.date = datetime.strptime(self.date, '%Y-%m-%d').date()


@dataclass
class QuantileConfig:
    upper: float = 0.95
    lower: float = 0.05
    extreme_upper: float = 0.99
    extreme_lower: float = 0.01


@dataclass
class SeasonalConfig:
    window: int = 7
    method: str = 'rolling_zscore'
    threshold: float = 2.0


@dataclass
class TagConfig:
    tag_groups: dict[str, list[str]] = field(default_factory=dict)
    conflict_tags: list[str] = field(default_factory=list)


@dataclass
class ValidationIssue:
    warning_type: WarningType
    message: str
    affected_records: list[str] = field(default_factory=list)
    severity: str = 'warn'


@dataclass
class AnomalyScore:
    quantile_score: float = 0.0
    seasonal_score: float = 0.0
    tag_score: float = 0.0
    composite_score: float = 0.0
    level: AnomalyLevel = AnomalyLevel.NORMAL


@dataclass
class BucketAssignment:
    record_date: date
    metric_name: str
    category: BucketCategory
    bucket_name: str
    score: float
    level: AnomalyLevel
    reasons: list[str] = field(default_factory=list)
    source_traces: list[str] = field(default_factory=list)


@dataclass
class CorrectionTrace:
    timestamp: datetime
    field: str
    old_value: str
    new_value: str
    reason: str = ''
    operator: str = 'system'
