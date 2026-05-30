from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Dict, List
from datetime import datetime


class SizeUnit(Enum):
    MM = "mm"
    UM = "μm"
    NM = "nm"
    M = "m"

    @classmethod
    def from_string(cls, s: str) -> Optional["SizeUnit"]:
        mapping = {
            "mm": cls.MM, "毫米": cls.MM,
            "μm": cls.UM, "um": cls.UM, "微米": cls.UM,
            "nm": cls.NM, "纳米": cls.NM,
            "m": cls.M, "米": cls.M
        }
        return mapping.get(s.lower() if s else "")


class DensityUnit(Enum):
    KG_M3 = "kg/m³"
    G_CM3 = "g/cm³"

    @classmethod
    def from_string(cls, s: str) -> Optional["DensityUnit"]:
        mapping = {
            "kg/m³": cls.KG_M3, "kg/m3": cls.KG_M3,
            "g/cm³": cls.G_CM3, "g/cm3": cls.G_CM3
        }
        return mapping.get(s.lower() if s else "")


class TimeUnit(Enum):
    SECOND = "s"
    MINUTE = "min"
    HOUR = "h"


class AnomalyType(Enum):
    MISSING_TEMPERATURE = "missing_temperature"
    MISSING_SIZE_UNIT = "missing_size_unit"
    INVALID_SIZE_UNIT = "invalid_size_unit"
    DUPLICATE_SAMPLE = "duplicate_sample"
    OUT_OF_BOUNDARY = "out_of_boundary"
    NEGATIVE_VALUE = "negative_value"
    SIZE_OUT_OF_MODEL_RANGE = "size_out_of_model_range"
    MERGE_CONFLICT = "merge_conflict"


@dataclass
class Particle:
    sample_id: str
    diameter: float
    diameter_unit: Optional[SizeUnit] = None
    raw_diameter_unit: str = ""
    density: Optional[float] = None
    density_unit: Optional[DensityUnit] = None
    source: str = ""
    record_time: Optional[datetime] = None
    metadata: Dict = field(default_factory=dict)


@dataclass
class Liquid:
    sample_id: str
    density: float
    density_unit: DensityUnit
    viscosity: float
    temperature: Optional[float] = None
    source: str = ""
    metadata: Dict = field(default_factory=dict)


@dataclass
class ExperimentRecord:
    sample_id: str
    particle: Optional[Particle] = None
    liquid: Optional[Liquid] = None
    raw_data: Dict = field(default_factory=dict)
    source_file: str = ""
    line_number: int = 0


class BoundaryType(Enum):
    LOWER = "lower_boundary"
    UPPER = "upper_boundary"
    NEAR_BOUNDARY = "near_boundary"


@dataclass
class BoundaryInfo:
    boundary_type: BoundaryType
    field_name: str
    value: float
    limit: float
    tolerance: float = 0.05


@dataclass
class SedimentationResult:
    sample_id: str
    velocity: float
    settling_time_1m: float
    reynolds_number: float
    is_laminar: bool
    particle_diameter_m: float
    particle_density_kgm3: float
    liquid_density_kgm3: float
    liquid_viscosity: float
    temperature: Optional[float]
    velocity_unit: str = "m/s"
    settling_time_unit: str = "s"
    boundary_info: Optional[BoundaryInfo] = None
    calculation_note: str = ""


@dataclass
class AnomalyRecord:
    sample_id: str
    anomaly_type: AnomalyType
    severity: str
    message: str
    human_readable_message: str
    source_file: str = ""
    line_number: int = 0
    field_name: str = ""
    raw_value: str = ""
    expected: str = ""
    conflict_details: Optional[Dict] = None


@dataclass
class MergeConflict:
    sample_id: str
    field_name: str
    particle_value: Optional[float]
    particle_source: str
    liquid_value: Optional[float]
    liquid_source: str
    resolved: bool = False
    resolution_note: str = ""


@dataclass
class BatchResult:
    normal_results: List[SedimentationResult] = field(default_factory=list)
    boundary_results: List[SedimentationResult] = field(default_factory=list)
    anomalies: List[AnomalyRecord] = field(default_factory=list)
    merge_conflicts: List[MergeConflict] = field(default_factory=list)
    total_records: int = 0
    processed_at: datetime = field(default_factory=datetime.now)
