from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Any, Optional
from datetime import datetime


class ProcessingStatus(str, Enum):
    PENDING = "待处理"
    PROCESSED = "已处理"
    NEEDS_MATERIAL = "待补材料"
    MANUAL_OVERRIDDEN = "人工改判"
    SKIPPED = "已跳过"
    ERROR = "处理异常"
    SUPERSEDED = "已被晚到附件取代"


@dataclass
class SourceRecord:
    record_id: str
    source_file: str
    source_line: int
    matrix_name: str
    status: ProcessingStatus = ProcessingStatus.PENDING
    raw_fields: Dict[str, Any] = field(default_factory=dict)
    processed_at: Optional[datetime] = None
    status_changed_at: Optional[datetime] = None
    notes: List[str] = field(default_factory=list)
    operator: str = "系统"
    original_unit: str = ""
    detected_unit: str = ""
    unit_consistent: bool = True
    superseded_by: Optional[str] = None
    supersedes: Optional[str] = None
    file_priority: int = 0

    def change_status(self, new_status: ProcessingStatus, note: str = "", operator: str = "系统"):
        old_status = self.status
        self.status = new_status
        self.status_changed_at = datetime.now()
        self.operator = operator
        if note:
            self.notes.append(f"[{self.status_changed_at.strftime('%Y-%m-%d %H:%M:%S')}] {operator}: {note} ({old_status.value} → {new_status.value})")
        else:
            self.notes.append(f"[{self.status_changed_at.strftime('%Y-%m-%d %H:%M:%S')}] {operator}: 状态变更 {old_status.value} → {new_status.value}")

    def add_note(self, note: str, operator: str = "系统"):
        ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        self.notes.append(f"[{ts}] {operator}: {note}")


class SourceTracker:
    def __init__(self):
        self.records: Dict[str, SourceRecord] = {}
        self.ingestion_log: List[Dict[str, Any]] = []

    def _make_id(self, source_file: str, source_line: int, matrix_name: str) -> str:
        return f"{source_file}::L{source_line}::{matrix_name}"

    def ingest_row(
        self,
        source_file: str,
        source_line: int,
        matrix_name: str,
        raw_row: Dict[str, Any],
        operator: str = "系统",
    ) -> SourceRecord:
        rid = self._make_id(source_file, source_line, matrix_name)
        now = datetime.now()
        if rid in self.records:
            record = self.records[rid]
            record.raw_fields.update(raw_row)
            record.add_note(f"重复摄入，字段已合并更新", operator)
        else:
            record = SourceRecord(
                record_id=rid,
                source_file=source_file,
                source_line=source_line,
                matrix_name=matrix_name,
                status=ProcessingStatus.PENDING,
                raw_fields=dict(raw_row),
                processed_at=now,
                status_changed_at=now,
                operator=operator,
            )
            self.records[rid] = record
        self.ingestion_log.append({
            "timestamp": now.isoformat(),
            "record_id": rid,
            "source_file": source_file,
            "source_line": source_line,
            "matrix_name": matrix_name,
            "operator": operator,
        })
        return record

    def get_record(self, source_file: str, source_line: int, matrix_name: str) -> Optional[SourceRecord]:
        return self.records.get(self._make_id(source_file, source_line, matrix_name))

    def find_by_matrix_name(self, matrix_name: str) -> List[SourceRecord]:
        return [r for r in self.records.values() if r.matrix_name == matrix_name]

    def mark_superseded(
        self,
        old_record_id: str,
        new_record_id: str,
        operator: str = "系统",
    ) -> bool:
        if old_record_id not in self.records or new_record_id not in self.records:
            return False
        old_rec = self.records[old_record_id]
        new_rec = self.records[new_record_id]
        old_rec.change_status(
            ProcessingStatus.SUPERSEDED,
            f"已被晚到附件取代：新来源 {new_rec.source_file} L{new_rec.source_line}，以新数据为准",
            operator,
        )
        old_rec.superseded_by = new_record_id
        new_rec.supersedes = old_record_id
        new_rec.add_note(f"取代草稿数据：旧来源 {old_rec.source_file} L{old_rec.source_line}", operator)
        return True

    def get_active_records(self) -> List[SourceRecord]:
        return [r for r in self.records.values() if r.status != ProcessingStatus.SUPERSEDED]

    def get_by_status(self, status: ProcessingStatus) -> List[SourceRecord]:
        return [r for r in self.records.values() if r.status == status]

    def list_all(self) -> List[SourceRecord]:
        return sorted(self.records.values(), key=lambda r: (r.source_file, r.source_line))

    def status_summary(self) -> Dict[str, int]:
        summary = {s.value: 0 for s in ProcessingStatus}
        for r in self.records.values():
            summary[r.status.value] += 1
        return summary

    def batch_set_status(
        self,
        record_ids: List[str],
        status: ProcessingStatus,
        note: str = "",
        operator: str = "系统",
    ) -> int:
        count = 0
        for rid in record_ids:
            if rid in self.records:
                self.records[rid].change_status(status, note, operator)
                count += 1
        return count

    def check_unit_consistency(self, record: SourceRecord, expected_unit: str) -> bool:
        unit_fields = ["单位", "计算单位", "unit", "计量单位", "calculation_unit"]
        detected = ""
        for k, v in record.raw_fields.items():
            if k.lower() in [f.lower() for f in unit_fields]:
                detected = str(v).strip()
                break
        record.detected_unit = detected
        record.original_unit = expected_unit
        consistent = (not expected_unit) or (not detected) or (detected.lower() == expected_unit.lower())
        record.unit_consistent = consistent
        if not consistent:
            record.add_note(f"单位不一致：预期[{expected_unit}]，检测到[{detected}]，请注意换算")
        return consistent
