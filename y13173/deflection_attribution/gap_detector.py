"""采样缺口检测与标记。

采样缺口指数据缺失、异常值、或样本不连续等情况，
需要在筛选、详情、导出时都保留明确标记。
"""

from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict

from .models import DeflectionRecord, ProcessStatus
from .field_mapper import safe_float


GAP_PATTERNS = [
    "缺口", "缺测", "漏测", "未测", "缺失", "缺", "无数据",
    "gap", "missing", "n/a", "na", "null", "none", "--", "-",
    "异常", "可疑", "无效", "坏点", "弃用",
]


def detect_sampling_gap(record: DeflectionRecord) -> Tuple[bool, str]:
    """检测单条记录是否为采样缺口。

    Returns:
        (is_gap, gap_reason)
    """
    reasons = []

    if record.deflection_value is None and record.measured_value is None:
        reasons.append("挠度值和实测值均为空")

    if record.deflection_value is not None and record.deflection_value == 0:
        reasons.append("挠度值为0，疑似缺测")

    if record.measure_time and any(p in str(record.measure_time).lower() for p in GAP_PATTERNS):
        reasons.append("测量时间字段含缺口标记")

    material_str = str(record.material_name).lower()
    if any(p in material_str for p in ["缺口", "缺测", "缺失", "gap", "missing"]):
        reasons.append("材料名称含缺口标记")

    raw_str = " ".join(str(v) for v in record.raw_data.values()).lower()
    for pattern in GAP_PATTERNS:
        if pattern in raw_str and pattern not in ["-", "null"]:
            reasons.append(f"原始数据含关键词[{pattern}]")
            break

    if "_extra" in record.raw_data:
        extra = record.raw_data["_extra"]
        if isinstance(extra, dict):
            for key, val in extra.items():
                if any(p in str(key).lower() for p in ["备注", "note", "remark", "说明"]):
                    if any(p in str(val).lower() for p in GAP_PATTERNS):
                        reasons.append(f"备注字段[{key}]标注缺口")
                        break

    is_gap = len(reasons) > 0
    gap_reason = "; ".join(reasons) if reasons else ""
    return is_gap, gap_reason


def mark_sampling_gaps(records: List[DeflectionRecord]) -> List[DeflectionRecord]:
    """批量标记采样缺口。"""
    for record in records:
        is_gap, reason = detect_sampling_gap(record)
        record.is_sampling_gap = is_gap
        record.gap_reason = reason
        if is_gap and record.status == ProcessStatus.PENDING:
            record.status = ProcessStatus.NEED_EVIDENCE
            record.status_note = reason if reason else "采样缺口待确认"
    return records


def find_sequence_gaps(records: List[DeflectionRecord]) -> List[Dict[str, Any]]:
    """检测序列中的连续性缺口（按梁号+测点分组）。

    返回缺失的测点位置信息。
    """
    groups: Dict[str, List[DeflectionRecord]] = defaultdict(list)
    for r in records:
        key = f"{r.beam_id}_{r.measure_point}"
        groups[key].append(r)

    gaps = []
    for key, group_records in groups.items():
        valid_points = [r for r in group_records if not r.is_sampling_gap and r.measure_point]
        if len(valid_points) < 2:
            continue

        try:
            positions = sorted(set(float(safe_float(r.measure_point) or 0) for r in valid_points))
        except (ValueError, TypeError):
            continue

        if len(positions) < 2:
            continue

        step = positions[1] - positions[0]
        if step <= 0:
            continue

        expected = positions[0]
        for actual in positions:
            while actual - expected > step * 0.5:
                gaps.append({
                    "beam_id": key.split("_")[0],
                    "measure_point": expected,
                    "gap_type": "序列不连续",
                    "detail": f"测点{expected}缺失，前序测点{expected-step}，后续测点{actual}",
                })
                expected += step
            expected = actual + step

    return gaps


def gap_summary(records: List[DeflectionRecord]) -> Dict[str, Any]:
    """生成缺口统计摘要。"""
    gap_records = [r for r in records if r.is_sampling_gap]
    by_reason: Dict[str, int] = defaultdict(int)
    for r in gap_records:
        reason = r.gap_reason or "未标注原因"
        by_reason[reason.split(";")[0]] += 1

    return {
        "total_gap_count": len(gap_records),
        "gap_ratio": len(gap_records) / len(records) if records else 0,
        "by_reason": dict(by_reason),
        "gap_record_ids": [r.record_id for r in gap_records],
    }
