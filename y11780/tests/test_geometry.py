"""测试几何核心算法"""

import math
import pytest
from geometry_optics.core.models import (
    Point, Vector, LineSegment, Ray, BoundingBox,
    IntersectionType, AngleUnit
)
from geometry_optics.core.geometry import (
    ray_segment_intersection,
    find_closest_intersection,
    compute_reflection,
    angle_between,
    are_parallel,
    are_orthogonal,
    angle_difference,
    normalize_angle,
    distance_to_segment
)


class TestPoint:
    def test_point_creation(self):
        p = Point(1, 2)
        assert p.x == 1
        assert p.y == 2
        assert p.z is None

    def test_point_3d(self):
        p = Point(1, 2, 3)
        assert p.to_tuple() == (1, 2, 3)

    def test_point_distance(self):
        p1 = Point(0, 0)
        p2 = Point(3, 4)
        assert p1.distance_to(p2) == 5.0

    def test_point_add_vector(self):
        p = Point(1, 2)
        v = Vector(3, 4)
        result = p + v
        assert result.x == 4
        assert result.y == 6

    def test_point_sub_point(self):
        p1 = Point(4, 6)
        p2 = Point(1, 2)
        v = p1 - p2
        assert v.x == 3
        assert v.y == 4


class TestVector:
    def test_vector_creation(self):
        v = Vector(3, 4)
        assert v.magnitude() == 5.0

    def test_vector_normalize(self):
        v = Vector(3, 4)
        n = v.normalize()
        assert abs(n.magnitude() - 1.0) < 1e-9

    def test_vector_dot(self):
        v1 = Vector(1, 0)
        v2 = Vector(0, 1)
        assert v1.dot(v2) == 0

    def test_vector_cross_2d(self):
        v1 = Vector(1, 0)
        v2 = Vector(0, 1)
        cross = v1.cross(v2)
        assert cross.z == 1

    def test_vector_angle(self):
        v1 = Vector(1, 0)
        v2 = Vector(0, 1)
        angle = v1.angle(v2)
        assert abs(angle - 90.0) < 1e-9

    def test_vector_reflect(self):
        incident = Vector(1, -1)
        normal = Vector(0, 1)
        reflected = incident.reflect(normal)
        assert abs(reflected.x - 1.0) < 1e-9
        assert abs(reflected.y - 1.0) < 1e-9

    def test_vector_from_angle(self):
        v = Vector.from_angle(45, AngleUnit.DEGREE)
        assert abs(v.x - math.sqrt(2)/2) < 1e-9
        assert abs(v.y - math.sqrt(2)/2) < 1e-9


class TestLineSegment:
    def test_segment_creation(self):
        seg = LineSegment(Point(0, 0), Point(1, 0), label="M1")
        assert seg.length() == 1.0
        assert seg.label == "M1"

    def test_segment_midpoint(self):
        seg = LineSegment(Point(0, 0), Point(2, 2))
        mid = seg.midpoint()
        assert mid.x == 1
        assert mid.y == 1

    def test_segment_contains_point(self):
        seg = LineSegment(Point(0, 0), Point(2, 0))
        assert seg.contains_point(Point(1, 0))
        assert not seg.contains_point(Point(3, 0))

    def test_segment_normal(self):
        seg = LineSegment(Point(0, 0), Point(1, 0))
        normal = seg.get_normal()
        assert abs(normal.y - 1.0) < 1e-9


class TestRay:
    def test_ray_from_two_points(self):
        ray = Ray.from_two_points(Point(0, 0), Point(1, 0), label="R1")
        assert abs(ray.direction.x - 1.0) < 1e-9
        assert abs(ray.direction.y) < 1e-9

    def test_ray_from_angle(self):
        ray = Ray.from_angle(Point(0, 0), 0, AngleUnit.DEGREE)
        assert abs(ray.direction.x - 1.0) < 1e-9

    def test_ray_point_at(self):
        ray = Ray(Point(0, 0), Vector(1, 0))
        p = ray.point_at(5)
        assert p.x == 5
        assert p.y == 0


class TestBoundingBox:
    def test_bbox_contains(self):
        bbox = BoundingBox(0, 10, 0, 10)
        assert bbox.contains(Point(5, 5))
        assert not bbox.contains(Point(-1, 5))
        assert not bbox.contains(Point(11, 5))


