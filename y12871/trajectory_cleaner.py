"""
轨迹清洗模块
============

清洗规则:
  1. 速度突变检测: 相邻两点间漂移速度超过阈值 (默认 10节)
  2. 方向突变检测: 相邻两点间方向变化超过阈值 (默认 90度)
  3. 异常点修复: 使用前后两点插值替换
  4. 禁航区越界标记: 不删除, 标记为待复核
  5. 晚到通报标记: 时间戳明显滞后的点标记为风险通报晚到
  6. 低置信度过滤: 置信度低于阈值的点标记, 不删除
"""

import copy
import math
from datetime import datetime, timedelta
from typing import List, Tuple

from models import (
    DriftPoint, Trajectory, CleanResult,
    DriftStatus, Position
)
from drift_calculator import haversine_distance


class CleanRule:
    SPEED_JUMP = "速度突变检测 (阈值: {threshold}节)"
    DIRECTION_JUMP = "方向突变检测 (阈值: {threshold}度)"
    LOW_CONFIDENCE = "低置信度标记 (阈值: {threshold})"
    LATE_NOTIFICATION = "风险通报晚到标记 (滞后: {threshold}小时)"
    RESTRICTED_ZONE = "禁航区越界标记 (保留不删除)"
    INTERPOLATION_FIX = "异常点插值修复"


def _calc_speed_between(p1: DriftPoint, p2: DriftPoint) -> float:
    """计算两点间的平均漂移速度 (节)"""
    dist_nm = haversine_distance(p1.position, p2.position)
    time_diff_h = abs((p2.position.timestamp - p1.position.timestamp).total_seconds()) / 3600.0
    if time_diff_h == 0:
        return float('inf')
    return dist_nm / time_diff_h


def _calc_direction(p1: DriftPoint, p2: DriftPoint) -> float:
    """计算从p1到p2的方位角 (度)"""
    dlat = math.radians(p2.position.lat - p1.position.lat)
    dlon = math.radians(p2.position.lon - p1.position.lon)
    lat1 = math.radians(p1.position.lat)

    y = math.sin(dlon) * math.cos(math.radians(p2.position.lat))
    x = math.cos(lat1) * math.sin(math.radians(p2.position.lat)) - \
        math.sin(lat1) * math.cos(math.radians(p2.position.lat)) * math.cos(dlon)

    bearing = math.degrees(math.atan2(y, x))
    if bearing < 0:
        bearing += 360
    return bearing


def _direction_diff(d1: float, d2: float) -> float:
    """计算两个方向角的最小差值 (度)"""
    diff = abs(d1 - d2)
    if diff > 180:
        diff = 360 - diff
    return diff


def _interpolate_point(p_prev: DriftPoint, p_next: DriftPoint, target_time: datetime) -> DriftPoint:
    """在两点之间按时间插值"""
    t_total = (p_next.position.timestamp - p_prev.position.timestamp).total_seconds()
    if t_total == 0:
        return copy.deepcopy(p_prev)

    t_ratio = (target_time - p_prev.position.timestamp).total_seconds() / t_total

    new_lat = p_prev.position.lat + (p_next.position.lat - p_prev.position.lat) * t_ratio
    new_lon = p_prev.position.lon + (p_next.position.lon - p_prev.position.lon) * t_ratio

    new_pos = Position(
        lat=new_lat,
        lon=new_lon,
        timestamp=target_time
    )

    new_confidence = (p_prev.confidence + p_next.confidence) / 2 * 0.8  # 插值降置信

    return DriftPoint(
        position=new_pos,
        status=DriftStatus.PENDING_REVIEW,
        source_buoy=p_prev.source_buoy or p_next.source_buoy,
        calc_method=p_prev.calc_method or p_next.calc_method,
        confidence=new_confidence,
        notes=["插值修复点", f"基于前后两点插值, 时间占比 {t_ratio:.2f}"],
        in_restricted_zone=False
    )


