from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Optional

from models import (
    CombustionTemp,
    CurvePoint,
    EngineRecord,
    FuelParams,
    MixtureResult,
    NozzleData,
    OxidizerFlow,
    PROPELLANT_PROFILES,
    Suggestion,
    UnitWarning,
    match_propellant_combo,
)

UNIT_CONVERSIONS = {
    "density": {
        ("kg/m³", "g/cm³"): 1000,
        ("g/cm³", "kg/m³"): 0.001,
        ("lb/ft³", "kg/m³"): 16.0185,
        ("kg/m³", "lb/ft³"): 0.062428,
    },
    "flow_rate": {
        ("kg/s", "g/s"): 1000,
        ("g/s", "kg/s"): 0.001,
        ("lb/s", "kg/s"): 0.453592,
        ("kg/s", "lb/s"): 2.20462,
        ("kg/s", "kg/h"): 3600,
        ("kg/h", "kg/s"): 1 / 3600,
    },
    "temperature": {
        ("K", "°C"): "K_to_C",
        ("°C", "K"): "C_to_K",
        ("K", "°F"): "K_to_F",
        ("°F", "K"): "F_to_K",
        ("°C", "°F"): "C_to_F",
        ("°F", "°C"): "F_to_C",
    },
    "length": {
        ("mm", "m"): 1000,
        ("m", "mm"): 0.001,
        ("in", "mm"): 25.4,
        ("mm", "in"): 1 / 25.4,
    },
}

SI_UNITS = {
    "density": "kg/m³",
    "flow_rate": "kg/s",
    "temperature": "K",
    "length": "mm",
}


def convert_temperature(value: float, from_unit: str, to_unit: str) -> float:
    if from_unit == to_unit:
        return value
    if from_unit == "K" and to_unit == "°C":
        return value - 273.15
    if from_unit == "°C" and to_unit == "K":
        return value + 273.15
    if from_unit == "K" and to_unit == "°F":
        return (value - 273.15) * 9 / 5 + 32
    if from_unit == "°F" and to_unit == "K":
        return (value - 32) * 5 / 9 + 273.15
    if from_unit == "°C" and to_unit == "°F":
        return value * 9 / 5 + 32
    if from_unit == "°F" and to_unit == "°C":
        return (value - 32) * 5 / 9
    raise ValueError(f"Unknown temperature conversion: {from_unit} -> {to_unit}")


def to_si_flow_rate(value: float, unit: str) -> float:
    if unit == "kg/s":
        return value
    if unit == "g/s":
        return value * 0.001
    if unit == "lb/s":
        return value * 0.453592
    if unit == "kg/h":
        return value / 3600
    raise ValueError(f"Unknown flow rate unit: {unit}")


def to_si_temperature(value: float, unit: str) -> float:
    return convert_temperature(value, unit, "K")


def to_si_length(value: float, unit: str) -> float:
    if unit == "mm":
        return value
    if unit == "m":
        return value * 1000
    if unit == "in":
        return value * 25.4
    raise ValueError(f"Unknown length unit: {unit}")


