"""采样缺口检测与标记。

采样缺口指数据缺失、异常值、或样本不连续等情况，
需要在筛选、详情、导出时都保留明确标记。
"""

from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict

from .models import DeflectionRecord, ProcessStatus
from .field_mapper import safe_float


GAP_PATTERNS_EXACT = {
    "--", "-", "n/a", "na", "null", "none",
    "无", "缺", "空", "",
    "缺测", "漏测", "未测",
}

GAP_PATTERNS_CONTAIN = [
    "缺口", "缺测", "漏测", "未测", "缺失", "无数据",
    "gap", "missing",
    "仪器故障", "补测",
]


def _value_is_gap(value: str) -> bool:
    """判断单个值是否为缺口标记（精确匹配）。"""
    if value is None:
        return True
    s = str(value).strip().lower()
    return s in GAP_PATTERNS_EXACT


def _value_contains_gap(value: str) -> bool:
    """判断值是否包含缺口关键词（包含匹配）。"""
    if value is None:
        return False
    s = str(value).lower()
    return any(p in s for p in GAP_PATTERNS_CONTAIN)


def detect_sampling_gap(record: DeflectionRecord) -> Tuple[bool, str]:
    """检测单条记录是否为采样缺口。

    Returns:
        (is_gap, gap_reason)
    """
    reasons = []

    has_deflection = (
        record.deflection_value is not None
        or record.measured_value is not None
        or record.deflection_ratio is not None
    )
    if not has_deflection:
        reasons.append("挠度相关数据全部为空")

    if record.deflection_value is not None and record.deflection_value == 0:
        if record.deflection_ratio is None or record.deflection_ratio == 0:
            reasons.append("挠度值为0，疑似缺测")

    if _value_is_gap(record.measured_value):
        reasons.append("实测值为缺口标记")

    if _value_contains_gap(str(record.measured_value)) and not _value_is_gap(record.measured_value):
        if str(record.measured_value).strip():
            reasons.append("实测值含缺口关键词")

    if _value_is_gap(record.deflection_value):
        reasons.append("挠度值为缺口标记")

    if _value_is_gap(record.deflection_ratio):
        reasons.append("挠度比为缺口标记")

    material_str = str(record.material_name)
    if _value_contains_gap(material_str):
        reasons.append("材料名称含缺口标记")

    if "original_row" in record.raw_data:
        orig = record.raw_data["original_row"]
        if isinstance(orig, dict):
            for key, val in orig.items():
                key_lower = str(key).lower()
                if any(k in key_lower for k in ["备注", "说明", "note", "remark", "comment"]):
                    val_str = str(val).strip()
                    if val_str and (_value_contains_gap(val_str) or _value_is_gap(val_str)):
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
