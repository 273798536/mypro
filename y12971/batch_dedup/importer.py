from __future__ import annotations

import csv
import os
from datetime import datetime
from typing import Any

from .audit import append_audit, get_audit_for_fingerprint
from .fingerprint import compute_batch_fingerprint, compute_content_fingerprint, compute_row_fingerprint
from .index_suggest import index_suggestion_changed, load_data_dict, suggest_index
from .models import (
    ConfirmationAction,
    ConfirmationRecord,
    DataDictEntry,
    DedupVerdict,
    ImportSession,
    IndexSuggestion,
    WorkOrder,
    WorkOrderStatus,
    load_json,
    save_json,
)

STATE_DIR = "state"
WORK_ORDERS_FILE = "work_orders.json"
SESSIONS_FILE = "import_sessions.json"
INDEX_SUGGESTION_FILE = "index_suggestion.json"
CONFIRMATIONS_FILE = "confirmations.json"


def _state_dir(output_dir: str) -> str:
    return os.path.join(output_dir, STATE_DIR)


def _work_orders_path(output_dir: str) -> str:
    return os.path.join(_state_dir(output_dir), WORK_ORDERS_FILE)


def _sessions_path(output_dir: str) -> str:
    return os.path.join(_state_dir(output_dir), SESSIONS_FILE)


def _index_suggestion_path(output_dir: str) -> str:
    return os.path.join(_state_dir(output_dir), INDEX_SUGGESTION_FILE)


def _confirmations_path(output_dir: str) -> str:
    return os.path.join(_state_dir(output_dir), CONFIRMATIONS_FILE)


def load_work_orders(output_dir: str) -> dict[str, WorkOrder]:
    path = _work_orders_path(output_dir)
    if not os.path.exists(path):
        return {}
    raw = load_json(path)
    return {fp: WorkOrder.from_dict(d) for fp, d in raw.items()}


def save_work_orders(output_dir: str, orders: dict[str, WorkOrder]) -> None:
    os.makedirs(_state_dir(output_dir), exist_ok=True)
    path = _work_orders_path(output_dir)
    save_json({fp: wo.to_dict() for fp, wo in orders.items()}, path)


def load_sessions(output_dir: str) -> list[ImportSession]:
    path = _sessions_path(output_dir)
    if not os.path.exists(path):
        return []
    raw = load_json(path)
    return [ImportSession.from_dict(d) for d in raw]


def save_sessions(output_dir: str, sessions: list[ImportSession]) -> None:
    os.makedirs(_state_dir(output_dir), exist_ok=True)
    path = _sessions_path(output_dir)
    save_json([s.to_dict() for s in sessions], path)


def load_saved_index_suggestion(output_dir: str) -> IndexSuggestion | None:
    path = _index_suggestion_path(output_dir)
    if not os.path.exists(path):
        return None
    raw = load_json(path)
    return IndexSuggestion.from_dict(raw)


def save_index_suggestion(output_dir: str, suggestion: IndexSuggestion) -> None:
    os.makedirs(_state_dir(output_dir), exist_ok=True)
    path = _index_suggestion_path(output_dir)
    save_json(suggestion.to_dict(), path)


def load_confirmations(output_dir: str) -> list[ConfirmationRecord]:
    path = _confirmations_path(output_dir)
    if not os.path.exists(path):
        return []
    raw = load_json(path)
    return [ConfirmationRecord.from_dict(d) for d in raw]


def save_confirmations(output_dir: str, records: list[ConfirmationRecord]) -> None:
    os.makedirs(_state_dir(output_dir), exist_ok=True)
    path = _confirmations_path(output_dir)
    save_json([r.to_dict() for r in records], path)


def read_csv_rows(path: str) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for encoding in ("utf-8-sig", "gbk", "latin-1"):
        try:
            with open(path, "r", encoding=encoding, errors="strict") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    cleaned = {k.strip(): v for k, v in row.items() if k is not None}
                    rows.append(cleaned)
            return rows
        except (UnicodeDecodeError, UnicodeError):
            rows = []
            continue
    return rows


def find_csv_files(directory: str) -> list[str]:
    if not os.path.isdir(directory):
        return []
    result = []
    for fname in sorted(os.listdir(directory)):
        if fname.lower().endswith(".csv") and not fname.startswith("."):
            result.append(os.path.join(directory, fname))
    return result


def _check_idempotent(
    output_dir: str,
    input_files: list[str],
    all_rows: list[dict[str, str]],
    key_fields: list[str] | None,
    is_supplement: bool,
) -> ImportSession | None:
    sessions = load_sessions(output_dir)
    content_fp = compute_content_fingerprint(all_rows, key_fields)
    batch_fp = compute_batch_fingerprint(input_files, extra=content_fp)
    for s in sessions:
        if s.batch_id == batch_fp and s.is_supplement == is_supplement:
            return s
    return None


