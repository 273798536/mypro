"""几何核心算法 - 求交计算、反射计算"""

from __future__ import annotations
import math
from typing import Optional, Tuple
from .models import (
    Point, Vector, LineSegment, Ray, BoundingBox,
    IntersectionResult, IntersectionType, ReflectionResult,
    AngleUnit
)


EPSILON = 1e-9


def ray_segment_intersection(
    ray: Ray,
    segment: LineSegment,
    epsilon: float = EPSILON
) -> IntersectionResult:
    """
    计算射线与线段的交点，使用参数化方程求解

    射线: P = ray.origin + t * ray.direction,  t >= 0
    线段: Q = segment.start + s * segment.direction,  0 <= s <= 1

    返回 IntersectionResult，包含交点类型和参数信息
    """
    p0 = ray.origin
    d = ray.direction

    q0 = segment.start
    seg_vec = segment.to_vector()
    seg_len = seg_vec.magnitude()

    if seg_len < epsilon:
        return IntersectionResult(
            ray=ray,
            segment=segment,
            intersection_type=IntersectionType.PARALLEL,
            intersection_point=None,
            parameter_t=None,
            parameter_s=None
        )

    e = seg_vec

    denom = d.x * e.y - d.y * e.x

    if abs(denom) < epsilon:
        cross_z = d.cross(e)
        if cross_z.z is not None and abs(cross_z.z) < epsilon:
            qp_vec = Vector.from_points(q0, p0)
            cross2 = d.cross(qp_vec)
            if cross2.z is not None and abs(cross2.z) < epsilon:
                return IntersectionResult(
                    ray=ray,
                    segment=segment,
                    intersection_type=IntersectionType.COINCIDENT,
                    intersection_point=None,
                    parameter_t=None,
                    parameter_s=None
                )
        return IntersectionResult(
            ray=ray,
            segment=segment,
            intersection_type=IntersectionType.PARALLEL,
            intersection_point=None,
            parameter_t=None,
            parameter_s=None
        )

    qp = Vector.from_points(p0, q0)

    t = (qp.x * e.y - qp.y * e.x) / denom
    s = (qp.x * d.y - qp.y * d.x) / denom

    if t < -epsilon:
        return IntersectionResult(
            ray=ray,
            segment=segment,
            intersection_type=IntersectionType.BEHIND_RAY,
            intersection_point=Point(p0.x + t * d.x, p0.y + t * d.y),
            parameter_t=t,
            parameter_s=s
        )

    if s < -epsilon or s > 1 + epsilon:
        intersection_point = Point(p0.x + t * d.x, p0.y + t * d.y)
        return IntersectionResult(
            ray=ray,
            segment=segment,
            intersection_type=IntersectionType.ON_EXTENSION,
            intersection_point=intersection_point,
            parameter_t=t,
            parameter_s=s
        )

    intersection_point = Point(p0.x + t * d.x, p0.y + t * d.y)

    return IntersectionResult(
        ray=ray,
        segment=segment,
        intersection_type=IntersectionType.VALID,
        intersection_point=intersection_point,
        parameter_t=t,
        parameter_s=s
    )


def check_bounds(
    point: Point,
    bbox: Optional[BoundingBox]
) -> bool:
    """检查点是否在边界框内"""
    if bbox is None:
        return True
    return bbox.contains(point)


def find_closest_intersection(
    ray: Ray,
    segments: list[LineSegment],
    bbox: Optional[BoundingBox] = None,
    epsilon: float = EPSILON
) -> Optional[IntersectionResult]:
    """
    找到射线与多个镜面线段的最近有效交点
    优先考虑: 1. 在边界框内 2. 在线段上 3. 距离最近
    """
    valid_intersections = []
    warning_intersections = []

    for seg in segments:
        result = ray_segment_intersection(ray, seg, epsilon)

        if result.intersection_type == IntersectionType.VALID:
            if bbox and not check_bounds(result.intersection_point, bbox):
                result.intersection_type = IntersectionType.OUT_OF_BOUNDS
                warning_intersections.append(result)
            else:
                valid_intersections.append(result)
        else:
            warning_intersections.append(result)

    if valid_intersections:
        valid_intersections.sort(key=lambda r: r.parameter_t if r.parameter_t is not None else float('inf'))
        return valid_intersections[0]

    if warning_intersections:
        warning_intersections.sort(key=lambda r: r.parameter_t if r.parameter_t is not None else float('inf'))
        return warning_intersections[0]

    return None


