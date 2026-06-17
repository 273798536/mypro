"""字段名兼容处理模块
处理不同版本说明中字段名不一致的问题，确保来源和处理状态等关键字段能被正确识别。
"""

import pandas as pd
from typing import Dict, List, Optional, Tuple
from replay.config import get_field_aliases


STANDARD_FIELDS = [
    "record_id", "source", "status", "question", "answer",
    "label", "prediction", "score"
]


def find_matching_column(df_columns: List[str], aliases: List[str]) -> Optional[str]:
    """在 DataFrame 列中查找匹配别名的列名"""
    for alias in aliases:
        for col in df_columns:
            if str(col).strip().lower() == alias.strip().lower():
                return col
    return None


def normalize_columns(df: pd.DataFrame, config: Dict) -> Tuple[pd.DataFrame, Dict[str, Optional[str]]]:
    """
    标准化列名，将不同版本的字段名映射到标准字段。
    返回标准化后的 DataFrame 和字段映射关系。
    """
    column_mapping = {}
    columns = list(df.columns)

    for field_type in STANDARD_FIELDS:
        aliases = get_field_aliases(config, field_type)
        matched_col = find_matching_column(columns, aliases)
        column_mapping[field_type] = matched_col

    rename_map = {}
    for standard_name, actual_name in column_mapping.items():
        if actual_name and actual_name != standard_name:
            rename_map[actual_name] = standard_name

    if rename_map:
        df = df.rename(columns=rename_map)

    return df, column_mapping


def ensure_required_fields(df: pd.DataFrame, column_mapping: Dict[str, Optional[str]]) -> Tuple[pd.DataFrame, List[str]]:
    """
    确保关键字段（来源、处理状态）存在，缺失则填充默认值并记录警告。
    返回处理后的 DataFrame 和警告列表。
    """
    warnings = []
    required_fields = {
        "source": "未知来源",
        "status": "待处理",
        "record_id": None
    }

    for field, default in required_fields.items():
        if field not in df.columns:
            if default is not None:
                df[field] = default
                warnings.append(f"字段 '{field}' 缺失，已填充默认值 '{default}'")
            else:
                df[field] = df.index.astype(str)
                warnings.append(f"字段 '{field}' 缺失，已使用行号作为ID")

    return df, warnings


def get_field_presence_summary(column_mapping: Dict[str, Optional[str]]) -> Dict[str, str]:
    """获取字段存在情况的汇总信息"""
    summary = {}
    for field, col in column_mapping.items():
        summary[field] = "✓ 已识别" if col else "✗ 缺失"
    return summary
