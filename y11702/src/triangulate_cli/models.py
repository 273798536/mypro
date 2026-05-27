from __future__ import annotations

import math
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Tuple
from uuid import uuid4


class AngleUnit(Enum):
    DEGREES = "degrees"
    RADIANS = "radians"
    GRADS = "grads"
    MILS = "mils"


class CoordinateSystem(Enum):
    UTM = "utm"
    LATLON = "latlon"
    CARTESIAN = "cartesian"


class ObservationStatus(Enum):
    VALID = "valid"
    INVALID = "invalid"
    OUTLIER = "outlier"
    PARALLEL = "parallel"


@dataclass
class SourceTrace:
    filename: str
    line_number: int
    column: Optional[int] = None
    raw_text: str = ""

    def __str__(self) -> str:
        if self.column:
            return f"{self.filename}:{self.line_number}:{self.column}"
        return f"{self.filename}:{self.line_number}"


@dataclass
class Correction:
    id: str = field(default_factory=lambda: uuid4().hex[:8])
    timestamp: float = 0.0
    reason: str = ""
    old_value: str = ""
    new_value: str = ""
    source: Optional[SourceTrace] = None


@dataclass
class Coordinate:
    x: float
    y: float
    system: CoordinateSystem = CoordinateSystem.CARTESIAN
    z: Optional[float] = None
    source: Optional[SourceTrace] = None

    def to_tuple(self) -> Tuple[float, float]:
        return (self.x, self.y)

    def distance_to(self, other: Coordinate) -> float:
        return math.hypot(self.x - other.x, self.y - other.y)


@dataclass
class Bearing:
    angle: float
    unit: AngleUnit = AngleUnit.DEGREES
    error: float = 0.0
    source: Optional[SourceTrace] = None

    def to_radians(self) -> float:
        if self.unit == AngleUnit.DEGREES:
            return math.radians(self.angle)
        elif self.unit == AngleUnit.GRADS:
            return self.angle * math.pi / 200.0
        elif self.unit == AngleUnit.MILS:
            return self.angle * math.pi / 3200.0
        return self.angle

    def to_degrees(self) -> float:
        if self.unit == AngleUnit.RADIANS:
            return math.degrees(self.angle)
        elif self.unit == AngleUnit.GRADS:
            return self.angle * 0.9
        elif self.unit == AngleUnit.MILS:
            return self.angle * 0.05625
        return self.angle

    def error_radians(self) -> float:
        if self.unit == AngleUnit.DEGREES:
            return math.radians(self.error)
        elif self.unit == AngleUnit.GRADS:
            return self.error * math.pi / 200.0
        elif self.unit == AngleUnit.MILS:
            return self.error * math.pi / 3200.0
        return self.error


@dataclass
class Observation:
    id: str = field(default_factory=lambda: uuid4().hex[:8])
    station_id: str = ""
    position: Coordinate = field(default_factory=lambda: Coordinate(0, 0))
    bearing: Bearing = field(default_factory=lambda: Bearing(0))
    status: ObservationStatus = ObservationStatus.VALID
    note: str = ""
    corrections: List[Correction] = field(default_factory=list)
    source: Optional[SourceTrace] = None

    def add_correction(self, correction: Correction):
        self.corrections.append(correction)


@dataclass
class MapBounds:
    min_x: float
    max_x: float
    min_y: float
    max_y: float
    name: str = ""
    source: Optional[SourceTrace] = None

    def contains(self, point: Coordinate) -> bool:
        return (self.min_x <= point.x <= self.max_x and
                self.min_y <= point.y <= self.max_y)

    def width(self) -> float:
        return self.max_x - self.min_x

    def height(self) -> float:
        return self.max_y - self.min_y


@dataclass
class IntersectionPoint:
    position: Coordinate
    observations: List[Observation]
    residual: float = 0.0
    is_valid: bool = True
    source: Optional[SourceTrace] = None


@dataclass
class ErrorEllipse:
    center: Coordinate
    major_axis: float
    minor_axis: float
    orientation: float
    confidence_level: float = 0.95


@dataclass
class TriangulationResult:
    estimated_position: Coordinate
    error_ellipse: Optional[ErrorEllipse] = None
    used_observations: List[Observation] = field(default_factory=list)
    excluded_observations: List[Observation] = field(default_factory=list)
    intersections: List[IntersectionPoint] = field(default_factory=list)
    confidence_score: float = 0.0
    corrections: List[Correction] = field(default_factory=list)


@dataclass
class InputData:
    observations: List[Observation] = field(default_factory=list)
    map_bounds: Optional[MapBounds] = None
    corrections: List[Correction] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)
