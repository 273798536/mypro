import json
import os
from typing import List, Dict, Optional
from datetime import datetime
from .models import (
    AuditEntry,
    VerificationResult,
    BatchReport,
    ResultStatus,
    ReviewAction,
)


class AuditTrail:
    def __init__(self, storage_path: Optional[str] = None):
        self.storage_path = storage_path
        self._entries: List[AuditEntry] = []
        if storage_path and os.path.exists(storage_path):
            self._load()

    def _load(self) -> None:
        if not self.storage_path:
            return
        try:
            with open(self.storage_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            for item in data:
                entry = AuditEntry(
                    result_id=item["result_id"],
                    record_id=item["record_id"],
                    action=ReviewAction(item["action"]),
                    previous_status=ResultStatus(item["previous_status"]),
                    new_status=ResultStatus(item["new_status"]),
                    operator=item["operator"],
                    comment=item.get("comment", ""),
                    timestamp=datetime.fromisoformat(item["timestamp"]),
                    changed_fields=item.get("changed_fields", {}),
                )
                self._entries.append(entry)
        except Exception:
            self._entries = []

    def save(self) -> None:
        if not self.storage_path:
            return
        data = [e.to_dict() for e in self._entries]
        os.makedirs(os.path.dirname(os.path.abspath(self.storage_path)), exist_ok=True)
        with open(self.storage_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def apply_review(
        self,
        result: VerificationResult,
        action: ReviewAction,
        operator: str,
        comment: str = "",
        override_expected_tax: Optional[float] = None,
    ) -> AuditEntry:
        previous_status = result.status
        action_to_status = {
            ReviewAction.CONFIRM_PASS: ResultStatus.USABLE,
            ReviewAction.MARK_PENDING: ResultStatus.PENDING,
            ReviewAction.REQUEST_RECOLLECT: ResultStatus.NEED_RECOLLECT,
            ReviewAction.ESCALATE: ResultStatus.NEED_REVIEW,
        }
        new_status = action_to_status.get(action, previous_status)
        changed_fields: Dict[str, Dict[str, any]] = {
            "status": {"before": previous_status.value, "after": new_status.value},
        }
        if override_expected_tax is not None:
            old_tax = result.expected_tax
            result.expected_tax = override_expected_tax
            result.tax_diff = round(result.claimed_tax - result.expected_tax, 2)
            changed_fields["expected_tax"] = {"before": old_tax, "after": override_expected_tax}
        result.status = new_status
        result.reviewed_by = operator
        result.reviewed_at = datetime.now()
        if not result.explanation.endswith("。") and result.explanation:
            result.explanation += "；"
        result.explanation += f"人工[{operator}]于{result.reviewed_at:%Y-%m-%d %H:%M}执行「{action.value}」"
        if comment:
            result.explanation += f"，备注:{comment}"
        entry = AuditEntry(
            result_id=f"{result.record.record_id}-{id(result)}",
            record_id=result.record.record_id,
            action=action,
            previous_status=previous_status,
            new_status=new_status,
            operator=operator,
            comment=comment,
            changed_fields=changed_fields,
        )
        self._entries.append(entry)
        self.save()
        return entry

    def format_diff(self, entry: AuditEntry) -> str:
        lines = [
            f"  记录 {entry.record_id} 于 {entry.timestamp:%Y-%m-%d %H:%M:%S} 由 {entry.operator} 操作:",
            f"    操作类型: {entry.action.value}",
        ]
        for field, change in entry.changed_fields.items():
            lines.append(f"    {field}: {change['before']}  →  {change['after']}")
        if entry.comment:
            lines.append(f"    备注: {entry.comment}")
        return "\n".join(lines)

    def history_for_record(self, record_id: str) -> List[AuditEntry]:
        return [e for e in self._entries if e.record_id == record_id]

    def attach_to_report(self, report: BatchReport) -> None:
        report.audit_entries.extend(self._entries)
