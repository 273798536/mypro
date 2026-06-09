"""留痕系统 - 人工修正留痕，状态变更前后对比"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from .errors import InvalidStateTransitionError
from .models import (
    AuditEntry,
    BoundaryCase,
    CaseBundle,
    CaseStatus,
)


ALLOWED_TRANSITIONS: dict[CaseStatus, list[CaseStatus]] = {
    CaseStatus.PENDING: [
        CaseStatus.APPROVED,
        CaseStatus.REJECTED,
        CaseStatus.NEEDS_RECOLLECTION,
        CaseStatus.TEMPORARY_HOLD,
    ],
    CaseStatus.TEMPORARY_HOLD: [
        CaseStatus.APPROVED,
        CaseStatus.REJECTED,
        CaseStatus.NEEDS_RECOLLECTION,
        CaseStatus.PENDING,
    ],
    CaseStatus.NEEDS_RECOLLECTION: [
        CaseStatus.PENDING,
        CaseStatus.APPROVED,
    ],
    CaseStatus.APPROVED: [
        CaseStatus.PENDING,
        CaseStatus.TEMPORARY_HOLD,
    ],
    CaseStatus.REJECTED: [
        CaseStatus.PENDING,
    ],
}


class AuditTrailManager:
    """留痕管理器 - 负责记录所有人工修正和状态变更"""

    def __init__(self, audit_entries: list[AuditEntry] | None = None):
        self._entries: list[AuditEntry] = audit_entries or []

    @property
    def entries(self) -> list[AuditEntry]:
        return sorted(self._entries, key=lambda e: e.timestamp)

    def get_for_case(self, case_id: str) -> list[AuditEntry]:
        return [e for e in self.entries if e.case_id == case_id]

    def _new_id(self) -> str:
        return f"audit_{uuid.uuid4().hex[:12]}"

    def record_status_change(
        self,
        bundle: CaseBundle,
        new_status: CaseStatus,
        operator: str,
        reason: str = "",
    ) -> AuditEntry:
        """记录状态变更 - 校验合法性并留痕"""
        case = bundle.case
        if new_status not in ALLOWED_TRANSITIONS.get(case.status, []):
            allowed = ALLOWED_TRANSITIONS.get(case.status, [])
            raise InvalidStateTransitionError(
                case_id=case.case_id,
                from_status=case.status,
                to_status=new_status,
                allowed=[s.value for s in allowed],
            )

        previous_status = case.status
        previous_conclusion = case.conclusion
        changed_fields: dict[str, Any] = {
            "status": {"from": previous_status.value, "to": new_status.value},
        }

        case.status = new_status
        case.updated_at = datetime.now()
        case.version += 1

        entry = AuditEntry(
            entry_id=self._new_id(),
            case_id=case.case_id,
            action="status_change",
            operator=operator,
            previous_status=previous_status,
            new_status=new_status,
            previous_conclusion=previous_conclusion,
            new_conclusion=case.conclusion,
            reason=reason,
            changed_fields=changed_fields,
        )
        self._entries.append(entry)
        bundle.audit_trail.append(entry)
        return entry

    def record_conclusion_change(
        self,
        bundle: CaseBundle,
        new_conclusion: str,
        operator: str,
        reason: str = "",
    ) -> AuditEntry:
        """记录结论变更"""
        case = bundle.case
        previous_conclusion = case.conclusion
        changed_fields: dict[str, Any] = {
            "conclusion": {"from": previous_conclusion, "to": new_conclusion},
        }

        case.conclusion = new_conclusion
        case.updated_at = datetime.now()
        case.version += 1

        entry = AuditEntry(
            entry_id=self._new_id(),
            case_id=case.case_id,
            action="conclusion_change",
            operator=operator,
            previous_status=case.status,
            new_status=case.status,
            previous_conclusion=previous_conclusion,
            new_conclusion=new_conclusion,
            reason=reason,
            changed_fields=changed_fields,
        )
        self._entries.append(entry)
        bundle.audit_trail.append(entry)
        return entry

    def record_field_change(
        self,
        bundle: CaseBundle,
        field_name: str,
        old_value: Any,
        new_value: Any,
        operator: str,
        reason: str = "",
    ) -> AuditEntry:
        """记录任意字段变更"""
        case = bundle.case
        changed_fields: dict[str, Any] = {
            field_name: {"from": old_value, "to": new_value},
        }

        setattr(case, field_name, new_value)
        case.updated_at = datetime.now()
        case.version += 1

        entry = AuditEntry(
            entry_id=self._new_id(),
            case_id=case.case_id,
            action="field_change",
            operator=operator,
            previous_status=case.status,
            new_status=case.status,
            previous_conclusion=case.conclusion,
            new_conclusion=case.conclusion,
            reason=reason,
            changed_fields=changed_fields,
        )
        self._entries.append(entry)
        bundle.audit_trail.append(entry)
        return entry

    def get_change_diff(self, case_id: str) -> str:
        """生成某个边界样例的变更对比文本"""
        case_entries = self.get_for_case(case_id)
        if not case_entries:
            return "（无变更记录）"

        lines = []
        for e in case_entries:
            ts = e.timestamp.strftime("%Y-%m-%d %H:%M:%S")
            header = f"[{ts}] {e.operator} 执行 {e.action}"
            if e.reason:
                header += f" - 原因: {e.reason}"
            lines.append(header)

            if e.previous_status != e.new_status:
                lines.append(
                    f"  状态: {e.previous_status.value if e.previous_status else 'N/A'}"
                    f" → {e.new_status.value if e.new_status else 'N/A'}"
                )
            if e.previous_conclusion != e.new_conclusion:
                lines.append(f"  结论: {e.previous_conclusion!r} → {e.new_conclusion!r}")
            for field, diff in e.changed_fields.items():
                if field not in ("status", "conclusion"):
                    lines.append(f"  {field}: {diff['from']!r} → {diff['to']!r}")
            lines.append("")
        return "\n".join(lines)
