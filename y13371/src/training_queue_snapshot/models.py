from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, List, Any
import uuid


class RowStatus(Enum):
    PROCESSED = "processed"
    BAD = "bad"
    SKIPPED = "skipped"
    BOUNDARY = "boundary"


class GrayFlag(Enum):
    NORMAL = "normal"
    GRAY_CANDIDATE = "gray_candidate"
    GRAY_ENABLED = "gray_enabled"
    GRAY_ERROR = "gray_error"


class ModificationType(Enum):
    NONE = "none"
    MANUAL_CORRECTION = "manual_correction"
    AUTO_FIX = "auto_fix"
    THRESHOLD_ADJUSTMENT = "threshold_adjustment"


@dataclass
class FeatureRow:
    sample_id: str
    features: Dict[str, float]
    label: Optional[float] = None
    status: RowStatus = RowStatus.PROCESSED
    gray_flag: GrayFlag = GrayFlag.NORMAL
    gray_ratio: Optional[float] = None
    modification_type: ModificationType = ModificationType.NONE
    modification_note: Optional[str] = None
    error_message: Optional[str] = None
    source_version: Optional[str] = None
    is_boundary: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["status"] = self.status.value
        data["gray_flag"] = self.gray_flag.value
        data["modification_type"] = self.modification_type.value
        data["timestamp"] = self.timestamp.isoformat()
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "FeatureRow":
        row = cls.__new__(cls)
        for key, value in data.items():
            if key == "status":
                row.status = RowStatus(value)
            elif key == "gray_flag":
                row.gray_flag = GrayFlag(value)
            elif key == "modification_type":
                row.modification_type = ModificationType(value)
            elif key == "timestamp":
                row.timestamp = datetime.fromisoformat(value)
            else:
                setattr(row, key, value)
        return row


@dataclass
class ProcessingStats:
    total: int = 0
    processed: int = 0
    bad: int = 0
    skipped: int = 0
    boundary: int = 0
    gray_candidate: int = 0
    gray_enabled: int = 0
    gray_error: int = 0
    manual_corrections: int = 0
    auto_fixes: int = 0
    threshold_adjustments: int = 0
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

    @property
    def processed_rate(self) -> float:
        return self.processed / self.total if self.total > 0 else 0.0

    @property
    def bad_rate(self) -> float:
        return self.bad / self.total if self.total > 0 else 0.0

    @property
    def gray_rate(self) -> float:
        gray_total = self.gray_candidate + self.gray_enabled
        return gray_total / self.total if self.total > 0 else 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total": self.total,
            "processed": self.processed,
            "bad": self.bad,
            "skipped": self.skipped,
            "boundary": self.boundary,
            "gray_candidate": self.gray_candidate,
            "gray_enabled": self.gray_enabled,
            "gray_error": self.gray_error,
            "manual_corrections": self.manual_corrections,
            "auto_fixes": self.auto_fixes,
            "threshold_adjustments": self.threshold_adjustments,
            "processed_rate": round(self.processed_rate, 4),
            "bad_rate": round(self.bad_rate, 4),
            "gray_rate": round(self.gray_rate, 4),
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
        }


@dataclass
class SnapshotMetrics:
    mean_values: Dict[str, float] = field(default_factory=dict)
    std_values: Dict[str, float] = field(default_factory=dict)
    min_values: Dict[str, float] = field(default_factory=dict)
    max_values: Dict[str, float] = field(default_factory=dict)
    null_counts: Dict[str, int] = field(default_factory=dict)
    outlier_counts: Dict[str, int] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class SnapshotThreshold:
    feature_name: str
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    outlier_zscore: float = 3.0
    allow_null: bool = False
    is_manual: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class SnapshotVersion:
    version_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    name: str = ""
    description: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    parent_version: Optional[str] = None
    thresholds: Dict[str, SnapshotThreshold] = field(default_factory=dict)
    gray_ratio: float = 0.0
    gray_ratio_config: Optional[float] = None
    note: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "version_id": self.version_id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
            "parent_version": self.parent_version,
            "thresholds": {k: v.to_dict() for k, v in self.thresholds.items()},
            "gray_ratio": self.gray_ratio,
            "gray_ratio_config": self.gray_ratio_config,
            "note": self.note,
        }


@dataclass
class Snapshot:
    snapshot_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    version: SnapshotVersion = field(default_factory=SnapshotVersion)
    rows: List[FeatureRow] = field(default_factory=list)
    stats: ProcessingStats = field(default_factory=ProcessingStats)
    metrics: SnapshotMetrics = field(default_factory=SnapshotMetrics)
    created_at: datetime = field(default_factory=datetime.now)
    source_file: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "snapshot_id": self.snapshot_id,
            "version": self.version.to_dict(),
            "rows": [r.to_dict() for r in self.rows],
            "stats": self.stats.to_dict(),
            "metrics": self.metrics.to_dict(),
            "created_at": self.created_at.isoformat(),
            "source_file": self.source_file,
        }


@dataclass
class VersionDiff:
    old_version_id: str
    new_version_id: str
    sample_changes: List[Dict[str, Any]] = field(default_factory=list)
    threshold_changes: List[Dict[str, Any]] = field(default_factory=list)
    manual_corrections: List[Dict[str, Any]] = field(default_factory=list)
    metric_changes: Dict[str, Dict[str, float]] = field(default_factory=dict)
    status_changes: Dict[str, Dict[str, int]] = field(default_factory=dict)
    gray_changes: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
