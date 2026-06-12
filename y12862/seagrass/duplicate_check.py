"""
重复上报检测模块
船队上次追问到很晚，就是因为报告里只剩一句模糊提醒。
这里必须精确到记录级别：哪条跟哪条重复、重复在什么字段、处理意见是什么。
"""

from collections import defaultdict
from typing import List, Dict, Tuple

from .models import ProcessingRecord, RECORD_STATUS_DUPLICATE, STAGE_DUPLICATE_CHECK


class DuplicateReport:
    """重复上报报告 - 精确到每条记录，不是模糊一句"""

    def __init__(self):
        self.groups: Dict[str, List[ProcessingRecord]] = defaultdict(list)
        self.duplicate_count = 0
        self.unique_count = 0

    @property
    def total_records(self) -> int:
        return self.duplicate_count + self.unique_count

    def summary(self) -> str:
        lines = []
        lines.append("=== 重复上报检测报告 ===")
        lines.append(f"总记录数: {self.total_records}")
        lines.append(f"唯一记录数: {self.unique_count}")
        lines.append(f"重复记录数: {self.duplicate_count}")
        lines.append(f"重复组数: {len(self.groups)}")
        lines.append("")
        lines.append("明细:")
        for fp, group in self.groups.items():
            if len(group) < 2:
                continue
            primary = group[0]
            dups = group[1:]
            lines.append(f"  指纹 {fp[:8]}...  主记录: {primary.record_id} ({primary.vessel_id}, {primary.survey_time.isoformat()})")
            for d in dups:
                lines.append(f"    -> 重复记录: {d.record_id} (状态: {d.status})")
        return "\n".join(lines)

    def as_table(self) -> List[Dict]:
        """输出表格形式，给报告和下载用"""
        rows = []
        for fp, group in self.groups.items():
            if len(group) < 2:
                continue
            primary = group[0]
            for idx, rec in enumerate(group):
                rows.append({
                    "fingerprint": fp,
                    "record_id": rec.record_id,
                    "vessel_id": rec.vessel_id,
                    "survey_time": rec.survey_time.isoformat(),
                    "longitude": round(rec.longitude, 4),
                    "latitude": round(rec.latitude, 4),
                    "role": "primary" if idx == 0 else "duplicate",
                    "duplicate_of": None if idx == 0 else primary.record_id,
                    "status": rec.status,
                })
        return rows


def detect_duplicates(records: List[ProcessingRecord]) -> Tuple[List[ProcessingRecord], DuplicateReport]:
    """
    检测重复上报。
    用指纹（vessel_id + survey_time + 经纬度）判断重复。
    第一条保留，其余标记为 duplicate。

    返回：(处理后的记录列表, 重复报告)
    报告是精确到记录级别的，不是模糊一句提醒。
    """
    report = DuplicateReport()
    seen = {}

    for rec in records:
        fp = rec.fingerprint()
        report.groups[fp].append(rec)

        if fp not in seen:
            seen[fp] = rec
            report.unique_count += 1

            rec.add_opinion(
                stage=STAGE_DUPLICATE_CHECK,
                operator="duplicate_detector",
                opinion="指纹唯一，无重复",
                decision="keep",
                evidence={"fingerprint": fp, "duplicate_group_size": 1}
            )
        else:
            primary = seen[fp]
            rec.status = RECORD_STATUS_DUPLICATE
            rec.duplicate_of = primary.record_id
            rec.add_flag("duplicate")
            report.duplicate_count += 1

            rec.add_opinion(
                stage=STAGE_DUPLICATE_CHECK,
                operator="duplicate_detector",
                opinion=f"与记录 {primary.record_id} 重复（同船同时同位置）",
                decision="mark_duplicate",
                evidence={
                    "fingerprint": fp,
                    "duplicate_of": primary.record_id,
                    "duplicate_fields": ["vessel_id", "survey_time", "longitude", "latitude"]
                }
            )

            primary.add_opinion(
                stage=STAGE_DUPLICATE_CHECK,
                operator="duplicate_detector",
                opinion=f"发现重复记录 {rec.record_id}，本记录作为主记录保留",
                decision="keep_as_primary",
                evidence={"fingerprint": fp, "duplicate_record_id": rec.record_id}
            )

    return records, report
