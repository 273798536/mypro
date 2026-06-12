from typing import Optional, Tuple, Dict, Any, List
from .models import Unit, CalculationException, ExceptionType


TIME_UNIT_FACTORS = {
    Unit.SECOND: 1.0,
    Unit.MINUTE: 60.0,
    Unit.HOUR: 3600.0,
}

COUNT_UNIT_FACTORS = {
    Unit.PERSON: 1.0,
    Unit.VEHICLE: 1.0,
    Unit.GROUP: 1.0,
}

LENGTH_UNIT_FACTORS = {
    Unit.METER: 1.0,
}

AREA_UNIT_FACTORS = {
    Unit.SQUARE_METER: 1.0,
}

UNIT_GROUPS = {
    "time": set(TIME_UNIT_FACTORS.keys()),
    "count": set(COUNT_UNIT_FACTORS.keys()),
    "length": set(LENGTH_UNIT_FACTORS.keys()),
    "area": set(AREA_UNIT_FACTORS.keys()),
}


def get_unit_group(unit: Unit) -> Optional[str]:
    for group_name, members in UNIT_GROUPS.items():
        if unit in members:
            return group_name
    return None


def are_units_compatible(from_unit: Unit, to_unit: Unit) -> bool:
    g1 = get_unit_group(from_unit)
    g2 = get_unit_group(to_unit)
    return g1 is not None and g2 is not None and g1 == g2


def get_conversion_factor(from_unit: Unit, to_unit: Unit) -> Optional[float]:
    if not are_units_compatible(from_unit, to_unit):
        return None
    group = get_unit_group(from_unit)
    if group == "time":
        return TIME_UNIT_FACTORS[from_unit] / TIME_UNIT_FACTORS[to_unit]
    if group in ("count", "length", "area"):
        return 1.0
    return None


def convert_value(
    value: float,
    from_unit: Unit,
    to_unit: Unit,
) -> Tuple[Optional[float], Optional[CalculationException]]:
    if from_unit == to_unit:
        return value, None
    factor = get_conversion_factor(from_unit, to_unit)
    if factor is None:
        detail = {
            "from_unit": from_unit.value,
            "to_unit": to_unit.value,
            "from_group": get_unit_group(from_unit),
            "to_group": get_unit_group(to_unit),
            "original_value": value,
        }
        exc = CalculationException(
            exception_type=ExceptionType.UNIT_MISMATCH,
            message=f"单位不兼容：无法从 {from_unit.value} 转换到 {to_unit.value}",
            detail=detail,
            suggestion=f"请检查题目输入单位与目标输出单位是否属同一量纲（时间/数量/长度/面积）。"
        )
        return None, exc
    converted = value * factor
    return converted, None


def detect_unit_shift(
    raw_value: float,
    raw_unit: Unit,
    expected_unit: Unit,
    historical_ref: Optional[Dict[str, Any]] = None,
) -> Tuple[bool, Optional[CalculationException]]:
    if raw_unit == expected_unit:
        return False, None
    group_raw = get_unit_group(raw_unit)
    group_expected = get_unit_group(expected_unit)
    if group_raw != group_expected:
        detail = {
            "raw_value": raw_value,
            "raw_unit": raw_unit.value,
            "expected_unit": expected_unit.value,
            "raw_group": group_raw,
            "expected_group": group_expected,
        }
        exc = CalculationException(
            exception_type=ExceptionType.UNIT_MISMATCH,
            message=f"公式结果单位 {raw_unit.value} 与目标单位 {expected_unit.value} 量纲不同",
            detail=detail,
            suggestion="请核对题目清单中公式输出量纲与 expected_output_unit 是否一致。"
        )
        return True, exc
    return False, None


def normalize_units_in_params(
    params: Dict[str, Any],
    param_units: Dict[str, Unit],
    target_units: Dict[str, Unit],
) -> Tuple[Dict[str, Any], List[CalculationException]]:
    normalized = dict(params)
    exceptions: List[CalculationException] = []
    for key, value in params.items():
        if key in param_units and key in target_units:
            from_u = param_units[key]
            to_u = target_units[key]
            converted, exc = convert_value(float(value), from_u, to_u)
            if exc is not None:
                exceptions.append(exc)
                continue
            if converted is not None:
                normalized[key] = converted
    return normalized, exceptions
