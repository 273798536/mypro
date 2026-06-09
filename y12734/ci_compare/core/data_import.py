"""数据导入与快照管理模块

功能：
- 支持 Excel (.xlsx/.xls) 和 CSV 格式导入
- 每次导入生成快照，保存原始数据和计算结果
- 支持版本对比，识别晚到错题、评分补录
"""
from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any

import pandas as pd

from .models import (
    StudentAnswer,
    DatasetSnapshot,
    SnapshotDiff,
    ScoreRecord,
)


SNAPSHOTS_DIR = Path(__file__).resolve().parent.parent.parent / "snapshots"
SNAPSHOTS_DIR.mkdir(exist_ok=True)


# ---------- 列名映射（兼容不同的导入格式） ----------

_COLUMN_ALIASES = {
    "student_id": ["student_id", "学生ID", "学号", "student", "sid"],
    "question_id": ["question_id", "题目ID", "题号", "question", "qid"],
    "is_correct": ["is_correct", "是否正确", "正确", "对错", "correct"],
    "score": ["score", "得分", "分数"],
    "answer_time": ["answer_time", "答题时间", "提交时间", "time"],
    "tags": ["tags", "标签", "知识点", "tag"],
    "record_id": ["record_id", "记录ID", "record"],
}


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """将各种命名风格的列名统一为标准列名"""
    rename_map = {}
    lower_cols = {str(c).strip().lower(): c for c in df.columns}
    for std_name, aliases in _COLUMN_ALIASES.items():
        for alias in aliases:
            key = alias.strip().lower()
            if key in lower_cols:
                rename_map[lower_cols[key]] = std_name
                break
    return df.rename(columns=rename_map)


def _parse_tags(tag_val: Any) -> List[str]:
    """解析标签字段，支持逗号/分号/竖线分隔的字符串，或列表"""
    if tag_val is None or (isinstance(tag_val, float) and pd.isna(tag_val)):
        return []
    if isinstance(tag_val, list):
        return [str(t).strip() for t in tag_val if str(t).strip()]
    s = str(tag_val).strip()
    if not s:
        return []
    for sep in [",", ";", "|", "、"]:
        if sep in s:
            return [p.strip() for p in s.split(sep) if p.strip()]
    return [s]


def _parse_bool(val: Any) -> Optional[bool]:
    """解析是否正确字段"""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        if val == 1:
            return True
        if val == 0:
            return False
    s = str(val).strip().lower()
    if s in {"1", "1.0", "true", "t", "yes", "y", "对", "正确", "是"}:
        return True
    if s in {"0", "0.0", "false", "f", "no", "n", "错", "错误", "否"}:
        return False
    return None


def _parse_datetime(val: Any) -> Optional[datetime]:
    """解析时间字段"""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    if isinstance(val, datetime):
        return val
    try:
        return pd.to_datetime(val).to_pydatetime()
    except Exception:
        return None


def _parse_score(val: Any) -> Optional[float]:
    """解析得分字段"""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


# ---------- 主要导入函数 ----------

def load_dataframe(file_path: str | Path) -> pd.DataFrame:
    """读取 Excel 或 CSV 文件为 DataFrame"""
    path = Path(file_path)
    suffix = path.suffix.lower()
    if suffix in {".xlsx", ".xls"}:
        return pd.read_excel(path)
    elif suffix == ".csv":
        return pd.read_csv(path)
    else:
        raise ValueError(f"不支持的文件格式: {suffix}，仅支持 .xlsx/.xls/.csv")


def dataframe_to_answers(df: pd.DataFrame) -> List[StudentAnswer]:
    """将 DataFrame 转换为 StudentAnswer 列表"""
    df = _normalize_columns(df.copy())
    answers: List[StudentAnswer] = []

    required_cols = {"student_id", "question_id"}
    if not required_cols.issubset(set(df.columns)):
        raise ValueError(
            f"导入数据缺少必要列: {required_cols - set(df.columns)}。"
            f"当前列: {list(df.columns)}"
        )

    for _, row in df.iterrows():
        ans = StudentAnswer(
            student_id=str(row.get("student_id", "")).strip(),
            question_id=str(row.get("question_id", "")).strip(),
            is_correct=_parse_bool(row.get("is_correct")),
            score=_parse_score(row.get("score")),
            answer_time=_parse_datetime(row.get("answer_time")),
            tags=_parse_tags(row.get("tags")),
        )
        if row.get("record_id"):
            ans.record_id = str(row["record_id"]).strip()
        answers.append(ans)

    return answers


def load_answers(file_path: str | Path) -> List[StudentAnswer]:
    """从文件直接加载答题记录"""
    df = load_dataframe(file_path)
    return dataframe_to_answers(df)


