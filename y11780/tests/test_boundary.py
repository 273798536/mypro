"""测试边界判定和特殊情况检测"""

import math
import pytest
from geometry_optics.core.models import (
    Point, Vector, LineSegment, Ray, BoundingBox,
    IntersectionType, IntersectionResult, ResultStatus,
    AngleUnit
)
from geometry_optics.core.boundary import (
    detect_angle_unit_issue,
    classify_intersection_quality,
    check_reflection_validity,
    check_segment_degeneracy,
    check_ray_degeneracy,
    validate_geometry_inputs,
    get_intersection_explanation,
    get_reflection_explanation
)
from geometry_optics.core.geometry import ray_segment_intersection, compute_reflection


class TestAngleUnitDetection:
    def test_radian_suspicious_large_value(self):
        is_suspicious, msg = detect_angle_unit_issue(90, AngleUnit.RADIAN)
        assert is_suspicious
        assert "超过 2π" in msg

    def test_degree_suspicious_small_value(self):
        is_suspicious, msg = detect_angle_unit_issue(0.017, AngleUnit.DEGREE)
        assert is_suspicious
        assert "过小" in msg

    def test_normal_degree_value(self):
        is_suspicious, msg = detect_angle_unit_issue(45, AngleUnit.DEGREE)
        assert not is_suspicious
        assert msg == ""

    def test_normal_radian_value(self):
        is_suspicious, msg = detect_angle_unit_issue(math.pi / 4, AngleUnit.RADIAN)
        assert not is_suspicious
        assert msg == ""

    def test_large_degree_value(self):
        is_suspicious, msg = detect_angle_unit_issue(400, AngleUnit.DEGREE)
        assert not is_suspicious
        assert "超过 360°" in msg


class TestIntersectionQualityClassification:
    def test_valid_intersection(self):
        ray = Ray(Point(5, 5), Vector(0, -1))
        seg = LineSegment(Point(2, 2), Point(8, 2))
        intersection = IntersectionResult(
            ray=ray, segment=seg,
            intersection_type=IntersectionType.VALID,
            intersection_point=Point(5, 2),
            parameter_t=3.0, parameter_s=0.5
        )
        status, warnings, deductions = classify_intersection_quality(intersection)
        assert status == ResultStatus.SUCCESS
        assert len(warnings) == 0
        assert any(d[0] == "valid_intersection" for d in deductions)

    def test_extension_intersection(self):
        ray = Ray(Point(1, 5), Vector(1, -1))
        seg = LineSegment(Point(3, 3), Point(7, 3))
        intersection = IntersectionResult(
            ray=ray, segment=seg,
            intersection_type=IntersectionType.ON_EXTENSION,
            intersection_point=Point(2, 3),
            parameter_t=3.0, parameter_s=-0.25
        )
        status, warnings, deductions = classify_intersection_quality(intersection)
        assert status == ResultStatus.WARNING
        assert any("延长线" in w for w in warnings)
        assert any(d[0] == "extension_intersection" for d in deductions)

    def test_parallel_intersection(self):
        ray = Ray(Point(0, 5), Vector(1, 0))
        seg = LineSegment(Point(2, 2), Point(8, 2))
        intersection = IntersectionResult(
            ray=ray, segment=seg,
            intersection_type=IntersectionType.PARALLEL,
            intersection_point=None
        )
        status, warnings, deductions = classify_intersection_quality(intersection)
        assert status == ResultStatus.ERROR
        assert any("平行" in w for w in warnings)
        assert any(d[0] == "parallel" for d in deductions)

    def test_behind_ray(self):
        ray = Ray(Point(5, 1), Vector(0, -1))
        seg = LineSegment(Point(2, 2), Point(8, 2))
        intersection = IntersectionResult(
            ray=ray, segment=seg,
            intersection_type=IntersectionType.BEHIND_RAY,
            intersection_point=Point(5, 2),
            parameter_t=-1.0, parameter_s=0.5
        )
        status, warnings, deductions = classify_intersection_quality(intersection)
        assert status == ResultStatus.ERROR
        assert any("后方" in w for w in warnings)

    def test_out_of_bounds(self):
        ray = Ray(Point(1, 1), Vector(1, 1))
        seg = LineSegment(Point(0, 0), Point(10, 10))
        bbox = BoundingBox(2, 8, 2, 8)
        intersection = IntersectionResult(
            ray=ray, segment=seg,
            intersection_type=IntersectionType.OUT_OF_BOUNDS,
            intersection_point=Point(0, 0),
            parameter_t=0.0, parameter_s=0.0
        )
        status, warnings, deductions = classify_intersection_quality(intersection, bbox)
        assert status == ResultStatus.WARNING
        assert any("边界框" in w for w in warnings)

    def test_coincident(self):
        ray = Ray(Point(1, 5), Vector(1, 0))
        seg = LineSegment(Point(2, 5), Point(8, 5))
        intersection = IntersectionResult(
            ray=ray, segment=seg,
            intersection_type=IntersectionType.COINCIDENT,
            intersection_point=None
        )
        status, warnings, deductions = classify_intersection_quality(intersection)
        assert status == ResultStatus.WARNING
        assert any("共线" in w for w in warnings)


