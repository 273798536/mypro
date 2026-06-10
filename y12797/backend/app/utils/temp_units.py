"""温度单位处理工具：支持℃、K、°F之间的校验与归一化转换。"""
import re
from typing import Optional, Tuple, Dict, Any


TEMP_UNIT_PATTERNS = [
    (r"[℃°]\s*C|deg\s*C|celsius|centigrade", "℃"),
    (r"\bK\b|kelvin", "K"),
    (r"[°]\s*F|deg\s*F|fahrenheit", "°F"),
]

STANDARD_TEMP_UNIT = "℃"


def parse_temperature(raw_value: str, raw_unit: Optional[str] = None) -> Dict[str, Any]:
    """
    解析温度值和单位，返回 {value, unit, normalized_value, normalized_unit, issues}
    - 自动从 value 字符串中提取单位（如 "37℃" -> 37, "℃"）
    - 自动归一化到标准单位℃
    - 检测异常（如 > 150℃ 或 < -50℃ 的非极端条件标注）
    """
    result = {
        "value": None,
        "unit": None,
        "normalized_value": None,
        "normalized_unit": STANDARD_TEMP_UNIT,
        "has_unit_missing": False,
        "has_unit_mismatch": False,
        "issue_description": "",
    }

    combined = f"{raw_value or ''} {raw_unit or ''}".strip()

    num_match = re.search(r"(-?\d+(?:\.\d+)?)", combined)
    if not num_match:
        result["issue_description"] = "无法从输入中提取有效温度数值"
        result["has_unit_missing"] = True
        return result

    try:
        num_value = float(num_match.group(1))
    except ValueError:
        result["issue_description"] = f"温度数值解析失败：{num_match.group(1)}"
        return result

    result["value"] = num_value

    unit_detected = None
    remaining = combined.replace(num_match.group(1), "").strip()
    for pattern, canon in TEMP_UNIT_PATTERNS:
        if re.search(pattern, remaining, re.IGNORECASE):
            unit_detected = canon
            break

    if not unit_detected:
        unit_detected = raw_unit if raw_unit else None

    if not unit_detected:
        result["has_unit_missing"] = True
        result["issue_description"] = "温度单位未填写，系统默认按℃处理，请复核确认"
        unit_detected = STANDARD_TEMP_UNIT

    result["unit"] = unit_detected

    if unit_detected != STANDARD_TEMP_UNIT:
        result["has_unit_mismatch"] = True

    try:
        normalized = convert_temperature(num_value, unit_detected, STANDARD_TEMP_UNIT)
        result["normalized_value"] = normalized
    except Exception as e:
        result["issue_description"] = f"温度单位转换失败：{str(e)}"
        return result

    if normalized > 150 or normalized < -50:
        if result["issue_description"]:
            result["issue_description"] += "；"
        result["issue_description"] += f"归一化后温度({normalized:.1f}℃)超出常规酶促反应范围(-50~150℃)，请确认"

    return result


def convert_temperature(value: float, from_unit: str, to_unit: str) -> float:
    """在℃、K、°F之间进行转换。"""
    from_c = from_unit
    to_c = to_unit
    in_celsius = value

    if from_c == "K":
        in_celsius = value - 273.15
    elif from_c == "°F":
        in_celsius = (value - 32) * 5.0 / 9.0
    elif from_c != "℃":
        raise ValueError(f"不支持的源温度单位：{from_c}")

    if to_c == "K":
        return in_celsius + 273.15
    elif to_c == "°F":
        return in_celsius * 9.0 / 5.0 + 32
    elif to_c == "℃":
        return in_celsius
    else:
        raise ValueError(f"不支持的目标温度单位：{to_c}")


def detect_temp_unit_mix(conditions) -> Tuple[bool, Dict[str, Any]]:
    """检测一批反应条件中是否存在温度单位混用情况。
    conditions: 具有 condition_name/unit/normalized_unit 属性的对象列表
    """
    temp_conditions = [
        c for c in conditions
        if c.condition_name and ("温度" in c.condition_name or "temp" in c.condition_name.lower())
    ]
    if not temp_conditions:
        return False, {}

    units_used = set()
    detail_list = []
    for tc in temp_conditions:
        u = tc.unit or "(未填)"
        units_used.add(u)
        detail_list.append({
            "condition_name": tc.condition_name,
            "value": tc.condition_value,
            "unit": u,
            "normalized_unit": tc.normalized_unit,
            "normalized_value": tc.normalized_value,
            "is_missing": tc.is_unit_missing,
            "is_mismatch": tc.is_unit_mismatch,
            "issue": tc.issue_description,
        })

    has_mix = len(units_used) > 1 or any(c.is_unit_missing or c.is_unit_mismatch for c in temp_conditions)

    return has_mix, {
        "units_used": sorted(list(units_used)),
        "conditions": detail_list,
        "summary": (
            f"共{len(temp_conditions)}项温度条件，"
            f"使用了{len(units_used)}种单位({', '.join(sorted(units_used))})，"
            f"已统一归一化为{STANDARD_TEMP_UNIT}"
        ),
    }
