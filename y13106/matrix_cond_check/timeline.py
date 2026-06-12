from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Any, Optional
from datetime import datetime
from .source_tracker import SourceTracker, SourceRecord, ProcessingStatus
from .validator import BoundaryValidator, ViolationRecord
from .core import CheckResult


class EventType(str, Enum):
    INGESTION = "数据摄入"
    PROCESS_OK = "已处理"
    NEEDS_MATERIAL = "待补材料"
    MANUAL_OVERRIDE = "人工改判"
    VIOLATION = "校验违规"
    UNIT_WARNING = "单位提示"
    RECHECK = "复算结果"


@dataclass
class TimelineEvent:
    timestamp: datetime
    event_type: EventType
    title: str
    description: str
    matrix_name: str
    source_file: str
    source_line: int
    status: str = ""
    operator: str = "系统"
    metadata: Dict[str, Any] = field(default_factory=dict)
    related_violation_id: str = ""

    @property
    def ts_str(self) -> str:
        return self.timestamp.strftime("%Y-%m-%d %H:%M:%S")


class TimelineGenerator:
    def __init__(self):
        self.events: List[TimelineEvent] = []

    def build_from_pipeline(
        self,
        source_tracker: SourceTracker,
        boundary_validator: BoundaryValidator,
        check_results: List[CheckResult],
        run_label: str = "首次运行",
    ) -> List[TimelineEvent]:
        self.events = []

        for entry in source_tracker.ingestion_log:
            self._add_event(TimelineEvent(
                timestamp=datetime.fromisoformat(entry["timestamp"]),
                event_type=EventType.INGESTION,
                title=f"[数据摄入] {entry['matrix_name']}",
                description=f"来源文件 {entry['source_file']} 第 {entry['source_line']} 行，由 {entry['operator']} 登记入库",
                matrix_name=entry["matrix_name"],
                source_file=entry["source_file"],
                source_line=entry["source_line"],
                operator=entry["operator"],
                metadata={"run_label": run_label},
            ))

        for record in source_tracker.list_all():
            if not record.unit_consistent:
                self._add_event(TimelineEvent(
                    timestamp=record.status_changed_at or datetime.now(),
                    event_type=EventType.UNIT_WARNING,
                    title=f"[单位提示] {record.matrix_name}",
                    description=f"文件 {record.source_file} 第 {record.source_line} 行：预期单位[{record.original_unit}]，实际检测到[{record.detected_unit}]，需确认是否换算",
                    matrix_name=record.matrix_name,
                    source_file=record.source_file,
                    source_line=record.source_line,
                    operator=record.operator,
                    status=ProcessingStatus.NEEDS_MATERIAL.value,
                    metadata={"run_label": run_label, "original_unit": record.original_unit, "detected_unit": record.detected_unit},
                ))

        for v in boundary_validator.violations:
            self._add_event(TimelineEvent(
                timestamp=datetime.now(),
                event_type=EventType.VIOLATION,
                title=f"[{v.violation_type.value}] {v.matrix_name}",
                description=f"{v.description} | {v.impact_scope}",
                matrix_name=v.matrix_name,
                source_file=v.source_file,
                source_line=v.source_line,
                status=v.resolution_status,
                operator="系统",
                metadata={"run_label": run_label, "severity": v.severity, "violation_id": v.violation_id},
                related_violation_id=v.violation_id,
            ))

        for record in source_tracker.list_all():
            if record.status == ProcessingStatus.PROCESSED:
                self._add_event(TimelineEvent(
                    timestamp=record.status_changed_at or record.processed_at or datetime.now(),
                    event_type=EventType.PROCESS_OK,
                    title=f"[已处理] {record.matrix_name}",
                    description=f"来源 {record.source_file} 第 {record.source_line} 行：校验通过，已归档。{self._format_notes(record)}",
                    matrix_name=record.matrix_name,
                    source_file=record.source_file,
                    source_line=record.source_line,
                    status=record.status.value,
                    operator=record.operator,
                    metadata={"run_label": run_label},
                ))
            elif record.status == ProcessingStatus.NEEDS_MATERIAL:
                self._add_event(TimelineEvent(
                    timestamp=record.status_changed_at or datetime.now(),
                    event_type=EventType.NEEDS_MATERIAL,
                    title=f"[待补材料] {record.matrix_name}",
                    description=f"来源 {record.source_file} 第 {record.source_line} 行：等待补充材料后复算。{self._format_notes(record)}",
                    matrix_name=record.matrix_name,
                    source_file=record.source_file,
                    source_line=record.source_line,
                    status=record.status.value,
                    operator=record.operator,
                    metadata={"run_label": run_label},
                ))
            elif record.status == ProcessingStatus.MANUAL_OVERRIDDEN:
                self._add_event(TimelineEvent(
                    timestamp=record.status_changed_at or datetime.now(),
                    event_type=EventType.MANUAL_OVERRIDE,
                    title=f"[人工改判] {record.matrix_name}",
                    description=f"来源 {record.source_file} 第 {record.source_line} 行：由 {record.operator} 人工改判。{self._format_notes(record)}",
                    matrix_name=record.matrix_name,
                    source_file=record.source_file,
                    source_line=record.source_line,
                    status=record.status.value,
                    operator=record.operator,
                    metadata={"run_label": run_label},
                ))

        self.events.sort(key=lambda e: e.timestamp)
        return self.events

    def add_recheck_event(
        self,
        matrix_name: str,
        source_file: str,
        source_line: int,
        previous_valid: bool,
        current_valid: bool,
        note: str = "",
        operator: str = "系统",
    ):
        title = f"[复算结果] {matrix_name}"
        if previous_valid == current_valid:
            desc = f"复算口径一致，结果不变：{'通过' if current_valid else '未通过'}。{note}"
        else:
            desc = f"复算口径变化：{'通过' if previous_valid else '未通过'} → {'通过' if current_valid else '未通过'}。{note}"
        self._add_event(TimelineEvent(
            timestamp=datetime.now(),
            event_type=EventType.RECHECK,
            title=title,
            description=f"来源 {source_file} 第 {source_line} 行：{desc}",
            matrix_name=matrix_name,
            source_file=source_file,
            source_line=source_line,
            operator=operator,
            status="已复算",
            metadata={"previous_valid": previous_valid, "current_valid": current_valid},
        ))

    def _add_event(self, event: TimelineEvent):
        self.events.append(event)

    @staticmethod
    def _format_notes(record: SourceRecord) -> str:
        if not record.notes:
            return ""
        latest = record.notes[-1]
        return f"最新备注：{latest}"

    def render_text(self, output_file: Optional[str] = None) -> str:
        lines: List[str] = []
        lines.append("=" * 80)
        lines.append("矩阵条件数边界校验 · 历史时间线")
        lines.append("=" * 80)
        lines.append("")

        buckets: Dict[EventType, List[TimelineEvent]] = {}
        for e in self.events:
            buckets.setdefault(e.event_type, []).append(e)

        order = [
            EventType.PROCESS_OK,
            EventType.NEEDS_MATERIAL,
            EventType.MANUAL_OVERRIDE,
            EventType.VIOLATION,
            EventType.UNIT_WARNING,
            EventType.INGESTION,
            EventType.RECHECK,
        ]

        for etype in order:
            if etype not in buckets:
                continue
            group = buckets[etype]
            lines.append(f"【{etype.value}】 共 {len(group)} 条")
            lines.append("-" * 80)
            for e in group:
                lines.append(f"  [{e.ts_str}] {e.title}")
                lines.append(f"      来源: {e.source_file} 第 {e.source_line} 行 | 操作人: {e.operator}")
                if e.status:
                    lines.append(f"      状态: {e.status}")
                lines.append(f"      说明: {e.description}")
                lines.append("")
            lines.append("")

        lines.append("=" * 80)
        lines.append("总计: 已处理 {} | 待补材料 {} | 人工改判 {} | 校验违规 {} | 单位提示 {} | 复算 {} | 数据摄入 {}".format(
            len(buckets.get(EventType.PROCESS_OK, [])),
            len(buckets.get(EventType.NEEDS_MATERIAL, [])),
            len(buckets.get(EventType.MANUAL_OVERRIDE, [])),
            len(buckets.get(EventType.VIOLATION, [])),
            len(buckets.get(EventType.UNIT_WARNING, [])),
            len(buckets.get(EventType.RECHECK, [])),
            len(buckets.get(EventType.INGESTION, [])),
        ))
        lines.append("=" * 80)

        result = "\n".join(lines)
        if output_file:
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(result)
        return result

    def render_csv(self, output_file: str) -> str:
        import csv
        headers = [
            "时间", "事件类型", "标题", "描述", "矩阵名称",
            "来源文件", "来源行号", "状态", "操作人", "关联违规ID",
        ]
        with open(output_file, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            for e in sorted(self.events, key=lambda x: x.timestamp):
                writer.writerow([
                    e.ts_str,
                    e.event_type.value,
                    e.title,
                    e.description,
                    e.matrix_name,
                    e.source_file,
                    e.source_line,
                    e.status,
                    e.operator,
                    e.related_violation_id,
                ])
        return output_file
