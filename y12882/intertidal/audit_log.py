"""
处理日志与回溯系统
核心思想：每一条处理记录都有唯一ID，记录来源、处理动作、处理意见，
地图、图表、报告共用同一批处理记录，保证三者对得上。
"""
from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Any, Optional, List, Dict


@dataclass
class ProcessingRecord:
    """单条处理记录，可追溯到原始数据行"""
    record_id: str
    source_type: str
    source_row_index: int
    source_file: str
    action: str
    before_value: Any
    after_value: Any
    reason: str
    handler: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    notes: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class ValidationIssue:
    """数据校验发现的问题"""
    issue_id: str
    issue_type: str
    severity: str
    source_type: str
    source_row_index: int
    field_name: str
    current_value: Any
    expected_value: Any
    description: str
    related_tide_record_id: Optional[str] = None
    related_salinity_record_id: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


class AuditLog:
    """审计日志，统一管理所有处理记录和校验问题"""

    def __init__(self, session_name: str = "default"):
        self.session_name = session_name
        self.created_at = datetime.now().isoformat()
        self.records: List[ProcessingRecord] = []
        self.issues: List[ValidationIssue] = []
        self.source_snapshots: Dict[str, Any] = {}

    def add_record(
        self,
        source_type: str,
        source_row_index: int,
        source_file: str,
        action: str,
        before_value: Any,
        after_value: Any,
        reason: str,
        handler: str = "system",
        notes: str = ""
    ) -> str:
        """添加一条处理记录，返回 record_id"""
        record_id = f"REC-{uuid.uuid4().hex[:8].upper()}"
        record = ProcessingRecord(
            record_id=record_id,
            source_type=source_type,
            source_row_index=source_row_index,
            source_file=source_file,
            action=action,
            before_value=before_value,
            after_value=after_value,
            reason=reason,
            handler=handler,
            notes=notes
        )
        self.records.append(record)
        return record_id

    def add_issue(
        self,
        issue_type: str,
        severity: str,
        source_type: str,
        source_row_index: int,
        field_name: str,
        current_value: Any,
        expected_value: Any,
        description: str,
        related_tide_record_id: Optional[str] = None,
        related_salinity_record_id: Optional[str] = None
    ) -> str:
        """添加一个校验问题，返回 issue_id"""
        issue_id = f"ISS-{uuid.uuid4().hex[:8].upper()}"
        issue = ValidationIssue(
            issue_id=issue_id,
            issue_type=issue_type,
            severity=severity,
            source_type=source_type,
            source_row_index=source_row_index,
            field_name=field_name,
            current_value=current_value,
            expected_value=expected_value,
            description=description,
            related_tide_record_id=related_tide_record_id,
            related_salinity_record_id=related_salinity_record_id
        )
        self.issues.append(issue)
        return issue_id

    def save_snapshot(self, name: str, data: Any):
        """保存原始数据快照，用于回溯"""
        self.source_snapshots[name] = data

    def trace_back(self, record_id: str) -> Optional[ProcessingRecord]:
        """根据处理记录ID反查"""
        for rec in self.records:
            if rec.record_id == record_id:
                return rec
        return None

    def trace_issue(self, issue_id: str) -> Optional[ValidationIssue]:
        """根据问题ID反查"""
        for issue in self.issues:
            if issue.issue_id == issue_id:
                return issue
        return None

    def get_records_by_source(self, source_type: str, row_index: int) -> List[ProcessingRecord]:
        """按来源行查找所有处理记录"""
        return [
            r for r in self.records
            if r.source_type == source_type and r.source_row_index == row_index
        ]

    def get_issues_by_type(self, issue_type: str) -> List[ValidationIssue]:
        """按问题类型查找"""
        return [i for i in self.issues if i.issue_type == issue_type]

    def summary(self) -> dict:
        """汇总统计"""
        issue_by_severity = {}
        for issue in self.issues:
            issue_by_severity[issue.severity] = issue_by_severity.get(issue.severity, 0) + 1

        issue_by_type = {}
        for issue in self.issues:
            issue_by_type[issue.issue_type] = issue_by_type.get(issue.issue_type, 0) + 1

        action_counts = {}
        for rec in self.records:
            action_counts[rec.action] = action_counts.get(rec.action, 0) + 1

        return {
            "session_name": self.session_name,
            "created_at": self.created_at,
            "total_records": len(self.records),
            "total_issues": len(self.issues),
            "issues_by_severity": issue_by_severity,
            "issues_by_type": issue_by_type,
            "actions_count": action_counts
        }

    def to_dict(self) -> dict:
        return {
            "session_name": self.session_name,
            "created_at": self.created_at,
            "summary": self.summary(),
            "records": [r.to_dict() for r in self.records],
            "issues": [i.to_dict() for i in self.issues]
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=indent)

    def save_to_file(self, filepath: str):
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(self.to_json())