def run_import(
    input_dir: str,
    output_dir: str,
    data_dict_path: str = "",
    operator: str = "system",
    force: bool = False,
    supplement: bool = False,
) -> ImportSession:
    input_files = find_csv_files(input_dir)
    if not input_files:
        raise FileNotFoundError(f"输入目录 {input_dir} 中未找到 CSV 文件")

    all_rows: list[dict[str, str]] = []
    for f in input_files:
        all_rows.extend(read_csv_rows(f))

    data_dict: list[DataDictEntry] | None = None
    if data_dict_path and os.path.exists(data_dict_path):
        data_dict = load_data_dict(data_dict_path)

    previous_suggestion = load_saved_index_suggestion(output_dir)
    new_suggestion = suggest_index(data_dict, all_rows, previous_suggestion)
    key_fields = new_suggestion.suggested_key_fields if new_suggestion.suggested_key_fields else None

    if not force:
        existing = _check_idempotent(output_dir, input_files, all_rows, key_fields, supplement)
        if existing is not None:
            return existing

    existing_orders = load_work_orders(output_dir)
    content_fp = compute_content_fingerprint(all_rows, key_fields)
    batch_fp = compute_batch_fingerprint(input_files, extra=content_fp)

    session = ImportSession(
        batch_id=batch_fp,
        input_files=[os.path.basename(f) for f in input_files],
        data_dict_file=os.path.basename(data_dict_path) if data_dict_path else "",
        index_suggestion=new_suggestion,
        previous_index_suggestion=previous_suggestion,
        total_rows=len(all_rows),
        is_supplement=supplement,
    )

    key_changed = index_suggestion_changed(previous_suggestion, new_suggestion)
    if key_changed:
        _reindex_with_new_keys(existing_orders, previous_suggestion, new_suggestion, output_dir, operator)

    new_count = 0
    duplicate_count = 0
    changed_count = 0
    uncertain_count = 0

    for row in all_rows:
        fp = compute_row_fingerprint(row, key_fields)
        now = datetime.now().isoformat()

        if fp in existing_orders:
            wo = existing_orders[fp]
            old_raw = wo.raw_data
            old_verdict = wo.verdict.value

            if _row_values_match(old_raw, row, key_fields):
                wo.seen_count += 1
                wo.last_seen_at = now
                if wo.status == WorkOrderStatus.CONFIRMED:
                    pass
                else:
                    wo.status = WorkOrderStatus.DUPLICATE
                    wo.verdict = DedupVerdict.DUPLICATE
                duplicate_count += 1
            else:
                wo.previous_verdict = old_verdict
                wo.verdict = DedupVerdict.UNCERTAIN
                wo.status = WorkOrderStatus.CHANGED
                wo.last_seen_at = now
                wo.seen_count += 1
                wo.new_values = row
                changed_count += 1
                uncertain_count += 1

                append_audit(
                    _state_dir(output_dir),
                    work_order_fingerprint=fp,
                    operator=operator,
                    action="value_changed",
                    reason="字段值变更,需人工复核",
                    old_verdict=old_verdict,
                    new_verdict=DedupVerdict.UNCERTAIN.value,
                    old_values=old_raw,
                    new_values=row,
                )
        else:
            wo = WorkOrder(
                raw_data=row,
                fingerprint=fp,
                status=WorkOrderStatus.NEW,
                verdict=DedupVerdict.UNIQUE,
                import_batch=batch_fp,
                first_seen_at=now,
                last_seen_at=now,
                seen_count=1,
                index_key_used=",".join(key_fields) if key_fields else "",
            )
            existing_orders[fp] = wo
            new_count += 1

    save_work_orders(output_dir, existing_orders)
    save_index_suggestion(output_dir, new_suggestion)

    session.new_count = new_count
    session.duplicate_count = duplicate_count
    session.changed_count = changed_count
    session.uncertain_count = uncertain_count
    session.confirmed_count = sum(
        1 for wo in existing_orders.values() if wo.status == WorkOrderStatus.CONFIRMED
    )
    session.finished_at = datetime.now().isoformat()

    sessions = load_sessions(output_dir)
    sessions.append(session)
    save_sessions(output_dir, sessions)

    return session


