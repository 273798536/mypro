"""边界判定和特殊情况检测"""

from __future__ import annotations
import math
from typing import List, Tuple, Optional
from .models import (
    Point, Vector, LineSegment, Ray, BoundingBox,
    IntersectionResult, IntersectionType, AngleUnit,
    SingleRayResult, ResultStatus
)
from .geometry import EPSILON, angle_difference


def detect_angle_unit_issue(
    angle_value: float,
    declared_unit: AngleUnit,
    epsilon: float = 1e-6
) -> Tuple[bool, str]:
    """
    检测角度单位是否可能错误

    如果声明为弧度但数值很大(>2π)，或声明为度但数值很小(<1.0且≠0)，可能单位错误
    """
    issues = []
    is_suspicious = False

    if declared_unit == AngleUnit.RADIAN:
        if abs(angle_value) > 2 * math.pi + 0.01:
            is_suspicious = True
            issues.append(
                f"声明为弧度但角度值 {angle_value:.4f} 超过 2π ≈ 6.2832，"
                f"可能实际是角度（度）。若为度，转换后为 {math.degrees(angle_value):.2f}°"
            )
    else:
        if abs(angle_value) < 1.0 and abs(angle_value) > epsilon:
            is_suspicious = True
            issues.append(
                f"声明为度但角度值 {angle_value:.6f} 过小，"
                f"可能实际是弧度。若为弧度，转换后为 {math.degrees(angle_value):.2f}°"
            )
        if abs(angle_value) > 360 + 0.01:
            issues.append(
                f"角度值 {angle_value:.2f}° 超过 360°，已自动归一化到 {angle_value % 360:.2f}°"
            )

    return is_suspicious, "; ".join(issues) if issues else ""


def classify_intersection_quality(
    result: IntersectionResult,
    bbox: Optional[BoundingBox] = None
) -> Tuple[ResultStatus, List[str], List[Tuple[str, float, str]]]:
    """
    对交点结果进行质量分类，返回状态、警告信息和扣分明细

    扣分规则:
    - 有效交点: 不扣分
    - 延长线交点: 扣0.5分 (交点不在线段上)
    - 边界框外: 扣0.3分
    - 射线后方: 扣1.0分
    - 平行无交: 扣1.0分
    - 共线重合: 扣0.8分 (无数交点)
    """
    warnings = []
    deductions = []
    status = ResultStatus.SUCCESS

    itype = result.intersection_type

    if itype == IntersectionType.VALID:
        deductions.append(("valid_intersection", 0.0, "交点在镜面线段上，有效"))

    elif itype == IntersectionType.ON_EXTENSION:
        status = ResultStatus.WARNING
        s_val = result.parameter_s
        if s_val is not None:
            if s_val < 0:
                dist_desc = f"在线段起点外 {-s_val:.3f} 倍线段长度处"
            else:
                dist_desc = f"在线段终点外 {s_val - 1:.3f} 倍线段长度处"
        else:
            dist_desc = "在线段延长线上"
        warnings.append(f"⚠️ 交点在镜面线段的延长线上: {dist_desc}")
        warnings.append("   提示: 入射光线没有直接照射到镜面上，而是照射到镜面的延长线")
        deductions.append(("extension_intersection", 0.5,
                           f"交点在镜面延长线上，参数s={result.parameter_s:.4f}"))

    elif itype == IntersectionType.OUT_OF_BOUNDS:
        status = ResultStatus.WARNING
        warnings.append("⚠️ 交点在题目给定的边界框外")
        warnings.append("   提示: 虽然几何上存在交点，但超出了题目规定的区域")
        deductions.append(("out_of_bounds", 0.3, "交点超出题目边界框范围"))

    elif itype == IntersectionType.BEHIND_RAY:
        status = ResultStatus.ERROR
        t_val = result.parameter_t
        warnings.append(f"❌ 交点在射线起点后方，参数t={t_val:.4f} < 0")
        warnings.append("   提示: 射线是从起点向方向向量发射的，后方不存在实际交点")
        deductions.append(("behind_ray", 1.0, f"交点在射线后方，t={t_val:.4f}"))

    elif itype == IntersectionType.PARALLEL:
        status = ResultStatus.ERROR
        warnings.append("❌ 入射光线与镜面平行，无交点")
        warnings.append("   提示: 两条平行线永不相交，检查镜面或光线方向是否正确")
        deductions.append(("parallel", 1.0, "入射光线与镜面平行，无交点"))

    elif itype == IntersectionType.COINCIDENT:
        status = ResultStatus.WARNING
        warnings.append("⚠️ 入射光线与镜面共线重合，存在无数个交点")
        warnings.append("   提示: 光线沿镜面方向传播，没有唯一的反射点")
        deductions.append(("coincident", 0.8, "光线与镜面共线，无数交点"))

    if bbox and result.intersection_point is not None:
        if not bbox.contains(result.intersection_point):
            if status != ResultStatus.ERROR:
                status = ResultStatus.WARNING
            warnings.append("⚠️ 交点超出题目边界框范围")
            if not any(d[0] == "out_of_bounds" for d in deductions):
                deductions.append(("out_of_bounds", 0.3, "交点超出边界框"))

    return status, warnings, deductions


