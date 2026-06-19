import os
import json
from datetime import datetime
from typing import List
from .models import HistoryEntry


HISTORY_FILENAME = "history.json"


def load_history(output_dir: str) -> List[HistoryEntry]:
    history = []
    fpath = os.path.join(output_dir, HISTORY_FILENAME)
    if not os.path.isfile(fpath):
        return history

    with open(fpath, "r", encoding="utf-8") as f:
        data = json.load(f)

    for item in data:
        history.append(HistoryEntry(
            timestamp=item.get("timestamp", ""),
            sample_id=item.get("sample_id", ""),
            field=item.get("field", ""),
            old_value=item.get("old_value", ""),
            new_value=item.get("new_value", ""),
            operator=item.get("operator", ""),
            reason=item.get("reason", ""),
        ))
    return history


def save_history(history: List[HistoryEntry], output_dir: str) -> None:
    os.makedirs(output_dir, exist_ok=True)
    fpath = os.path.join(output_dir, HISTORY_FILENAME)
    data = [
        {
            "timestamp": h.timestamp,
            "sample_id": h.sample_id,
            "field": h.field,
            "old_value": h.old_value,
            "new_value": h.new_value,
            "operator": h.operator,
            "reason": h.reason,
        }
        for h in history
    ]
    with open(fpath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def add_history_entry(
    history: List[HistoryEntry],
    sample_id: str,
    field: str,
    old_value: str,
    new_value: str,
    operator: str = "unknown",
    reason: str = "",
) -> HistoryEntry:
    entry = HistoryEntry(
        timestamp=datetime.now().isoformat(),
        sample_id=sample_id,
        field=field,
        old_value=old_value,
        new_value=new_value,
        operator=operator,
        reason=reason,
    )
    history.append(entry)
    return entry


def get_sample_history(history: List[HistoryEntry], sample_id: str) -> List[HistoryEntry]:
    return [h for h in history if h.sample_id == sample_id]
