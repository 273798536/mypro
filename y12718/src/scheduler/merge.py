from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Iterable

from .models import Assignment, DraftRow, RowStatus, AuditRecord, ProjectState
from .storage import next_id, append_audit, save_state


def merge_rows(rows: Iterable[DraftRow]) -> tuple[list[Assignment], dict[str, list[DraftRow]]]:
    """把草稿行按内容哈希合并，生成候选排班。完全相同的多次导入不会产生重复结论。"""
    by_hash: dict[str, list[DraftRow]] = defaultdict(list)
    non_empty = [r for r in rows if not r.is_empty]

    for r in non_empty:
        h = r.content_hash()
        by_hash[h].append(r)

    assignments: list[Assignment] = []
    for h, group in by_hash.items():
        canonical = group[0]
        if not (canonical.person and canonical.date and canonical.shift):
            continue
        aid = next_id("asg")
        hours = canonical.hours if canonical.hours is not None else 8.0
        now = datetime.now().isoformat(timespec="seconds")
        assignments.append(
            Assignment(
                assignment_id=aid,
                person=canonical.person,
                date=canonical.date,
                shift=canonical.shift,
                hours=hours,
                status=RowStatus.PENDING,
                content_hash=h,
                source_rows=[f"{r.source_file}:{r.raw_index}" for r in group],
                created_at=now,
                updated_at=now,
            )
        )
    return assignments, dict(by_hash)


def find_duplicates(rows: Iterable[DraftRow]) -> dict[str, list[DraftRow]]:
    dup: dict[str, list[DraftRow]] = defaultdict(list)
    for r in rows:
        if r.is_empty:
            continue
        dup[r.content_hash()].append(r)
    return {h: g for h, g in dup.items() if len(g) > 1}


def merge_into_state(state: ProjectState, new_assignments: list[Assignment], output_dir, operator: str = "ta") -> list[Assignment]:
    """把新候选排班并入项目状态，按 (person, date, shift) 幂等合并，避免同一件事出现两份结论。"""
    existing_keys = {a.identity_key(): a for a in state.assignments.values()}
    added: list[Assignment] = []
    for a in new_assignments:
        key = a.identity_key()
        if key in existing_keys:
            prev = existing_keys[key]
            if prev.content_hash == a.content_hash:
                prev.source_rows = list(dict.fromkeys(prev.source_rows + a.source_rows))
                prev.updated_at = datetime.now().isoformat(timespec="seconds")
                continue
            before = {"status": prev.status.value, "hours": prev.hours, "source_rows": list(prev.source_rows)}
            prev.source_rows = list(dict.fromkeys(prev.source_rows + a.source_rows))
            prev.content_hash = a.content_hash
            prev.updated_at = datetime.now().isoformat(timespec="seconds")
            after = {"status": prev.status.value, "hours": prev.hours, "source_rows": list(prev.source_rows)}
            if before != after:
                record = AuditRecord(
                    record_id=next_id("adt"),
                    timestamp=datetime.now().isoformat(timespec="seconds"),
                    assignment_id=prev.assignment_id,
                    before=before,
                    after=after,
                    operator=operator,
                    comment="补录合并",
                )
                state.audit.append(record)
                append_audit(output_dir, record)
        else:
            state.assignments[a.assignment_id] = a
            existing_keys[key] = a
            added.append(a)
    return added


def confirm_assignment(state: ProjectState, assignment_id: str, output_dir, operator: str = "ta", comment: str = "") -> bool:
    a = state.assignments.get(assignment_id)
    if not a:
        return False
    if a.status == RowStatus.CONFIRMED:
        return True
    before = {"status": a.status.value}
    a.status = RowStatus.CONFIRMED
    a.updated_at = datetime.now().isoformat(timespec="seconds")
    after = {"status": a.status.value}
    record = AuditRecord(
        record_id=next_id("adt"),
        timestamp=datetime.now().isoformat(timespec="seconds"),
        assignment_id=a.assignment_id,
        before=before,
        after=after,
        operator=operator,
        comment=comment or "待确认→通过",
    )
    state.audit.append(record)
    append_audit(output_dir, record)
    save_state(output_dir, state)
    return True


def reject_assignment(state: ProjectState, assignment_id: str, output_dir, operator: str = "ta", comment: str = "") -> bool:
    a = state.assignments.get(assignment_id)
    if not a:
        return False
    before = {"status": a.status.value}
    a.status = RowStatus.REJECTED
    a.updated_at = datetime.now().isoformat(timespec="seconds")
    after = {"status": a.status.value}
    record = AuditRecord(
        record_id=next_id("adt"),
        timestamp=datetime.now().isoformat(timespec="seconds"),
        assignment_id=a.assignment_id,
        before=before,
        after=after,
        operator=operator,
        comment=comment or "驳回",
    )
    state.audit.append(record)
    append_audit(output_dir, record)
    save_state(output_dir, state)
    return True


def edit_assignment(state: ProjectState, assignment_id: str, output_dir, operator: str = "ta", **fields) -> bool:
    a = state.assignments.get(assignment_id)
    if not a:
        return False
    before: dict = {}
    after: dict = {}
    allowed = {"person", "date", "shift", "hours", "note"}
    for k, v in fields.items():
        if k not in allowed or v is None:
            continue
        if hasattr(a, k) and getattr(a, k) != v:
            before[k] = getattr(a, k)
            setattr(a, k, v)
            after[k] = v
    if not before:
        return False
    a.updated_at = datetime.now().isoformat(timespec="seconds")
    record = AuditRecord(
        record_id=next_id("adt"),
        timestamp=datetime.now().isoformat(timespec="seconds"),
        assignment_id=a.assignment_id,
        before=before,
        after=after,
        operator=operator,
        comment="人工修正",
    )
    state.audit.append(record)
    append_audit(output_dir, record)
    save_state(output_dir, state)
    return True
