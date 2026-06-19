from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .models import MisjudgmentRecord


class Store:
    def __init__(self, store_path: str | Path = "kb_replay_store.json"):
        self.store_path = Path(store_path)
        self._records: dict[str, MisjudgmentRecord] = {}
        self._load()

    def _load(self) -> None:
        if self.store_path.exists():
            raw = json.loads(self.store_path.read_text(encoding="utf-8"))
            for item in raw.get("records", []):
                rec = MisjudgmentRecord.from_dict(item)
                self._records[rec.id] = rec

    def _save(self) -> None:
        data = {
            "records": [r.to_dict() for r in self._records.values()],
        }
        self.store_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def add(self, record: MisjudgmentRecord) -> MisjudgmentRecord:
        self._records[record.id] = record
        self._save()
        return record

    def get(self, record_id: str) -> MisjudgmentRecord | None:
        return self._records.get(record_id)

    def update(self, record: MisjudgmentRecord) -> MisjudgmentRecord:
        from datetime import datetime
        record.updated_at = datetime.now().isoformat()
        self._records[record.id] = record
        self._save()
        return record

    def find_by_name(self, name: str) -> MisjudgmentRecord | None:
        name_lower = name.lower().strip()
        for rec in self._records.values():
            if rec.name.lower().strip() == name_lower:
                return rec
            for alias in rec.aliases:
                if alias.lower().strip() == name_lower:
                    return rec
        return None

    def find_fuzzy(self, name: str) -> list[MisjudgmentRecord]:
        name_clean = name.lower().replace(" ", "").replace("_", "").replace("-", "")
        matches = []
        for rec in self._records.values():
            candidates = [rec.name] + rec.aliases
            for candidate in candidates:
                candidate_clean = candidate.lower().replace(" ", "").replace("_", "").replace("-", "")
                if name_clean in candidate_clean or candidate_clean in name_clean:
                    matches.append(rec)
                    break
        return matches

    def list_all(self) -> list[MisjudgmentRecord]:
        return list(self._records.values())

    def list_by_status(self, status: str) -> list[MisjudgmentRecord]:
        from .models import RecordStatus
        return [r for r in self._records.values() if r.status == RecordStatus(status)]

    def delete(self, record_id: str) -> bool:
        if record_id in self._records:
            del self._records[record_id]
            self._save()
            return True
        return False
