import re
from mc_verify.models import QuestionItem, UnitTrace, UnitStatus


_KNOWN_UNITS = {
    "m", "cm", "mm", "km", "ft", "in",
    "kg", "g", "mg", "lb", "oz",
    "s", "ms", "min", "h",
    "A", "mA", "V", "mV", "kV",
    "W", "kW", "MW",
    "J", "kJ", "N", "kN",
    "Pa", "kPa", "MPa",
    "m/s", "km/h", "m/s²",
    "Hz", "kHz", "MHz",
    "°C", "°F", "K",
    "mol", "L", "mL",
    "m²", "m³", "cm²", "cm³",
}

_UNIT_PATTERNS = [
    re.compile(r'\d+\s*([a-zA-Z°²³/]+)$'),
    re.compile(r'\d+\s*([a-zA-Z°²³/]+)\s*[,，。；;]'),
]

_CHINESE_UNIT_HINTS = {
    "米": "m", "厘米": "cm", "毫米": "mm", "千米": "km",
    "千克": "kg", "克": "g", "毫克": "mg",
    "秒": "s", "分": "min", "时": "h", "小时": "h",
    "安培": "A", "伏特": "V", "瓦特": "W",
    "焦耳": "J", "牛顿": "N", "帕斯卡": "Pa",
    "摄氏度": "°C", "开尔文": "K",
    "摩尔": "mol", "升": "L", "毫升": "mL",
    "平方米": "m²", "立方米": "m³",
}


def extract_unit_from_value(value_str: str) -> str | None:
    if not value_str or not isinstance(value_str, str):
        return None
    for pattern in _UNIT_PATTERNS:
        m = pattern.search(value_str.strip())
        if m:
            candidate = m.group(1)
            if candidate in _KNOWN_UNITS:
                return candidate
    return None


def extract_unit_from_description(desc: str) -> str | None:
    if not desc or not isinstance(desc, str):
        return None
    for cn, en in _CHINESE_UNIT_HINTS.items():
        if cn in desc:
            return en
    return None


def check_unit(item: QuestionItem) -> UnitTrace:
    original_field = ""
    original_value = None
    expected_unit = None
    actual_unit = None
    detail = ""

    if item.unit:
        return UnitTrace(
            status=UnitStatus.OK,
            original_field="unit",
            original_value=item.unit,
            expected_unit=item.unit,
            actual_unit=item.unit,
            detail="单位字段直接提供",
        )

    for key, val in item.source_fields.items():
        if val is None:
            continue
        val_str = str(val)
        extracted = extract_unit_from_value(val_str)
        if extracted:
            return UnitTrace(
                status=UnitStatus.OK,
                original_field=key,
                original_value=val,
                expected_unit=extracted,
                actual_unit=extracted,
                detail=f"从来源字段 '{key}' 的值中提取到单位 '{extracted}'",
            )

    desc_unit = extract_unit_from_description(item.source_description)
    if desc_unit:
        return UnitTrace(
            status=UnitStatus.MISMATCH,
            original_field="source_description",
            original_value=item.source_description,
            expected_unit=desc_unit,
            actual_unit=None,
            detail=f"题目描述含中文单位提示 '{desc_unit}'，但数值字段缺少对应单位标注",
        )

    missing_fields = []
    for key, val in item.source_fields.items():
        if val is not None:
            missing_fields.append(f"'{key}'={val}")

    detail_parts = []
    if missing_fields:
        detail_parts.append("以下来源字段无法提取单位: " + ", ".join(missing_fields))
    if item.source_description:
        detail_parts.append(f"题目描述: '{item.source_description}'")

    return UnitTrace(
        status=UnitStatus.MISSING,
        original_field=",".join(item.source_fields.keys()) if item.source_fields else "(无来源字段)",
        original_value=item.source_description or "(无描述)",
        expected_unit=None,
        actual_unit=None,
        detail="; ".join(detail_parts) if detail_parts else "无法从任何字段提取单位信息",
    )
