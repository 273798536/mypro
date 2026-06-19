from __future__ import annotations

from collections import Counter
from typing import Any

from .models import DataDictEntry, IndexSuggestion


def load_data_dict(path: str) -> list[DataDictEntry]:
    import csv

    entries: list[DataDictEntry] = []
    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            is_uk = str(row.get("is_unique_key", "")).strip().lower()
            entries.append(
                DataDictEntry(
                    field_name=row.get("field_name", "").strip(),
                    field_type=row.get("field_type", "").strip(),
                    is_unique_key=is_uk in ("true", "1", "yes"),
                    description=row.get("description", "").strip(),
                )
            )
    return entries


def suggest_index(
    data_dict: list[DataDictEntry] | None,
    sample_rows: list[dict[str, str]],
    previous_suggestion: IndexSuggestion | None = None,
) -> IndexSuggestion:
    explicit_keys: list[str] = []
    if data_dict:
        explicit_keys = [e.field_name for e in data_dict if e.is_unique_key]

    if explicit_keys:
        return IndexSuggestion(
            suggested_key_fields=explicit_keys,
            confidence=1.0,
            reason="数据字典显式指定唯一键字段",
        )

    if previous_suggestion and previous_suggestion.confidence >= 1.0:
        return previous_suggestion

    heuristic_keys = _heuristic_key_fields(sample_rows)

    if heuristic_keys:
        if previous_suggestion and previous_suggestion.suggested_key_fields == heuristic_keys:
            return previous_suggestion
        return IndexSuggestion(
            suggested_key_fields=heuristic_keys,
            confidence=0.7,
            reason="基于字段值分布启发式推断(数据字典尚未指定唯一键)",
        )

    if previous_suggestion and previous_suggestion.suggested_key_fields:
        return previous_suggestion

    return IndexSuggestion(
        suggested_key_fields=[],
        confidence=0.0,
        reason="无法推断唯一键,需等待数据字典或人工指定",
    )


def _heuristic_key_fields(rows: list[dict[str, str]]) -> list[str]:
    if not rows:
        return []

    all_fields = list(rows[0].keys())
    field_uniqueness: dict[str, float] = {}

    for f in all_fields:
        values = [row.get(f, "").strip() for row in rows]
        non_empty = [v for v in values if v]
        if not non_empty:
            field_uniqueness[f] = 0.0
            continue
        counter = Counter(non_empty)
        unique_ratio = len(counter) / len(non_empty)
        field_uniqueness[f] = unique_ratio

    name_hints_all = [f for f in all_fields if any(hint in f.lower() for hint in ("id", "no", "code", "编号", "代码", "单号", "工号"))]
    name_hints_unique = [f for f in name_hints_all if field_uniqueness.get(f, 0) >= 0.5]

    if name_hints_unique:
        name_hints_unique.sort(key=lambda f: field_uniqueness[f], reverse=True)
        return sorted(name_hints_unique[:1])

    candidates = [f for f, ratio in field_uniqueness.items() if ratio >= 0.95]
    if candidates:
        candidates.sort(key=lambda f: field_uniqueness[f], reverse=True)
        return [candidates[0]]

    return []


def index_suggestion_changed(
    old: IndexSuggestion | None, new: IndexSuggestion | None
) -> bool:
    if old is None and new is None:
        return False
    if old is None or new is None:
        return True
    return old.suggested_key_fields != new.suggested_key_fields


def describe_index_diff(
    old: IndexSuggestion | None, new: IndexSuggestion | None
) -> dict[str, Any]:
    return {
        "changed": index_suggestion_changed(old, new),
        "old_fields": old.suggested_key_fields if old else [],
        "new_fields": new.suggested_key_fields if new else [],
        "old_reason": old.reason if old else "",
        "new_reason": new.reason if new else "",
        "old_confidence": old.confidence if old else 0.0,
        "new_confidence": new.confidence if new else 0.0,
    }
