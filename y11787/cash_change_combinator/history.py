from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from models import HistoryEntry, SourceLocation


class History:
    def __init__(self) -> None:
        self.entries: list[HistoryEntry] = []

    def record(
        self,
        action: str,
        detail: str = "",
        source: SourceLocation | None = None,
        corrections: list[dict[str, Any]] | None = None,
    ) -> HistoryEntry:
        entry = HistoryEntry(
            action=action,
            detail=detail,
            source=source,
            corrections=corrections or [],
        )
        self.entries.append(entry)
        return entry

    def record_correction(
        self,
        original_action: str,
        original_detail: str,
        corrected_detail: str,
        reason: str,
        source: SourceLocation | None = None,
    ) -> HistoryEntry:
        return self.record(
            action=f"correction:{original_action}",
            detail=corrected_detail,
            source=source,
            corrections=[
                {
                    "original_action": original_action,
                    "original_detail": original_detail,
                    "corrected_detail": corrected_detail,
                    "reason": reason,
                }
            ],
        )

    def to_list(self) -> list[dict[str, Any]]:
        return [e.to_dict() for e in self.entries]

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(self.to_list(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    @classmethod
    def load(cls, path: Path) -> "History":
        h = cls()
        if path.exists():
            data = json.loads(path.read_text(encoding="utf-8"))
            for item in data:
                src = None
                if "source" in item and item["source"]:
                    parts = str(item["source"]).rsplit(":", 1)
                    if len(parts) == 2:
                        try:
                            src = SourceLocation(file=parts[0], line=int(parts[1]))
                        except ValueError:
                            src = SourceLocation(file=str(item["source"]), line=0)
                entry = HistoryEntry(
                    id=item.get("id", ""),
                    timestamp=item.get("timestamp", ""),
                    action=item.get("action", ""),
                    detail=item.get("detail", ""),
                    source=src,
                    corrections=item.get("corrections", []),
                )
                h.entries.append(entry)
        return h


def make_run_dir(output_root: Path) -> Path:
    output_root.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = output_root / f"run_{ts}"
    counter = 1
    while run_dir.exists():
        run_dir = output_root / f"run_{ts}_{counter:03d}"
        counter += 1
    run_dir.mkdir(parents=True)
    return run_dir
