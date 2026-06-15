from typing import List, Dict, Optional, Any
from datetime import datetime
import uuid

from .models import (
    ComplaintRecord,
    MeetingMinute,
    HistoryEntry,
    ReplayState,
    RecordAction,
    ComplaintStatus,
)


class HistoryManager:
    def __init__(self, state: ReplayState):
        self.state = state

    def record_change(
        self,
        entity_type: str,
        entity_id: str,
        action: RecordAction,
        actor: str,
        before_value: Optional[Dict[str, Any]] = None,
        after_value: Optional[Dict[str, Any]] = None,
        reason: Optional[str] = None,
        source_ref: Optional[str] = None,
    ) -> HistoryEntry:
        entry = HistoryEntry(
            entry_id=f"HIS-{uuid.uuid4().hex[:8]}",
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            actor=actor,
            timestamp=datetime.now(),
            before_value=before_value,
            after_value=after_value,
            reason=reason,
            source_ref=source_ref,
        )
        self.state.history.append(entry)
        self.state.last_updated = datetime.now()
        return entry

    def update_complaint_status(
        self,
        complaint_id: str,
        new_status: ComplaintStatus,
        actor: str,
        reason: str = "",
        handle_result: Optional[str] = None,
    ) -> Optional[ComplaintRecord]:
        if complaint_id not in self.state.records:
            return None

        record = self.state.records[complaint_id]
        before = {
            "status": record.status.value,
            "handler": record.handler,
            "handle_result": record.handle_result,
        }

        old_status = record.status
        record.status = new_status
        if handle_result:
            record.handle_result = handle_result
        if actor:
            record.handler = actor
            record.handle_time = datetime.now()

        after = {
            "status": record.status.value,
            "handler": record.handler,
            "handle_result": record.handle_result,
        }

        self.record_change(
            entity_type="complaint",
            entity_id=complaint_id,
            action=RecordAction.MODIFY,
            actor=actor,
            before_value=before,
            after_value=after,
            reason=reason or f"状态变更: {old_status.value} → {new_status.value}",
        )

        return record

    def add_minute_version(self, minute: MeetingMinute, actor: str = "system") -> bool:
        minute_id = minute.minute_id
        if minute_id not in self.state.minutes:
            self.state.minutes[minute_id] = []

        existing_versions = [m.version for m in self.state.minutes[minute_id]]
        if minute.version in existing_versions:
            return False

        self.state.minutes[minute_id].append(minute)
        self.state.minutes[minute_id].sort(key=lambda m: m.version)

        self.record_change(
            entity_type="meeting_minute",
            entity_id=minute.minute_id,
            action=RecordAction.SUBMIT if minute.version == 1 else RecordAction.MODIFY,
            actor=actor,
            after_value={
                "version": minute.version,
                "title": minute.meeting_title,
                "is_appendum": minute.is_appendum,
                "screenshot_count": len(minute.screenshot_refs),
            },
            reason=f"会议纪要 v{minute.version}",
            source_ref=minute.raw_source[:100] if minute.raw_source else None,
        )
        return True

    def get_entity_history(self, entity_type: str, entity_id: str) -> List[HistoryEntry]:
        return [
            h
            for h in self.state.history
            if h.entity_type == entity_type and h.entity_id == entity_id
        ]

    def get_complaint_history(self, complaint_id: str) -> List[HistoryEntry]:
        return self.get_entity_history("complaint", complaint_id)

    def get_minute_history(self, minute_id: str) -> List[HistoryEntry]:
        return self.get_entity_history("meeting_minute", minute_id)

    def trace_minute_origin(self, minute_id: str) -> Dict[str, Any]:
        versions = self.state.get_minute_versions(minute_id)
        if not versions:
            return {}

        first = versions[0]
        latest = versions[-1]

        return {
            "minute_id": minute_id,
            "original_version": first.version,
            "original_title": first.meeting_title,
            "original_content": first.content,
            "original_time": first.meeting_time,
            "latest_version": latest.version,
            "latest_title": latest.meeting_title,
            "total_versions": len(versions),
            "appendums": [v for v in versions if v.is_appendum],
            "screenshots": latest.screenshot_refs,
            "history_entries": self.get_minute_history(minute_id),
        }

    def get_actor_changes(self, actor: str) -> List[HistoryEntry]:
        return [h for h in self.state.history if h.actor == actor]

    def all_history(self) -> List[HistoryEntry]:
        return sorted(self.state.history, key=lambda h: h.timestamp, reverse=True)
