from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any


class ValidationStatus(str, Enum):
    PASSED = "passed"
    FAILED = "failed"
    PENDING = "pending"
    MANUAL_OVERRIDDEN = "manual_overridden"
    NEEDS_MORE_DATA = "needs_more_data"


class TimelineStatus(str, Enum):
    PROCESSED = "已处理"
    PENDING_MATERIAL = "待补材料"
    MANUAL_REVIEW = "人工改判"
    ANOMALY = "异常标记"
    SUPPLEMENTED = "补充材料"


@dataclass
class ParameterRecord:
    record_id: str
    params: Dict[str, float]
    source: str = ""
    detail_ref: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    remark: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record_id,
            "params": dict(self.params),
            "source": self.source,
            "detail_ref": self.detail_ref,
            "created_at": self.created_at.isoformat(),
            "remark": self.remark,
        }


@dataclass
class ParameterVersion:
    version: int
    records: Dict[str, ParameterRecord] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    supplement_note: str = ""
    is_supplement: bool = False
    base_version: Optional[int] = None

    def record_count(self) -> int:
        return len(self.records)

    def get_record_ids(self) -> List[str]:
        return list(self.records.keys())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            "record_count": self.record_count(),
            "records": {rid: r.to_dict() for rid, r in self.records.items()},
            "created_at": self.created_at.isoformat(),
            "supplement_note": self.supplement_note,
            "is_supplement": self.is_supplement,
            "base_version": self.base_version,
        }


@dataclass
class AnomalyPoint:
    record_id: str
    param_name: str
    expected_value: float
    actual_value: float
    deviation: float
    z_score: float
    boundary_upper: float
    boundary_lower: float
    is_extrapolation: bool = False
    extrapolation_direction: Optional[str] = None
    explanation: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record_id,
            "param_name": self.param_name,
            "expected_value": self.expected_value,
            "actual_value": self.actual_value,
            "deviation": self.deviation,
            "z_score": self.z_score,
            "boundary_upper": self.boundary_upper,
            "boundary_lower": self.boundary_lower,
            "is_extrapolation": self.is_extrapolation,
            "extrapolation_direction": self.extrapolation_direction,
            "explanation": self.explanation,
        }


@dataclass
class ValidationResult:
    version: int
    status: ValidationStatus
    total_records: int
    anomaly_count: int
    anomalies: List[AnomalyPoint] = field(default_factory=list)
    extrapolation_issues: List["ExtrapolationIssue"] = field(default_factory=list)
    stats: Dict[str, Any] = field(default_factory=dict)
    simulation_count: int = 0
    confidence_level: float = 0.95
    validated_at: datetime = field(default_factory=datetime.now)
    manual_review_note: str = ""
    previous_judgment: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            "status": self.status.value,
            "total_records": self.total_records,
            "anomaly_count": self.anomaly_count,
            "anomalies": [a.to_dict() for a in self.anomalies],
            "extrapolation_issues": [e.to_dict() for e in self.extrapolation_issues],
            "stats": dict(self.stats),
            "simulation_count": self.simulation_count,
            "confidence_level": self.confidence_level,
            "validated_at": self.validated_at.isoformat(),
            "manual_review_note": self.manual_review_note,
            "previous_judgment": self.previous_judgment,
        }


@dataclass
class TimelineEntry:
    timestamp: datetime
    status: TimelineStatus
    title: str
    description: str
    version: Optional[int] = None
    record_id: Optional[str] = None
    detail: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "status": self.status.value,
            "title": self.title,
            "description": self.description,
            "version": self.version,
            "record_id": self.record_id,
            "detail": dict(self.detail),
        }
