"""字段名自适应映射。

处理复核人提交的实验记录字段名不一致的问题。
通过同义词映射和模糊匹配，将不同来源的字段名统一到标准字段。
"""

import csv
import io
from typing import Dict, List, Optional, Tuple, Any
import re


STANDARD_FIELD_MAP: Dict[str, List[str]] = {
    "beam_id": [
        "beam_id", "梁号", "梁编号", "梁体编号", "梁ID", "beam", "梁名",
        "构件编号", "构件号", "girder_id", "girder"
    ],
    "measure_point": [
        "measure_point", "测点", "测量点", "测点编号", "截面位置",
        "位置", "position", "point", "measuring_point"
    ],
    "measure_time": [
        "measure_time", "测量时间", "时间", "检测日期", "日期",
        "time", "date", "检测时间", "观测时间"
    ],
    "design_value": [
        "design_value", "设计值", "设计挠度", "理论值", "计算值",
        "design", "theoretical_value"
    ],
    "measured_value": [
        "measured_value", "实测值", "测量值", "实测挠度", "观测值",
        "measured", "measurement", "actual_value"
    ],
    "deflection_value": [
        "deflection_value", "挠度值", "挠度", "变形值", "扰度",
        "deflection", "deformation"
    ],
    "deflection_ratio": [
        "deflection_ratio", "挠度比", "挠度系数", "相对挠度",
        "比值", "ratio", "relative_deflection"
    ],
    "material_name": [
        "material_name", "材料名称", "材料", "材质", "材料名",
        "material", "材料牌号"
    ],
    "material_batch": [
        "material_batch", "材料批号", "批号", "批次", "炉号",
        "batch", "batch_no", "材料批次"
    ],
    "construction_team": [
        "construction_team", "施工班组", "施工队", "班组",
        "team", "施工单位", "作业队"
    ],
}


def _normalize_name(name: str) -> str:
    """归一化字段名：去空格、转小写、统一标点。"""
    name = name.strip().lower()
    name = re.sub(r"[\s_\-]+", "", name)
    return name


def build_field_mapping(header: List[str]) -> Dict[str, str]:
    """根据CSV表头构建字段映射。

    返回 {标准字段名: 原始字段名} 的映射。
    未匹配到的标准字段不会出现在结果中。
    """
    normalized_header = {_normalize_name(h): h for h in header}
    mapping: Dict[str, str] = {}

    for standard_field, aliases in STANDARD_FIELD_MAP.items():
        for alias in aliases:
            normalized_alias = _normalize_name(alias)
            if normalized_alias in normalized_header:
                mapping[standard_field] = normalized_header[normalized_alias]
                break

    return mapping


def parse_csv_file(file_path: str) -> Tuple[List[Dict[str, Any]], Dict[str, str], List[str]]:
    """解析CSV文件，返回原始记录列表、字段映射、原始表头。

    Returns:
        (records, field_mapping, header)
    """
    with open(file_path, "r", encoding="utf-8-sig", newline="") as f:
        content = f.read()

    return parse_csv_content(content, file_path)


def parse_csv_content(content: str, source_name: str = "unknown") -> Tuple[List[Dict[str, Any]], Dict[str, str], List[str]]:
    """解析CSV内容字符串。"""
    reader = csv.DictReader(io.StringIO(content))
    header = reader.fieldnames or []
    mapping = build_field_mapping(header)

    records = []
    for i, row in enumerate(reader, start=2):
        record = dict(row)
        record["_source_file"] = source_name
        record["_source_line"] = i
        records.append(record)

    return records, mapping, header


def map_record(raw_record: Dict[str, Any], mapping: Dict[str, str]) -> Dict[str, Any]:
    """根据映射将原始记录转换为标准字段记录。

    返回标准字段名到值的映射，未匹配的字段包含在 _extra 中。
    """
    result: Dict[str, Any] = {}
    mapped_fields = set()

    for standard_field, raw_field in mapping.items():
        if raw_field in raw_record:
            result[standard_field] = raw_record[raw_field]
            mapped_fields.add(raw_field)

    extra = {}
    for key, value in raw_record.items():
        if key not in mapped_fields and not key.startswith("_"):
            extra[key] = value
    result["_extra"] = extra
    result["_source_file"] = raw_record.get("_source_file", "")
    result["_source_line"] = raw_record.get("_source_line", 0)

    return result


def get_unmapped_fields(header: List[str], mapping: Dict[str, str]) -> List[str]:
    """获取未被映射的字段列表。"""
    mapped_raw_fields = set(mapping.values())
    return [h for h in header if h not in mapped_raw_fields]


def safe_float(value: Any) -> Optional[float]:
    """安全转换为浮点数。"""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    try:
        s = str(value).strip()
        if not s:
            return None
        s = s.replace(",", "").replace(" ", "")
        return float(s)
    except (ValueError, TypeError):
        return None
