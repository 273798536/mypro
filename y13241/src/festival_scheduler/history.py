from __future__ import annotations

import json
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from uuid import UUID

from .models import (
    AudioFile,
    ConflictRecord,
    ConflictType,
    HistoryAction,
    HistoryEntry,
    ItemStatus,
    ProcessingResult,
    ScheduleItem,
)


class HistoryManager:
    def __init__(self, history_dir: str, result: Optional[ProcessingResult] = None):
        self.history_dir = Path(history_dir)
        self.history_dir.mkdir(parents=True, exist_ok=True)
        self.result = result or ProcessingResult()
        self._screenshots_dir = self.history_dir / "screenshots"
        self._screenshots_dir.mkdir(exist_ok=True)
        self._notes_dir = self.history_dir / "notes"
        self._notes_dir.mkdir(exist_ok=True)

    def add_note(
        self,
        item: Union[ScheduleItem, ConflictRecord],
        note: str,
        actor: str = "system",
    ) -> HistoryEntry:
        old_notes = list(item.notes) if hasattr(item, "notes") else []
        item.notes.append(note)

        entry = HistoryEntry(
            action=HistoryAction.NOTE_ADDED,
            item_id=item.id,
            actor=actor,
            details={"item_type": type(item).__name__},
            old_value=old_notes,
            new_value=list(item.notes),
            note=note,
        )

        self.result.history.append(entry)
        self._save_note_file(item.id, note, actor)
        self._persist_history()

        return entry

    def add_screenshot(
        self,
        item: Union[ScheduleItem, ConflictRecord],
        screenshot_path: str,
        actor: str = "system",
        caption: Optional[str] = None,
    ) -> HistoryEntry:
        src_path = Path(screenshot_path)
        if not src_path.exists():
            raise FileNotFoundError(f"Screenshot not found: {screenshot_path}")

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest_filename = f"{item.id}_{timestamp}{src_path.suffix}"
        dest_path = self._screenshots_dir / dest_filename

        shutil.copy2(src_path, dest_path)

        if hasattr(item, "screenshots"):
            old_screenshots = list(item.screenshots)
            item.screenshots.append(str(dest_path))
            new_value = list(item.screenshots)
        else:
            old_screenshots = []
            new_value = [str(dest_path)]

        entry = HistoryEntry(
            action=HistoryAction.SCREENSHOT_ADDED,
            item_id=item.id,
            actor=actor,
            details={
                "item_type": type(item).__name__,
                "original_path": screenshot_path,
                "caption": caption,
            },
            old_value=old_screenshots,
            new_value=new_value,
            screenshot_path=str(dest_path),
            note=caption,
        )

        self.result.history.append(entry)
        self._persist_history()

        return entry

    def update_status(
        self,
        item: ScheduleItem,
        new_status: ItemStatus,
        actor: str = "system",
        reason: Optional[str] = None,
    ) -> HistoryEntry:
        old_status = item.status
        item.status = new_status

        entry = HistoryEntry(
            action=HistoryAction.STATUS_CHANGED,
            item_id=item.id,
            actor=actor,
            details={"reason": reason},
            old_value=old_status.value,
            new_value=new_status.value,
            note=reason,
        )

        self.result.history.append(entry)

        if new_status == ItemStatus.PROCESSED:
            self.result.stats.processed += 1
        elif new_status == ItemStatus.SKIPPED:
            self.result.stats.skipped += 1
        elif new_status == ItemStatus.BAD:
            self.result.stats.bad += 1
        elif new_status == ItemStatus.NEEDS_EVIDENCE:
            self.result.stats.needs_evidence += 1
        elif new_status == ItemStatus.NEEDS_CONFIRMATION:
            self.result.stats.needs_confirmation += 1

        self._persist_history()
        return entry

    def update_item_field(
        self,
        item: ScheduleItem,
        field_name: str,
        new_value: Any,
        actor: str = "system",
        reason: Optional[str] = None,
    ) -> HistoryEntry:
        old_value = getattr(item, field_name)
        setattr(item, field_name, new_value)

        entry = HistoryEntry(
            action=HistoryAction.UPDATED,
            item_id=item.id,
            actor=actor,
            details={"field": field_name, "reason": reason},
            old_value=old_value,
            new_value=new_value,
            note=reason,
        )

        self.result.history.append(entry)
        self._persist_history()

        return entry

    def resolve_conflict(
        self,
        conflict: ConflictRecord,
        resolution: str,
        actor: str = "system",
    ) -> HistoryEntry:
        conflict.resolution = resolution
        conflict.resolved_at = datetime.now()
        conflict.resolved_by = actor

        entry = HistoryEntry(
            action=HistoryAction.CONFLICT_RESOLVED,
            item_id=conflict.id,
            actor=actor,
            details={"conflict_type": conflict.conflict_type.value},
            old_value=None,
            new_value=resolution,
            note=resolution,
        )

        self.result.history.append(entry)
        self.result.stats.conflicts_resolved += 1
        self._persist_history()

        return entry

    def manual_confirm(
        self,
        conflict: ConflictRecord,
        confirmation: str,
        actor: str = "operator",
    ) -> HistoryEntry:
        entry = HistoryEntry(
            action=HistoryAction.MANUAL_CONFIRMATION,
            item_id=conflict.id,
            actor=actor,
            details={"conflict_type": conflict.conflict_type.value},
            old_value=conflict.confirmation_reason,
            new_value=confirmation,
            note=confirmation,
        )

        self.result.history.append(entry)
        self._persist_history()

        return entry

    def get_item_history(self, item_id: UUID) -> List[HistoryEntry]:
        return sorted(
            [h for h in self.result.history if h.item_id == item_id],
            key=lambda h: h.timestamp,
        )

    def get_full_history(self) -> List[HistoryEntry]:
        return sorted(self.result.history, key=lambda h: h.timestamp)

    def get_history_by_action(self, action: HistoryAction) -> List[HistoryEntry]:
        return sorted(
            [h for h in self.result.history if h.action == action],
            key=lambda h: h.timestamp,
        )

    def _save_note_file(self, item_id: UUID, note: str, actor: str) -> Path:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        note_file = self._notes_dir / f"{item_id}_{timestamp}.md"

        content = f"""# Note for {item_id}

**Timestamp:** {datetime.now().isoformat()}
**Actor:** {actor}

{note}
"""
        note_file.write_text(content, encoding="utf-8")
        return note_file

    def _persist_history(self) -> None:
        history_file = self.history_dir / "history.json"
        history_data = [
            h.model_dump(mode="json") for h in self.result.history
        ]
        with open(history_file, "w", encoding="utf-8") as f:
            json.dump(history_data, f, ensure_ascii=False, indent=2)

        state_file = self.history_dir / "state.json"
        state_data = {
            "schedule_items": [
                item.model_dump(mode="json") for item in self.result.schedule_items
            ],
            "audio_files": [
                af.model_dump(mode="json") for af in self.result.audio_files
            ],
            "conflicts": [
                c.model_dump(mode="json") for c in self.result.conflicts
            ],
            "stats": self.result.stats.model_dump(mode="json"),
            "bad_rows": self.result.bad_rows,
            "skipped_rows": self.result.skipped_rows,
        }
        with open(state_file, "w", encoding="utf-8") as f:
            json.dump(state_data, f, ensure_ascii=False, indent=2)

    def load_history(self) -> None:
        history_file = self.history_dir / "history.json"
        if history_file.exists():
            with open(history_file, "r", encoding="utf-8") as f:
                history_data = json.load(f)
            self.result.history = [
                HistoryEntry(**h) for h in history_data
            ]

        state_file = self.history_dir / "state.json"
        if state_file.exists():
            with open(state_file, "r", encoding="utf-8") as f:
                state_data = json.load(f)
            self.result.schedule_items = [
                ScheduleItem(**item) for item in state_data.get("schedule_items", [])
            ]
            self.result.audio_files = [
                AudioFile(**af) for af in state_data.get("audio_files", [])
            ]
            self.result.conflicts = [
                ConflictRecord(**c) for c in state_data.get("conflicts", [])
            ]
            if "stats" in state_data:
                from .models import ProcessingStats
                self.result.stats = ProcessingStats(**state_data["stats"])
            self.result.bad_rows = state_data.get("bad_rows", [])
            self.result.skipped_rows = state_data.get("skipped_rows", [])

    def find_item_by_id(self, item_id: str) -> Optional[Union[ScheduleItem, ConflictRecord, AudioFile]]:
        try:
            uuid_id = UUID(item_id)
        except ValueError:
            return None

        for item in self.result.schedule_items:
            if item.id == uuid_id:
                return item

        for conflict in self.result.conflicts:
            if conflict.id == uuid_id:
                return conflict

        for af in self.result.audio_files:
            if af.id == uuid_id:
                return af

        return None

    def find_schedule_by_track_id(self, track_id: str) -> Optional[ScheduleItem]:
        for item in self.result.schedule_items:
            if item.track_id == track_id:
                return item
        return None
