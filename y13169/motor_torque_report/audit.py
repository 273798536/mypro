from __future__ import annotations

from datetime import datetime
from typing import Optional

from .models import (
    Anomaly,
    AnomalyType,
    JudgmentAction,
    JudgmentEntry,
)


class AuditTrail:
    def __init__(self) -> None:
        self._entries: list[JudgmentEntry] = []

    def add(self, entry: JudgmentEntry) -> None:
        self._entries.append(entry)

    def record_override(
        self,
        operator: str,
        target_record_id: str,
        anomaly_type: AnomalyType,
        action: JudgmentAction,
        reason: str,
        previous_value: object = None,
        new_value: object = None,
    ) -> JudgmentEntry:
        entry = JudgmentEntry(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            operator=operator,
            action=action,
            target_record_id=target_record_id,
            anomaly_type=anomaly_type,
            reason=reason,
            previous_value=previous_value,
            new_value=new_value,
        )
        self._entries.append(entry)
        return entry

    def record_direction_fix(
        self,
        operator: str,
        record_id: str,
        old_direction: str,
        new_direction: str,
        reason: str,
    ) -> JudgmentEntry:
        return self.record_override(
            operator=operator,
            target_record_id=record_id,
            anomaly_type=AnomalyType.DIRECTION_REVERSED,
            action=JudgmentAction.CORRECT_DIRECTION,
            reason=reason,
            previous_value=old_direction,
            new_value=new_direction,
        )

    def record_release(
        self,
        operator: str,
        record_id: str,
        reason: str,
    ) -> JudgmentEntry:
        return self.record_override(
            operator=operator,
            target_record_id=record_id,
            anomaly_type=None,
            action=JudgmentAction.OVERRIDE_RELEASE,
            reason=reason,
        )

    def record_supplement_request(
        self,
        operator: str,
        record_id: str,
        reason: str,
    ) -> JudgmentEntry:
        return self.record_override(
            operator=operator,
            target_record_id=record_id,
            anomaly_type=None,
            action=JudgmentAction.REQUEST_SUPPLEMENT,
            reason=reason,
        )

    @property
    def entries(self) -> list[JudgmentEntry]:
        return list(self._entries)

    def entries_for_record(self, record_id: str) -> list[JudgmentEntry]:
        return [e for e in self._entries if e.target_record_id == record_id]

    def to_dict_list(self) -> list[dict]:
        return [
            {
                "timestamp": e.timestamp,
                "operator": e.operator,
                "action": e.action.value,
                "target_record_id": e.target_record_id,
                "anomaly_type": e.anomaly_type.value if e.anomaly_type else None,
                "reason": e.reason,
                "previous_value": str(e.previous_value) if e.previous_value is not None else None,
                "new_value": str(e.new_value) if e.new_value is not None else None,
                "parameter_name": e.parameter_name,
                "formula_used": e.formula_used,
            }
            for e in self._entries
        ]
