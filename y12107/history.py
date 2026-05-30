from __future__ import annotations

import copy
from dataclasses import dataclass, field
from typing import Any, Optional

from engine import ScheduleResult


@dataclass(frozen=True)
class ScheduleSnapshot:
    version: int
    result: dict[str, Any]
    timestamp: str
    trigger: str
    building_snapshot: dict[str, Any]
    order_snapshot: dict[str, Any]
    shift_snapshot: dict[str, Any]


@dataclass
class DiffEntry:
    field_path: str
    old_value: Any
    new_value: Any
    change_type: str


@dataclass
class ScheduleDiff:
    old_version: int
    new_version: int
    changes: list[DiffEntry]
    added_steps: list[dict[str, Any]]
    removed_steps: list[dict[str, Any]]
    modified_steps: list[dict[str, Any]]
    total_distance_old: float
    total_distance_new: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "old_version": self.old_version,
            "new_version": self.new_version,
            "total_distance_change": {
                "old": self.total_distance_old,
                "new": self.total_distance_new,
                "delta": self.total_distance_new - self.total_distance_old,
            },
            "added_steps": self.added_steps,
            "removed_steps": self.removed_steps,
            "modified_steps": self.modified_steps,
            "field_changes": [
                {
                    "field": c.field_path,
                    "old": c.old_value,
                    "new": c.new_value,
                    "type": c.change_type,
                }
                for c in self.changes
            ],
        }

    @property
    def has_changes(self) -> bool:
        return bool(self.changes or self.added_steps or self.removed_steps or self.modified_steps)


class HistoryManager:
    def __init__(self) -> None:
        self._snapshots: list[ScheduleSnapshot] = []
        self._next_version: int = 1

    def record(
        self,
        result: ScheduleResult,
        buildings: dict[str, Any],
        orders: dict[str, Any],
        shifts: dict[str, Any],
        trigger: str = "schedule",
        timestamp: Optional[str] = None,
    ) -> ScheduleSnapshot:
        from datetime import datetime

        ts = timestamp or datetime.now().isoformat()
        version = self._next_version
        self._next_version += 1
        snapshot = ScheduleSnapshot(
            version=version,
            result=copy.deepcopy(result.to_dict()),
            timestamp=ts,
            trigger=trigger,
            building_snapshot=copy.deepcopy(buildings),
            order_snapshot=copy.deepcopy(orders),
            shift_snapshot=copy.deepcopy(shifts),
        )
        self._snapshots.append(snapshot)
        return snapshot

    def get_snapshot(self, version: int) -> Optional[ScheduleSnapshot]:
        for s in self._snapshots:
            if s.version == version:
                return s
        return None

    def get_latest(self) -> Optional[ScheduleSnapshot]:
        return self._snapshots[-1] if self._snapshots else None

    def list_versions(self) -> list[dict[str, Any]]:
        return [
            {
                "version": s.version,
                "timestamp": s.timestamp,
                "trigger": s.trigger,
                "total_distance": s.result.get("total_distance", 0),
                "steps_count": len(s.result.get("steps", [])),
            }
            for s in self._snapshots
        ]

    def diff(self, old_version: int, new_version: int) -> Optional[ScheduleDiff]:
        old_snap = self.get_snapshot(old_version)
        new_snap = self.get_snapshot(new_version)
        if old_snap is None or new_snap is None:
            return None

        old_result = old_snap.result
        new_result = new_snap.result

        changes: list[DiffEntry] = []

        old_dist = old_result.get("total_distance", 0.0)
        new_dist = new_result.get("total_distance", 0.0)
        if old_dist != new_dist:
            changes.append(
                DiffEntry(
                    field_path="total_distance",
                    old_value=old_dist,
                    new_value=new_dist,
                    change_type="modified",
                )
            )

        for field_name in ["unreachable_orders", "closed_door_buildings", "unassigned_orders", "warnings"]:
            old_val = old_result.get(field_name, [])
            new_val = new_result.get(field_name, [])
            if old_val != new_val:
                changes.append(
                    DiffEntry(
                        field_path=field_name,
                        old_value=old_val,
                        new_value=new_val,
                        change_type="modified",
                    )
                )

        old_steps = {s["order_id"]: s for s in old_result.get("steps", [])}
        new_steps = {s["order_id"]: s for s in new_result.get("steps", [])}

        added = []
        removed = []
        modified = []

        for oid, ns in new_steps.items():
            if oid not in old_steps:
                added.append(ns)
            else:
                os = old_steps[oid]
                mods: dict[str, Any] = {"order_id": oid, "changes": []}
                for k in ["building_id", "shift_id", "priority", "distance", "path", "notes"]:
                    if os.get(k) != ns.get(k):
                        mods["changes"].append(
                            {
                                "field": k,
                                "old": os.get(k),
                                "new": ns.get(k),
                            }
                        )
                if mods["changes"]:
                    modified.append(mods)

        for oid in old_steps:
            if oid not in new_steps:
                removed.append(old_steps[oid])

        return ScheduleDiff(
            old_version=old_version,
            new_version=new_version,
            changes=changes,
            added_steps=added,
            removed_steps=removed,
            modified_steps=modified,
            total_distance_old=old_dist,
            total_distance_new=new_dist,
        )

    def replay(self, up_to_version: Optional[int] = None) -> list[dict[str, Any]]:
        versions = self.list_versions()
        if up_to_version is not None:
            versions = [v for v in versions if v["version"] <= up_to_version]
        return versions

    @property
    def snapshot_count(self) -> int:
        return len(self._snapshots)
