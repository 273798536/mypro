from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional


class MaterialSource(Enum):
    EXPERIMENT_RECORD = "experiment_record"
    LATE_ATTACHMENT = "late_attachment"
    ORAL_NOTE = "oral_note"


class DataQuality(Enum):
    OK = "ok"
    SUSPECT = "suspect"
    BAD = "bad"
    MISSING = "missing"


@dataclass
class ProvenanceEntry:
    source: MaterialSource
    source_file: str
    row_index: Optional[int] = None
    timestamp: Optional[str] = None
    version: int = 1
    content_hash: str = ""

    def compute_hash(self, data: Any) -> str:
        raw = json.dumps(data, sort_keys=True, ensure_ascii=False)
        return hashlib.md5(raw.encode()).hexdigest()[:12]

    def update_version(self, data: Any) -> None:
        new_hash = self.compute_hash(data)
        if new_hash != self.content_hash and self.content_hash:
            self.version += 1
        self.content_hash = new_hash


@dataclass
class SurfaceData:
    material_name: str
    area_m2: float
    absorption_coeff: float
    original_area_m2: Optional[float] = None
    original_absorption_coeff: Optional[float] = None
    provenance: ProvenanceEntry = field(default_factory=lambda: ProvenanceEntry(source=MaterialSource.EXPERIMENT_RECORD, source_file=""))
    quality: DataQuality = DataQuality.OK
    quality_reason: str = ""
    original_row: Optional[int] = None

    def __post_init__(self) -> None:
        if self.original_area_m2 is None:
            self.original_area_m2 = self.area_m2
        if self.original_absorption_coeff is None:
            self.original_absorption_coeff = self.absorption_coeff

    @property
    def absorption_area(self) -> float:
        return self.area_m2 * self.absorption_coeff

    @property
    def original_absorption_area(self) -> float:
        assert self.original_area_m2 is not None
        assert self.original_absorption_coeff is not None
        return self.original_area_m2 * self.original_absorption_coeff

    @property
    def area_unit(self) -> str:
        return "m²"

    @property
    def coeff_unit(self) -> str:
        return "无量纲"

    @property
    def has_coeff_deviation(self) -> bool:
        assert self.original_absorption_coeff is not None
        return abs(self.absorption_coeff - self.original_absorption_coeff) > 1e-9

    @property
    def has_area_deviation(self) -> bool:
        assert self.original_area_m2 is not None
        return abs(self.area_m2 - self.original_area_m2) > 1e-9

    @property
    def delta_coeff(self) -> float:
        assert self.original_absorption_coeff is not None
        return self.absorption_coeff - self.original_absorption_coeff

    @property
    def delta_area(self) -> float:
        assert self.original_area_m2 is not None
        return self.area_m2 - self.original_area_m2

    def to_dict(self) -> dict:
        return {
            "material_name": self.material_name,
            "area_m2": self.area_m2,
            "absorption_coeff": self.absorption_coeff,
            "original_area_m2": self.original_area_m2,
            "original_absorption_coeff": self.original_absorption_coeff,
            "absorption_area_m2": self.absorption_area,
            "delta_coeff": round(self.delta_coeff, 6) if self.has_coeff_deviation else 0.0,
            "delta_area": round(self.delta_area, 4) if self.has_area_deviation else 0.0,
            "has_deviation": self.has_coeff_deviation or self.has_area_deviation,
            "source": self.provenance.source.value,
            "source_file": self.provenance.source_file,
            "version": self.provenance.version,
            "quality": self.quality.value,
            "quality_reason": self.quality_reason,
            "original_row": self.original_row,
        }


