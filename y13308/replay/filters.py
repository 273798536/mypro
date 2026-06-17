"""筛选与详情查看模块"""

from typing import List, Optional, Callable
from replay.models import Record
from replay.constants import PROCESS_STATUS, EVAL_RESULT


def filter_records(
    records: List[Record],
    status: Optional[str] = None,
    eval_result: Optional[str] = None,
    source: Optional[str] = None,
    only_duplicates: bool = False,
    only_outliers: bool = False,
    only_wrong: bool = False
) -> List[Record]:
    """
    多条件筛选记录
    """
    result = list(records)

    if status:
        result = [r for r in result if r.status == status]

    if eval_result:
        result = [r for r in result if r.eval_result == eval_result]

    if source:
        result = [r for r in result if source.lower() in r.source.lower()]

    if only_duplicates:
        result = [r for r in result if r.is_duplicate]

    if only_outliers:
        result = [r for r in result if r.is_outlier]

    if only_wrong:
        result = [r for r in result if r.eval_result == EVAL_RESULT["WRONG"]]

    return result


def get_record_by_id(records: List[Record], record_id: str) -> Optional[Record]:
    """根据 ID 查找单条记录"""
    for rec in records:
        if rec.record_id == record_id:
            return rec
    return None


def group_by_source(records: List[Record]) -> dict:
    """按来源分组"""
    groups = {}
    for rec in records:
        if rec.source not in groups:
            groups[rec.source] = []
        groups[rec.source].append(rec)
    return groups


def group_by_status(records: List[Record]) -> dict:
    """按处理状态分组"""
    groups = {}
    for status in PROCESS_STATUS.values():
        groups[status] = []
    for rec in records:
        if rec.status not in groups:
            groups[rec.status] = []
        groups[rec.status].append(rec)
    return groups


def get_wrong_predictions(records: List[Record]) -> List[Record]:
    """获取所有误判样本"""
    return [r for r in records if r.eval_result == EVAL_RESULT["WRONG"]]


def get_duplicate_records(records: List[Record]) -> List[Record]:
    """获取所有重复评测样本"""
    return [r for r in records if r.is_duplicate]
