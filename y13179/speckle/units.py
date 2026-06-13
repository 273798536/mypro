from typing import Tuple, List

LENGTH_UNITS = {
    "m": 1.0,
    "meter": 1.0,
    "meters": 1.0,
    "cm": 0.01,
    "centimeter": 0.01,
    "centimeters": 0.01,
    "mm": 0.001,
    "millimeter": 0.001,
    "millimeters": 0.001,
    "um": 1e-6,
    "μm": 1e-6,
    "micron": 1e-6,
    "microns": 1e-6,
    "nm": 1e-9,
    "nanometer": 1e-9,
}

POWER_UNITS = {
    "w": 1.0,
    "watt": 1.0,
    "watts": 1.0,
    "mw": 1e-3,
    "milliwatt": 1e-3,
    "milliwatts": 1e-3,
    "uw": 1e-6,
    "μw": 1e-6,
    "microwatt": 1e-6,
    "microwatts": 1e-6,
    "nw": 1e-9,
    "nanowatt": 1e-9,
}

UNIT_CATEGORIES = [
    ("长度", LENGTH_UNITS, "mm"),
    ("光功率", POWER_UNITS, "mW"),
]


def detect_category(unit_str: str):
    unit_lower = unit_str.strip().lower()
    for cat_name, unit_map, target in UNIT_CATEGORIES:
        if unit_lower in unit_map:
            return cat_name, unit_map, target
    return None, None, None


def normalize_unit(value: float, unit_str: str) -> Tuple[float, str, List[str]]:
    steps = []
    original = f"{value} {unit_str}"
    steps.append(f"[单位识别] 原始输入 = {original}")

    category, unit_map, target_unit = detect_category(unit_str)
    if category is None:
        steps.append(f"[单位警告] 未知单位 '{unit_str}'，按原样保留（不做换算）")
        return value, unit_str, steps

    unit_lower = unit_str.strip().lower()
    src_factor = unit_map[unit_lower]
    dst_factor = unit_map[target_unit.lower()]
    ratio = src_factor / dst_factor

    steps.append(f"[分类归属] {category}类，基准单位 = {target_unit}")
    steps.append(f"[换算系数] 1 {unit_str} = {src_factor / dst_factor:.6g} {target_unit}")

    if abs(src_factor - dst_factor) > 1e-12:
        normalized = value * ratio
        steps.append(f"[数量级校正] {value} × {ratio:.6g} = {normalized:.6g} {target_unit}")
        if ratio >= 1000 or ratio <= 0.001:
            steps.append(f"[混写提示] ⚠ 数量级差达到 {ratio:.6g} 倍，确认是否单位书写混写")
    else:
        normalized = value
        steps.append(f"[单位一致] 无需换算，结果 = {normalized} {target_unit}")

    steps.append(f"[归一化结果] {original}  →  {normalized:.6g} {target_unit}")
    return normalized, target_unit, steps


def format_steps(steps: List[str], indent: str = "  ") -> str:
    return "\n".join(f"{indent}{s}" for s in steps)
