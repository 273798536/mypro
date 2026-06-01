from datetime import datetime
from typing import Optional

from .models import HistoryEntry, HistoryEventType


class HistoryLog:
    def __init__(self):
        self.entries: list[HistoryEntry] = []
        self._counter = 0

    def _next_id(self) -> str:
        self._counter += 1
        return f"hist_{self._counter:04d}"

    def record(
        self,
        annotation_id: str,
        event_type: HistoryEventType,
        description: str,
        related_clip_id: Optional[str] = None,
        related_report_id: Optional[str] = None,
    ) -> HistoryEntry:
        entry = HistoryEntry(
            entry_id=self._next_id(),
            annotation_id=annotation_id,
            event_type=event_type,
            description=description,
            timestamp=datetime.now().isoformat(),
            superseded_by=None,
            related_clip_id=related_clip_id,
            related_report_id=related_report_id,
        )
        self.entries.append(entry)
        return entry

    def supersede(self, old_entry_id: str, new_entry: HistoryEntry):
        for entry in self.entries:
            if entry.entry_id == old_entry_id:
                entry.superseded_by = new_entry.entry_id
                break

    def get_active_entries(self, annotation_id: Optional[str] = None) -> list[HistoryEntry]:
        results = [e for e in self.entries if e.is_active]
        if annotation_id:
            results = [e for e in results if e.annotation_id == annotation_id]
        return results

    def get_critical_entries(self, annotation_id: Optional[str] = None) -> list[HistoryEntry]:
        results = [e for e in self.entries if e.is_critical and e.is_active]
        if annotation_id:
            results = [e for e in results if e.annotation_id == annotation_id]
        return results

    def get_mis_delete_entries(self) -> list[HistoryEntry]:
        return [
            e
            for e in self.entries
            if e.event_type == HistoryEventType.MIS_DELETE
        ]

    def has_mis_delete(self, annotation_id: str) -> bool:
        return any(
            e.annotation_id == annotation_id
            and e.event_type == HistoryEventType.MIS_DELETE
            for e in self.entries
        )

    def get_full_history(self, annotation_id: str) -> list[HistoryEntry]:
        return [e for e in self.entries if e.annotation_id == annotation_id]

    def format_history(self, annotation_id: Optional[str] = None) -> str:
        entries = self.get_full_history(annotation_id) if annotation_id else self.entries
        if not entries:
            return "无历史记录"

        lines = []
        for e in entries:
            status = "" if e.is_active else f" [已被 {e.superseded_by} 取代]"
            critical = " 🔴" if e.is_critical else ""
            lines.append(
                f"  [{e.timestamp}] {e.event_type.value}: {e.description}{status}{critical}"
            )
        return "\n".join(lines)
