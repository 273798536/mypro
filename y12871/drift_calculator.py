"""
海上搜救漂移计算模块
====================

【公式说明】
  1. 风压漂移法 (Leeway Method)
     V_leeway = k * V_wind
     其中: V_leeway 为风压漂移速度(节), V_wind 为风速(节), k 为风压系数
           人在水中 k ≈ 0.02 ~ 0.04
           小型救生艇 k ≈ 0.06 ~ 0.10
           大型残骸 k ≈ 0.03 ~ 0.05

  2. 海流叠加法 (Ocean Current Method)
     V_total = V_current + V_leeway (矢量叠加)
     其中: V_current 为海流速度(节), 方向为流向

  3. 综合漂移模型 (Comprehensive Model)
     V_total = α * V_current + β * V_wind + γ * V_wave
     其中: α, β, γ 为权重系数, 根据目标类型调整
           波浪漂移 V_wave ≈ 0.015 * H * T (H:波高 m, T:周期 s)

【单位说明】
  - 速度: 节 (knots, 1节 = 1海里/小时 ≈ 1.852 km/h)
  - 距离: 海里 (nautical miles, 1海里 ≈ 1.852 km)
  - 角度: 度 (°), 方位角 0°=正北, 顺时针增加
  - 风速: 节 (knots) 或 m/s (1 m/s ≈ 1.944节)
  - 时间: 小时 (h)

【适用范围】
  - 风压漂移法: 开放海域, 风场均匀, 无强海流区域
  - 海流叠加法: 海流主导区域, 如近岸洋流、海峡
  - 综合漂移模型: 复杂海况, 搜救行动超过12小时

【失败原因】
  - 浮标数据缺失 (风速/风向/流速/流向任一缺失)
  - 起点位置无效 (经纬度越界)
  - 计算时间步长过大 (超过24小时)
  - 目标类型未知 (无法确定风压系数)
"""

import math
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from models import (
    Position, BuoyData, DriftPoint, Trajectory,
    CalculationMethod, DriftStatus, CalcFailure, RestrictedZone
)


FORMULA_INFO = {
    "风压漂移法": {
        "formula": "V_leeway = k × V_wind",
        "params": "k=风压系数(人0.02-0.04, 艇0.06-0.10), V_wind=风速(节)",
        "unit": "节 (knots)",
        "scope": "开放海域, 风场均匀, 无强海流",
        "failures": ["风速缺失", "风向缺失", "目标类型未知"]
    },
    "海流叠加法": {
        "formula": "V_total = V_current + V_leeway (矢量叠加)",
        "params": "V_current=海流速度(节), V_leeway=风压漂移速度(节)",
        "unit": "节 (knots)",
        "scope": "海流主导区域, 如近岸洋流、海峡",
        "failures": ["流速缺失", "流向缺失", "风速缺失"]
    },
    "综合漂移模型": {
        "formula": "V_total = α×V_current + β×V_wind + γ×V_wave",
        "params": "α/β/γ=权重系数, V_wave≈0.015×H×T",
        "unit": "节 (knots)",
        "scope": "复杂海况, 搜救超过12小时",
        "failures": ["关键参数全部缺失", "波高周期数据不足"]
    }
}


LEEWAY_COEFFICIENTS = {
    "person_in_water": 0.03,
    "life_raft_small": 0.08,
    "life_raft_large": 0.06,
    "vessel_wreckage": 0.04,
    "cargo_container": 0.05,
}


COMPREHENSIVE_WEIGHTS = {
    "alpha": 0.7,
    "beta": 0.25,
    "gamma": 0.05,
}


def haversine_distance(pos1: Position, pos2: Position) -> float:
    """
    计算两点间的大圆距离 (海里)
    """
    R = 3440.065  # 地球半径, 单位: 海里

    lat1_rad = math.radians(pos1.lat)
    lat2_rad = math.radians(pos2.lat)
    dlat = lat2_rad - lat1_rad
    dlon = math.radians(pos2.lon - pos1.lon)

    a = math.sin(dlat / 2) ** 2 + \
        math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def destination_point(start: Position, bearing: float, distance_nm: float) -> Position:
    """
    给定起点、方位角和距离, 计算终点位置
    bearing: 方位角 (度), 0=正北, 顺时针
    distance_nm: 距离 (海里)
    """
    R = 3440.065
    d = distance_nm / R
    lat1 = math.radians(start.lat)
    lon1 = math.radians(start.lon)
    b = math.radians(bearing)

    lat2 = math.asin(math.sin(lat1) * math.cos(d) +
                     math.cos(lat1) * math.sin(d) * math.cos(b))
    lon2 = lon1 + math.atan2(math.sin(b) * math.sin(d) * math.cos(lat1),
                             math.cos(d) - math.sin(lat1) * math.sin(lat2))

    return Position(
        lat=math.degrees(lat2),
        lon=math.degrees(lon2),
        timestamp=start.timestamp
    )


