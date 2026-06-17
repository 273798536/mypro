from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fewshot_sampler.schemas import FeedbackStatus


@dataclass
class FeedbackEntry:
    feedback_id: str
    batch_id: str
    record_id: str
    anomaly_index: Optional[int] = None
    status: FeedbackStatus = FeedbackStatus.PENDING
    comment: str = ""
    handler: str = ""
    resolution: str = ""
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    tags: List[str] = field(default_factory=list)
    attachments: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["status"] = self.status.value
        d["状态标签"] = self.status.label
        return d


class FeedbackManager:
    FEEDBACK_DIR = "feedback"
    INDEX_FILE = "feedback_index.jsonl"

    def __init__(self, storage_root: str = "./.fewshot_storage"):
        self.root = Path(storage_root).resolve()
        self.fb_dir = self.root / self.FEEDBACK_DIR
        self.fb_dir.mkdir(parents=True, exist_ok=True)
        self.index_path = self.fb_dir / self.INDEX_FILE

    def _next_id(self, batch_id: str) -> str:
        existing = self._list_feedback_ids(batch_id)
        return f"FB-{batch_id}-{len(existing) + 1:04d}"

    def _list_feedback_ids(self, batch_id: str) -> List[str]:
        ids = []
        if self.index_path.exists():
            with open(self.index_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            entry = json.loads(line)
                            if entry.get("batch_id") == batch_id:
                                ids.append(entry.get("feedback_id", ""))
                        except json.JSONDecodeError:
                            continue
        return ids

    def add_feedback(
        self,
        batch_id: str,
        record_id: str,
        status: FeedbackStatus = FeedbackStatus.PENDING,
        comment: str = "",
        handler: str = "",
        resolution: str = "",
        anomaly_index: Optional[int] = None,
        tags: Optional[List[str]] = None,
    ) -> FeedbackEntry:
        fid = self._next_id(batch_id)
        now = datetime.now().isoformat()
        entry = FeedbackEntry(
            feedback_id=fid,
            batch_id=batch_id,
            record_id=record_id,
            anomaly_index=anomaly_index,
            status=status,
            comment=comment,
            handler=handler,
            resolution=resolution,
            created_at=now,
            updated_at=now,
            tags=tags or [],
        )
        with open(self.index_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry.to_dict(), ensure_ascii=False) + "\n")
        record_file = self.fb_dir / f"{fid}.json"
        with open(record_file, "w", encoding="utf-8") as f:
            json.dump(entry.to_dict(), f, ensure_ascii=False, indent=2)
        return entry

    def update_status(
        self,
        feedback_id: str,
        status: FeedbackStatus,
        comment: str = "",
        handler: str = "",
        resolution: str = "",
    ) -> Optional[FeedbackEntry]:
        all_entries = self._read_all()
        target_idx = None
        for i, e in enumerate(all_entries):
            if e.feedback_id == feedback_id:
                target_idx = i
                break
        if target_idx is None:
            return None
        entry = all_entries[target_idx]
        entry.status = status
        if comment:
            entry.comment = (entry.comment + "\n" + comment).strip() if entry.comment else comment
        if handler:
            entry.handler = handler
        if resolution:
            entry.resolution = resolution
        entry.updated_at = datetime.now().isoformat()
        all_entries[target_idx] = entry
        self._rewrite_all(all_entries)
        record_file = self.fb_dir / f"{feedback_id}.json"
        with open(record_file, "w", encoding="utf-8") as f:
            json.dump(entry.to_dict(), f, ensure_ascii=False, indent=2)
        return entry

    def get_feedback(self, feedback_id: str) -> Optional[FeedbackEntry]:
        record_file = self.fb_dir / f"{feedback_id}.json"
        if not record_file.exists():
            return None
        try:
            with open(record_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            return self._dict_to_entry(data)
        except (json.JSONDecodeError, TypeError):
            return None

    def list_by_record(self, batch_id: str, record_id: str) -> List[FeedbackEntry]:
        result = []
        if self.index_path.exists():
            with open(self.index_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            data = json.loads(line)
                            if data.get("batch_id") == batch_id and data.get("record_id") == record_id:
                                result.append(self._dict_to_entry(data))
                        except json.JSONDecodeError:
                            continue
        result.sort(key=lambda e: e.created_at)
        return result

    def list_by_batch(self, batch_id: str) -> List[FeedbackEntry]:
        result = []
        if self.index_path.exists():
            with open(self.index_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            data = json.loads(line)
                            if data.get("batch_id") == batch_id:
                                result.append(self._dict_to_entry(data))
                        except json.JSONDecodeError:
                            continue
        result.sort(key=lambda e: e.created_at)
        return result

    def list_by_status(self, batch_id: str, status: FeedbackStatus) -> List[FeedbackEntry]:
        all_batch = self.list_by_batch(batch_id)
        return [e for e in all_batch if e.status == status]

    def stats(self, batch_id: str) -> Dict[str, int]:
        all_batch = self.list_by_batch(batch_id)
        result = {s.label: 0 for s in FeedbackStatus}
        result["总反馈数"] = len(all_batch)
        for e in all_batch:
            result[e.status.label] += 1
        return result

    def _read_all(self) -> List[FeedbackEntry]:
        result = []
        if self.index_path.exists():
            with open(self.index_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            result.append(self._dict_to_entry(json.loads(line)))
                        except json.JSONDecodeError:
                            continue
        return result

    def _rewrite_all(self, entries: List[FeedbackEntry]) -> None:
        tmp_path = self.index_path.with_suffix(".tmp")
        with open(tmp_path, "w", encoding="utf-8") as f:
            for e in entries:
                f.write(json.dumps(e.to_dict(), ensure_ascii=False) + "\n")
        tmp_path.replace(self.index_path)

    def _dict_to_entry(self, data: Dict[str, Any]) -> FeedbackEntry:
        return FeedbackEntry(
            feedback_id=data.get("feedback_id", ""),
            batch_id=data.get("batch_id", ""),
            record_id=data.get("record_id", ""),
            anomaly_index=data.get("anomaly_index"),
            status=FeedbackStatus(data.get("status", FeedbackStatus.PENDING.value)),
            comment=data.get("comment", ""),
            handler=data.get("handler", ""),
            resolution=data.get("resolution", ""),
            created_at=data.get("created_at", ""),
            updated_at=data.get("updated_at", ""),
            tags=data.get("tags", []),
            attachments=data.get("attachments", []),
        )