def clean_trajectory(
    trajectory: Trajectory,
    speed_threshold_knots: float = 10.0,
    direction_threshold_deg: float = 90.0,
    confidence_threshold: float = 0.3,
    late_notification_hours: float = 2.0,
    reference_time: datetime = None
) -> CleanResult:
    """
    清洗漂移轨迹, 保留前后对比

    参数:
        trajectory: 原始轨迹
        speed_threshold_knots: 速度突变阈值 (节)
        direction_threshold_deg: 方向突变阈值 (度)
        confidence_threshold: 置信度阈值
        late_notification_hours: 晚到通报阈值 (小时)
        reference_time: 参考时间 (用于判断晚到), 默认取最后一个点的时间

    返回:
        CleanResult: 清洗结果, 包含原始轨迹、清洗后轨迹、删除/修改的点
    """
    if len(trajectory.drift_points) < 2:
        return CleanResult(
            original_trajectory=copy.deepcopy(trajectory),
            cleaned_trajectory=copy.deepcopy(trajectory),
            removed_points=[],
            modified_points=[],
            clean_rules_applied=["数据点不足, 跳过清洗"]
        )

    original = copy.deepcopy(trajectory)
    cleaned_points: List[DriftPoint] = []
    removed: List[DriftPoint] = []
    modified: List[Tuple[DriftPoint, DriftPoint]] = []
    rules_applied: List[str] = []

    if reference_time is None:
        reference_time = trajectory.drift_points[-1].position.timestamp

    prev_point = None
    prev_direction = None

    for i, point in enumerate(trajectory.drift_points):
        curr_point = copy.deepcopy(point)
        is_removed = False
        is_modified = False
        orig_point = copy.deepcopy(point)

        if curr_point.in_restricted_zone:
            curr_point.status = DriftStatus.EXCEEDED_RESTRICTED
            curr_point.notes.append("禁航区越界, 保留待人工复核")
            rule = CleanRule.RESTRICTED_ZONE
            if rule not in rules_applied:
                rules_applied.append(rule)
            is_modified = True

        time_lag = (reference_time - curr_point.position.timestamp).total_seconds() / 3600.0
        if time_lag > late_notification_hours:
            if curr_point.status == DriftStatus.NORMAL:
                curr_point.status = DriftStatus.LATE_NOTIFICATION
            curr_point.notes.append(f"数据滞后 {time_lag:.1f} 小时, 属风险通报晚到")
            rule = CleanRule.LATE_NOTIFICATION.format(threshold=late_notification_hours)
            if rule not in rules_applied:
                rules_applied.append(rule)
            is_modified = True

        if curr_point.confidence < confidence_threshold:
            if curr_point.status == DriftStatus.NORMAL:
                curr_point.status = DriftStatus.PENDING_REVIEW
            curr_point.notes.append(f"低置信度 ({curr_point.confidence:.2f}), 建议人工复核")
            rule = CleanRule.LOW_CONFIDENCE.format(threshold=confidence_threshold)
            if rule not in rules_applied:
                rules_applied.append(rule)
            is_modified = True

        if prev_point is not None and i > 0:
            speed = _calc_speed_between(prev_point, curr_point)
            if speed > speed_threshold_knots and i < len(trajectory.drift_points) - 1:
                next_point = trajectory.drift_points[i + 1]
                fixed_point = _interpolate_point(prev_point, next_point, curr_point.position.timestamp)
                fixed_point.notes.append(f"速度突变 ({speed:.1f}节 > {speed_threshold_knots}节), 已插值修复")
                fixed_point.notes.extend(curr_point.notes)
                fixed_point.in_restricted_zone = curr_point.in_restricted_zone
                fixed_point.restricted_zone_id = curr_point.restricted_zone_id
                if curr_point.in_restricted_zone:
                    fixed_point.status = DriftStatus.EXCEEDED_RESTRICTED
                removed.append(curr_point)
                modified.append((orig_point, fixed_point))
                cleaned_points.append(fixed_point)
                prev_point = fixed_point
                prev_direction = _calc_direction(prev_point, next_point) if i + 1 < len(trajectory.drift_points) else None
                rule = CleanRule.SPEED_JUMP.format(threshold=speed_threshold_knots)
                if rule not in rules_applied:
                    rules_applied.append(rule)
                rule2 = CleanRule.INTERPOLATION_FIX
                if rule2 not in rules_applied:
                    rules_applied.append(rule2)
                continue
            else:
                direction = _calc_direction(prev_point, curr_point)
                if prev_direction is not None:
                    dir_diff = _direction_diff(prev_direction, direction)
                    if dir_diff > direction_threshold_deg and i < len(trajectory.drift_points) - 1:
                        next_point = trajectory.drift_points[i + 1]
                        fixed_point = _interpolate_point(prev_point, next_point, curr_point.position.timestamp)
                        fixed_point.notes.append(f"方向突变 ({dir_diff:.0f}° > {direction_threshold_deg}°), 已插值修复")
                        fixed_point.notes.extend(curr_point.notes)
                        fixed_point.in_restricted_zone = curr_point.in_restricted_zone
                        fixed_point.restricted_zone_id = curr_point.restricted_zone_id
                        if curr_point.in_restricted_zone:
                            fixed_point.status = DriftStatus.EXCEEDED_RESTRICTED
                        removed.append(curr_point)
                        modified.append((orig_point, fixed_point))
                        cleaned_points.append(fixed_point)
                        prev_point = fixed_point
                        prev_direction = direction
                        rule = CleanRule.DIRECTION_JUMP.format(threshold=direction_threshold_deg)
                        if rule not in rules_applied:
                            rules_applied.append(rule)
                        rule2 = CleanRule.INTERPOLATION_FIX
                        if rule2 not in rules_applied:
                            rules_applied.append(rule2)
                        continue
                prev_direction = direction

        if is_removed:
            removed.append(curr_point)
        else:
            cleaned_points.append(curr_point)
            if is_modified:
                modified.append((orig_point, curr_point))

        prev_point = curr_point if not is_removed else prev_point

    cleaned_trajectory = copy.deepcopy(trajectory)
    cleaned_trajectory.drift_points = cleaned_points

    if not rules_applied:
        rules_applied.append("未应用清洗规则, 轨迹正常")

    return CleanResult(
        original_trajectory=original,
        cleaned_trajectory=cleaned_trajectory,
        removed_points=removed,
        modified_points=modified,
        clean_rules_applied=rules_applied
    )


def has_significant_change(clean_result: CleanResult) -> bool:
    """判断清洗是否引起了显著变化 (可能影响判断)"""
    if clean_result.removed_points:
        return True
    if len(clean_result.modified_points) > 0:
        for orig, mod in clean_result.modified_points:
            if orig.status != mod.status:
                return True
            if orig.in_restricted_zone != mod.in_restricted_zone:
                return True
    return False
