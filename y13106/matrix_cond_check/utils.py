import csv
import os
from typing import List, Dict, Any, Optional


def safe_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip()
    if s == "" or s.lower() in ("nan", "none", "null", "na", "n/a"):
        return None
    try:
        return float(s.replace(",", ""))
    except (ValueError, TypeError):
        return None


def load_csv(file_path: str) -> List[Dict[str, Any]]:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"文件不存在: {file_path}")
    rows = []
    with open(file_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=2):
            row["__source_line__"] = i
            row["__source_file__"] = os.path.basename(file_path)
            rows.append(row)
    return rows


def normalize_field_name(name: str) -> str:
    return (
        name.strip()
        .lower()
        .replace(" ", "_")
        .replace("（", "(")
        .replace("）", ")")
    )


FIELD_ALIASES = {
    "matrix_name": ["矩阵名称", "matrix", "矩阵", "name", "名称"],
    "condition_number": ["条件数", "cond", "condition_number", "cond_number", "条件值"],
    "lower_bound": ["下界", "下限", "lower", "lower_bound", "min"],
    "upper_bound": ["上界", "上限", "upper", "upper_bound", "max"],
    "extrapolation_flag": ["外推标记", "外推", "extrapolation", "is_extrapolated", "外推标志"],
    "calculation_unit": ["单位", "计算单位", "unit", "计量单位"],
    "remark": ["备注", "remark", "说明", "comment"],
}


def resolve_field(row: Dict[str, Any], canonical: str) -> Optional[Any]:
    aliases = FIELD_ALIASES.get(canonical, [canonical])
    normalized = {normalize_field_name(k): v for k, v in row.items()}
    for alias in aliases:
        key = normalize_field_name(alias)
        if key in normalized:
            return normalized[key]
    return None
