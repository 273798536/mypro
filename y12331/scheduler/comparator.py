from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from .models import (
    ScheduleContext, ScheduleVersion, ScheduleEntry,
    ScheduleStatus, ConflictType
)


@dataclass
class ScheduleDiff:
    course_id: str
    change_type: str
    old_value: str
    new_value: str
    field: str


@dataclass
class VersionComparison:
    old_version: int
    new_version: int
    added_courses: List[str]
    removed_courses: List[str]
    time_changes: List[ScheduleDiff]
    status_changes: List[ScheduleDiff]
    conflict_changes: List[Tuple[str, str, str]]
    total_conflicts_old: int
    total_conflicts_new: int


class ScheduleComparator:
    def __init__(self, context: ScheduleContext):
        self.context = context

    def compare_versions(self, old_version: int, new_version: int) -> Optional[VersionComparison]:
        old = self._get_version(old_version)
        new = self._get_version(new_version)

        if not old or not new:
            return None

        old_ids = set(old.entries.keys())
        new_ids = set(new.entries.keys())

        added = list(new_ids - old_ids)
        removed = list(old_ids - new_ids)
        common = old_ids & new_ids

        time_changes = []
        status_changes = []
        conflict_changes = []

        for cid in common:
            old_entry = old.entries[cid]
            new_entry = new.entries[cid]

            if str(old_entry.time_slot) != str(new_entry.time_slot):
                time_changes.append(ScheduleDiff(
                    course_id=cid,
                    change_type='时间变更',
                    old_value=str(old_entry.time_slot),
                    new_value=str(new_entry.time_slot),
                    field='time_slot'
                ))

            if old_entry.status != new_entry.status:
                status_changes.append(ScheduleDiff(
                    course_id=cid,
                    change_type='状态变更',
                    old_value=old_entry.status.value,
                    new_value=new_entry.status.value,
                    field='status'
                ))

            old_conflicts = set(c.description for c in old_entry.conflicts)
            new_conflicts = set(c.description for c in new_entry.conflicts)

            for c in old_conflicts - new_conflicts:
                conflict_changes.append((cid, '冲突解决', c))
            for c in new_conflicts - old_conflicts:
                conflict_changes.append((cid, '新增冲突', c))

        return VersionComparison(
            old_version=old_version,
            new_version=new_version,
            added_courses=added,
            removed_courses=removed,
            time_changes=time_changes,
            status_changes=status_changes,
            conflict_changes=conflict_changes,
            total_conflicts_old=len(old.get_conflicts()),
            total_conflicts_new=len(new.get_conflicts())
        )

    def compare_latest(self) -> Optional[VersionComparison]:
        if len(self.context.versions) < 2:
            return None
        return self.compare_versions(
            self.context.versions[-2].version,
            self.context.versions[-1].version
        )

    def _get_version(self, version_num: int) -> Optional[ScheduleVersion]:
        for v in self.context.versions:
            if v.version == version_num:
                return v
        return None

    def get_version_summary(self, version_num: int) -> Optional[Dict]:
        version = self._get_version(version_num)
        if not version:
            return None

        normal = 0
        pending = 0
        conflict = 0
        conflict_by_type = {}

        for entry in version.entries.values():
            if entry.status == ScheduleStatus.NORMAL:
                normal += 1
            elif entry.status == ScheduleStatus.PENDING:
                pending += 1
            elif entry.status == ScheduleStatus.CONFLICT:
                conflict += 1

            for c in entry.conflicts:
                conflict_by_type[c.type.value] = conflict_by_type.get(c.type.value, 0) + 1

        return {
            'version': version_num,
            'timestamp': version.timestamp,
            'reason': version.reason,
            'total_courses': len(version.entries),
            'normal': normal,
            'pending': pending,
            'conflict': conflict,
            'conflict_by_type': conflict_by_type
        }
