from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime


class DataSource(str, Enum):
    VIDEO_MARKER = "video_marker"
    FRAME_RATE = "frame_rate"
    SCALE_REFERENCE = "scale_reference"
    RELEASE_HEIGHT = "release_height"
    LANDING_POINT = "landing_point"
    TRAINING_REPORT = "training_report"
    MANUAL_CORRECTION = "manual_correction"
    AUTO_CORRECTION = "auto_correction"
    ESTIMATED = "estimated"


class CorrectionType(str, Enum):
    FRAME_RATE_ADJUSTMENT = "frame_rate_adjustment"
    SCALE_RECALIBRATION = "scale_recalibration"
    OUTLIER_REMOVAL = "outlier_removal"
    AIR_RESISTANCE_ENABLED = "air_resistance_enabled"
    AIR_RESISTANCE_DISABLED = "air_resistance_disabled"
    MANUAL_OVERRIDE = "manual_override"


class AnomalySeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class Status(str, Enum):
    RAW = "raw"
    PROCESSED = "processed"
    CORRECTED = "corrected"
    NEEDS_REVIEW = "needs_review"


@dataclass
class CorrectionRecord:
    timestamp: datetime
    correction_type: CorrectionType
    old_value: Any
    new_value: Any
    reason: str
    source: DataSource
    author: Optional[str] = None


@dataclass
class DataPoint:
    value: Any
    source: DataSource
    confidence: float = 1.0
    timestamp: Optional[datetime] = None
    raw_value: Optional[Any] = None
    correction_history: List[CorrectionRecord] = field(default_factory=list)
    status: Status = Status.RAW
    notes: List[str] = field(default_factory=list)

    def correct(self, new_value: Any, correction_type: CorrectionType,
                reason: str, source: DataSource, author: Optional[str] = None,
                new_confidence: Optional[float] = None) -> None:
        self.correction_history.append(CorrectionRecord(
            timestamp=datetime.now(),
            correction_type=correction_type,
            old_value=self.value,
            new_value=new_value,
            reason=reason,
            source=source,
            author=author
        ))
        if self.raw_value is None:
            self.raw_value = self.value
        self.value = new_value
        self.status = Status.CORRECTED
        if new_confidence is not None:
            self.confidence = new_confidence

    def mark_for_review(self, note: str) -> None:
        self.status = Status.NEEDS_REVIEW
        self.notes.append(note)


@dataclass
class TrajectoryPoint:
    frame: int
    t: float
    x: float
    y: float
    x_source: DataSource
    y_source: DataSource
    confidence: float = 1.0
    is_outlier: bool = False


@dataclass
class Anomaly:
    severity: AnomalySeverity
    category: str
    message: str
    details: Dict[str, Any] = field(default_factory=dict)
    affected_fields: List[str] = field(default_factory=list)
    suggestion: Optional[str] = None


@dataclass
class InputData:
    frame_rate: DataPoint
    scale: DataPoint
    release_height: DataPoint
    trajectory: List[TrajectoryPoint]
    landing_point: Optional[DataPoint] = None
    training_report: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ProjectileParams:
    v0: float
    angle_deg: float
    release_height: float
    g: float = 9.81
    air_resistance_enabled: bool = False
    drag_coefficient: Optional[float] = None
    mass: Optional[float] = None
    cross_sectional_area: Optional[float] = None
    air_density: float = 1.225


@dataclass
class AnalysisResult:
    params: ProjectileParams
    params_confidence: Dict[str, float]
    predicted_trajectory: List[Dict[str, float]]
    landing_position: float
    flight_time: float
    max_height: float
    anomalies: List[Anomaly]
    input_data: InputData
    processing_steps: List[str] = field(default_factory=list)