class TestReflectionValidity:
    def test_valid_reflection(self):
        valid, issues = check_reflection_validity(45, 45, AngleUnit.DEGREE)
        assert valid
        assert any("验证通过" in i for i in issues)

    def test_invalid_reflection(self):
        valid, issues = check_reflection_validity(45, 50, AngleUnit.DEGREE, tolerance=0.1)
        assert not valid
        assert any("≠" in i for i in issues)

    def test_angle_out_of_range(self):
        valid, issues = check_reflection_validity(100, 100, AngleUnit.DEGREE)
        assert not valid
        assert any("超出正常范围" in i for i in issues)


class TestDegeneracyChecks:
    def test_degenerate_segment(self):
        seg = LineSegment(Point(0, 0), Point(0, 0))
        is_degen, msg = check_segment_degeneracy(seg)
        assert is_degen
        assert "退化" in msg

    def test_valid_segment(self):
        seg = LineSegment(Point(0, 0), Point(1, 0))
        is_degen, msg = check_segment_degeneracy(seg)
        assert not is_degen
        assert msg == ""

    def test_degenerate_ray(self):
        ray = Ray(Point(0, 0), Vector(0, 0))
        is_degen, msg = check_ray_degeneracy(ray)
        assert is_degen
        assert "零向量" in msg

    def test_valid_ray(self):
        ray = Ray(Point(0, 0), Vector(1, 0))
        is_degen, msg = check_ray_degeneracy(ray)
        assert not is_degen
        assert msg == ""


class TestInputValidation:
    def test_valid_inputs(self):
        segs = [LineSegment(Point(0, 0), Point(1, 0), label="M1")]
        rays = [Ray(Point(0, 1), Vector(0, -1), label="R1")]
        errors, warnings = validate_geometry_inputs(segs, rays)
        assert len(errors) == 0

    def test_invalid_bbox(self):
        segs = [LineSegment(Point(0, 0), Point(1, 0), label="M1")]
        rays = [Ray(Point(0, 1), Vector(0, -1), label="R1")]
        bbox = BoundingBox(10, 0, 0, 10)
        errors, warnings = validate_geometry_inputs(segs, rays, bbox)
        assert len(errors) > 0
        assert any("x_min" in e for e in errors)


class TestExplanations:
    def test_intersection_explanation_valid(self):
        ray = Ray(Point(5, 5), Vector(0, -1))
        seg = LineSegment(Point(2, 2), Point(8, 2))
        intersection = IntersectionResult(
            ray=ray, segment=seg,
            intersection_type=IntersectionType.VALID,
            intersection_point=Point(5, 2),
            parameter_t=3.0, parameter_s=0.5
        )
        explanations = get_intersection_explanation(intersection)
        assert len(explanations) > 0
        assert any("有效交点" in e for e in explanations)
        assert any("交点坐标" in e for e in explanations)

    def test_intersection_explanation_parallel(self):
        ray = Ray(Point(0, 5), Vector(1, 0))
        seg = LineSegment(Point(2, 2), Point(8, 2))
        intersection = IntersectionResult(
            ray=ray, segment=seg,
            intersection_type=IntersectionType.PARALLEL
        )
        explanations = get_intersection_explanation(intersection)
        assert any("平行无交点" in e for e in explanations)
        assert any("不存在交点" in e for e in explanations)

    def test_reflection_explanation(self):
        ray = Ray(Point(5, 8), Vector(0, -1))
        seg = LineSegment(Point(2, 5), Point(8, 5))
        intersection = ray_segment_intersection(ray, seg)
        reflection = compute_reflection(ray, intersection)

        explanations = get_reflection_explanation(reflection)
        assert len(explanations) > 0
        assert any("入射角" in e for e in explanations)
        assert any("反射角" in e for e in explanations)
        assert any("反射定律" in e for e in explanations)
