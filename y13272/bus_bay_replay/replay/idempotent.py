from typing import Set, Tuple
from .models import ComplaintRecord, RecordAction, HistoryEntry, ReplayState
from datetime import datetime
import uuid


class IdempotencyManager:
    def __init__(self, state: ReplayState):
        self.state = state

    def check_and_mark(self, record: ComplaintRecord) -> Tuple[bool, str]:
        key = record.idempotency_key()
        if key in self.state.idempotency_seen:
            return False, f"重复提交已忽略: {record.complaint_id} (key={key[:8]}...)"
        self.state.idempotency_seen.add(key)
        return True, "新记录"

    def is_duplicate(self, record: ComplaintRecord) -> bool:
        return record.idempotency_key() in self.state.idempotency_seen

    def process_withdraw(self, record: ComplaintRecord, actor: str) -> bool:
        key = record.idempotency_key()
        if key not in self.state.idempotency_seen:
            return False

        entry = HistoryEntry(
            entry_id=f"HIS-{uuid.uuid4().hex[:8]}",
            entity_type="complaint",
            entity_id=record.complaint_id,
            action=RecordAction.WITHDRAW,
            actor=actor,
            timestamp=datetime.now(),
            before_value={"status": record.status.value, "idempotency_key": key},
            after_value={"status": "withdrawn"},
            reason="撤回操作",
            source_ref="manual_withdraw",
        )
        self.state.history.append(entry)
        return True

    def batch_process(self, records, actor: str = "system") -> Tuple[int, int, list]:
        accepted = 0
        duplicates = 0
        messages = []

        for record in records:
            ok, msg = self.check_and_mark(record)
            if ok:
                accepted += 1
                entry = HistoryEntry(
                    entry_id=f"HIS-{uuid.uuid4().hex[:8]}",
                    entity_type="complaint",
                    entity_id=record.complaint_id,
                    action=RecordAction.SUBMIT,
                    actor=actor,
                    timestamp=record.submit_time,
                    after_value={
                        "bay_name": record.bay_name,
                        "status": record.status.value,
                        "description": record.description[:50] + "..." if len(record.description) > 50 else record.description,
                    },
                    reason="初始提交",
                    source_ref=record.source,
                )
                self.state.history.append(entry)
            else:
                duplicates += 1
                messages.append(f"[去重] {record.complaint_id}: {msg}")

        return accepted, duplicates, messages

    def stats(self) -> dict:
        return {
            "total_seen": len(self.state.idempotency_seen),
        }
