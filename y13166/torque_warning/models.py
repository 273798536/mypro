from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Dict, Any


class TorqueDirection(str, Enum):
    CLOCKWISE = "CW"
    COUNTERCLOCKWISE = "CCW"
    UNKNOWN = "UNKNOWN"


class WarningLevel(str, Enum):
    NORMAL = "NORMAL"
    CAUTION = "CAUTION"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class MaterialStatus(str, Enum):
    PROCESSED = "PROCESSED"
    PENDING_SUPPLEMENT = "PENDING_SUPPLEMENT"
    MANUAL_OVERRIDE = "MANUAL_OVERRIDE"


@dataclass
class TorqueReading:
    timestamp: str
    value_nm: float
    direction: TorqueDirection
    sensor_id: str
    rpm: float = 0.0
    temperature_c: float = 25.0
    is_boundary: bool = False
    boundary_reason: str = ""


@dataclass
class EquipmentNameplate:
    equipment_id: str
    model: str
    rated_torque_nm: float
    max_torque_nm: float
    warning_threshold_pct: float
    critical_threshold_pct: float
    manufacturer: str
    install_date: str
    rated_speed_rpm: float
    notes: str = ""


@dataclass
class LateAttachment:
    attachment_id: str
    equipment_id: str
    file_name: str
    upload_time: str
    content_summary: str
    readings: List[TorqueReading] = field(default_factory=list)


@dataclass
class SupplementaryNote:
    note_id: str
    equipment_id: str
    author: str
    created_at: str
    content: str
    overrides_threshold: bool = False
    override_threshold_pct: Optional[float] = None


@dataclass
class ProcessedRecord:
    equipment_id: str
    readings: List[TorqueReading]
    nameplate: EquipmentNameplate
    warning_level: WarningLevel
    peak_torque_nm: float
    peak_torque_rpm: float
    direction_issue: bool
    direction_issue_desc: str
    boundary_samples: List[TorqueReading]
    extreme_values: List[TorqueReading]
    status: MaterialStatus
    status_note: str
    formulas_applied: List[str]
    units_ref: Dict[str, str]
    override_applied: bool = False
    override_note: str = ""


@dataclass
class RunConfig:
    input_dir: str
    output_dir: str
    threshold_adjustment_pct: float = 0.0
    require_confirmation: bool = True
    param_level: int = 1


@dataclass
class TerminalSummary:
    total_equipment: int
    normal_count: int
    caution_count: int
    warning_count: int
    critical_count: int
    direction_issue_count: int
    extreme_value_count: int
    boundary_sample_count: int
    pending_material_count: int
    manual_override_count: int
    processed_count: int
    run_config: RunConfig
    flagged_records: List[str]
    timestamp: str


@dataclass
class ConfirmationRequest:
    equipment_id: str
    reason: str
    next_step: str
    original_level: WarningLevel
    suggested_level: WarningLevel
    context: Dict[str, Any] = field(default_factory=dict)