class TestRaySegmentIntersection:
    def test_valid_intersection(self):
        ray = Ray(Point(5, 5), Vector(0, -1))
        seg = LineSegment(Point(2, 2), Point(8, 2))
        result = ray_segment_intersection(ray, seg)

        assert result.intersection_type == IntersectionType.VALID
        assert result.intersection_point is not None
        assert abs(result.intersection_point.x - 5.0) < 1e-9
        assert abs(result.intersection_point.y - 2.0) < 1e-9
        assert result.parameter_t == 3.0
        assert 0 <= result.parameter_s <= 1

    def test_parallel_no_intersection(self):
        ray = Ray(Point(0, 4), Vector(1, 0))
        seg = LineSegment(Point(2, 2), Point(8, 2))
        result = ray_segment_intersection(ray, seg)

        assert result.intersection_type == IntersectionType.PARALLEL
        assert result.intersection_point is None

    def test_coincident(self):
        ray = Ray(Point(0, 5), Vector(1, 0))
        seg = LineSegment(Point(2, 5), Point(8, 5))
        result = ray_segment_intersection(ray, seg)

        assert result.intersection_type == IntersectionType.COINCIDENT

    def test_intersection_on_extension_s_negative(self):
        ray = Ray(Point(1, 5), Vector(1, -1))
        seg = LineSegment(Point(4, 3), Point(7, 3))
        result = ray_segment_intersection(ray, seg)

        assert result.intersection_type == IntersectionType.ON_EXTENSION
        assert result.parameter_s < 0

    def test_intersection_on_extension_s_greater_than_1(self):
        ray = Ray(Point(9, 5), Vector(-1, -1))
        seg = LineSegment(Point(3, 3), Point(6, 3))
        result = ray_segment_intersection(ray, seg)

        assert result.intersection_type == IntersectionType.ON_EXTENSION
        assert result.parameter_s > 1

    def test_intersection_behind_ray(self):
        ray = Ray(Point(5, 1), Vector(0, -1))
        seg = LineSegment(Point(2, 2), Point(8, 2))
        result = ray_segment_intersection(ray, seg)

        assert result.intersection_type == IntersectionType.BEHIND_RAY
        assert result.parameter_t < 0

    def test_45_degree_reflection(self):
        ray = Ray(Point(5, 5), Vector(0, -1))
        seg = LineSegment(Point(2, 2), Point(8, 2))
        result = ray_segment_intersection(ray, seg)
        reflection = compute_reflection(ray, result)

        assert reflection is not None
        assert abs(reflection.incident_angle - 0) < 0.1
        assert abs(reflection.reflection_angle - 0) < 0.1

    def test_find_closest_intersection(self):
        ray = Ray(Point(0, 5), Vector(1, 0))
        segs = [
            LineSegment(Point(5, 3), Point(5, 7), label="M1"),
            LineSegment(Point(8, 3), Point(8, 7), label="M2")
        ]
        result = find_closest_intersection(ray, segs)

        assert result is not None
        assert result.segment.label == "M1"
        assert abs(result.intersection_point.x - 5.0) < 1e-9


class TestReflection:
    def test_reflection_computation(self):
        ray = Ray(Point(5, 8), Vector(0, -1))
        seg = LineSegment(Point(2, 5), Point(8, 5))

        intersection = ray_segment_intersection(ray, seg)
        assert intersection.is_valid()

        reflection = compute_reflection(ray, intersection)
        assert reflection is not None
        assert abs(reflection.incident_angle) < 0.1
        assert abs(reflection.reflection_angle) < 0.1

    def test_reflection_45_degrees(self):
        ray = Ray(Point(1, 5), Vector(1, -1).normalize())
        seg = LineSegment(Point(2, 2), Point(8, 2))

        intersection = ray_segment_intersection(ray, seg)
        reflection = compute_reflection(ray, intersection)

        assert reflection is not None
        assert abs(reflection.incident_angle - 45) < 0.1
        assert abs(reflection.reflection_angle - 45) < 0.1


class TestGeometryUtilities:
    def test_are_parallel(self):
        v1 = Vector(1, 2)
        v2 = Vector(2, 4)
        assert are_parallel(v1, v2)

    def test_are_orthogonal(self):
        v1 = Vector(1, 0)
        v2 = Vector(0, 1)
        assert are_orthogonal(v1, v2)

    def test_angle_difference(self):
        diff = angle_difference(350, 10, AngleUnit.DEGREE)
        assert abs(diff - 20) < 1e-9

    def test_normalize_angle(self):
        assert normalize_angle(370) == 10
        assert normalize_angle(-10) == 350

    def test_distance_to_segment(self):
        seg = LineSegment(Point(0, 0), Point(2, 0))
        dist, closest = distance_to_segment(Point(1, 1), seg)
        assert abs(dist - 1.0) < 1e-9
        assert closest.x == 1
        assert closest.y == 0
