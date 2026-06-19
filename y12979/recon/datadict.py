from __future__ import annotations

import json
import os
from typing import Dict, List, Optional

from .models import DataDictEntry


DATADICT_FILE = "data_dictionary.json"


def _datadict_path(output_dir: str) -> str:
    return os.path.join(output_dir, DATADICT_FILE)


def load_data_dictionary(output_dir: str) -> Dict[str, DataDictEntry]:
    fpath = _datadict_path(output_dir)
    if not os.path.isfile(fpath):
        return {}
    with open(fpath, encoding="utf-8") as f:
        data = json.load(f)
    entries = {}
    for item in data:
        entry = DataDictEntry(
            field_name=item.get("field_name", ""),
            field_type=item.get("field_type", "string"),
            description=item.get("description", ""),
            source=item.get("source", ""),
            last_updated=item.get("last_updated", ""),
            is_new=item.get("is_new", False),
        )
        entries[entry.field_name] = entry
    return entries


def save_data_dictionary(output_dir: str, entries: Dict[str, DataDictEntry]) -> None:
    os.makedirs(output_dir, exist_ok=True)
    fpath = _datadict_path(output_dir)
    data = []
    for entry in entries.values():
        data.append(
            {
                "field_name": entry.field_name,
                "field_type": entry.field_type,
                "description": entry.description,
                "source": entry.source,
                "last_updated": entry.last_updated,
                "is_new": entry.is_new,
            }
        )
    with open(fpath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def register_new_fields(
    output_dir: str,
    field_names: List[str],
    source: str = "auto_detected",
) -> List[DataDictEntry]:
    existing = load_data_dictionary(output_dir)
    new_entries: List[DataDictEntry] = []
    for name in field_names:
        if name in existing:
            continue
        entry = DataDictEntry(
            field_name=name,
            field_type="unknown",
            description="",
            source=source,
            is_new=True,
        )
        existing[name] = entry
        new_entries.append(entry)
    if new_entries:
        save_data_dictionary(output_dir, existing)
    return new_entries


def supplement_field(
    output_dir: str,
    field_name: str,
    description: str,
    field_type: str = "string",
) -> Optional[DataDictEntry]:
    existing = load_data_dictionary(output_dir)
    if field_name not in existing:
        return None
    entry = existing[field_name]
    entry.description = description
    entry.field_type = field_type
    entry.is_new = False
    save_data_dictionary(output_dir, existing)
    return entry


def get_all_entries(output_dir: str) -> Dict[str, DataDictEntry]:
    return load_data_dictionary(output_dir)


def get_new_entries(output_dir: str) -> List[DataDictEntry]:
    entries = load_data_dictionary(output_dir)
    return [e for e in entries.values() if e.is_new]