def detect_unit_warnings(
    fuel_params: FuelParams,
    oxidizer_flow: OxidizerFlow,
    nozzle_data: NozzleData,
    combustion_temp: CombustionTemp,
) -> list[UnitWarning]:
    warnings: list[UnitWarning] = []

    si_flow = SI_UNITS["flow_rate"]
    if fuel_params.flow_rate_unit != si_flow:
        factor = _get_conversion_factor("flow_rate", fuel_params.flow_rate_unit, si_flow)
        warnings.append(
            UnitWarning(
                field="fuel_params.flow_rate_unit",
                current_unit=fuel_params.flow_rate_unit,
                expected_unit=si_flow,
                conversion_factor=factor,
                suggestion=f"燃料流量单位为 {fuel_params.flow_rate_unit}，"
                f"标准单位为 {si_flow}，乘以 {factor} 即可转换",
            )
        )
    if oxidizer_flow.flow_rate_unit != si_flow:
        factor = _get_conversion_factor("flow_rate", oxidizer_flow.flow_rate_unit, si_flow)
        warnings.append(
            UnitWarning(
                field="oxidizer_flow.flow_rate_unit",
                current_unit=oxidizer_flow.flow_rate_unit,
                expected_unit=si_flow,
                conversion_factor=factor,
                suggestion=f"氧化剂流量单位为 {oxidizer_flow.flow_rate_unit}，"
                f"标准单位为 {si_flow}，乘以 {factor} 即可转换",
            )
        )

    if fuel_params.flow_rate_unit != oxidizer_flow.flow_rate_unit:
        factor = _get_conversion_factor("flow_rate", fuel_params.flow_rate_unit, oxidizer_flow.flow_rate_unit)
        warnings.append(
            UnitWarning(
                field="flow_rate_unit_mismatch",
                current_unit=f"燃料={fuel_params.flow_rate_unit}, 氧化剂={oxidizer_flow.flow_rate_unit}",
                expected_unit="统一单位",
                conversion_factor=factor,
                suggestion=f"燃料和氧化剂流量单位不一致，"
                f"将燃料流量乘以 {factor} 转换为 {oxidizer_flow.flow_rate_unit}",
            )
        )

    si_density = SI_UNITS["density"]
    if fuel_params.density_unit != si_density:
        factor = _get_conversion_factor("density", fuel_params.density_unit, si_density)
        warnings.append(
            UnitWarning(
                field="fuel_params.density_unit",
                current_unit=fuel_params.density_unit,
                expected_unit=si_density,
                conversion_factor=factor,
                suggestion=f"燃料密度单位为 {fuel_params.density_unit}，"
                f"标准单位为 {si_density}，乘以 {factor} 即可转换",
            )
        )

    si_temp = SI_UNITS["temperature"]
    if combustion_temp.unit != si_temp:
        warnings.append(
            UnitWarning(
                field="combustion_temp.unit",
                current_unit=combustion_temp.unit,
                expected_unit=si_temp,
                conversion_factor=None,
                suggestion=f"燃烧温度单位为 {combustion_temp.unit}，"
                f"标准单位为 {si_temp}，请手动转换（温标换算非简单乘法）",
            )
        )

    si_length = SI_UNITS["length"]
    if nozzle_data.length_unit != si_length:
        factor = _get_conversion_factor("length", nozzle_data.length_unit, si_length)
        warnings.append(
            UnitWarning(
                field="nozzle_data.length_unit",
                current_unit=nozzle_data.length_unit,
                expected_unit=si_length,
                conversion_factor=factor,
                suggestion=f"喷管长度单位为 {nozzle_data.length_unit}，"
                f"标准单位为 {si_length}，乘以 {factor} 即可转换",
            )
        )

    return warnings


def _get_conversion_factor(category: str, from_unit: str, to_unit: str) -> Optional[float]:
    if category in UNIT_CONVERSIONS:
        conversions = UNIT_CONVERSIONS[category]
        key = (from_unit, to_unit)
        if key in conversions:
            val = conversions[key]
            if isinstance(val, (int, float)):
                return val
    return None


def calculate_mixture_ratio(fuel_flow_si: float, oxidizer_flow_si: float) -> float:
    if fuel_flow_si <= 0:
        raise ValueError("燃料流量必须大于0")
    return oxidizer_flow_si / fuel_flow_si


def check_boundary(
    mixture_ratio: float,
    propellant_combo: Optional[str],
) -> tuple[str, str]:
    if propellant_combo is None or propellant_combo not in PROPELLANT_PROFILES:
        return (
            "unknown",
            "未识别推进剂组合，无法判定混合比边界；"
            "请在 fuel_params.name 和 oxidizer_flow.name 使用标准名称（如 RP-1, LOX）",
        )

    profile = PROPELLANT_PROFILES[propellant_combo]
    mr_low, mr_high = profile["mr_range"]
    typical = profile["typical_mr"]

    if mixture_ratio < mr_low:
        return (
            "critical",
            f"混合比 {mixture_ratio:.3f} 低于下限 {mr_low}（{propellant_combo} 典型值 {typical}），"
            f"燃料偏多，可能导致不完全燃烧、比冲下降、排气温度偏低",
        )
    elif mixture_ratio > mr_high:
        return (
            "critical",
            f"混合比 {mixture_ratio:.3f} 超过上限 {mr_high}（{propellant_combo} 典型值 {typical}），"
            f"氧化剂偏多，可能导致烧蚀、推力室过热、金属壁面损伤",
        )
    elif mixture_ratio < typical * 0.85:
        return (
            "warning",
            f"混合比 {mixture_ratio:.3f} 偏低（{propellant_combo} 典型值 {typical}，安全范围 {mr_low}~{mr_high}），"
            f"燃料略偏多，比冲可能略低于最优",
        )
    elif mixture_ratio > typical * 1.15:
        return (
            "warning",
            f"混合比 {mixture_ratio:.3f} 偏高（{propellant_combo} 典型值 {typical}，安全范围 {mr_low}~{mr_high}），"
            f"氧化剂略偏多，推力室温度偏高",
        )
    else:
        return (
            "normal",
            f"混合比 {mixture_ratio:.3f} 在正常范围（{propellant_combo} 典型值 {typical}，安全范围 {mr_low}~{mr_high}）",
        )


