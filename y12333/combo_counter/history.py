from __future__ import annotations

import copy
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional


@dataclass
class HistoryEntry:
    rule_a: str
    rule_b: str
    field_name: str
    old_value: Any
    new_value: Any
    operator: str
    note: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict[str, Any]:
        return {
            "rule_a": self.rule_a,
            "rule_b": self.rule_b,
            "field_name": self.field_name,
            "old_value": self.old_value,
            "new_value": self.new_value,
            "operator": self.operator,
            "note": self.note,
            "timestamp": self.timestamp,
        }


class HistoryTracker:
    def __init__(self):
        self._entries: list[HistoryEntry] = []

    def record(
        self,
        rule_a: str,
        rule_b: str,
        field: str,
        old_value: Any,
        new_value: Any,
        operator: str = "system",
        note: str = "",
    ) -> HistoryEntry:
        entry = HistoryEntry(
            rule_a=rule_a,
            rule_b=rule_b,
            field_name=field,
            old_value=old_value,
            new_value=new_value,
            operator=operator,
            note=note,
        )
        self._entries.append(entry)
        return entry

    def get_entries(
        self,
        rule_a: Optional[str] = None,
        rule_b: Optional[str] = None,
        field_name: Optional[str] = None,
    ) -> list[HistoryEntry]:
        results = self._entries
        if rule_a is not None:
            results = [e for e in results if e.rule_a == rule_a]
        if rule_b is not None:
            results = [e for e in results if e.rule_b == rule_b]
        if field_name is not None:
            results = [e for e in results if e.field_name == field_name]
        return results

    def compare_history(
        self, rule_a: str, rule_b: str
    ) -> list[dict[str, Any]]:
        entries = self.get_entries(rule_a=rule_a, rule_b=rule_b)
        if not entries:
            return []

        comparison = []
        for i, entry in enumerate(entries):
            item = {
                "step": i + 1,
                "timestamp": entry.timestamp,
                "operator": entry.operator,
                "field": entry.field_name,
                "old_value": entry.old_value,
                "new_value": entry.new_value,
                "note": entry.note,
            }
            if i > 0:
                prev = entries[i - 1]
                item["changed_from_previous"] = (
                    entry.old_value != prev.new_value or entry.field_name != prev.field_name
                )
            else:
                item["changed_from_previous"] = False
            comparison.append(item)
        return comparison

    def detect_conflicts(self) -> list[dict[str, Any]]:
        conflicts = []
        by_pair: dict[str, list[HistoryEntry]] = {}
        for e in self._entries:
            key = f"{e.rule_a}::{e.rule_b}"
            by_pair.setdefault(key, []).append(e)

        for pair_key, entries in by_pair.items():
            field_entries: dict[str, list[HistoryEntry]] = {}
            for e in entries:
                field_entries.setdefault(e.field_name, []).append(e)

            for fname, fentries in field_entries.items():
                for i in range(1, len(fentries)):
                    prev = fentries[i - 1]
                    curr = fentries[i]
                    if prev.new_value != curr.old_value:
                        conflicts.append(
                            {
                                "pair": pair_key,
                                "field": fname,
                                "conflict_type": "value_mismatch",
                                "description": (
                                    f"Previous new_value '{prev.new_value}' != "
                                    f"current old_value '{curr.old_value}' — "
                                    f"an intermediate change was lost."
                                ),
                                "previous_entry": prev.to_dict(),
                                "current_entry": curr.to_dict(),
                                "impact": (
                                    f"The pruning explanation for {pair_key} was modified "
                                    f"outside the tracked flow. The current displayed value "
                                    f"'{curr.new_value}' may not reflect all changes."
                                ),
                            }
                        )

                if len(fentries) > 1:
                    last = fentries[-1]
                    conflicts.append(
                        {
                            "pair": pair_key,
                            "field": fname,
                            "conflict_type": "manual_override",
                            "description": (
                                f"Field '{fname}' for {pair_key} was modified "
                                f"{len(fentries)} time(s). Last by '{last.operator}'."
                            ),
                            "last_value": last.new_value,
                            "impact": (
                                f"The final value '{last.new_value}' was set by "
                                f"'{last.operator}' at {last.timestamp}. "
                                f"Verify this override is intentional."
                            ),
                        }
                    )

        return conflicts

    def all_entries(self) -> list[HistoryEntry]:
        return list(self._entries)

    def to_dict_list(self) -> list[dict[str, Any]]:
        return [e.to_dict() for e in self._entries]
