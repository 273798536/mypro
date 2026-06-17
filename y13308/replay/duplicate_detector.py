"""重复评测样本检测与标记模块"""

import pandas as pd
from typing import List, Dict, Set, Tuple
from replay.config import load_config


def detect_duplicates(
    df: pd.DataFrame,
    id_field: str = "record_id",
    question_field: str = "question"
) -> Tuple[pd.DataFrame, Dict[str, List[int]]]:
    """
    检测重复评测样本。
    判断标准：相同样本ID 或 相同问题内容。
    返回标记后的 DataFrame 和重复分组信息。
    """
    df = df.copy()
    df["_is_duplicate"] = False
    duplicate_groups: Dict[str, List[int]] = {}

    id_counts = df[id_field].value_counts()
    duplicate_ids = id_counts[id_counts > 1].index.tolist()

    for dup_id in duplicate_ids:
        indices = df[df[id_field] == dup_id].index.tolist()
        if len(indices) > 1:
            df.loc[indices, "_is_duplicate"] = True
            key = f"ID:{dup_id}"
            duplicate_groups[key] = indices

    if question_field in df.columns:
        q_counts = df[question_field].value_counts()
        duplicate_questions = q_counts[q_counts > 1].index.tolist()
        for dup_q in duplicate_questions:
            indices = df[df[question_field] == dup_q].index.tolist()
            if len(indices) > 1:
                df.loc[indices, "_is_duplicate"] = True
                key = f"问题:{str(dup_q)[:30]}..."
                duplicate_groups[key] = duplicate_groups.get(key, []) + indices

    return df, duplicate_groups


def mark_duplicates_in_records(records: List, df: pd.DataFrame) -> List:
    """将重复标记同步到记录列表"""
    for i, record in enumerate(records):
        if i < len(df) and df.iloc[i].get("_is_duplicate", False):
            record.is_duplicate = True
            if "重复评测" not in record.notes:
                record.notes.append("重复评测样本")
    return records


def get_duplicate_summary(duplicate_groups: Dict[str, List[int]]) -> Dict:
    """生成重复评测汇总信息"""
    total_duplicate_rows = sum(len(v) for v in duplicate_groups.values())
    return {
        "重复组数": len(duplicate_groups),
        "涉及行数": total_duplicate_rows,
        "分组详情": duplicate_groups
    }
