import uuid
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from dataclasses import dataclass

@dataclass
class AuditLogEntry:
    id: str
    task_id: str
    action: str
    field: Optional[str]
    old_value: Optional[str]
    new_value: Optional[str]
    performed_by: str
    reason: Optional[str]
    timestamp: str
    metadata: Dict[str, Any]

class AuditTrail:
    def __init__(self):
        self.entries: List[AuditLogEntry] = []

    def _generate_id(self) -> str:
        return str(uuid.uuid4())

    def _now(self) -> str:
        return datetime.now().isoformat()

    def _serialize_value(self, value: Any) -> str:
        if value is None:
            return ''
        if isinstance(value, (dict, list)):
            return json.dumps(value, ensure_ascii=False)
        return str(value)

    def log_correction(
        self,
        task_id: str,
        field: str,
        old_value: Any,
        new_value: Any,
        corrected_by: str,
        reason: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLogEntry:
        entry = AuditLogEntry(
            id=self._generate_id(),
            task_id=task_id,
            action='correction',
            field=field,
            old_value=self._serialize_value(old_value),
            new_value=self._serialize_value(new_value),
            performed_by=corrected_by,
            reason=reason,
            timestamp=self._now(),
            metadata=metadata or {}
        )
        self.entries.append(entry)
        return entry

    def log_import(
        self,
        task_id: str,
        package_type: str,
        source: str,
        imported_by: str,
        content_summary: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLogEntry:
        entry = AuditLogEntry(
            id=self._generate_id(),
            task_id=task_id,
            action='import',
            field=package_type,
            old_value=None,
            new_value=content_summary,
            performed_by=imported_by,
            reason=f'导入{package_type}数据',
            timestamp=self._now(),
            metadata={
                'source': source,
                **(metadata or {})
            }
        )
        self.entries.append(entry)
        return entry

    def log_calculation(
        self,
        task_id: str,
        calculation_type: str,
        performed_by: str,
        result_summary: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLogEntry:
        entry = AuditLogEntry(
            id=self._generate_id(),
            task_id=task_id,
            action='calculation',
            field=calculation_type,
            old_value=None,
            new_value=result_summary,
            performed_by=performed_by,
            reason=f'执行{calculation_type}计算',
            timestamp=self._now(),
            metadata=metadata or {}
        )
        self.entries.append(entry)
        return entry

    def log_report_generation(
        self,
        task_id: str,
        report_format: str,
        generated_by: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLogEntry:
        entry = AuditLogEntry(
            id=self._generate_id(),
            task_id=task_id,
            action='report',
            field=report_format,
            old_value=None,
            new_value=f'生成{report_format}格式报告',
            performed_by=generated_by,
            reason=f'生成{report_format}报告',
            timestamp=self._now(),
            metadata=metadata or {}
        )
        self.entries.append(entry)
        return entry

    def log_status_change(
        self,
        task_id: str,
        old_status: str,
        new_status: str,
        changed_by: str,
        reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AuditLogEntry:
        entry = AuditLogEntry(
            id=self._generate_id(),
            task_id=task_id,
            action='status_change',
            field='status',
            old_value=old_status,
            new_value=new_status,
            performed_by=changed_by,
            reason=reason or f'状态变更: {old_status} → {new_status}',
            timestamp=self._now(),
            metadata=metadata or {}
        )
        self.entries.append(entry)
        return entry

    def get_task_audit_trail(self, task_id: str) -> List[AuditLogEntry]:
        return [e for e in self.entries if e.task_id == task_id]

    def get_corrections(self, task_id: Optional[str] = None) -> List[AuditLogEntry]:
        entries = [e for e in self.entries if e.action == 'correction']
        if task_id:
            entries = [e for e in entries if e.task_id == task_id]
        return entries

    def get_entry_by_id(self, entry_id: str) -> Optional[AuditLogEntry]:
        for entry in self.entries:
            if entry.id == entry_id:
                return entry
        return None

    def to_dict(self, task_id: Optional[str] = None) -> List[Dict[str, Any]]:
        entries = self.entries
        if task_id:
            entries = [e for e in entries if e.task_id == task_id]

        return [
            {
                'id': entry.id,
                'taskId': entry.task_id,
                'action': entry.action,
                'field': entry.field,
                'oldValue': entry.old_value,
                'newValue': entry.new_value,
                'performedBy': entry.performed_by,
                'reason': entry.reason,
                'timestamp': entry.timestamp,
                'metadata': entry.metadata
            }
            for entry in entries
        ]

    def get_correction_summary(self, task_id: str) -> Dict[str, Any]:
        corrections = self.get_corrections(task_id)
        fields_corrected = set(c.field for c in corrections)

        return {
            'totalCorrections': len(corrections),
            'fieldsCorrected': sorted(list(fields_corrected)),
            'lastCorrectionAt': max((c.timestamp for c in corrections), default=None),
            'correctedBy': sorted(list(set(c.performed_by for c in corrections))),
            'corrections': [
                {
                    'field': c.field,
                    'oldValue': c.old_value,
                    'newValue': c.new_value,
                    'correctedBy': c.performed_by,
                    'reason': c.reason,
                    'timestamp': c.timestamp
                }
                for c in corrections
            ]
        }

    def verify_tamper_proof(self, entries: List[Dict[str, Any]]) -> bool:
        for i in range(1, len(entries)):
            current = entries[i]
            previous = entries[i - 1]

            if current['timestamp'] < previous['timestamp']:
                return False

        return True
