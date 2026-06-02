import math
from datetime import datetime, timezone, timedelta
from typing import Tuple

from .models import (
    CalculationResult,
    Observation,
    Severity,
    ValidationResult,
    WeatherCondition,
)

ANGLE_SOURCE = "arctan(杆高/影长) + 天文算法校验"
UNIT_SOURCE = "1° = π/180 rad; 来源: 国际单位制(SI)"
BASE_SHADOW_ERROR = 0.005
BASE_POLE_ERROR = 0.003
OVERCAST_MULTIPLIER = 3.0
UNKNOWN_WEATHER_MULTIPLIER = 2.0


def _julian_day(dt_utc: datetime) -> float:
    if dt_utc.month <= 2:
        y = dt_utc.year - 1
        m = dt_utc.month + 12
    else:
        y = dt_utc.year
        m = dt_utc.month
    d = dt_utc.day + dt_utc.hour / 24.0 + dt_utc.minute / 1440.0 + dt_utc.second / 86400.0
    a = int(y / 100)
    b = 2 - a + int(a / 4)
    return int(365.25 * (y + 4716)) + int(30.6001 * (m + 1)) + d + b - 1524.5


def _julian_century(jd: float) -> float:
    return (jd - 2451545.0) / 36525.0


def _solar_position(jd: float) -> Tuple[float, float]:
    t = _julian_century(jd)
    l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360
    m_rad = math.radians((357.52911 + t * (35999.05029 - t * 0.0001537)) % 360)
    c = (1.914602 - t * (0.004817 + t * 0.000014)) * math.sin(m_rad) \
        + (0.019993 - t * 0.000101) * math.sin(2 * m_rad) \
        + 0.000289 * math.sin(3 * m_rad)
    sun_lon = l0 + c
    omega = math.radians(125.04 - 1934.136 * t)
    sun_lon -= 0.00569 - 0.00478 * math.sin(omega)
    epsilon0 = 23.0 + (26.0 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60.0) / 60.0
    epsilon = epsilon0 + 0.00256 * math.cos(omega)
    epsilon_rad = math.radians(epsilon)
    lambda_rad = math.radians(sun_lon)
    declination = math.asin(math.sin(epsilon_rad) * math.sin(lambda_rad))
    ra = math.atan2(math.cos(epsilon_rad) * math.sin(lambda_rad), math.cos(lambda_rad))
    return declination, ra


def _equation_of_time(jd: float) -> float:
    t = _julian_century(jd)
    l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360
    _, ra_rad = _solar_position(jd)
    ra_deg = math.degrees(ra_rad) % 360
    eot_deg = (l0 - ra_deg) % 360
    if eot_deg > 180:
        eot_deg -= 360
    eot_minutes = eot_deg * 4.0
    return eot_minutes / 60.0


def _local_to_utc(obs: Observation) -> datetime:
    tz = timezone(timedelta(hours=obs.timezone_offset))
    local_dt = datetime.combine(obs.obs_date, obs.obs_time, tzinfo=tz)
    return local_dt.astimezone(timezone.utc)


def compute_astronomical_angle(obs: Observation) -> Tuple[float, float]:
    utc_dt = _local_to_utc(obs)
    jd = _julian_day(utc_dt)
    declination, _ = _solar_position(jd)
    eot_hours = _equation_of_time(jd)
    utc_decimal = utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0
    true_solar_time = utc_decimal + obs.longitude / 15.0 + eot_hours
    ha_deg = (true_solar_time - 12.0) * 15.0
    if ha_deg > 180:
        ha_deg -= 360
    elif ha_deg < -180:
        ha_deg += 360
    ha_rad = math.radians(ha_deg)
    lat_rad = math.radians(obs.latitude)
    sin_alt = (math.sin(lat_rad) * math.sin(declination) +
               math.cos(lat_rad) * math.cos(declination) * math.cos(ha_rad))
    sin_alt = max(-1.0, min(1.0, sin_alt))
    elevation_rad = math.asin(sin_alt)
    cos_az_num = math.sin(declination) - math.sin(lat_rad) * sin_alt
    cos_az_den = math.cos(lat_rad) * math.cos(elevation_rad)
    if abs(cos_az_den) < 1e-10:
        azimuth_deg = 180.0
    else:
        cos_az = cos_az_num / cos_az_den
        cos_az = max(-1.0, min(1.0, cos_az))
        azimuth_deg = math.degrees(math.acos(cos_az))
        if ha_deg > 0:
            azimuth_deg = 360.0 - azimuth_deg
    return math.degrees(elevation_rad), azimuth_deg


