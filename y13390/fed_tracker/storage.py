import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List, Any
from .models import TaskSummary, ProcessingResult, TaskRecord, TaskStatus


class StateStorage:
    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = Path(base_dir or os.getcwd()) / ".fed_tracker_state"
        self.base_dir.mkdir(exist_ok=True)
        self.summary_file = self.base_dir / "task_summary.json"
        self.records_file = self.base_dir / "task_records.json"
        self.history_file = self.base_dir / "processing_history.json"
        self.notes_file = self.base_dir / "historical_notes.json"

    def save_summary(self, summary: TaskSummary) -> None:
        with open(self.summary_file, "w", encoding="utf-8") as f:
            json.dump(summary.model_dump(mode="json"), f, ensure_ascii=False, indent=2)

    def load_summary(self) -> Optional[TaskSummary]:
        if not self.summary_file.exists():
            return None
        with open(self.summary_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return TaskSummary(**data)

    def save_records(self, records: List[TaskRecord]) -> None:
        records_dict = [r.model_dump(mode="json") for r in records]
        with open(self.records_file, "w", encoding="utf-8") as f:
            json.dump(records_dict, f, ensure_ascii=False, indent=2)

    def load_records(self) -> List[TaskRecord]:
        if not self.records_file.exists():
            return []
        with open(self.records_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return [TaskRecord(**r) for r in data]

    def add_processing_result(self, result: ProcessingResult) -> None:
        history = self._load_history()
        history.append(result.model_dump(mode="json"))
        with open(self.history_file, "w", encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False, indent=2)

    def _load_history(self) -> List[Dict[str, Any]]:
        if not self.history_file.exists():
            return []
        with open(self.history_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def load_history(self) -> List[ProcessingResult]:
        return [ProcessingResult(**r) for r in self._load_history()]

    def add_note(self, note: str) -> None:
        notes = self.load_notes()
        timestamp = datetime.now().isoformat()
        notes.append(f"[{timestamp}] {note}")
        with open(self.notes_file, "w", encoding="utf-8") as f:
            json.dump(notes, f, ensure_ascii=False, indent=2)

    def load_notes(self) -> List[str]:
        if not self.notes_file.exists():
            return []
        with open(self.notes_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def clear(self) -> None:
        for f in [self.summary_file, self.records_file, self.history_file, self.notes_file]:
            if f.exists():
                f.unlink()

    def verify_consistency(self) -> Dict[str, bool]:
        summary = self.load_summary()
        records = self.load_records()
        history = self.load_history()
        notes = self.load_notes()

        result = {
            "summary_exists": summary is not None,
            "records_consistent": True,
            "notes_in_summary": True,
            "status_matches": True,
        }

        if summary:
            historical_notes_set = set(summary.historical_notes)
            for note in notes:
                if note not in historical_notes_set:
                    result["notes_in_summary"] = False
                    break

            status_counts = {
                TaskStatus.PROCESSED: 0,
                TaskStatus.SKIPPED: 0,
                TaskStatus.BAD_RECORD: 0,
                TaskStatus.REVISED: 0,
            }
            for r in records:
                if r.status in status_counts:
                    status_counts[r.status] += 1

            if status_counts[TaskStatus.PROCESSED] != summary.processed:
                result["status_matches"] = False
            if status_counts[TaskStatus.SKIPPED] != summary.skipped:
                result["status_matches"] = False
            if status_counts[TaskStatus.BAD_RECORD] != summary.bad_records:
                result["status_matches"] = False
            if status_counts[TaskStatus.REVISED] != summary.revised:
                result["status_matches"] = False

            if len(records) != summary.total:
                result["records_consistent"] = False

        return result
