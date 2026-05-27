from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Set, Tuple, Optional
from .geometry import Point, Polygon


@dataclass
class CollisionResult:
    polygon_a_id: str
    polygon_b_id: str
    is_colliding: bool
    overlap_area: float = 0.0
    collision_depth: float = 0.0
    collision_normal: Optional[Point] = None
    is_exception: bool = False
    exception_reason: str = ""

    def to_dict(self) -> dict:
        return {
            "polygon_a_id": self.polygon_a_id,
            "polygon_b_id": self.polygon_b_id,
            "is_colliding": self.is_colliding,
            "overlap_area": self.overlap_area,
            "collision_depth": self.collision_depth,
            "collision_normal": (
                [self.collision_normal.x, self.collision_normal.y]
                if self.collision_normal
                else None
            ),
            "is_exception": self.is_exception,
            "exception_reason": self.exception_reason,
        }


def get_axes(polygon: Polygon) -> List[Point]:
    vertices = polygon.get_scaled_vertices()
    axes = []
    for i in range(len(vertices)):
        p1 = vertices[i]
        p2 = vertices[(i + 1) % len(vertices)]
        edge = p2 - p1
        normal = Point(-edge.y, edge.x).normalize()
        axes.append(normal)
    return axes


def project_polygon(polygon: Polygon, axis: Point) -> Tuple[float, float]:
    vertices = polygon.get_scaled_vertices()
    projections = [v.dot(axis) for v in vertices]
    return (min(projections), max(projections))


def overlap(min1: float, max1: float, min2: float, max2: float) -> bool:
    return not (max1 < min2 or max2 < min1)


def get_overlap_depth(min1: float, max1: float, min2: float, max2: float) -> float:
    return min(max1, max2) - max(min1, min2)


def sat_collision_detection(poly_a: Polygon, poly_b: Polygon) -> CollisionResult:
    if not poly_a.is_valid or not poly_b.is_valid:
        return CollisionResult(
            polygon_a_id=poly_a.id,
            polygon_b_id=poly_b.id,
            is_colliding=False,
        )

    axes_a = get_axes(poly_a)
    axes_b = get_axes(poly_b)
    all_axes = axes_a + axes_b

    min_overlap = float("inf")
    min_axis = None

    for axis in all_axes:
        min_a, max_a = project_polygon(poly_a, axis)
        min_b, max_b = project_polygon(poly_b, axis)

        if not overlap(min_a, max_a, min_b, max_b):
            return CollisionResult(
                polygon_a_id=poly_a.id,
                polygon_b_id=poly_b.id,
                is_colliding=False,
            )

        current_overlap = get_overlap_depth(min_a, max_a, min_b, max_b)
        if current_overlap < min_overlap:
            min_overlap = current_overlap
            min_axis = axis

    try:
        shapely_a = poly_a.to_shapely()
        shapely_b = poly_b.to_shapely()
        intersection = shapely_a.intersection(shapely_b)
        overlap_area = intersection.area
    except Exception:
        overlap_area = 0.0

    return CollisionResult(
        polygon_a_id=poly_a.id,
        polygon_b_id=poly_b.id,
        is_colliding=True,
        overlap_area=overlap_area,
        collision_depth=min_overlap,
        collision_normal=min_axis,
    )


@dataclass
class CollisionDetector:
    polygons: List[Polygon] = field(default_factory=list)
    exception_pairs: Set[Tuple[str, str]] = field(default_factory=set)
    layer_collision_matrix: dict = field(default_factory=dict)

    def add_polygon(self, polygon: Polygon):
        self.polygons.append(polygon)

    def add_exception_pair(self, id_a: str, id_b: str):
        pair = tuple(sorted([id_a, id_b]))
        self.exception_pairs.add(pair)

    def set_layer_collision(self, layer_a: str, layer_b: str, can_collide: bool):
        key = tuple(sorted([layer_a, layer_b]))
        self.layer_collision_matrix[key] = can_collide

    def can_layers_collide(self, layer_a: str, layer_b: str) -> bool:
        key = tuple(sorted([layer_a, layer_b]))
        return self.layer_collision_matrix.get(key, True)

    def is_exception_pair(self, id_a: str, id_b: str) -> bool:
        pair = tuple(sorted([id_a, id_b]))
        return pair in self.exception_pairs

    def check_all_collisions(self) -> List[CollisionResult]:
        results = []
        n = len(self.polygons)

        for i in range(n):
            for j in range(i + 1, n):
                poly_a = self.polygons[i]
                poly_b = self.polygons[j]

                if not self.can_layers_collide(
                    poly_a.collision_layer, poly_b.collision_layer
                ):
                    continue

                result = sat_collision_detection(poly_a, poly_b)

                if result.is_colliding:
                    if self.is_exception_pair(poly_a.id, poly_b.id):
                        result.is_exception = True
                        result.exception_reason = "预设例外对"
                    elif self._check_polygon_exception_notes(poly_a, poly_b):
                        result.is_exception = True
                        result.exception_reason = "多边形例外备注匹配"

                results.append(result)

        return results

    def _check_polygon_exception_notes(self, poly_a: Polygon, poly_b: Polygon) -> bool:
        note_a = poly_a.exception_note.lower()
        note_b = poly_b.exception_note.lower()

        if not note_a or not note_b:
            return False

        keywords_a = set(k.strip() for k in note_a.split(","))
        keywords_b = set(k.strip() for k in note_b.split(","))

        return len(keywords_a & keywords_b) > 0

    def get_collisions_by_scene(self, scene_id: str) -> List[CollisionResult]:
        scene_polygons = [p for p in self.polygons if p.scene_id == scene_id]
        temp_detector = CollisionDetector()
        temp_detector.polygons = scene_polygons
        temp_detector.exception_pairs = self.exception_pairs
        temp_detector.layer_collision_matrix = self.layer_collision_matrix
        return temp_detector.check_all_collisions()

    def get_invalid_polygons(self) -> List[Polygon]:
        return [p for p in self.polygons if not p.is_valid]
