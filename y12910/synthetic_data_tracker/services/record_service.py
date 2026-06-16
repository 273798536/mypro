import hashlib
from typing import Optional, List
from database import get_connection
from models import RecordCreate, RecordUpdate, RecordResponse, DedupResult


def _hash_content(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _row_to_response(row) -> RecordResponse:
    return RecordResponse(
        id=row["id"],
        source_material=row["source_material"],
        prompt_version=row["prompt_version"],
        content=row["content"],
        content_hash=row["content_hash"],
        status=row["status"],
        feedback=row["feedback"],
        notes=row["notes"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def check_duplicate(content: str) -> DedupResult:
    content_hash = _hash_content(content)
    conn = get_connection()
    row = conn.execute(
        "SELECT id FROM records WHERE content_hash = ? LIMIT 1",
        (content_hash,),
    ).fetchone()
    conn.close()
    if row:
        return DedupResult(is_duplicate=True, existing_record_id=row["id"])
    return DedupResult(is_duplicate=False)


def create_record(data: RecordCreate) -> RecordResponse:
    content_hash = _hash_content(data.content)
    conn = get_connection()
    cursor = conn.execute(
        """INSERT INTO records (source_material, prompt_version, content, content_hash, feedback, notes)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (
            data.source_material,
            data.prompt_version,
            data.content,
            content_hash,
            data.feedback,
            data.notes,
        ),
    )
    record_id = cursor.lastrowid
    conn.execute(
        """INSERT INTO source_traces (record_id, source_type, source_ref, prompt_version, snapshot)
           VALUES (?, 'import', ?, ?, ?)""",
        (record_id, data.source_material, data.prompt_version, data.content),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM records WHERE id = ?", (record_id,)).fetchone()
    conn.close()
    return _row_to_response(row)


def get_record(record_id: int) -> Optional[RecordResponse]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM records WHERE id = ?", (record_id,)).fetchone()
    conn.close()
    if row is None:
        return None
    return _row_to_response(row)


def list_records(status: Optional[str] = None) -> List[RecordResponse]:
    conn = get_connection()
    if status:
        rows = conn.execute(
            "SELECT * FROM records WHERE status = ? ORDER BY id",
            (status,),
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM records ORDER BY id").fetchall()
    conn.close()
    return [_row_to_response(r) for r in rows]


VALID_TRANSITIONS = {
    "imported": ["pending_review"],
    "pending_review": ["confirmed", "rejected"],
    "confirmed": ["rejected"],
    "rejected": ["pending_review"],
}


def transition_status(record_id: int, new_status: str, changed_by: str, reason: str) -> Optional[RecordResponse]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM records WHERE id = ?", (record_id,)).fetchone()
    if row is None:
        conn.close()
        return None
    current_status = row["status"]
    allowed = VALID_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        conn.close()
        raise ValueError(
            f"不允许从 '{current_status}' 转到 '{new_status}'，允许的目标: {allowed}"
        )
    conn.execute(
        "UPDATE records SET status = ?, updated_at = datetime('now') WHERE id = ?",
        (new_status, record_id),
    )
    conn.execute(
        """INSERT INTO version_logs (record_id, field_name, old_value, new_value, prompt_version, changed_by)
           VALUES (?, 'status', ?, ?, '', ?)""",
        (record_id, current_status, new_status, changed_by),
    )
    conn.execute(
        """INSERT INTO source_traces (record_id, source_type, source_ref, prompt_version, snapshot)
           VALUES (?, 'status_change', ?, '', ?)""",
        (record_id, f"{current_status}->{new_status}", reason or f"by {changed_by}"),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM records WHERE id = ?", (record_id,)).fetchone()
    conn.close()
    return _row_to_response(row)


def update_record(record_id: int, data: RecordUpdate, changed_by: str = "evaluator") -> Optional[RecordResponse]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM records WHERE id = ?", (record_id,)).fetchone()
    if row is None:
        conn.close()
        return None
    updates = {}
    for field in ["source_material", "prompt_version", "content", "feedback", "notes"]:
        val = getattr(data, field, None)
        if val is not None:
            old_val = row[field]
            if val != old_val:
                updates[field] = val
                conn.execute(
                    """INSERT INTO version_logs (record_id, field_name, old_value, new_value, prompt_version, changed_by)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (
                        record_id,
                        field,
                        old_val,
                        val,
                        data.prompt_version if data.prompt_version else row["prompt_version"],
                        changed_by,
                    ),
                )
                if field in ("prompt_version", "feedback"):
                    source_type = "prompt" if field == "prompt_version" else "human_feedback"
                    conn.execute(
                        """INSERT INTO source_traces (record_id, source_type, source_ref, prompt_version, snapshot)
                           VALUES (?, ?, ?, ?, ?)""",
                        (
                            record_id,
                            source_type,
                            f"{field}: {old_val}->{val}",
                            data.prompt_version if data.prompt_version else row["prompt_version"],
                            val,
                        ),
                    )
    if not updates:
        conn.close()
        return _row_to_response(row)
    if "content" in updates:
        updates["content_hash"] = _hash_content(updates["content"])
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [record_id]
    conn.execute(
        f"UPDATE records SET {set_clause}, updated_at = datetime('now') WHERE id = ?",
        values,
    )
    conn.commit()
    row = conn.execute("SELECT * FROM records WHERE id = ?", (record_id,)).fetchone()
    conn.close()
    return _row_to_response(row)