def check_reflection_validity(
    incident_angle: float,
    reflection_angle: float,
    unit: AngleUnit,
    tolerance: float = 0.1
) -> Tuple[bool, List[str]]:
    """
    检查反射计算的有效性，验证入射角等于反射角
    """
    valid = True
    issues = []

    angle_diff = angle_difference(incident_angle, reflection_angle, unit)
    if angle_diff > tolerance:
        valid = False
        issues.append(
            f"⚠️ 反射定律验证: 入射角({incident_angle:.4f}°) ≠ 反射角({reflection_angle:.4f}°), "
            f"差值 {angle_diff:.4f}° > 容差 {tolerance}°"
        )
    else:
        issues.append(
            f"✓ 反射定律验证通过: 入射角 ≈ 反射角 ≈ {incident_angle:.2f}° "
            f"(差值 {angle_diff:.4f}°)"
        )

    if incident_angle < 0 or incident_angle > 90:
        valid = False
        issues.append(
            f"⚠️ 入射角 {incident_angle:.2f}° 超出正常范围 [0°, 90°]"
        )

    return valid, issues


def check_segment_degeneracy(segment: LineSegment, epsilon: float = EPSILON) -> Tuple[bool, str]:
    """检查线段是否退化（起点终点重合）"""
    length = segment.length()
    if length < epsilon:
        return True, f"镜面线段'{segment.label}'退化: 起点与终点重合，长度为0"
    return False, ""


def check_ray_degeneracy(ray: Ray, epsilon: float = EPSILON) -> Tuple[bool, str]:
    """检查射线方向是否退化（零向量）"""
    mag = ray.direction.magnitude()
    if mag < epsilon:
        return True, f"光线'{ray.label}'退化: 方向向量为零向量"
    return False, ""


def validate_geometry_inputs(
    segments: List[LineSegment],
    rays: List[Ray],
    bbox: Optional[BoundingBox] = None
) -> Tuple[List[str], List[str]]:
    """
    验证所有几何输入的有效性
    返回 (错误列表, 警告列表)
    """
    errors = []
    warnings = []

    for seg in segments:
        is_degen, msg = check_segment_degeneracy(seg)
        if is_degen:
            errors.append(msg)

    for ray in rays:
        is_degen, msg = check_ray_degeneracy(ray)
        if is_degen:
            errors.append(msg)

    if bbox:
        if bbox.x_min >= bbox.x_max:
            errors.append(f"边界框无效: x_min({bbox.x_min}) >= x_max({bbox.x_max})")
        if bbox.y_min >= bbox.y_max:
            errors.append(f"边界框无效: y_min({bbox.y_min}) >= y_max({bbox.y_max})")
        if bbox.z_min is not None and bbox.z_max is not None:
            if bbox.z_min >= bbox.z_max:
                errors.append(f"边界框无效: z_min({bbox.z_min}) >= z_max({bbox.z_max})")

    return errors, warnings


