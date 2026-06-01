from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any


class ConflictType(Enum):
    GROUP_METRIC_MISMATCH = "group_metric_mismatch"
    GROUP_SAMPLE_MISMATCH = "group_sample_mismatch"
    METRIC_SAMPLE_MISMATCH = "metric_sample_mismatch"
    INSUFFICIENT_SAMPLE = "insufficient_sample"
    UNEVEN_GROUP = "uneven_group"
    DELAYED_METRIC = "delayed_metric"


class ConflictSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class DelayStatus(Enum):
    ON_TIME = "on_time"
    DELAYED = "delayed"
    PARTIAL = "partial"


@dataclass
class ExperimentGroup:
    group_id: str
    group_name: str
    is_control: bool = False
    traffic_ratio: float = 1.0
    channel_ids: list[str] = field(default_factory=list)
    city_ids: list[str] = field(default_factory=list)
    description: str = ""

    def __post_init__(self):
        if self.traffic_ratio <= 0 or self.traffic_ratio > 1:
            raise ValueError(
                f"traffic_ratio must be in (0,1], got {self.traffic_ratio}"
            )


@dataclass
class MetricData:
    metric_id: str
    metric_name: str
    unit: str
    control_mean: float
    control_std: float
    treatment_mean: float
    treatment_std: float
    control_n: int
    treatment_n: int
    arrival_time: datetime | None = None
    expected_time: datetime | None = None
    delay_status: DelayStatus = DelayStatus.ON_TIME
    delay_hours: float = 0.0
    source_channel: str = ""
    source_city: str = ""

    def __post_init__(self):
        if self.control_n < 0 or self.treatment_n < 0:
            raise ValueError("sample sizes must be non-negative")
        if self.control_std < 0 or self.treatment_std < 0:
            raise ValueError("standard deviations must be non-negative")


@dataclass
class SampleInfo:
    group_id: str
    required_n: int
    actual_n: int
    min_detectable_effect: float
    unit: str = "observations"
    is_sufficient: bool = True
    shortfall: int = 0
    collection_time: datetime | None = None

    def __post_init__(self):
        self.is_sufficient = self.actual_n >= self.required_n
        self.shortfall = max(0, self.required_n - self.actual_n)


@dataclass
class DelayEvent:
    event_id: str
    source_type: str
    source_id: str
    expected_time: datetime
    actual_time: datetime | None
    delay_hours: float
    affected_metrics: list[str] = field(default_factory=list)
    affected_groups: list[str] = field(default_factory=list)
    description: str = ""
    sequence_order: int = 0


@dataclass
class ConflictRecord:
    conflict_id: str
    conflict_type: ConflictType
    severity: ConflictSeverity
    sources: list[str]
    description: str
    detected_at: datetime = field(default_factory=datetime.now)
    resolution: str = "logged_pending"
    related_delay_events: list[str] = field(default_factory=list)
    sequence_order: int = 0
    intermediate_values: dict[str, Any] = field(default_factory=dict)


@dataclass
class IntermediateStep:
    step_name: str
    formula: str
    inputs: dict[str, Any]
    output: Any
    unit: str = ""
    note: str = ""


@dataclass
class PowerResult:
    result_id: str
    metric_id: str
    metric_name: str
    power: float
    confidence_interval_lower: float
    confidence_interval_upper: float
    effect_size: float
    effect_size_unit: str
    mde: float
    alpha: float
    achieved_power: float
    required_n_per_group: int
    actual_n_control: int
    actual_n_treatment: int
    is_significant: bool
    intermediate_steps: list[IntermediateStep] = field(default_factory=list)
    group_comparison_id: str = ""
    conflict_ids: list[str] = field(default_factory=list)
    delay_event_ids: list[str] = field(default_factory=list)
    computed_at: datetime = field(default_factory=datetime.now)


@dataclass
class GroupComparison:
    comparison_id: str
    control_group_id: str
    treatment_group_id: str
    metric_id: str
    metric_name: str
    control_mean: float
    treatment_mean: float
    absolute_diff: float
    relative_diff: float
    control_n: int
    treatment_n: int
    is_balanced: bool = True
    balance_ratio: float = 1.0
    intermediate_steps: list[IntermediateStep] = field(default_factory=list)
    delay_event_ids: list[str] = field(default_factory=list)

    def __post_init__(self):
        self.absolute_diff = self.treatment_mean - self.control_mean
        if self.control_mean != 0:
            self.relative_diff = self.absolute_diff / abs(self.control_mean)
        else:
            self.relative_diff = float("inf") if self.absolute_diff != 0 else 0.0
        if self.control_n == 0 and self.treatment_n == 0:
            self.balance_ratio = 0.0
        elif self.control_n == 0 or self.treatment_n == 0:
            self.balance_ratio = 0.0
        else:
            self.balance_ratio = min(self.control_n, self.treatment_n) / max(self.control_n, self.treatment_n)
        self.is_balanced = self.balance_ratio >= 0.8


@dataclass
class TraceLink:
    link_id: str
    source_type: str
    source_id: str
    target_type: str
    target_id: str
    description: str
    link_time: datetime = field(default_factory=datetime.now)


@dataclass
class ExperimentSnapshot:
    snapshot_id: str
    experiment_name: str
    groups: list[ExperimentGroup] = field(default_factory=list)
    metrics: list[MetricData] = field(default_factory=list)
    sample_infos: list[SampleInfo] = field(default_factory=list)
    delay_events: list[DelayEvent] = field(default_factory=list)
    conflicts: list[ConflictRecord] = field(default_factory=list)
    power_results: list[PowerResult] = field(default_factory=list)
    group_comparisons: list[GroupComparison] = field(default_factory=list)
    trace_links: list[TraceLink] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