def check_temperature(
    combustion_temp_K: Optional[float],
    propellant_combo: Optional[str],
    mixture_ratio: Optional[float],
) -> tuple[str, str]:
    if combustion_temp_K is None:
        return ("unknown", "燃烧温度数据缺失，无法判定温度超限")
    if propellant_combo is None or propellant_combo not in PROPELLANT_PROFILES:
        return ("unknown", "未识别推进剂组合，无法判定温度超限边界")

    profile = PROPELLANT_PROFILES[propellant_combo]
    temp_limit = profile["temp_limit_K"]

    if combustion_temp_K > temp_limit * 1.05:
        return (
            "critical",
            f"燃烧温度 {combustion_temp_K:.0f}K 超过上限 {temp_limit}K 达 5% 以上，"
            f"存在推力室烧蚀风险；建议降低混合比（减少氧化剂流量）或增加冷却",
        )
    elif combustion_temp_K > temp_limit:
        return (
            "warning",
            f"燃烧温度 {combustion_temp_K:.0f}K 略超上限 {temp_limit}K，"
            f"建议微调混合比或加强再生冷却",
        )
    else:
        return (
            "normal",
            f"燃烧温度 {combustion_temp_K:.0f}K 在安全范围内（上限 {temp_limit}K）",
        )


def generate_suggestions(
    mixture_ratio: Optional[float],
    boundary_status: str,
    boundary_detail: str,
    temp_status: str,
    temp_detail: str,
    unit_warnings: list[UnitWarning],
    fuel_flow_si: Optional[float],
    oxidizer_flow_si: Optional[float],
    propellant_combo: Optional[str],
    combustion_temp_K: Optional[float],
) -> list[Suggestion]:
    suggestions: list[Suggestion] = []

    if mixture_ratio is not None and propellant_combo and propellant_combo in PROPELLANT_PROFILES:
        profile = PROPELLANT_PROFILES[propellant_combo]
        typical_mr = profile["typical_mr"]
        mr_low, mr_high = profile["mr_range"]

        if boundary_status == "critical":
            if mixture_ratio < mr_low:
                target_ox = typical_mr * fuel_flow_si if fuel_flow_si else None
                action = (
                    f"将氧化剂流量调至 {target_ox:.3f} kg/s（使混合比达到典型值 {typical_mr}）"
                    if target_ox
                    else f"提高氧化剂流量使混合比达到典型值 {typical_mr}"
                )
                suggestions.append(
                    Suggestion(
                        category="mixture_ratio",
                        severity="critical",
                        message=boundary_detail,
                        action=action,
                    )
                )
            elif mixture_ratio > mr_high:
                target_fuel = oxidizer_flow_si / typical_mr if oxidizer_flow_si else None
                action = (
                    f"将燃料流量调至 {target_fuel:.3f} kg/s（使混合比达到典型值 {typical_mr}）"
                    if target_fuel
                    else f"提高燃料流量使混合比达到典型值 {typical_mr}"
                )
                suggestions.append(
                    Suggestion(
                        category="mixture_ratio",
                        severity="critical",
                        message=boundary_detail,
                        action=action,
                    )
                )
        elif boundary_status == "warning":
            if mixture_ratio < typical_mr:
                target_ox = typical_mr * fuel_flow_si if fuel_flow_si else None
                action = (
                    f"建议将氧化剂流量调至 {target_ox:.3f} kg/s（使混合比达到典型值 {typical_mr}）"
                    if target_ox
                    else f"建议提高氧化剂流量使混合比接近典型值 {typical_mr}"
                )
            else:
                target_fuel = oxidizer_flow_si / typical_mr if oxidizer_flow_si else None
                action = (
                    f"建议将燃料流量调至 {target_fuel:.3f} kg/s（使混合比达到典型值 {typical_mr}）"
                    if target_fuel
                    else f"建议提高燃料流量使混合比接近典型值 {typical_mr}"
                )
            suggestions.append(
                Suggestion(
                    category="mixture_ratio",
                    severity="warning",
                    message=boundary_detail,
                    action=action,
                )
            )

    if temp_status in ("critical", "warning"):
        suggestions.append(
            Suggestion(
                category="temperature",
                severity=temp_status,
                message=temp_detail,
                action=(
                    "降低混合比（减少氧化剂流量）或增强再生冷却；"
                    "若温度数据单位疑似有误，请先确认温标（K/°C/°F）"
                ),
            )
        )

    for uw in unit_warnings:
        suggestions.append(
            Suggestion(
                category="unit_mismatch",
                severity="warning",
                message=f"单位不一致：{uw.field}，当前 {uw.current_unit}，期望 {uw.expected_unit}",
                action=uw.suggestion,
            )
        )

    return suggestions