def ms_to_knots(ms: float) -> float:
    return ms * 1.94384


def knots_to_ms(knots: float) -> float:
    return knots / 1.94384


def _validate_buoy_for_method(buoy: BuoyData, method: CalculationMethod) -> Tuple[bool, List[str]]:
    """检查浮标数据是否满足某计算方法的要求"""
    missing = []

    if method == CalculationMethod.LEEWAY:
        if buoy.wind_speed is None:
            missing.append("wind_speed (风速)")
        if buoy.wind_direction is None:
            missing.append("wind_direction (风向)")

    elif method == CalculationMethod.OCEAN_CURRENT:
        if buoy.current_speed is None:
            missing.append("current_speed (流速)")
        if buoy.current_direction is None:
            missing.append("current_direction (流向)")
        if buoy.wind_speed is None:
            missing.append("wind_speed (风速)")
        if buoy.wind_direction is None:
            missing.append("wind_direction (风向)")

    elif method == CalculationMethod.COMPREHENSIVE:
        required = 0
        if buoy.current_speed is not None and buoy.current_direction is not None:
            required += 1
        else:
            missing.append("current_speed/current_direction (海流)")
        if buoy.wind_speed is not None and buoy.wind_direction is not None:
            required += 1
        else:
            missing.append("wind_speed/wind_direction (风)")
        if buoy.wave_height is not None:
            required += 1
        else:
            missing.append("wave_height (波高)")
        if required < 2:
            return False, missing
        return True, missing

    return len(missing) == 0, missing


def calculate_leeway_drift(
    start: Position,
    buoy: BuoyData,
    duration_hours: float,
    target_type: str = "person_in_water"
) -> Tuple[Optional[Position], Optional[str]]:
    """
    风压漂移法计算
    返回: (终点位置, 失败原因)
    """
    if buoy.wind_speed is None or buoy.wind_direction is None:
        return None, "风速或风向数据缺失"

    k = LEEWAY_COEFFICIENTS.get(target_type, 0.03)
    v_leeway = k * buoy.wind_speed  # 节

    drift_distance = v_leeway * duration_hours  # 海里

    drift_direction = buoy.wind_direction  # 风吹方向即漂移方向

    end_pos = destination_point(start, drift_direction, drift_distance)
    end_pos.timestamp = start.timestamp + timedelta(hours=duration_hours)

    return end_pos, None


def calculate_ocean_current_drift(
    start: Position,
    buoy: BuoyData,
    duration_hours: float,
    target_type: str = "person_in_water"
) -> Tuple[Optional[Position], Optional[str]]:
    """
    海流叠加法计算
    返回: (终点位置, 失败原因)
    """
    missing_fields = []
    if buoy.current_speed is None or buoy.current_direction is None:
        missing_fields.append("海流数据")
    if buoy.wind_speed is None or buoy.wind_direction is None:
        missing_fields.append("风数据")

    if missing_fields:
        return None, "数据缺失: " + ", ".join(missing_fields)

    k = LEEWAY_COEFFICIENTS.get(target_type, 0.03)
    v_wind = k * buoy.wind_speed
    dir_wind = math.radians(buoy.wind_direction)
    v_current = buoy.current_speed
    dir_current = math.radians(buoy.current_direction)

    vx = v_wind * math.sin(dir_wind) + v_current * math.sin(dir_current)
    vy = v_wind * math.cos(dir_wind) + v_current * math.cos(dir_current)

    v_total = math.sqrt(vx ** 2 + vy ** 2)
    dir_total = math.degrees(math.atan2(vx, vy))
    if dir_total < 0:
        dir_total += 360

    drift_distance = v_total * duration_hours

    end_pos = destination_point(start, dir_total, drift_distance)
    end_pos.timestamp = start.timestamp + timedelta(hours=duration_hours)

    return end_pos, None