def compute_reflection(
    ray: Ray,
    intersection: IntersectionResult,
    angle_unit: AngleUnit = AngleUnit.DEGREE,
    epsilon: float = EPSILON
) -> Optional[ReflectionResult]:
    """
    计算反射光线和反射角
    基于反射定律: 入射角 = 反射角 (相对于法线)
    """
    if not intersection.is_valid() or intersection.intersection_point is None:
        return None

    segment = intersection.segment
    incident_dir = ray.direction * (-1)
    normal = segment.get_normal(incident_dir)

    reflected_dir = ray.direction.reflect(normal)

    incident_angle_raw = incident_dir.angle(normal, angle_unit)
    reflection_angle_raw = reflected_dir.angle(normal, angle_unit)

    if angle_unit == AngleUnit.DEGREE:
        incident_angle = min(incident_angle_raw, 180 - incident_angle_raw)
        reflection_angle = min(reflection_angle_raw, 180 - reflection_angle_raw)
    else:
        incident_angle = min(incident_angle_raw, math.pi - incident_angle_raw)
        reflection_angle = min(reflection_angle_raw, math.pi - reflection_angle_raw)

    reflected_ray = Ray(
        origin=intersection.intersection_point,
        direction=reflected_dir.normalize(),
        label=f"{ray.label}_reflected"
    )

    return ReflectionResult(
        incident_ray=ray,
        mirror_segment=segment,
        intersection=intersection,
        incident_angle=incident_angle,
        reflection_angle=reflection_angle,
        reflected_ray=reflected_ray,
        normal=normal,
        angle_unit=angle_unit
    )


def angle_between(v1: Vector, v2: Vector, unit: AngleUnit = AngleUnit.DEGREE) -> float:
    """计算两个向量之间的夹角"""
    return v1.angle(v2, unit)


def distance_to_segment(point: Point, segment: LineSegment) -> Tuple[float, Point]:
    """
    计算点到线段的最短距离和最近点
    """
    p = point
    a = segment.start
    b = segment.end

    ab = Vector.from_points(a, b)
    ap = Vector.from_points(a, p)

    ab_mag_sq = ab.dot(ab)

    if ab_mag_sq < EPSILON:
        return p.distance_to(a), a

    t = ap.dot(ab) / ab_mag_sq
    t = max(0.0, min(1.0, t))

    closest_point = a + ab * t
    distance = p.distance_to(closest_point)

    return distance, closest_point


def are_orthogonal(v1: Vector, v2: Vector, epsilon: float = EPSILON) -> bool:
    """检查两个向量是否正交"""
    return abs(v1.dot(v2)) < epsilon


def are_parallel(v1: Vector, v2: Vector, epsilon: float = EPSILON) -> bool:
    """检查两个向量是否平行"""
    cross = v1.cross(v2)
    if cross.z is not None:
        return abs(cross.z) < epsilon
    return abs(v1.x * v2.y - v1.y * v2.x) < epsilon


def normalize_angle(angle: float, unit: AngleUnit = AngleUnit.DEGREE) -> float:
    """将角度归一化到 [0, 360) 或 [0, 2π)"""
    if unit == AngleUnit.DEGREE:
        return angle % 360.0
    else:
        return angle % (2 * math.pi)


def angle_difference(angle1: float, angle2: float, unit: AngleUnit = AngleUnit.DEGREE) -> float:
    """计算两个角度之间的最小差值"""
    if unit == AngleUnit.DEGREE:
        diff = abs((angle1 - angle2 + 180) % 360 - 180)
    else:
        diff = abs((angle1 - angle2 + math.pi) % (2 * math.pi) - math.pi)
    return diff
