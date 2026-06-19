from __future__ import annotations

import json
import os
from typing import List, Optional

from .models import RollbackRecord, RollbackStatus


ROLLBACK_FILE = "rollback_log.json"


def _rollback_path(output_dir: str) -> str:
    return os.path.join(output_dir, ROLLBACK_FILE)


def load_rollback_log(output_dir: str) -> List[RollbackRecord]:
    fpath = _rollback_path(output_dir)
    if not os.path.isfile(fpath):
        return []
    with open(fpath, encoding="utf-8") as f:
        data = json.load(f)
    records = []
    for item in data:
        record = RollbackRecord(
            record_id=item.get("record_id", ""),
            session_id=item.get("session_id", ""),
            transaction_id=item.get("transaction_id", ""),
            work_order_id=item.get("work_order_id", ""),
            reason=item.get("reason", ""),
            action=item.get("action", ""),
            timestamp=item.get("timestamp", ""),
            status=RollbackStatus(item.get("status", "open")),
            supplement_notes=item.get("supplement_notes", []),
        )
        records.append(record)
    return records


def save_rollback_log(output_dir: str, records: List[RollbackRecord]) -> None:
    os.makedirs(output_dir, exist_ok=True)
    fpath = _rollback_path(output_dir)
    data = []
    for r in records:
        data.append(
            {
                "record_id": r.record_id,
                "session_id": r.session_id,
                "transaction_id": r.transaction_id,
                "work_order_id": r.work_order_id,
                "reason": r.reason,
                "action": r.action,
                "timestamp": r.timestamp,
                "status": r.status.value,
                "supplement_notes": r.supplement_notes,
            }
        )
    with open(fpath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def prune_stale_open_records(
    output_dir: str, previous_session_ids: List[str]
) -> List[RollbackRecord]:
    records = load_rollback_log(output_dir)
    if not previous_session_ids:
        return records
    kept: List[RollbackRecord] = []
    for r in records:
        if r.session_id in previous_session_ids and r.status == RollbackStatus.OPEN:
            continue
        kept.append(r)
    save_rollback_log(output_dir, kept)
    return kept


def append_rollback_record(output_dir: str, record: RollbackRecord) -> None:
    records = load_rollback_log(output_dir)
    records.append(record)
    save_rollback_log(output_dir, records)


def supplement_rollback(output_dir: str, record_id: str, note: str) -> Optional[RollbackRecord]:
    records = load_rollback_log(output_dir)
    for r in records:
        if r.record_id == record_id:
            r.add_note(note)
            save_rollback_log(output_dir, records)
            return r
    return None


def resolve_rollback(output_dir: str, record_id: str) -> Optional[RollbackRecord]:
    records = load_rollback_log(output_dir)
    for r in records:
        if r.record_id == record_id:
            r.resolve()
            save_rollback_log(output_dir, records)
            return r
    return None