def estimate_c_star(
    temperature_K: float,
    gamma: float,
    R_gas: float,
    efficiency: float,
) -> float:
    if temperature_K <= 0 or gamma <= 1.0 or R_gas <= 0:
        return 0.0
    denom = math.sqrt(gamma * ((2 / (gamma + 1)) ** ((gamma + 1) / (gamma - 1))))
    c_star_ideal = math.sqrt(R_gas * temperature_K) / denom
    return efficiency * c_star_ideal


def estimate_isp(c_star: float, gamma: float, expansion_ratio: float) -> float:
    if c_star <= 0 or expansion_ratio <= 1 or gamma <= 1:
        return 0.0
    p_ratio = (2 / (gamma + 1)) ** (gamma / (gamma - 1))
    if expansion_ratio < 1 / p_ratio:
        cf = 1.0
    else:
        term = 1 - p_ratio ** ((gamma - 1) / gamma) * (1 / expansion_ratio) ** ((gamma - 1) / gamma)
        cf = math.sqrt(
            2 * gamma**2 / (gamma - 1) * term
            * (2 / (gamma + 1)) ** ((gamma + 1) / (gamma - 1))
        )
    g0 = 9.80665
    return c_star * cf / g0


def generate_curve_data(
    propellant_combo: Optional[str],
    efficiency: float,
    combustion_temp_K: Optional[float],
    expansion_ratio: Optional[float],
    current_mr: Optional[float],
) -> list[CurvePoint]:
    if propellant_combo is None or propellant_combo not in PROPELLANT_PROFILES:
        return []
    if combustion_temp_K is None or combustion_temp_K <= 0:
        return []

    profile = PROPELLANT_PROFILES[propellant_combo]
    gamma = profile["gamma"]
    R_gas = profile["R_gas"]
    mr_low, mr_high = profile["mr_range"]
    eff_expansion = expansion_ratio if expansion_ratio and expansion_ratio > 1 else 40.0

    steps = 20
    mr_span = mr_high - mr_low
    start_mr = max(mr_low - mr_span * 0.1, 0.5)
    end_mr = mr_high + mr_span * 0.1

    points: list[CurvePoint] = []
    for i in range(steps + 1):
        mr = start_mr + (end_mr - start_mr) * i / steps
        temp_estimate = combustion_temp_K * (1 - 0.15 * ((mr - profile["typical_mr"]) / mr_span) ** 2)
        temp_estimate = max(temp_estimate, 300)
        c_star = estimate_c_star(temp_estimate, gamma, R_gas, efficiency)
        isp = estimate_isp(c_star, gamma, eff_expansion)
        points.append(
            CurvePoint(
                mixture_ratio=round(mr, 4),
                c_star=round(c_star, 1) if c_star > 0 else None,
                isp=round(isp, 1) if isp > 0 else None,
                efficiency_used=efficiency,
            )
        )

    return points