def compute_shadow_angle(pole_height: float, shadow_length: float) -> float:
    if shadow_length <= 0:
        return 90.0
    return math.degrees(math.atan(pole_height / shadow_length))


def _estimate_error(obs: Observation) -> Tuple[float, str]:
    base_error = BASE_SHADOW_ERROR + BASE_POLE_ERROR

    if obs.pole_height and obs.pole_height > 0 and obs.shadow_length and obs.shadow_length > 0:
        if obs.shadow_length > 0:
            delta_angle = (obs.pole_height / (obs.shadow_length ** 2 + obs.pole_height ** 2)) * base_error
        else:
            delta_angle = base_error * 10
    else:
        delta_angle = 0.5

    if obs.weather == WeatherCondition.OVERCAST:
        delta_angle *= OVERCAST_MULTIPLIER
        weather_note = "阴天条件，误差乘以3倍。"
    elif obs.weather == WeatherCondition.UNKNOWN:
        delta_angle *= UNKNOWN_WEATHER_MULTIPLIER
        weather_note = "天气未知，误差乘以2倍。"
    elif obs.weather == WeatherCondition.PARTLY_CLOUDY:
        delta_angle *= 1.5
        weather_note = "多云条件，误差乘以1.5倍。"
    else:
        weather_note = "晴天条件，使用基准误差。"

    explanation = f"基准误差来源: 影长测量±{BASE_SHADOW_ERROR}m + 杆高测量±{BASE_POLE_ERROR}m。{weather_note}"

    return round(delta_angle, 4), explanation


def calculate(obs: Observation, idx: int, validation: ValidationResult) -> CalculationResult:
    base = CalculationResult(
        observation_index=idx,
        site_name=obs.site_name,
        obs_date=obs.obs_date.isoformat(),
        obs_time=obs.obs_time.isoformat(),
        timezone_label=obs.timezone_label,
        angle_source=ANGLE_SOURCE,
        unit_source=UNIT_SOURCE,
    )

    shadow_angle = None
    can_shadow = (obs.pole_height is not None and obs.pole_height > 0
                  and obs.shadow_length is not None and obs.shadow_length > 0)

    tz_errors = [i for i in validation.issues if i.code == "TIMEZONE_MISMATCH"]
    tz_warning = any(i.code == "TIMEZONE_MISMATCH" for i in validation.issues)

    if can_shadow:
        shadow_angle = compute_shadow_angle(obs.pole_height, obs.shadow_length)
        base.pole_height_used = obs.pole_height
        base.shadow_length_used = obs.shadow_length

    try:
        astro_elev, astro_az = compute_astronomical_angle(obs)
    except Exception:
        astro_elev = None
        astro_az = None

    if can_shadow and shadow_angle is not None:
        base.solar_elevation_angle_deg = round(shadow_angle, 4)
        base.solar_elevation_angle_rad = round(math.radians(shadow_angle), 6)
        base.azimuth_deg = round(astro_az, 4) if astro_az is not None else None
    elif astro_elev is not None:
        base.solar_elevation_angle_deg = round(astro_elev, 4)
        base.solar_elevation_angle_rad = round(math.radians(astro_elev), 6)
        base.azimuth_deg = round(astro_az, 4) if astro_az is not None else None
        base.angle_source = "天文算法估算（无实测影长）"
        fallback_parts = []
        if obs.pole_height is None or obs.pole_height <= 0:
            fallback_parts.append("杆高缺失")
        if obs.shadow_length is None or obs.shadow_length <= 0:
            fallback_parts.append("影长缺失或无效")
        base.fallback_reason = "影长法不可用: " + "、".join(fallback_parts)
    else:
        base.skip_reason = "杆高或影长缺失，且天文算法计算失败"
        return base

    err_deg, err_explanation = _estimate_error(obs)
    base.error_estimate_deg = err_deg
    base.error_explanation = err_explanation

    if tz_warning and base.solar_elevation_angle_deg is not None:
        tz_max_err = len(tz_errors) * 1.5
        base.error_estimate_deg = round(base.error_estimate_deg + tz_max_err, 4)
        base.error_explanation += f" 时区偏差额外增加±{tz_max_err:.1f}°不确定性。"

    if can_shadow and shadow_angle is not None and astro_elev is not None:
        diff = abs(shadow_angle - astro_elev)
        if diff > 5.0:
            base.error_explanation += f" 影长法({shadow_angle:.2f}°)与天文法({astro_elev:.2f}°)偏差{diff:.2f}°，建议复查数据。"

    return base


def calculate_all(observations: list[Observation], validations: list[ValidationResult]) -> list[CalculationResult]:
    results = []
    for i, (obs, val) in enumerate(zip(observations, validations)):
        results.append(calculate(obs, i, val))
    return results
