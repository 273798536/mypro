"""核心数据模型定义"""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List, Tuple
import math
from datetime import datetime


class AngleUnit(str, Enum):
    DEGREE = "degree"
    RADIAN = "radian"


class IntersectionType(str, Enum):
    VALID = "valid"
    PARALLEL = "parallel"
    COINCIDENT = "coincident"
    ON_EXTENSION = "on_extension"
    OUT_OF_BOUNDS = "out_of_bounds"
    BEHIND_RAY = "behind_ray"


class ResultStatus(str, Enum):
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    SKIPPED = "skipped"


@dataclass
class Point:
    x: float
    y: float
    z: Optional[float] = None

    def to_tuple(self) -> Tuple[float, ...]:
        if self.z is not None:
            return (self.x, self.y, self.z)
        return (self.x, self.y)

    def distance_to(self, other: "Point") -> float:
        if self.z is not None and other.z is not None:
            return math.sqrt((self.x - other.x) ** 2 + (self.y - other.y) ** 2 + (self.z - other.z) ** 2)
        return math.sqrt((self.x - other.x) ** 2 + (self.y - other.y) ** 2)

    def __add__(self, other: "Vector") -> "Point":
        if isinstance(other, Vector):
            if self.z is not None and other.z is not None:
                return Point(self.x + other.x, self.y + other.y, self.z + other.z)
            return Point(self.x + other.x, self.y + other.y)
        raise TypeError("Point只能与Vector相加")

    def __sub__(self, other: "Point") -> "Vector":
        if self.z is not None and other.z is not None:
            return Vector(self.x - other.x, self.y - other.y, self.z - other.z)
        return Vector(self.x - other.x, self.y - other.y)

    def __repr__(self) -> str:
        if self.z is not None:
            return f"Point({self.x:.4f}, {self.y:.4f}, {self.z:.4f})"
        return f"Point({self.x:.4f}, {self.y:.4f})"


@dataclass
class Vector:
    x: float
    y: float
    z: Optional[float] = None

    @classmethod
    def from_points(cls, start: Point, end: Point) -> "Vector":
        return end - start

    @classmethod
    def from_angle(cls, angle: float, unit: AngleUnit = AngleUnit.DEGREE) -> "Vector":
        if unit == AngleUnit.DEGREE:
            rad = math.radians(angle)
        else:
            rad = angle
        return cls(math.cos(rad), math.sin(rad))

    def magnitude(self) -> float:
        if self.z is not None:
            return math.sqrt(self.x ** 2 + self.y ** 2 + self.z ** 2)
        return math.sqrt(self.x ** 2 + self.y ** 2)

    def normalize(self) -> "Vector":
        mag = self.magnitude()
        if mag == 0:
            raise ValueError("零向量无法归一化")
        if self.z is not None:
            return Vector(self.x / mag, self.y / mag, self.z / mag)
        return Vector(self.x / mag, self.y / mag)

    def dot(self, other: "Vector") -> float:
        if self.z is not None and other.z is not None:
            return self.x * other.x + self.y * other.y + self.z * other.z
        return self.x * other.x + self.y * other.y

    def cross(self, other: "Vector") -> "Vector":
        if self.z is not None and other.z is not None:
            return Vector(
                self.y * other.z - self.z * other.y,
                self.z * other.x - self.x * other.z,
                self.x * other.y - self.y * other.x
            )
        z_comp = self.x * other.y - self.y * other.x
        return Vector(0, 0, z_comp)

    def angle(self, other: "Vector", unit: AngleUnit = AngleUnit.DEGREE) -> float:
        dot_product = self.dot(other)
        mag_product = self.magnitude() * other.magnitude()
        if mag_product == 0:
            return 0.0
        cos_theta = max(-1.0, min(1.0, dot_product / mag_product))
        rad = math.acos(cos_theta)
        if unit == AngleUnit.DEGREE:
            return math.degrees(rad)
        return rad

    def reflect(self, normal: "Vector") -> "Vector":
        n = normal.normalize()
        dot = self.dot(n)
        reflected = self - n * (2 * dot)
        return reflected

    def __mul__(self, scalar: float) -> "Vector":
        if self.z is not None:
            return Vector(self.x * scalar, self.y * scalar, self.z * scalar)
        return Vector(self.x * scalar, self.y * scalar)

    def __sub__(self, other: "Vector") -> "Vector":
        if self.z is not None and other.z is not None:
            return Vector(self.x - other.x, self.y - other.y, self.z - other.z)
        return Vector(self.x - other.x, self.y - other.y)

    def __repr__(self) -> str:
        if self.z is not None:
            return f"Vector({self.x:.4f}, {self.y:.4f}, {self.z:.4f})"
        return f"Vector({self.x:.4f}, {self.y:.4f})"


