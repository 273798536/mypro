from collections import defaultdict
from typing import List, Dict

from .types import SensorRecord, DuplicateInfo


def _guess_reason(records: List[SensorRecord]) -> str:
    vals = [r.normalized_value for r in records]
    max_ratio = max(vals) / min(vals) if min(vals) > 0 else float("inf")

    unit_set = {r.raw_unit for r in records}
    if len(unit_set) > 1:
        return (
            f"同一设备下出现 {len(unit_set)} 种单位 ({', '.join(sorted(unit_set))})，"
            f"疑似单位混写导致数量级差异（最大/最小比值 ≈ {max_ratio:.3g}）"
        )

    if max_ratio >= 100:
        return (
            f"数值最大/最小比值 ≈ {max_ratio:.3g}，疑似重复录入时单位漏标注"
        )

    versions = {r.version for r in records}
    if len(versions) > 1:
        return f"存在 {len(versions)} 个版本 ({', '.join(sorted(versions))})，可能是重测覆盖"

    time_gap_h = abs((records[-1].timestamp - records[0].timestamp).total_seconds()) / 3600
    if time_gap_h > 1:
        return f"首末时间差 {time_gap_h:.1f}h，可能是同设备跨时段多次采集"

    return "重复原因不明，需人工确认是否录入笔误"


def _describe_impact(device_id: str, records: List[SensorRecord]) -> str:
    lines = [
        f"设备 {device_id} 共有 {len(records)} 条重复记录",
        f"  出现行号: {', '.join(str(r.row_index) for r in records)}",
        f"  时间跨度: {records[0].timestamp} ~ {records[-1].timestamp}",
        f"  归一化值范围: {min(r.normalized_value for r in records):.6g} ~ "
        f"{max(r.normalized_value for r in records):.6g} {records[0].normalized_unit}",
    ]
    if any(r.remarks for r in records):
        remark_count = sum(len(r.remarks) for r in records)
        lines.append(f"  备注数量: {remark_count} 条（含历史补记）")
    if any(r.screenshots for r in records):
        shot_count = sum(len(r.screenshots) for r in records)
        versions = sorted({s.version for r in records for s in r.screenshots})
        lines.append(f"  截图数量: {shot_count} 张，版本 {', '.join(versions)}")
    return "\n".join(lines)


def detect_duplicates(records: List[SensorRecord]) -> List[DuplicateInfo]:
    grouped: Dict[str, List[SensorRecord]] = defaultdict(list)
    for r in records:
        grouped[r.device_id].append(r)

    alerts: List[DuplicateInfo] = []
    for device_id, recs in sorted(grouped.items()):
        if len(recs) <= 1:
            continue
        recs_sorted = sorted(recs, key=lambda r: r.timestamp)
        alerts.append(DuplicateInfo(
            device_id=device_id,
            occurrences=[r.row_index for r in recs_sorted],
            timestamps=[r.timestamp for r in recs_sorted],
            values=[r.normalized_value for r in recs_sorted],
            reason_hint=_guess_reason(recs_sorted),
            impact_scope=_describe_impact(device_id, recs_sorted),
        ))
    return alerts
