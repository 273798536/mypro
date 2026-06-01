import math
from .models import Observation, Severity, ValidationIssue, ValidationResult, WeatherCondition


def _expected_timezone(longitude: float) -> float:
    return round(longitude / 15.0)


def validate(observation: Observation) -> ValidationResult:
    result = ValidationResult()

    _check_timezone(observation, result)
    _check_pole_height(observation, result)
    _check_shadow(observation, result)
    _check_weather(observation, result)
    _check_coordinates(observation, result)
    _check_import_errors(observation, result)

    return result


def validate_all(observations: list[Observation]) -> list[ValidationResult]:
    return [validate(obs) for obs in observations]


def _check_timezone(obs: Observation, result: ValidationResult):
    expected = _expected_timezone(obs.longitude)
    diff = abs(obs.timezone_offset - expected)
    if diff > 1.0:
        severity = Severity.ERROR if diff > 3.0 else Severity.WARNING
        affected = ["solar_elevation_angle", "azimuth", "datetime_interpretation"]
        explanation = (
            f"经度 {obs.longitude}° 对应标准时区 UTC{'+' if expected >= 0 else ''}{expected}，"
            f"但记录时区为 {obs.timezone_label}，偏差 {diff:.1f} 小时。"
            f"时区偏差直接影响太阳角与方位角计算中当地时→太阳时的转换，"
            f"同时导致日期时间解读偏移。"
        )
        result.add_issue(ValidationIssue(
            code="TIMEZONE_MISMATCH",
            severity=severity,
            message=f"时区偏差: 记录 {obs.timezone_label} vs 预期 UTC{'+' if expected >= 0 else ''}{expected}",
            affected_fields=affected,
            explanation=explanation,
        ))


def _check_pole_height(obs: Observation, result: ValidationResult):
    if obs.pole_height is None or obs.pole_height <= 0:
        affected = ["solar_elevation_angle"]
        explanation = (
            "杆高缺失或无效，无法通过 arctan(杆高/影长) 计算太阳高度角。"
            "该观测记录的太阳高度角将被跳过，仅保留天文算法估算结果。"
        )
        result.add_issue(ValidationIssue(
            code="POLE_HEIGHT_MISSING",
            severity=Severity.ERROR,
            message=f"杆高缺失或无效: {obs.pole_height}",
            affected_fields=affected,
            explanation=explanation,
        ))


def _check_shadow(obs: Observation, result: ValidationResult):
    if obs.shadow_length is None or obs.shadow_length < 0:
        affected = ["solar_elevation_angle"]
        explanation = (
            "影长缺失或为负值，无法参与太阳高度角计算。"
            "该观测的太阳高度角计算将被跳过。"
        )
        result.add_issue(ValidationIssue(
            code="SHADOW_INVALID",
            severity=Severity.ERROR,
            message=f"影长无效: {obs.shadow_length}",
            affected_fields=affected,
            explanation=explanation,
        ))
    elif obs.shadow_length == 0:
        affected = ["solar_elevation_angle"]
        explanation = (
            "影长为0，太阳高度角理论为90°（正午直射）。"
            "实际测量中影长为0通常暗示杆高与影长比例极端，结果不可靠。"
        )
        result.add_issue(ValidationIssue(
            code="SHADOW_ZERO",
            severity=Severity.WARNING,
            message="影长为0，太阳角将接近90°，结果可靠性存疑",
            affected_fields=affected,
            explanation=explanation,
        ))


def _check_weather(obs: Observation, result: ValidationResult):
    if obs.weather == WeatherCondition.OVERCAST:
        affected = ["solar_elevation_angle"]
        explanation = (
            "阴天条件下影子边界模糊，影长测量误差显著增大。"
            "计算所得太阳高度角的误差范围将扩大，建议将误差估计乘以2~3倍。"
            "太阳方位角受影响较小。"
        )
        result.add_issue(ValidationIssue(
            code="OVERCAST_CONDITION",
            severity=Severity.WARNING,
            message="阴天观测，影长测量精度受影响",
            affected_fields=affected,
            explanation=explanation,
        ))
    elif obs.weather == WeatherCondition.UNKNOWN:
        affected = ["solar_elevation_angle"]
        explanation = (
            "天气状况未知，无法评估影长测量精度。"
            "建议补充天气信息以确定误差范围。"
        )
        result.add_issue(ValidationIssue(
            code="WEATHER_UNKNOWN",
            severity=Severity.INFO,
            message="天气状况未记录",
            affected_fields=affected,
            explanation=explanation,
        ))


def _check_coordinates(obs: Observation, result: ValidationResult):
    if not (-90 <= obs.latitude <= 90):
        affected = ["solar_elevation_angle", "azimuth", "datetime_interpretation"]
        explanation = f"纬度 {obs.latitude}° 超出有效范围 [-90, 90]，所有基于坐标的计算均不可靠。"
        result.add_issue(ValidationIssue(
            code="LATITUDE_OUT_OF_RANGE",
            severity=Severity.ERROR,
            message=f"纬度超出范围: {obs.latitude}°",
            affected_fields=affected,
            explanation=explanation,
        ))
    if not (-180 <= obs.longitude <= 180):
        affected = ["solar_elevation_angle", "azimuth", "datetime_interpretation"]
        explanation = f"经度 {obs.longitude}° 超出有效范围 [-180, 180]，所有基于坐标的计算均不可靠。"
        result.add_issue(ValidationIssue(
            code="LONGITUDE_OUT_OF_RANGE",
            severity=Severity.ERROR,
            message=f"经度超出范围: {obs.longitude}°",
            affected_fields=affected,
            explanation=explanation,
        ))


def _check_import_errors(obs: Observation, result: ValidationResult):
    if obs.site_name == "_import_error":
        affected = ["all"]
        explanation = "该记录导入过程中出现错误，所有字段均不可信。"
        result.add_issue(ValidationIssue(
            code="IMPORT_ERROR",
            severity=Severity.ERROR,
            message=f"导入失败: {obs.notes}",
            affected_fields=affected,
            explanation=explanation,
        ))
