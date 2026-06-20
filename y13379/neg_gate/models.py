from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


class GateStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    SUSPENDED = "suspended"
    REJECTED = "rejected"


class TimelineEventType(enum.Enum):
    SAMPLE_CHANGE = "sample_change"
    VERSION_CHANGE = "version_change"
    THRESHOLD_CHANGE = "threshold_change"
    MANUAL_OVERRIDE = "manual_override"
    GRAYSCALE_UPDATE = "grayscale_update"
    GATE_DECISION = "gate_decision"
    DATA_QUALITY_ALERT = "data_quality_alert"
    FIELD_NORMALIZATION = "field_normalization"


@dataclass
class SourceInfo:
    original_field_name: str
    normalized_field_name: str
    raw_value: Any
    source_file: Optional[str] = None
    source_line: Optional[int] = None


@dataclass
class TrainingLogEntry:
    entry_id: str
    timestamp: datetime
    sample_id: Optional[str] = None
    version: Optional[str] = None
    neg_sample_ratio: Optional[float] = None
    threshold: Optional[float] = None
    grayscale_ratio: Optional[float] = None
    metric_value: Optional[float] = None
    metric_name: Optional[str] = None
    label: Optional[int] = None
    prediction: Optional[float] = None
    raw_fields: Dict[str, Any] = field(default_factory=dict)
    source_info: Dict[str, SourceInfo] = field(default_factory=dict)
    processing_status: str = "raw"
    quality_flag: Optional[str] = None
    original_line: Optional[str] = None

    def get_effective_neg_ratio(self) -> Optional[float]:
        return self.neg_sample_ratio

    def get_original_reference(self) -> str:
        parts = [f"entry_id={self.entry_id}"]
        if self.original_line is not None:
            parts.append(f"line={self.original_line}")
        for si in self.source_info.values():
            if si.source_line is not None:
                parts.append(f"source_line={si.source_line}")
                break
        return ", ".join(parts)


@dataclass
class GrayscaleResult:
    grayscale_ratio: float
    sample_count_before: int
    sample_count_after: int
    threshold_before: Optional[float] = None
    threshold_after: Optional[float] = None
    metric_before: Optional[float] = None
    metric_after: Optional[float] = None
    manual_overrides: List[str] = field(default_factory=list)

    def sample_delta(self) -> int:
        return self.sample_count_after - self.sample_count_before

    def threshold_delta(self) -> Optional[float]:
        if self.threshold_before is not None and self.threshold_after is not None:
            return self.threshold_after - self.threshold_before
        return None

    def breakdown(self) -> Dict[str, Any]:
        result: Dict[str, Any] = {
            "grayscale_ratio": self.grayscale_ratio,
            "sample_change": {
                "before": self.sample_count_before,
                "after": self.sample_count_after,
                "delta": self.sample_delta(),
            },
        }
        if self.threshold_before is not None and self.threshold_after is not None:
            result["threshold_change"] = {
                "before": self.threshold_before,
                "after": self.threshold_after,
                "delta": self.threshold_delta(),
            }
        if self.metric_before is not None and self.metric_after is not None:
            result["metric_change"] = {
                "before": self.metric_before,
                "after": self.metric_after,
                "delta": self.metric_after - self.metric_before,
            }
        if self.manual_overrides:
            result["manual_overrides"] = self.manual_overrides
        return result


@dataclass
class GateRecord:
    record_id: str
    log_entry: TrainingLogEntry
    status: GateStatus = GateStatus.PENDING
    grayscale_result: Optional[GrayscaleResult] = None
    suspended_reason: Optional[str] = None
    suspended_at: Optional[datetime] = None
    confirmed_by: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    bad_data_refs: List[str] = field(default_factory=list)

    def suspend(self, reason: str) -> None:
        self.status = GateStatus.SUSPENDED
        self.suspended_reason = reason
        self.suspended_at = datetime.now()

    def approve(self, confirmed_by: str) -> None:
        self.status = GateStatus.APPROVED
        self.confirmed_by = confirmed_by
        self.confirmed_at = datetime.now()

    def reject(self, reason: Optional[str] = None) -> None:
        self.status = GateStatus.REJECTED
        if reason and not self.suspended_reason:
            self.suspended_reason = reason


@dataclass
class TimelineEvent:
    event_id: str
    event_type: TimelineEventType
    timestamp: datetime
    record_id: str
    description: str
    raw_log_ref: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)
