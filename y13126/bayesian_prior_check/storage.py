from __future__ import annotations

import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from .models import (
    ParsedRecord,
    RunRecord,
    RunStatus,
    RunSummary,
    ValidationIssue,
)


class RunStorage:
    def __init__(self, storage_dir: Optional[str] = None):
        if storage_dir is None:
            storage_dir = os.path.join(os.getcwd(), ".bayes_check_history")
        self.storage_dir = Path(storage_dir)
        self._records_dir = self.storage_dir / "runs"
        self._upload_dir = self.storage_dir / "uploads"
        self._records_dir.mkdir(parents=True, exist_ok=True)
        self._upload_dir.mkdir(parents=True, exist_ok=True)
        self._index_path = self.storage_dir / "index.json"
        self._ensure_index()

    def _ensure_index(self) -> None:
        if not self._index_path.exists():
            self._index_path.write_text(
                json.dumps({"runs": []}, ensure_ascii=False, indent=2)
            )

    def _load_index(self) -> dict:
        with open(self._index_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save_index(self, data: dict) -> None:
        with open(self._index_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)

    def create_run(
        self,
        source_file: str,
        config_file: Optional[str] = None,
        note: Optional[str] = None,
        stored_file_path: Optional[str] = None,
    ) -> RunRecord:
        run_id = datetime.now().strftime("%Y%m%d_%H%M%S_") + uuid.uuid4().hex[:8]
        record = RunRecord(
            run_id=run_id,
            status=RunStatus.PENDING,
            source_file=source_file,
            stored_file_path=stored_file_path,
            config_file=config_file,
            note=note,
        )
        self._save_run(record)
        self._add_to_index(record)
        return record

    def save_uploaded_file(self, run_id: str, filename: str, content: bytes) -> str:
        safe_name = Path(filename).name
        target = self._upload_dir / f"{run_id}_{safe_name}"
        with open(target, "wb") as f:
            f.write(content)
        return str(target.resolve())

    def _run_path(self, run_id: str) -> Path:
        return self._records_dir / f"{run_id}.json"

    def _details_path(self, run_id: str) -> Path:
        return self._records_dir / f"{run_id}_details.jsonl"

    def _save_run(self, record: RunRecord) -> None:
        path = self._run_path(record.run_id)
        data = record.model_dump(mode="json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)

    def _add_to_index(self, record: RunRecord) -> None:
        idx = self._load_index()
        entry = {
            "run_id": record.run_id,
            "status": record.status.value,
            "started_at": record.started_at.isoformat(),
            "source_file": record.source_file,
            "note": record.note,
        }
        idx["runs"].insert(0, entry)
        self._save_index(idx)

    def _update_index_status(self, run_id: str, record: RunRecord) -> None:
        idx = self._load_index()
        for entry in idx["runs"]:
            if entry["run_id"] == run_id:
                entry["status"] = record.status.value
                entry["finished_at"] = record.finished_at.isoformat() if record.finished_at else None
                entry["note"] = record.note
                break
        self._save_index(idx)

    def append_record_details(
        self, run_id: str, parsed: ParsedRecord
    ) -> None:
        path = self._details_path(run_id)
        issues_data = []
        for issue in parsed.issues:
            issues_data.append(issue.model_dump(mode="json"))
        line = json.dumps(
            {
                "row_number": parsed.row_number,
                "outcome": parsed.outcome.value,
                "source_file": parsed.raw_record.source_file,
                "raw_line": parsed.raw_record.raw_line,
                "raw_values": parsed.raw_record.raw_values,
                "parsed_values": parsed.parsed_values,
                "issues": issues_data,
                "parse_errors": parsed.parse_errors,
            },
            ensure_ascii=False,
            default=str,
        )
        with open(path, "a", encoding="utf-8") as f:
            f.write(line + "\n")

    def update_run(self, record: RunRecord) -> None:
        self._save_run(record)
        self._update_index_status(record.run_id, record)

    def finalize_run(
        self,
        record: RunRecord,
        summary: RunSummary,
        error_message: Optional[str] = None,
    ) -> RunRecord:
        record.status = RunStatus.FAILED if error_message else RunStatus.COMPLETED
        record.finished_at = datetime.now()
        record.summary = summary
        record.error_message = error_message
        self.update_run(record)
        return record

    def get_run(self, run_id: str) -> Optional[RunRecord]:
        path = self._run_path(run_id)
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return RunRecord(**data)

    def list_runs(self, limit: int = 20) -> list[RunRecord]:
        idx = self._load_index()
        results = []
        for entry in idx["runs"][:limit]:
            rec = self.get_run(entry["run_id"])
            if rec:
                results.append(rec)
        return results

    def get_run_details(self, run_id: str) -> list[dict]:
        path = self._details_path(run_id)
        if not path.exists():
            return []
        details = []
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    details.append(json.loads(line))
        return details

    def update_note(self, run_id: str, note: str) -> Optional[RunRecord]:
        record = self.get_run(run_id)
        if not record:
            return None
        record.note = note
        self.update_run(record)
        return record
