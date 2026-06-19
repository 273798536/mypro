import pandas as pd
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import hashlib


FIELD_ALIASES = {
    "source": ["来源", "source", "数据来源", "origin", "样本来源", "data_source"],
    "status": ["处理状态", "状态", "status", "处理结果", "state", "review_status"],
    "label": ["标签", "label", "分类标签", "tag", "审查标签", "review_label"],
    "original_label": ["原始标签", "原标签", "original_label", "旧标签", "模型旧标签"],
    "new_label": ["新标签", "复核标签", "new_label", "新模型标签", "review_result"],
    "sample_id": ["样本ID", "样本编号", "id", "sample_id", "编号", "记录ID"],
    "content": ["内容", "文本", "content", "正文", "样本内容", "code", "代码片段"],
    "risk_level": ["风险等级", "风险级别", "risk_level", "level", "严重程度"],
    "reason": ["理由", "原因", "reason", "说明", "判断依据", "判定理由"],
    "reviewer": ["复核人", "审查人", "reviewer", "处理人", "操作人"],
    "review_time": ["复核时间", "处理时间", "review_time", "时间", "更新时间"],
    "conflict_flag": ["标签冲突", "冲突标记", "conflict_flag", "is_conflict", "是否冲突"],
    "evidence_ref": ["证据引用", "引用", "evidence_ref", "reference", "证据链接"],
    "remark": ["备注", "remark", "说明", "补充说明", "comment"],
}

REQUIRED_FIELDS = ["source", "status"]


@dataclass
class SampleRecord:
    sample_id: str
    source: str
    status: str
    label: str = ""
    original_label: str = ""
    new_label: str = ""
    content: str = ""
    risk_level: str = ""
    reason: str = ""
    reviewer: str = ""
    review_time: str = ""
    conflict_flag: bool = False
    conflict_detail: str = ""
    evidence_ref: str = ""
    remark: str = ""
    raw_fields: Dict[str, str] = field(default_factory=dict)
    field_mapping: Dict[str, str] = field(default_factory=dict)


@dataclass
class FieldMappingResult:
    mapping: Dict[str, str]
    missing_required: List[str]
    unmapped_columns: List[str]
    ambiguous_fields: List[Tuple[str, List[str]]]


def detect_field_mapping(columns: List[str]) -> FieldMappingResult:
    mapping = {}
    unmapped = []
    ambiguous = []

    col_lower_map = {col.lower().strip(): col for col in columns}

    for standard_field, aliases in FIELD_ALIASES.items():
        matched = []
        for alias in aliases:
            alias_lower = alias.lower().strip()
            for col_lower, original_col in col_lower_map.items():
                if alias_lower == col_lower or alias_lower in col_lower:
                    if original_col not in matched:
                        matched.append(original_col)
        if len(matched) == 1:
            mapping[standard_field] = matched[0]
        elif len(matched) > 1:
            ambiguous.append((standard_field, matched))
            mapping[standard_field] = matched[0]

    mapped_cols = set(mapping.values())
    for col in columns:
        if col not in mapped_cols:
            unmapped.append(col)

    missing_required = [f for f in REQUIRED_FIELDS if f not in mapping]

    return FieldMappingResult(
        mapping=mapping,
        missing_required=missing_required,
        unmapped_columns=unmapped,
        ambiguous_fields=ambiguous,
    )


def load_sample_table(file_path: str) -> Tuple[List[SampleRecord], FieldMappingResult]:
    if file_path.endswith(".csv"):
        df = pd.read_csv(file_path, dtype=str)
    elif file_path.endswith(".xlsx") or file_path.endswith(".xls"):
        df = pd.read_excel(file_path, dtype=str)
    else:
        raise ValueError(f"不支持的文件格式: {file_path}")

    df = df.fillna("")
    mapping_result = detect_field_mapping(list(df.columns))

    records = []
    for idx, row in df.iterrows():
        raw = {col: str(row[col]) for col in df.columns}

        def get_val(field_name):
            if field_name in mapping_result.mapping:
                col = mapping_result.mapping[field_name]
                return str(row.get(col, "")).strip()
            return ""

        sample_id = get_val("sample_id") or f"AUTO-{idx:04d}"
        conflict_flag_str = get_val("conflict_flag").lower()
        conflict_flag = conflict_flag_str in ["是", "true", "1", "yes", "有", "冲突"]

        original_label = get_val("original_label") or get_val("label")
        new_label = get_val("new_label") or get_val("label")

        if original_label and new_label and original_label != new_label:
            conflict_flag = True
            conflict_detail = (
                f"原始标签「{original_label}」与新标签「{new_label}」不一致"
            )
        else:
            conflict_detail = get_val("reason") or ""

        record = SampleRecord(
            sample_id=sample_id,
            source=get_val("source") or "未知来源",
            status=get_val("status") or "待处理",
            label=get_val("label"),
            original_label=original_label,
            new_label=new_label,
            content=get_val("content"),
            risk_level=get_val("risk_level"),
            reason=get_val("reason"),
            reviewer=get_val("reviewer"),
            review_time=get_val("review_time"),
            conflict_flag=conflict_flag,
            conflict_detail=conflict_detail,
            evidence_ref=get_val("evidence_ref"),
            remark=get_val("remark"),
            raw_fields=raw,
            field_mapping=mapping_result.mapping,
        )
        records.append(record)

    return records, mapping_result
