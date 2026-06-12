from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Tuple
from enum import Enum


class DriftStatus(Enum):
    NORMAL = "正常"
    LATE_NOTIFICATION = "风险通报晚到"
    EXCEEDED_RESTRICTED = "禁航区越界"
    DATA_MISSING = "数据缺失"
    CALC_FAILED = "计算失败"
    PENDING_REVIEW = "待复核"
    CONFIRMED = "人工确认"


class CalculationMethod(Enum):
    LEEWAY = "风压漂移法"
    OCEAN_CURRENT = "海流叠加法"
    COMPREHENSIVE = "综合漂移模型"


@dataclass
class Position:
    lat: float
    lon: float
    timestamp: datetime

    def __post_init__(self):
        if not (-90 <= self.lat <= 90):
            raise ValueError(f"纬度超出范围: {self.lat}")
        if not (-180 <= self.lon <= 180):
            raise ValueError(f"经度超出范围: {self.lon}")


@dataclass
class BuoyData:
    buoy_id: str
    position: Position
    wind_speed: Optional[float] = None
    wind_direction: Optional[float] = None
    current_speed: Optional[float] = None
    current_direction: Optional[float] = None
    wave_height: Optional[float] = None
    is_valid: bool = True
    invalid_reason: Optional[str] = None

    def completeness_score(self) -> float:
        fields = [self.wind_speed, self.wind_direction,
                  self.current_speed, self.current_direction,
                  self.wave_height]
        filled = sum(1 for f in fields if f is not None)
        return filled / len(fields)


@dataclass
class RestrictedZone:
    zone_id: str
    name: str
    polygon: List[Tuple[float, float]]
    reason: str = ""


@dataclass
class DriftPoint:
    position: Position
    status: DriftStatus = DriftStatus.NORMAL
    source_buoy: Optional[str] = None
    calc_method: Optional[CalculationMethod] = None
    confidence: float = 1.0
    notes: List[str] = field(default_factory=list)
    in_restricted_zone: bool = False
    restricted_zone_id: Optional[str] = None


@dataclass
class Trajectory:
    trajectory_id: str
    start_position: Position
    drift_points: List[DriftPoint] = field(default_factory=list)
    source: str = ""
    photo_refs: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    review_count: int = 0
    manually_confirmed: bool = False

    def latest_point(self) -> Optional[DriftPoint]:
        if self.drift_points:
            return self.drift_points[-1]
        return None


@dataclass
class CleanResult:
    original_trajectory: Trajectory
    cleaned_trajectory: Trajectory
    removed_points: List[DriftPoint]
    modified_points: List[Tuple[DriftPoint, DriftPoint]]
    clean_rules_applied: List[str]


@dataclass
class CalcFailure:
    point_index: int
    reason: str
    method: CalculationMethod
    missing_fields: List[str] = field(default_factory=list)


@dataclass
class DriftReport:
    trajectory_id: str
    before_clean: Optional[Trajectory] = None
    after_clean: Optional[Trajectory] = None
    clean_result: Optional[CleanResult] = None
    failures: List[CalcFailure] = field(default_factory=list)
    missing_buoys: List[str] = field(default_factory=list)
    restricted_zone_violations: List[DriftPoint] = field(default_factory=list)
    generated_at: datetime = field(default_factory=datetime.now)
    reviewer_notes: str = ""