@dataclass
class RoomData:
    room_id: str
    volume_m3: float
    measured_t60_s: float
    original_volume_m3: Optional[float] = None
    original_measured_t60_s: Optional[float] = None
    surfaces: list[SurfaceData] = field(default_factory=list)
    provenance: ProvenanceEntry = field(default_factory=lambda: ProvenanceEntry(source=MaterialSource.EXPERIMENT_RECORD, source_file=""))
    quality: DataQuality = DataQuality.OK
    quality_reason: str = ""
    original_row: Optional[int] = None
    frequency_hz: Optional[int] = None

    def __post_init__(self) -> None:
        if self.original_volume_m3 is None:
            self.original_volume_m3 = self.volume_m3
        if self.original_measured_t60_s is None:
            self.original_measured_t60_s = self.measured_t60_s

    @property
    def volume_unit(self) -> str:
        return "m³"

    @property
    def t60_unit(self) -> str:
        return "s"

    @property
    def total_absorption(self) -> float:
        return sum(s.absorption_area for s in self.surfaces if s.quality != DataQuality.BAD)

    @property
    def effective_surface_count(self) -> int:
        return len([s for s in self.surfaces if s.quality != DataQuality.BAD])

    @property
    def has_volume_deviation(self) -> bool:
        assert self.original_volume_m3 is not None
        return abs(self.volume_m3 - self.original_volume_m3) > 1e-9

    @property
    def has_t60_deviation(self) -> bool:
        assert self.original_measured_t60_s is not None
        return abs(self.measured_t60_s - self.original_measured_t60_s) > 1e-9

    @property
    def delta_volume(self) -> float:
        assert self.original_volume_m3 is not None
        return self.volume_m3 - self.original_volume_m3

    @property
    def delta_t60(self) -> float:
        assert self.original_measured_t60_s is not None
        return self.measured_t60_s - self.original_measured_t60_s

    def to_dict(self) -> dict:
        return {
            "room_id": self.room_id,
            "volume_m3": self.volume_m3,
            "measured_t60_s": self.measured_t60_s,
            "original_volume_m3": self.original_volume_m3,
            "original_measured_t60_s": self.original_measured_t60_s,
            "delta_volume": round(self.delta_volume, 4) if self.has_volume_deviation else 0.0,
            "delta_t60": round(self.delta_t60, 4) if self.has_t60_deviation else 0.0,
            "has_volume_deviation": self.has_volume_deviation,
            "has_t60_deviation": self.has_t60_deviation,
            "frequency_hz": self.frequency_hz,
            "total_absorption_m2": self.total_absorption,
            "effective_surface_count": self.effective_surface_count,
            "surface_count_total": len(self.surfaces),
            "source": self.provenance.source.value,
            "source_file": self.provenance.source_file,
            "version": self.provenance.version,
            "quality": self.quality.value,
            "quality_reason": self.quality_reason,
            "original_row": self.original_row,
            "surfaces": [s.to_dict() for s in self.surfaces],
        }


@dataclass
class SurfaceContribution:
    material_name: str
    area_m2: float
    absorption_coeff: float
    absorption_area_m2: float
    partial_t60_s: float
    contribution_s: float
    contribution_pct: float
    sensitivity_s_per_alpha: float = 0.0
    delta_alpha: float = 0.0
    delta_source: str = ""
    is_sensitivity_only: bool = False
    original_row: Optional[int] = None

    def to_dict(self) -> dict:
        return {
            "material_name": self.material_name,
            "area_m2": self.area_m2,
            "absorption_coeff": self.absorption_coeff,
            "absorption_area_m2": round(self.absorption_area_m2, 4),
            "partial_t60_s": round(self.partial_t60_s, 4),
            "contribution_s": round(self.contribution_s, 4),
            "contribution_pct": round(self.contribution_pct, 2),
            "sensitivity_s_per_alpha": round(self.sensitivity_s_per_alpha, 4),
            "delta_alpha": round(self.delta_alpha, 6),
            "delta_source": self.delta_source,
            "is_sensitivity_only": self.is_sensitivity_only,
            "original_row": self.original_row,
        }


