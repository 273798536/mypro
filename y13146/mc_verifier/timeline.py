from typing import List, Dict, Optional
from datetime import datetime

from .models import (
    TimelineEntry,
    TimelineStatus,
    ValidationResult,
    ParameterVersion,
    ValidationStatus,
)


class TimelineGenerator:
    def __init__(self):
        self._entries: List[TimelineEntry] = []

    @property
    def entries(self) -> List[TimelineEntry]:
        return list(self._entries)

    def add_entry(
        self,
        status: TimelineStatus,
        title: str,
        description: str,
        version: Optional[int] = None,
        record_id: Optional[str] = None,
        detail: Optional[Dict] = None,
        timestamp: Optional[datetime] = None,
    ) -> TimelineEntry:
        entry = TimelineEntry(
            timestamp=timestamp or datetime.now(),
            status=status,
            title=title,
            description=description,
            version=version,
            record_id=record_id,
            detail=detail or {},
        )
        self._entries.append(entry)
        return entry

    def add_validation_result(
        self,
        result: ValidationResult,
        param_version: ParameterVersion,
    ):
        if result.status == ValidationStatus.PASSED:
            self.add_entry(
                status=TimelineStatus.PROCESSED,
                title=f"v{result.version} 校验通过",
                description=(
                    f"共 {result.total_records} 条记录，"
                    f"蒙特卡洛模拟 {result.simulation_count} 次，"
                    f"置信度 {result.confidence_level*100:.0f}%，"
                    f"无异常点。"
                ),
                version=result.version,
            )
        elif result.status == ValidationStatus.FAILED:
            self.add_entry(
                status=TimelineStatus.ANOMALY,
                title=f"v{result.version} 校验未通过",
                description=(
                    f"共 {result.total_records} 条记录，"
                    f"发现 {result.anomaly_count} 个异常点，"
                    f"需关注。"
                ),
                version=result.version,
                detail={
                    "anomaly_count": result.anomaly_count,
                    "anomaly_ids": list({a.record_id for a in result.anomalies}),
                },
            )
        elif result.status == ValidationStatus.PENDING:
            extrap_ids = list({e.record_id for e in result.extrapolation_issues})
            self.add_entry(
                status=TimelineStatus.PENDING_MATERIAL,
                title=f"v{result.version} 外推越界，待补充材料",
                description=(
                    f"共 {result.total_records} 条记录，"
                    f"{len(result.extrapolation_issues)} 个外推越界点，"
                    f"需补充材料或人工确认。"
                ),
                version=result.version,
                detail={
                    "extrapolation_count": len(result.extrapolation_issues),
                    "affected_records": extrap_ids,
                },
            )
        elif result.status == ValidationStatus.MANUAL_OVERRIDDEN:
            self.add_entry(
                status=TimelineStatus.MANUAL_REVIEW,
                title=f"v{result.version} 人工改判",
                description=result.manual_review_note or "人工改判",
                version=result.version,
                detail={
                    "previous_judgment": result.previous_judgment,
                },
            )

    def add_supplement(
        self,
        new_version: ParameterVersion,
        base_version: int,
        added_count: int,
        updated_count: int,
        note: str,
    ):
        desc_parts = []
        if added_count > 0:
            desc_parts.append(f"新增 {added_count} 条")
        if updated_count > 0:
            desc_parts.append(f"更新 {updated_count} 条")
        desc = "、".join(desc_parts) if desc_parts else "无变动"

        self.add_entry(
            status=TimelineStatus.SUPPLEMENTED,
            title=f"v{new_version.version} 补充材料",
            description=(
                f"{desc}（基于 v{base_version}）。"
                f"备注：{note}"
            ),
            version=new_version.version,
            detail={
                "base_version": base_version,
                "added_count": added_count,
                "updated_count": updated_count,
            },
        )

    def add_manual_override(
        self,
        version: int,
        record_id: str,
        reason: str,
        operator: str,
    ):
        self.add_entry(
            status=TimelineStatus.MANUAL_REVIEW,
            title=f"v{version} 人工改判记录 [{record_id}]",
            description=f"操作人：{operator}；原因：{reason}",
            version=version,
            record_id=record_id,
            detail={"operator": operator},
        )

    def generate_timeline_text(self, title: str = "蒙特卡洛误差边界校验 - 历史时间线") -> str:
        lines = []
        lines.append("=" * 70)
        lines.append(title)
        lines.append("=" * 70)
        lines.append("")

        status_icons = {
            TimelineStatus.PROCESSED: "✅",
            TimelineStatus.PENDING_MATERIAL: "⏳",
            TimelineStatus.MANUAL_REVIEW: "👤",
            TimelineStatus.ANOMALY: "⚠️",
            TimelineStatus.SUPPLEMENTED: "📥",
        }

        sorted_entries = sorted(self._entries, key=lambda e: e.timestamp, reverse=True)

        for i, entry in enumerate(sorted_entries, 1):
            icon = status_icons.get(entry.status, "•")
            ts = entry.timestamp.strftime("%Y-%m-%d %H:%M:%S")

            lines.append(f"  [{i}] {icon} {entry.status.value}")
            lines.append(f"      时间   : {ts}")
            lines.append(f"      标题   : {entry.title}")
            lines.append(f"      描述   : {entry.description}")
            if entry.version is not None:
                lines.append(f"      版本   : v{entry.version}")
            if entry.record_id is not None:
                lines.append(f"      记录   : {entry.record_id}")
            lines.append("")

        lines.append("-" * 70)
        lines.append("【状态图例】")
        lines.append(f"  ✅ {TimelineStatus.PROCESSED.value}    - 校验通过，已处理")
        lines.append(f"  ⏳ {TimelineStatus.PENDING_MATERIAL.value}  - 等待补充材料")
        lines.append(f"  👤 {TimelineStatus.MANUAL_REVIEW.value}  - 人工改判")
        lines.append(f"  ⚠️ {TimelineStatus.ANOMALY.value}       - 异常标记")
        lines.append(f"  📥 {TimelineStatus.SUPPLEMENTED.value}  - 补充材料")
        lines.append("=" * 70)

        return "\n".join(lines)

    def generate_summary(self) -> Dict:
        summary = {
            "total_events": len(self._entries),
            "by_status": {},
            "processed_count": 0,
            "pending_count": 0,
            "manual_count": 0,
            "anomaly_count": 0,
            "supplemented_count": 0,
        }

        for entry in self._entries:
            status = entry.status.value
            summary["by_status"][status] = summary["by_status"].get(status, 0) + 1

            if entry.status == TimelineStatus.PROCESSED:
                summary["processed_count"] += 1
            elif entry.status == TimelineStatus.PENDING_MATERIAL:
                summary["pending_count"] += 1
            elif entry.status == TimelineStatus.MANUAL_REVIEW:
                summary["manual_count"] += 1
            elif entry.status == TimelineStatus.ANOMALY:
                summary["anomaly_count"] += 1
            elif entry.status == TimelineStatus.SUPPLEMENTED:
                summary["supplemented_count"] += 1

        return summary

    def to_list(self) -> List[Dict]:
        return [e.to_dict() for e in sorted(self._entries, key=lambda x: x.timestamp)]
