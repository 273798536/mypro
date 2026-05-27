from .models import AuditEntry


class AuditTrail:
    def __init__(self):
        self.entries: list[AuditEntry] = []

    def record(self, action: str, target: str, old_value: str = None, new_value: str = None, source: str = "system", reason: str = ""):
        entry = AuditEntry(
            action=action,
            target=target,
            old_value=old_value,
            new_value=new_value,
            source=source,
            reason=reason,
        )
        self.entries.append(entry)

    def filter_by_action(self, action: str) -> list[AuditEntry]:
        return [e for e in self.entries if e.action == action]

    def filter_by_target(self, target: str) -> list[AuditEntry]:
        return [e for e in self.entries if target in e.target]

    def get_corrections(self) -> list[AuditEntry]:
        return [e for e in self.entries if e.action in ("score_adjusted", "appeal_status_change")]

    def to_dict_list(self) -> list[dict]:
        return [
            {
                "timestamp": e.timestamp,
                "action": e.action,
                "target": e.target,
                "old_value": e.old_value,
                "new_value": e.new_value,
                "source": e.source,
                "reason": e.reason,
            }
            for e in self.entries
        ]