def apply_score_records(
    answers: List[StudentAnswer],
    score_records: List[ScoreRecord],
) -> List[StudentAnswer]:
    """将评分补录应用到答题记录上

    返回更新后的答题记录列表（不修改原列表）。
    """
    record_map = {a.record_id: a for a in answers}
    updated = []
    for ans in answers:
        updated.append(StudentAnswer(**{
            **ans.__dict__,
            "tags": list(ans.tags),
        }))
    updated_map = {a.record_id: a for a in updated}

    for sr in score_records:
        if sr.record_id in updated_map:
            a = updated_map[sr.record_id]
            a.is_correct = sr.is_correct
            if sr.score is not None:
                a.score = sr.score

    return updated


# ---------- 快照管理 ----------

def _snapshot_path(snapshot_id: str) -> Path:
    return SNAPSHOTS_DIR / f"{snapshot_id}.json"


def save_snapshot(
    answers: List[StudentAnswer],
    source_name: str = "",
    description: str = "",
) -> DatasetSnapshot:
    """保存答题记录快照

    Returns:
        快照元数据
    """
    snapshot = DatasetSnapshot(
        source_name=source_name,
        record_count=len(answers),
        description=description,
    )
    data = {
        "snapshot": snapshot.to_dict(),
        "answers": [a.to_dict() for a in answers],
    }
    with open(_snapshot_path(snapshot.snapshot_id), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return snapshot


def load_snapshot(snapshot_id: str) -> Tuple[DatasetSnapshot, List[StudentAnswer]]:
    """加载指定快照

    Returns:
        (快照元数据, 答题记录列表)
    """
    path = _snapshot_path(snapshot_id)
    if not path.exists():
        raise FileNotFoundError(f"快照不存在: {snapshot_id}")

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    snap_data = data["snapshot"]
    snapshot = DatasetSnapshot(
        snapshot_id=snap_data["snapshot_id"],
        created_at=datetime.fromisoformat(snap_data["created_at"]),
        source_name=snap_data.get("source_name", ""),
        record_count=snap_data.get("record_count", 0),
        description=snap_data.get("description", ""),
    )

    answers = []
    for a_data in data["answers"]:
        ans = StudentAnswer(
            student_id=a_data["student_id"],
            question_id=a_data["question_id"],
            is_correct=a_data.get("is_correct"),
            score=a_data.get("score"),
            answer_time=datetime.fromisoformat(a_data["answer_time"]) if a_data.get("answer_time") else None,
            tags=a_data.get("tags", []),
            record_id=a_data.get("record_id"),
        )
        answers.append(ans)

    return snapshot, answers


def list_snapshots() -> List[DatasetSnapshot]:
    """列出所有快照的元数据（不加载答题记录）"""
    result: List[DatasetSnapshot] = []
    for f in sorted(SNAPSHOTS_DIR.glob("*.json"), reverse=True):
        try:
            with open(f, "r", encoding="utf-8") as fp:
                data = json.load(fp)
            sd = data["snapshot"]
            result.append(DatasetSnapshot(
                snapshot_id=sd["snapshot_id"],
                created_at=datetime.fromisoformat(sd["created_at"]),
                source_name=sd.get("source_name", ""),
                record_count=sd.get("record_count", 0),
                description=sd.get("description", ""),
            ))
        except Exception:
            continue
    return result


def _ans_key(a: StudentAnswer) -> str:
    """使用 (student_id, question_id) 作为答题记录的稳定复合主键"""
    return f"{a.student_id}__{a.question_id}"


def diff_snapshots(
    old_answers: List[StudentAnswer],
    new_answers: List[StudentAnswer],
) -> SnapshotDiff:
    """对比两个快照，计算差异

    使用 (student_id, question_id) 作为复合主键，避免因 UUID 变化导致误判。
    识别：新增记录、移除记录、评分更新记录，以及受影响的分组。
    """
    old_map = {_ans_key(a): a for a in old_answers}
    new_map = {_ans_key(a): a for a in new_answers}

    old_ids = set(old_map.keys())
    new_ids = set(new_map.keys())

    added_keys = new_ids - old_ids
    removed_keys = old_ids - new_ids
    added = [new_map[k].record_id for k in added_keys]
    removed = [old_map[k].record_id for k in removed_keys]

    updated: List[str] = []
    affected_groups: set = set()

    for key in old_ids & new_ids:
        o = old_map[key]
        n = new_map[key]
        if o.is_correct != n.is_correct or o.score != n.score:
            updated.append(n.record_id)
            affected_groups.add(n.question_id)

    for k in added_keys:
        affected_groups.add(new_map[k].question_id)
    for k in removed_keys:
        affected_groups.add(old_map[k].question_id)

    return SnapshotDiff(
        added_records=sorted(added),
        removed_records=sorted(removed),
        updated_records=sorted(updated),
        affected_groups=sorted(affected_groups),
    )