@dataclass
class LineSegment:
    start: Point
    end: Point
    label: str = ""
    material: str = "mirror"
    refractive_index: float = 1.0

    def to_vector(self) -> Vector:
        return Vector.from_points(self.start, self.end)

    def midpoint(self) -> Point:
        if self.start.z is not None and self.end.z is not None:
            return Point(
                (self.start.x + self.end.x) / 2,
                (self.start.y + self.end.y) / 2,
                (self.start.z + self.end.z) / 2
            )
        return Point(
            (self.start.x + self.end.x) / 2,
            (self.start.y + self.end.y) / 2
        )

    def length(self) -> float:
        return self.start.distance_to(self.end)

    def contains_point(self, p: Point, epsilon: float = 1e-9) -> bool:
        d1 = p.distance_to(self.start)
        d2 = p.distance_to(self.end)
        total = self.length()
        return abs(d1 + d2 - total) < epsilon

    def get_normal(self, incident_dir: Optional[Vector] = None) -> Vector:
        seg_vec = self.to_vector()
        if seg_vec.z is not None:
            perp = Vector(-seg_vec.y, seg_vec.x, 0)
        else:
            perp = Vector(-seg_vec.y, seg_vec.x)
        if incident_dir is not None:
            dot = perp.dot(incident_dir)
            if dot < 0:
                perp = perp * (-1)
        return perp.normalize()

    def __repr__(self) -> str:
        return f"LineSegment({self.start} -> {self.end}, label='{self.label}')"


@dataclass
class Ray:
    origin: Point
    direction: Vector
    label: str = ""
    wavelength: Optional[float] = None

    @classmethod
    def from_two_points(cls, origin: Point, through: Point, label: str = "") -> "Ray":
        direction = Vector.from_points(origin, through).normalize()
        return cls(origin, direction, label)

    @classmethod
    def from_angle(cls, origin: Point, angle: float, unit: AngleUnit = AngleUnit.DEGREE, label: str = "") -> "Ray":
        direction = Vector.from_angle(angle, unit).normalize()
        return cls(origin, direction, label)

    def point_at(self, t: float) -> Point:
        if t < 0:
            raise ValueError("射线参数t不能为负")
        return self.origin + self.direction * t

    def __repr__(self) -> str:
        return f"Ray(origin={self.origin}, dir={self.direction}, label='{self.label}')"


@dataclass
class BoundingBox:
    x_min: float
    x_max: float
    y_min: float
    y_max: float
    z_min: Optional[float] = None
    z_max: Optional[float] = None

    def contains(self, p: Point, epsilon: float = 1e-9) -> bool:
        if p.x < self.x_min - epsilon or p.x > self.x_max + epsilon:
            return False
        if p.y < self.y_min - epsilon or p.y > self.y_max + epsilon:
            return False
        if self.z_min is not None and self.z_max is not None and p.z is not None:
            if p.z < self.z_min - epsilon or p.z > self.z_max + epsilon:
                return False
        return True

    def __repr__(self) -> str:
        if self.z_min is not None and self.z_max is not None:
            return f"BoundingBox(x:[{self.x_min},{self.x_max}], y:[{self.y_min},{self.y_max}], z:[{self.z_min},{self.z_max}])"
        return f"BoundingBox(x:[{self.x_min},{self.x_max}], y:[{self.y_min},{self.y_max}])"


@dataclass
class CorrectionRecord:
    timestamp: datetime
    field: str
    old_value: str
    new_value: str
    reason: str
    operator: str = "system"

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp.isoformat(),
            "field": self.field,
            "old_value": self.old_value,
            "new_value": self.new_value,
            "reason": self.reason,
            "operator": self.operator
        }


@dataclass
class ProblemInput:
    problem_id: str
    source: str
    mirror_segments: List[LineSegment]
    incident_rays: List[Ray]
    bounding_box: Optional[BoundingBox] = None
    angle_unit: AngleUnit = AngleUnit.DEGREE
    refractive_index_env: float = 1.0
    metadata: dict = field(default_factory=dict)
    corrections: List[CorrectionRecord] = field(default_factory=list)

    def add_correction(self, field: str, old_value: str, new_value: str, reason: str, operator: str = "system"):
        self.corrections.append(CorrectionRecord(
            timestamp=datetime.now(),
            field=field,
            old_value=old_value,
            new_value=new_value,
            reason=reason,
            operator=operator
        ))


@dataclass
class IntersectionResult:
    ray: Ray
    segment: LineSegment
    intersection_type: IntersectionType
    intersection_point: Optional[Point] = None
    parameter_t: Optional[float] = None
    parameter_s: Optional[float] = None

    def is_valid(self) -> bool:
        return self.intersection_type == IntersectionType.VALID


@dataclass
class ReflectionResult:
    incident_ray: Ray
    mirror_segment: LineSegment
    intersection: IntersectionResult
    incident_angle: Optional[float] = None
    reflection_angle: Optional[float] = None
    reflected_ray: Optional[Ray] = None
    normal: Optional[Vector] = None
    angle_unit: AngleUnit = AngleUnit.DEGREE


@dataclass
class SingleRayResult:
    ray_label: str
    status: ResultStatus
    intersection: Optional[IntersectionResult] = None
    reflection: Optional[ReflectionResult] = None
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    explanations: List[str] = field(default_factory=list)
    score_deductions: List[Tuple[str, float, str]] = field(default_factory=list)


@dataclass
class ProblemResult:
    problem_id: str
    source: str
    status: ResultStatus
    ray_results: List[SingleRayResult]
    total_score: float = 0.0
    max_score: float = 0.0
    summary: List[str] = field(default_factory=list)
    processing_time: float = 0.0
    input_corrections: List[CorrectionRecord] = field(default_factory=list)