def confirm_work_order(
    output_dir: str,
    fingerprint: str,
    action: ConfirmationAction,
    operator: str,
    reason: str,
) -> ConfirmationRecord | None:
    orders = load_work_orders(output_dir)
    if fingerprint not in orders:
        return None

    wo = orders[fingerprint]
    old_verdict = wo.verdict.value
    old_status = wo.status
    old_raw = dict(wo.raw_data)
    new_raw = dict(wo.new_values)

    if action == ConfirmationAction.APPROVE:
        wo.status = WorkOrderStatus.CONFIRMED
        wo.verdict = DedupVerdict.UNIQUE
        if wo.new_values:
            wo.raw_data = dict(wo.new_values)
            wo.new_values = {}
            wo.previous_verdict = ""
    elif action == ConfirmationAction.REJECT:
        wo.status = WorkOrderStatus.REJECTED
        wo.verdict = DedupVerdict.DUPLICATE
        if wo.new_values:
            wo.new_values = {}
            wo.previous_verdict = ""
    elif action == ConfirmationAction.DEFER:
        wo.verdict = DedupVerdict.UNCERTAIN

    new_verdict = wo.verdict.value
    save_work_orders(output_dir, orders)

    record = ConfirmationRecord(
        work_order_fingerprint=fingerprint,
        action=action,
        operator=operator,
        reason=reason,
        old_verdict=old_verdict,
        new_verdict=new_verdict,
    )

    confirmations = load_confirmations(output_dir)
    confirmations.append(record)
    save_confirmations(output_dir, confirmations)

    audit_action = f"manual_{action.value}"
    append_audit(
        _state_dir(output_dir),
        work_order_fingerprint=fingerprint,
        operator=operator,
        action=audit_action,
        reason=reason,
        old_verdict=old_verdict,
        new_verdict=new_verdict,
        old_values=old_raw,
        new_values=new_raw,
    )

    return record


def _row_values_match(
    old: dict[str, str], new: dict[str, str], key_fields: list[str] | None
) -> bool:
    from .fingerprint import normalize_value

    all_fields = sorted(set(list(old.keys()) + list(new.keys())))
    for f in all_fields:
        old_v = normalize_value(old.get(f, ""))
        new_v = normalize_value(new.get(f, ""))
        if old_v != new_v:
            return False
    return True


def _reindex_with_new_keys(
    orders: dict[str, WorkOrder],
    old_suggestion: IndexSuggestion | None,
    new_suggestion: IndexSuggestion,
    output_dir: str,
    operator: str,
) -> None:
    if not new_suggestion.suggested_key_fields:
        return

    new_key_fields = new_suggestion.suggested_key_fields
    reindexed: dict[str, WorkOrder] = {}
    state_dir = _state_dir(output_dir)

    for fp, wo in orders.items():
        new_fp = compute_row_fingerprint(wo.raw_data, new_key_fields)
        old_verdict = wo.verdict.value

        if new_fp != fp:
            wo.previous_verdict = old_verdict
            wo.fingerprint = new_fp
            wo.index_key_used = ",".join(new_key_fields)

            append_audit(
                state_dir,
                work_order_fingerprint=new_fp,
                operator=operator,
                action="reindex_fingerprint_changed",
                reason=f"索引键变更为 {','.join(new_key_fields)}，指纹由 {fp} 变更",
                old_verdict=old_verdict,
                new_verdict=wo.verdict.value,
                old_values=wo.raw_data,
                new_values=wo.raw_data,
            )

        if new_fp in reindexed:
            existing = reindexed[new_fp]
            if existing.first_seen_at <= wo.first_seen_at:
                kept = existing
                other = wo
            else:
                kept = wo
                other = existing

            kept.seen_count += other.seen_count
            if other.last_seen_at > kept.last_seen_at:
                kept.last_seen_at = other.last_seen_at

            if kept.verdict == DedupVerdict.UNIQUE or other.verdict == DedupVerdict.UNIQUE:
                kept.previous_verdict = kept.verdict.value
                kept.verdict = DedupVerdict.UNCERTAIN
                kept.status = WorkOrderStatus.CHANGED
                kept.new_values = other.raw_data

                append_audit(
                    state_dir,
                    work_order_fingerprint=new_fp,
                    operator=operator,
                    action="reindex_collision",
                    reason=f"索引键变更({','.join(new_key_fields)})导致指纹冲突：与 {fp} 合并",
                    old_verdict=kept.previous_verdict,
                    new_verdict=DedupVerdict.UNCERTAIN.value,
                    old_values=kept.raw_data,
                    new_values=other.raw_data,
                )

                if other.fingerprint != fp or other.previous_verdict:
                    append_audit(
                        state_dir,
                        work_order_fingerprint=fp,
                        operator=operator,
                        action="reindex_collision_merged",
                        reason=f"索引键变更导致与 {new_fp} 合并",
                        old_verdict=other.verdict.value,
                        new_verdict=DedupVerdict.UNCERTAIN.value,
                        old_values=other.raw_data,
                        new_values=kept.raw_data,
                    )

            reindexed[new_fp] = kept
        else:
            reindexed[new_fp] = wo

    orders.clear()
    orders.update(reindexed)
