from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from models import HistoryEntry, QASample, VersionNote


def _json_default(obj: Any) -> Any:
    if isinstance(obj, datetime):
        return obj.isoformat()
    if hasattr(obj, "value"):
        return obj.value
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def load_json(filepath: Path) -> Dict[str, Any]:
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(filepath: Path, data: Any) -> None:
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=_json_default)


def load_samples(filepath: Path) -> List[QASample]:
    raw = load_json(filepath)
    return [QASample(**item) for item in raw]


def load_version_note(filepath: Path) -> VersionNote:
    raw = load_json(filepath)
    return VersionNote(**raw)


def load_history(filepath: Path) -> List[HistoryEntry]:
    if not filepath.exists():
        return []
    raw = load_json(filepath)
    return [HistoryEntry(**item) for item in raw]


def save_history(filepath: Path, entries: List[HistoryEntry]) -> None:
    save_json(filepath, [e.model_dump() for e in entries])


def append_history(filepath: Path, entry: HistoryEntry) -> None:
    entries = load_history(filepath)
    entries.append(entry)
    save_history(filepath, entries)


def format_datetime(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def banner(text: str, char: str = "=") -> str:
    return char * 60 + f"\n  {text}\n" + char * 60


def divider(char: str = "-") -> str:
    return char * 60
