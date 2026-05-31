from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum
import uuid


class DataStatus(Enum):
    NORMAL = "normal"
    BOUNDARY = "boundary"
    BAD_INPUT = "bad_input"
    PENDING_REVIEW = "pending_review"


class ViolationType(Enum):
    SPEED_OVER_LIMIT = "speed_over_limit"
    SPEED_UNDER_LIMIT = "speed_under_limit"
    VACUUM_LEAK = "vacuum_leak"
    TEMPERATURE_OVER_LIMIT = "temperature_over_limit"
    TEMP_RISE_LAG = "temp_rise_lag"
    MATERIAL_STRESS_EXCEEDED = "material_stress_exceeded"


@dataclass
class TimeSeriesPoint:
    timestamp: datetime
    speed_rpm: float
    vacuum_pa: float
    temperature_c: float


@dataclass
class FlywheelDataRecord:
    record_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    experiment_id: str = ""
    batch_id: str = ""
    time_series_data: List[TimeSeriesPoint] = field(default_factory=list)
    material_params_id: Optional[str] = None
    status: DataStatus = DataStatus.NORMAL
    violations: List[ViolationType] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    notes: str = ""

    def add_violation(self, violation: ViolationType):
        if violation not in self.violations:
            self.violations.append(violation)
            self.updated_at = datetime.now()


@dataclass
class MaterialParameterRecord:
    param_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    experiment_id: str = ""
    tensile_strength_mpa: float = 0.0
    density_kg_m3: float = 0.0
    elastic_modulus_gpa: float = 0.0
    poisson_ratio: float = 0.0
    source: str = ""
    is_latest: bool = True
    previous_version_id: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    created_by: str = ""
    change_reason: str = ""


@dataclass
class CalculationResult:
    result_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    record_id: str = ""
    kinetic_energy_j: float = 0.0
    stored_energy_kwh: float = 0.0
    max_stress_mpa: float = 0.0
    safety_factor: float = 0.0
    boundary_check_passed: bool = True
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    material_params_version: Optional[str] = None
    calculated_at: datetime = field(default_factory=datetime.now)


@dataclass
class ShutdownRecommendation:
    recommendation_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    record_id: str = ""
    should_shutdown: bool = False
    priority: str = "low"
    reason: str = ""
    violation_types: List[ViolationType] = field(default_factory=list)
    responsible_persons: List[str] = field(default_factory=list)
    next_steps: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    status: str = "pending"


@dataclass
class BatchProcessingResult:
    batch_id: str = ""
    total_records: int = 0
    normal_count: int = 0
    boundary_count: int = 0
    bad_input_count: int = 0
    pending_review_count: int = 0
    normal_results: List[FlywheelDataRecord] = field(default_factory=list)
    boundary_cases: List[FlywheelDataRecord] = field(default_factory=list)
    bad_inputs: List[FlywheelDataRecord] = field(default_factory=list)
    pending_review: List[FlywheelDataRecord] = field(default_factory=list)
    processed_at: datetime = field(default_factory=datetime.now)


def validate_data_point(point: TimeSeriesPoint) -> List[str]:
    errors = []
    if point.speed_rpm < 0 or point.speed_rpm > 100000:
        errors.append(f"转速值异常: {point.speed_rpm} rpm")
    if point.vacuum_pa < 0 or point.vacuum_pa > 100000:
        errors.append(f"真空度值异常: {point.vacuum_pa} Pa")
    if point.temperature_c < -50 or point.temperature_c > 500:
        errors.append(f"温度值异常: {point.temperature_c} °C")
    return errors