def calculate_comprehensive_drift(
    start: Position,
    buoy: BuoyData,
    duration_hours: float,
    target_type: str = "person_in_water"
) -> Tuple[Optional[Position], Optional[str]]:
    """
    综合漂移模型计算
    返回: (终点位置, 失败原因)
    """
    has_current = buoy.current_speed is not None and buoy.current_direction is not None
    has_wind = buoy.wind_speed is not None and buoy.wind_direction is not None
    has_wave = buoy.wave_height is not None

    if not has_current and not has_wind:
        return None, "风和海流数据全部缺失, 无法计算"
    if not has_current or not has_wind:
        has_wave = has_wave  # 至少两个数据源可用

    alpha = COMPREHENSIVE_WEIGHTS["alpha"]
    beta = COMPREHENSIVE_WEIGHTS["beta"]
    gamma = COMPREHENSIVE_WEIGHTS["gamma"]

    k = LEEWAY_COEFFICIENTS.get(target_type, 0.03)

    vx, vy = 0.0, 0.0
    total_weight = 0.0

    if has_current:
        vx += alpha * buoy.current_speed * math.sin(math.radians(buoy.current_direction))
        vy += alpha * buoy.current_speed * math.cos(math.radians(buoy.current_direction))
        total_weight += alpha

    if has_wind:
        v_wind_mag = k * buoy.wind_speed
        vx += beta * v_wind_mag * math.sin(math.radians(buoy.wind_direction))
        vy += beta * v_wind_mag * math.cos(math.radians(buoy.wind_direction))
        total_weight += beta

    if has_wave:
        v_wave = 0.015 * buoy.wave_height * 6.0
        wave_dir = buoy.wind_direction if buoy.wind_direction else 0.0
        vx += gamma * v_wave * math.sin(math.radians(wave_dir))
        vy += gamma * v_wave * math.cos(math.radians(wave_dir))
        total_weight += gamma

    if total_weight > 0:
        vx /= total_weight
        vy /= total_weight

    v_total = math.sqrt(vx ** 2 + vy ** 2)
    dir_total = math.degrees(math.atan2(vx, vy))
    if dir_total < 0:
        dir_total += 360

    drift_distance = v_total * duration_hours

    end_pos = destination_point(start, dir_total, drift_distance)
    end_pos.timestamp = start.timestamp + timedelta(hours=duration_hours)

    confidence = total_weight
    return end_pos, None


def _find_nearest_buoy(pos: Position, buoys: List[BuoyData]) -> Optional[BuoyData]:
    """找到最近的有效浮标"""
    valid_buoys = [b for b in buoys if b.is_valid]
    if not valid_buoys:
        return None

    nearest = min(valid_buoys, key=lambda b: haversine_distance(pos, b.position))
    return nearest


def _find_best_buoy_for_method(
    pos: Position,
    buoys: List[BuoyData],
    method: CalculationMethod
) -> Tuple[Optional[BuoyData], List[str]]:
    """
    找到最适合某计算方法的浮标 (优先找数据完整的, 再找距离近的)

    返回: (最合适的浮标或None, 最近浮标的缺失字段列表)
    """
    valid_buoys = [b for b in buoys if b.is_valid]
    if not valid_buoys:
        return None, ["all_buoys"]

    valid_buoys_sorted = sorted(valid_buoys, key=lambda b: haversine_distance(pos, b.position))

    perfect_buoys = []
    partial_buoys = []

    for b in valid_buoys_sorted:
        is_valid, missing = _validate_buoy_for_method(b, method)
        if is_valid:
            perfect_buoys.append((b, missing))
        else:
            partial_buoys.append((b, missing))

    if perfect_buoys:
        return perfect_buoys[0][0], []

    if partial_buoys:
        return partial_buoys[0][0], partial_buoys[0][1]

    return None, ["no_valid_buoys"]