def calculate_all(
    engine: EngineRecord,
    version: int,
) -> MixtureResult:
    now = datetime.now(timezone.utc).isoformat()
    missing: list[str] = []
    fuel_flow_si: Optional[float] = None
    ox_flow_si: Optional[float] = None
    temp_K: Optional[float] = None

    if engine.fuel_params.flow_rate is not None and engine.fuel_params.flow_rate > 0:
        fuel_flow_si = to_si_flow_rate(engine.fuel_params.flow_rate, engine.fuel_params.flow_rate_unit)
    else:
        missing.append("fuel_params.flow_rate")

    if engine.oxidizer_flow.flow_rate is not None and engine.oxidizer_flow.flow_rate > 0:
        ox_flow_si = to_si_flow_rate(engine.oxidizer_flow.flow_rate, engine.oxidizer_flow.flow_rate_unit)
    else:
        missing.append("oxidizer_flow.flow_rate")

    if engine.combustion_temp.value is not None:
        temp_K = to_si_temperature(engine.combustion_temp.value, engine.combustion_temp.unit)
    else:
        missing.append("combustion_temp.value")

    unit_warnings = detect_unit_warnings(
        engine.fuel_params, engine.oxidizer_flow, engine.nozzle_data, engine.combustion_temp
    )

    propellant_combo = match_propellant_combo(engine.fuel_params.name, engine.oxidizer_flow.name)

    mixture_ratio: Optional[float] = None
    if fuel_flow_si is not None and ox_flow_si is not None and fuel_flow_si > 0:
        mixture_ratio = round(calculate_mixture_ratio(fuel_flow_si, ox_flow_si), 4)

    boundary_status, boundary_detail = "unknown", "混合比数据不足，无法判定"
    if mixture_ratio is not None:
        boundary_status, boundary_detail = check_boundary(mixture_ratio, propellant_combo)

    temp_status, temp_detail = "unknown", "燃烧温度数据缺失，无法判定"
    if temp_K is not None:
        temp_status, temp_detail = check_temperature(temp_K, propellant_combo, mixture_ratio)

    suggestions = generate_suggestions(
        mixture_ratio, boundary_status, boundary_detail,
        temp_status, temp_detail, unit_warnings,
        fuel_flow_si, ox_flow_si, propellant_combo, temp_K,
    )

    expansion_ratio = engine.nozzle_data.expansion_ratio
    curve_data = generate_curve_data(
        propellant_combo, engine.efficiency, temp_K, expansion_ratio, mixture_ratio
    )

    return MixtureResult(
        version=version,
        mixture_ratio=mixture_ratio,
        boundary_status=boundary_status,
        boundary_detail=boundary_detail,
        temp_status=temp_status,
        temp_detail=temp_detail,
        unit_warnings=unit_warnings,
        suggestions=suggestions,
        efficiency_used=engine.efficiency,
        propellant_combo=propellant_combo,
        curve_data=curve_data,
        calculated_at=now,
        missing_fields=missing,
    )


def diff_results(old: MixtureResult, new: MixtureResult) -> dict:
    old_sug_keys = {(s.category, s.severity, s.message) for s in old.suggestions}
    new_sug_keys = {(s.category, s.severity, s.message) for s in new.suggestions}
    new_suggestions = [s for s in new.suggestions if (s.category, s.severity, s.message) not in old_sug_keys]
    resolved_suggestions = [s for s in old.suggestions if (s.category, s.severity, s.message) not in new_sug_keys]

    return {
        "old_version": old.version,
        "new_version": new.version,
        "mixture_ratio_changed": old.mixture_ratio != new.mixture_ratio,
        "old_mixture_ratio": old.mixture_ratio,
        "new_mixture_ratio": new.mixture_ratio,
        "boundary_changed": old.boundary_status != new.boundary_status,
        "old_boundary_status": old.boundary_status,
        "new_boundary_status": new.boundary_status,
        "temp_changed": old.temp_status != new.temp_status,
        "old_temp_status": old.temp_status,
        "new_temp_status": new.temp_status,
        "efficiency_changed": old.efficiency_used != new.efficiency_used,
        "old_efficiency": old.efficiency_used,
        "new_efficiency": new.efficiency_used,
        "new_suggestions": [s.model_dump() for s in new_suggestions],
        "resolved_suggestions": [s.model_dump() for s in resolved_suggestions],
    }
