from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import List, Tuple, Optional
from shapely.geometry import Polygon as ShapelyPolygon
from shapely.validation import explain_validity


@dataclass
class Point:
    x: float
    y: float

    def __add__(self, other: Point) -> Point:
        return Point(self.x + other.x, self.y + other.y)

    def __sub__(self, other: Point) -> Point:
        return Point(self.x - other.x, self.y - other.y)

    def __mul__(self, scalar: float) -> Point:
        return Point(self.x * scalar, self.y * scalar)

    def dot(self, other: Point) -> float:
        return self.x * other.x + self.y * other.y

    def cross(self, other: Point) -> float:
        return self.x * other.y - self.y * other.x

    def length(self) -> float:
        return math.sqrt(self.x * self.x + self.y * self.y)

    def normalize(self) -> Point:
        l = self.length()
        if l == 0:
            return Point(0, 0)
        return Point(self.x / l, self.y / l)

    def to_tuple(self) -> Tuple[float, float]:
        return (self.x, self.y)


@dataclass
class Polygon:
    id: str
    vertices: List[Point]
    collision_layer: str = "default"
    scale: float = 1.0
    scene_id: str = ""
    exception_note: str = ""
    source_file: str = ""
    issues: List[str] = field(default_factory=list)
    is_valid: bool = True

    def __post_init__(self):
        self._validate()

    def _validate(self):
        if len(self.vertices) < 3:
            self.is_valid = False
            self.issues.append("多边形顶点数少于3个")
            return

        self._check_self_intersection()
        self._check_scale()

    def _check_self_intersection(self):
        try:
            shapely_poly = ShapelyPolygon([v.to_tuple() for v in self.vertices])
            if not shapely_poly.is_valid:
                validity_info = explain_validity(shapely_poly)
                self.is_valid = False
                if "Self-intersection" in validity_info:
                    self.issues.append(f"自交多边形: {validity_info}")
                else:
                    self.issues.append(f"无效多边形: {validity_info}")
        except Exception as e:
            self.is_valid = False
            self.issues.append(f"多边形验证失败: {str(e)}")

    def _check_scale(self):
        if self.scale <= 0:
            self.is_valid = False
            self.issues.append(f"缩放比例错误: {self.scale} (必须大于0)")
        elif self.scale < 0.01:
            self.issues.append(f"缩放比例过小警告: {self.scale}")
        elif self.scale > 100:
            self.issues.append(f"缩放比例过大警告: {self.scale}")

    def get_scaled_vertices(self) -> List[Point]:
        center = self._get_center()
        return [center + (v - center) * self.scale for v in self.vertices]

    def _get_center(self) -> Point:
        if not self.vertices:
            return Point(0, 0)
        cx = sum(v.x for v in self.vertices) / len(self.vertices)
        cy = sum(v.y for v in self.vertices) / len(self.vertices)
        return Point(cx, cy)

    def get_bounds(self) -> Tuple[float, float, float, float]:
        scaled = self.get_scaled_vertices()
        xs = [v.x for v in scaled]
        ys = [v.y for v in scaled]
        return (min(xs), min(ys), max(xs), max(ys))

    def to_shapely(self) -> ShapelyPolygon:
        return ShapelyPolygon([v.to_tuple() for v in self.get_scaled_vertices()])


def parse_polygon(data: dict, source_file: str = "") -> Polygon:
    vertices = []
    for coord in data.get("vertices", []):
        if isinstance(coord, (list, tuple)) and len(coord) >= 2:
            vertices.append(Point(float(coord[0]), float(coord[1])))

    return Polygon(
        id=str(data.get("id", "")),
        vertices=vertices,
        collision_layer=data.get("collision_layer", "default"),
        scale=float(data.get("scale", 1.0)),
        scene_id=str(data.get("scene_id", "")),
        exception_note=data.get("exception_note", ""),
        source_file=source_file,
    )