def _point_in_polygon(lat: float, lon: float, polygon: List[Tuple[float, float]]) -> bool:
    """判断点是否在多边形内 (射线法)"""
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        yi, xi = polygon[i]
        yj, xj = polygon[j]
        if ((yi > lat) != (yj > lat)) and \
           (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def _check_restricted_zones(pos: Position, zones: List[RestrictedZone]) -> Tuple[bool, Optional[str]]:
    """检查位置是否在禁航区内"""
    for zone in zones:
        if _point_in_polygon(pos.lat, pos.lon, zone.polygon):
            return True, zone.zone_id
    return False, None


def calculate_trajectory(
    start_pos: Position,
    buoys: List[BuoyData],
    time_steps: int = 12,
    step_hours: float = 1.0,
    target_type: str = "person_in_water",
    method: CalculationMethod = CalculationMethod.COMPREHENSIVE,
    restricted_zones: Optional[List[RestrictedZone]] = None,
    trajectory_id: str = "TRJ-001"
) -> Tuple[Trajectory, List[CalcFailure], List[str]]:
    """
    计算完整漂移轨迹

    参数:
        start_pos: 起始位置
        buoys: 浮标数据列表
        time_steps: 时间步数
        step_hours: 每步时长(小时)
        target_type: 目标类型
        method: 计算方法
        restricted_zones: 禁航区列表
        trajectory_id: 轨迹ID

    返回:
        (轨迹, 失败列表, 缺失浮标ID列表)
    """
    if restricted_zones is None:
        restricted_zones = []

    trajectory = Trajectory(
        trajectory_id=trajectory_id,
        start_position=start_pos,
        source=f"计算生成 ({method.value})"
    )

    failures: List[CalcFailure] = []
    missing_buoys: List[str] = []

    current_pos = start_pos

    calc_funcs = {
        CalculationMethod.LEEWAY: calculate_leeway_drift,
        CalculationMethod.OCEAN_CURRENT: calculate_ocean_current_drift,
        CalculationMethod.COMPREHENSIVE: calculate_comprehensive_drift,
    }
    calc_func = calc_funcs[method]

    for i in range(time_steps):
        best_buoy, missing = _find_best_buoy_for_method(current_pos, buoys, method)

        if best_buoy is None:
            failures.append(CalcFailure(
                point_index=i,
                reason="附近无有效浮标数据",
                method=method,
                missing_fields=["all_buoys"]
            ))
            missing_buoys.append(f"step_{i}_no_buoy")
            continue

        if not missing:
            result, err = calc_func(current_pos, best_buoy, step_hours, target_type)
            if err or result is None:
                failures.append(CalcFailure(
                    point_index=i,
                    reason=err or "未知错误",
                    method=method,
                    missing_fields=missing
                ))
                continue

            dp = DriftPoint(
                position=result,
                status=DriftStatus.NORMAL,
                source_buoy=best_buoy.buoy_id,
                calc_method=method,
                confidence=best_buoy.completeness_score(),
                notes=[]
            )

            in_zone, zone_id = _check_restricted_zones(result, restricted_zones)
            if in_zone:
                dp.in_restricted_zone = True
                dp.restricted_zone_id = zone_id
                dp.status = DriftStatus.EXCEEDED_RESTRICTED
                dp.notes.append("进入禁航区, 需人工复核")

            trajectory.drift_points.append(dp)
            current_pos = result
            continue

        alt_method = None
        alt_calc = None

        if method == CalculationMethod.COMPREHENSIVE:
            if best_buoy.wind_speed and best_buoy.wind_direction:
                alt_method = CalculationMethod.LEEWAY
                alt_calc = calculate_leeway_drift
            elif best_buoy.current_speed and best_buoy.current_direction:
                alt_method = CalculationMethod.OCEAN_CURRENT
                alt_calc = calculate_ocean_current_drift

        if method == CalculationMethod.OCEAN_CURRENT:
            if best_buoy.wind_speed and best_buoy.wind_direction:
                alt_method = CalculationMethod.LEEWAY
                alt_calc = calculate_leeway_drift

        if alt_method and alt_calc:
            result, err = alt_calc(current_pos, best_buoy, step_hours, target_type)
            if result and not err:
                dp = DriftPoint(
                    position=result,
                    status=DriftStatus.NORMAL,
                    source_buoy=best_buoy.buoy_id,
                    calc_method=alt_method,
                    confidence=best_buoy.completeness_score() * 0.7,
                    notes=[f"降级计算: 原方法{method.value}数据不足, 改用{alt_method.value}"]
                )
                in_zone, zone_id = _check_restricted_zones(result, restricted_zones)
                if in_zone:
                    dp.in_restricted_zone = True
                    dp.restricted_zone_id = zone_id
                    if dp.status == DriftStatus.NORMAL:
                        dp.status = DriftStatus.EXCEEDED_RESTRICTED
                    dp.notes.append("进入禁航区, 请关注")
                trajectory.drift_points.append(dp)
                current_pos = result
                failures.append(CalcFailure(
                    point_index=i,
                    reason=f"降级计算: {', '.join(missing)}",
                    method=method,
                    missing_fields=missing
                ))
                if best_buoy.buoy_id not in missing_buoys:
                    missing_buoys.append(best_buoy.buoy_id)
                continue

        failures.append(CalcFailure(
            point_index=i,
            reason=f"浮标 {best_buoy.buoy_id} 数据不足, 无法降级: {', '.join(missing)}",
            method=method,
            missing_fields=missing
        ))
        if best_buoy.buoy_id not in missing_buoys:
            missing_buoys.append(best_buoy.buoy_id)

    return trajectory, failures, missing_buoys


def get_formula_info() -> dict:
    """返回公式说明供界面展示"""
    return FORMULA_INFO