@dataclass
class AttributedError:
    room_id: str
    calculated_t60_s: float
    measured_t60_s: float
    absolute_error_s: float
    relative_error_pct: float
    volume_contribution_s: float
    volume_contribution_pct: float
    surface_contributions: list[SurfaceContribution] = field(default_factory=list)
    dominant_source: str = ""
    formula_chain: list[FormulaStep] = field(default_factory=list)
    explained_error_s: float = 0.0
    unexplained_error_s: float = 0.0
    attribution_mode: str = "sensitivity_only"

    def to_dict(self) -> dict:
        return {
            "room_id": self.room_id,
            "calculated_t60_s": round(self.calculated_t60_s, 4),
            "measured_t60_s": round(self.measured_t60_s, 4),
            "absolute_error_s": round(self.absolute_error_s, 4),
            "relative_error_pct": round(self.relative_error_pct, 2),
            "volume_contribution_s": round(self.volume_contribution_s, 4),
            "volume_contribution_pct": round(self.volume_contribution_pct, 2),
            "surface_contributions": [sc.to_dict() for sc in self.surface_contributions],
            "dominant_source": self.dominant_source,
            "formula_chain": [fs.to_dict() for fs in self.formula_chain],
            "explained_error_s": round(self.explained_error_s, 4),
            "unexplained_error_s": round(self.unexplained_error_s, 4),
            "attribution_mode": self.attribution_mode,
        }


@dataclass
class FormulaStep:
    name: str
    expression: str
    values: dict[str, Any]
    result: float
    unit: str
    note: str = ""

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "expression": self.expression,
            "values": self.values,
            "result": round(self.result, 4) if isinstance(self.result, float) else self.result,
            "unit": self.unit,
            "note": self.note,
        }


@dataclass
class ConflictRecord:
    room_id: str
    field_name: str
    value_a: Any
    value_b: Any
    source_a: str
    source_b: str
    source_a_version: int = 1
    source_b_version: int = 1
    resolution: str = ""

    def to_dict(self) -> dict:
        return {
            "room_id": self.room_id,
            "field_name": self.field_name,
            "value_a": self.value_a,
            "value_b": self.value_b,
            "source_a": self.source_a,
            "source_b": self.source_b,
            "source_a_version": self.source_a_version,
            "source_b_version": self.source_b_version,
            "resolution": self.resolution,
        }


@dataclass
class SamplingGap:
    room_id: str
    gap_type: str
    description: str
    affected_fields: list[str]
    severity: str = "warning"

    def to_dict(self) -> dict:
        return {
            "room_id": self.room_id,
            "gap_type": self.gap_type,
            "description": self.description,
            "affected_fields": self.affected_fields,
            "severity": self.severity,
        }


@dataclass
class PipelineResult:
    rooms: list[RoomData]
    attributed_errors: list[AttributedError]
    conflicts: list[ConflictRecord]
    sampling_gaps: list[SamplingGap]
    bad_data_refs: list[BadDataRef]
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "rooms": [r.to_dict() for r in self.rooms],
            "attributed_errors": [ae.to_dict() for ae in self.attributed_errors],
            "conflicts": [c.to_dict() for c in self.conflicts],
            "sampling_gaps": [sg.to_dict() for sg in self.sampling_gaps],
            "bad_data_refs": [bd.to_dict() for bd in self.bad_data_refs],
        }


@dataclass
class BadDataRef:
    room_id: str
    field_name: str
    field_value: Any
    boundary_min: Any
    boundary_max: Any
    source: str
    source_file: str
    original_row: Optional[int] = None
    reason: str = ""

    def to_dict(self) -> dict:
        return {
            "room_id": self.room_id,
            "field_name": self.field_name,
            "field_value": self.field_value,
            "boundary_min": self.boundary_min,
            "boundary_max": self.boundary_max,
            "source": self.source,
            "source_file": self.source_file,
            "original_row": self.original_row,
            "reason": self.reason,
        }