def get_intersection_explanation(result: IntersectionResult) -> List[str]:
    """
    生成交点结果的详细解释
    """
    explanations = []
    itype = result.intersection_type

    if result.intersection_point:
        p = result.intersection_point
        explanations.append(f"📌 交点坐标: ({p.x:.4f}, {p.y:.4f})")

    if result.parameter_t is not None:
        explanations.append(f"   射线参数 t = {result.parameter_t:.6f} (t≥0 表示在射线上)")

    if result.parameter_s is not None:
        explanations.append(f"   线段参数 s = {result.parameter_s:.6f} (0≤s≤1 表示在线段上)")

    type_explanations = {
        IntersectionType.VALID: [
            "✅ 有效交点",
            "   - 交点同时在射线和镜面线段上",
            "   - 可以进行反射计算"
        ],
        IntersectionType.PARALLEL: [
            "❌ 平行无交点",
            "   - 入射光线方向与镜面方向平行",
            "   - 几何上不存在交点",
            "   - 建议检查镜面方向或光线入射角度"
        ],
        IntersectionType.COINCIDENT: [
            "⚠️ 共线重合",
            "   - 入射光线与镜面在同一直线上",
            "   - 存在无数个交点，无法确定唯一反射点",
            "   - 建议调整光线入射角度"
        ],
        IntersectionType.ON_EXTENSION: [
            "⚠️ 交点在延长线上",
            "   - 几何上存在交点，但不在线段范围内",
            "   - s < 0: 交点在线段起点之外",
            "   - s > 1: 交点在线段终点之外",
            "   - 实际物理上光线无法照射到镜面"
        ],
        IntersectionType.OUT_OF_BOUNDS: [
            "⚠️ 交点在边界框外",
            "   - 虽然几何上存在有效交点",
            "   - 但超出题目规定的边界框范围",
            "   - 可能需要检查边界框设置或题目条件"
        ],
        IntersectionType.BEHIND_RAY: [
            "❌ 交点在射线后方",
            "   - t < 0: 交点在射线起点的反方向",
            "   - 射线是从起点单向发射的，后方不存在实际交点",
            "   - 检查光线方向向量是否正确"
        ]
    }

    explanations.extend(type_explanations.get(itype, []))

    return explanations


def get_reflection_explanation(reflection: ReflectionResult) -> List[str]:
    """
    生成反射结果的详细解释
    """
    explanations = []
    unit_symbol = "°" if reflection.angle_unit == AngleUnit.DEGREE else " rad"

    if reflection.incident_angle is not None:
        explanations.append(f"📐 入射角: {reflection.incident_angle:.4f}{unit_symbol}")

    if reflection.reflection_angle is not None:
        explanations.append(f"📐 反射角: {reflection.reflection_angle:.4f}{unit_symbol}")

    if reflection.normal:
        n = reflection.normal
        explanations.append(f"🧭 镜面法向量: ({n.x:.4f}, {n.y:.4f})")

    if reflection.reflected_ray:
        r = reflection.reflected_ray
        d = r.direction
        explanations.append(f"↗️  反射光线方向: ({d.x:.4f}, {d.y:.4f})")

    if reflection.incident_angle is not None and reflection.reflection_angle is not None:
        diff = abs(reflection.incident_angle - reflection.reflection_angle)
        if diff < 0.01:
            explanations.append(f"✓ 验证: 入射角 ≈ 反射角，符合反射定律")
        else:
            explanations.append(f"⚠️ 注意: 入射角与反射角相差 {diff:.4f}{unit_symbol}")

    return explanations
