from datetime import datetime
from settlement.models import AmendmentLog, Settlement


class AmendmentTracker:
    def __init__(self):
        self.logs: list[AmendmentLog] = []

    def amend(
        self,
        settlement: Settlement,
        field_name: str,
        new_value,
        reason: str,
        operator: str = "system",
    ) -> AmendmentLog:
        old_value = getattr(settlement, field_name, None)
        if old_value is None:
            raise ValueError(f"Settlement has no field '{field_name}'")
        old_str = str(old_value)
        new_str = str(new_value)
        log = AmendmentLog(
            settlement_id=settlement.settlement_id,
            field_name=field_name,
            old_value=old_str,
            new_value=new_str,
            reason=reason,
            operator=operator,
            timestamp=datetime.now().isoformat(),
        )
        self.logs.append(log)
        setattr(settlement, field_name, new_value)
        if field_name not in ("exception_notes",):
            settlement.exception_notes.append(
                f"[修正] {field_name}: {old_str} -> {new_str}, 原因: {reason}"
            )
        return log

    def get_logs(self, settlement_id: str = "") -> list[AmendmentLog]:
        if settlement_id:
            return [l for l in self.logs if l.settlement_id == settlement_id]
        return list(self.logs)

    def get_logs_as_dicts(self, settlement_id: str = "") -> list[dict]:
        return [l.to_dict() for l in self.get_logs(settlement_id)]

    def has_amendments(self, settlement_id: str) -> bool:
        return any(l.settlement_id == settlement_id for l in self.logs)
