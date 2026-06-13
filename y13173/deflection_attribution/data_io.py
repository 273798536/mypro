"""数据导入导出。

支持：
- 从CSV导入实验记录（自动字段映射）
- 导出带标记的CSV明细（筛选、详情都留标记）
- 状态持久化（JSON）
"""

import csv
import json
import os
from typing import List, Dict, Any, Optional

from .models import DeflectionRecord, ProcessStatus, AttributionSummary
from .field_mapper import (
    parse_csv_file,
    parse_csv_content,
    map_record,
    safe_float,
)


EXPORT_COLUMNS = [
    ("record_id", "记录ID"),
    ("source_file", "来源文件"),
    ("source_line", "来源行号"),
    ("beam_id", "梁号"),
    ("measure_point", "测点"),
    ("measure_time", "测量时间"),
    ("design_value", "设计值"),
    ("measured_value", "实测值"),
    ("deflection_value", "挠度值"),
    ("deflection_ratio", "挠度比"),
    ("material_name", "材料名称"),
    ("material_batch", "材料批号"),
    ("construction_team", "施工班组"),
    ("is_sampling_gap", "是否采样缺口"),
    ("gap_reason", "缺口原因"),
    ("is_extreme", "是否极端值"),
    ("extreme_reason", "极端值原因"),
    ("attribution", "归因分类"),
    ("attribution_detail", "归因详情"),
    ("risk_level", "风险等级"),
    ("status", "处理状态"),
    ("status_note", "状态说明"),
]


def load_records_from_csv(file_path: str) -> List[DeflectionRecord]:
    """从CSV文件加载记录。

    自动进行字段映射，保留原始数据以便追溯。
    """
    raw_records, mapping, header = parse_csv_file(file_path)

    records = []
    for raw in raw_records:
        mapped = map_record(raw, mapping)
        record = DeflectionRecord()
        record.source_file = os.path.basename(raw.get("_source_file", file_path))
        record.source_line = raw.get("_source_line", 0)

        record.beam_id = str(mapped.get("beam_id", "") or "")
        record.measure_point = str(mapped.get("measure_point", "") or "")
        record.measure_time = str(mapped.get("measure_time", "") or "")

        record.design_value = safe_float(mapped.get("design_value"))
        record.measured_value = safe_float(mapped.get("measured_value"))
        record.deflection_value = safe_float(mapped.get("deflection_value"))
        record.deflection_ratio = safe_float(mapped.get("deflection_ratio"))

        record.material_name = str(mapped.get("material_name", "") or "")
        record.material_batch = str(mapped.get("material_batch", "") or "")
        record.construction_team = str(mapped.get("construction_team", "") or "")

        if record.deflection_ratio is None and record.design_value and record.measured_value:
            if record.design_value != 0:
                record.deflection_ratio = record.measured_value / record.design_value

        if record.deflection_value is None and record.design_value and record.measured_value:
            record.deflection_value = record.measured_value - record.design_value

        record.raw_data = {
            "original_header": header,
            "field_mapping": mapping,
            "original_row": {k: v for k, v in raw.items() if not k.startswith("_")},
            "_extra": mapped.get("_extra", {}),
        }

        records.append(record)

    return records


def load_records_from_csvs(file_paths: List[str]) -> List[DeflectionRecord]:
    """从多个CSV文件加载记录。"""
    all_records = []
    for fp in file_paths:
        all_records.extend(load_records_from_csv(fp))
    return all_records


def export_records_to_csv(records: List[DeflectionRecord], output_path: str) -> str:
    """导出记录到CSV。

    所有标记字段（is_sampling_gap, is_extreme等）都会保留。
    返回输出文件路径。
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_path)) or ".", exist_ok=True)

    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([col[1] for col in EXPORT_COLUMNS])

        for record in records:
            row = []
            for field_name, _ in EXPORT_COLUMNS:
                value = getattr(record, field_name, "")
                if isinstance(value, bool):
                    value = "是" if value else "否"
                elif value is None:
                    value = ""
                row.append(value)
            writer.writerow(row)

    return output_path


def filter_records(
    records: List[DeflectionRecord],
    only_gaps: bool = False,
    only_extremes: bool = False,
    only_need_evidence: bool = False,
    min_risk: Optional[str] = None,
    attribution: Optional[str] = None,
    beam_id: Optional[str] = None,
) -> List[DeflectionRecord]:
    """筛选记录。

    所有筛选条件可组合，所有结果都保留原始标记。
    """
    result = records

    if only_gaps:
        result = [r for r in result if r.is_sampling_gap]

    if only_extremes:
        result = [r for r in result if r.is_extreme]

    if only_need_evidence:
        result = [r for r in result if r.status == ProcessStatus.NEED_EVIDENCE]

    if min_risk:
        risk_order = ["低风险", "中风险", "高风险", "极端风险"]
        try:
            min_idx = risk_order.index(min_risk)
            result = [r for r in result if risk_order.index(r.risk_level.value) >= min_idx]
        except ValueError:
            pass

    if attribution:
        result = [r for r in result if r.attribution.value == attribution]

    if beam_id:
        result = [r for r in result if beam_id in r.beam_id]

    return result


def save_state(records: List[DeflectionRecord], state_path: str) -> str:
    """保存处理状态到JSON文件。"""
    data = [r.to_dict() for r in records]
    os.makedirs(os.path.dirname(os.path.abspath(state_path)) or ".", exist_ok=True)
    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return state_path


def load_state(state_path: str) -> List[DeflectionRecord]:
    """从JSON文件加载处理状态。"""
    with open(state_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return [DeflectionRecord.from_dict(d) for d in data]


def get_record_detail(record: DeflectionRecord) -> Dict[str, Any]:
    """获取单条记录的详细信息（含追溯线索）。"""
    detail = record.to_dict()
    detail["raw_data_preview"] = {
        "source_file": record.source_file,
        "source_line": record.source_line,
        "original_fields": list(record.raw_data.get("original_row", {}).keys()),
        "field_mapping": record.raw_data.get("field_mapping", {}),
    }
    return detail
