from database import get_conn

STATUS_LABELS = {
    "pending": "待复核",
    "reviewing": "复核中",
    "passed": "已通过",
    "mismatch": "文件名不匹配",
    "expired": "授权到期",
    "need_note": "待补授权备注",
    "reconciled": "已重新对齐",
    "abnormal": "异常",
}

STATUS_COLORS = {
    "pending": "bg-gray-100 text-gray-800",
    "reviewing": "bg-blue-100 text-blue-800",
    "passed": "bg-green-100 text-green-800",
    "mismatch": "bg-yellow-100 text-yellow-800",
    "expired": "bg-red-100 text-red-800",
    "need_note": "bg-orange-100 text-orange-800",
    "reconciled": "bg-teal-100 text-teal-800",
    "abnormal": "bg-rose-100 text-rose-800",
}


def status_label(status: str) -> str:
    return STATUS_LABELS.get(status, status)


def status_color(status: str) -> str:
    return STATUS_COLORS.get(status, "bg-gray-100 text-gray-800")


def write_status_log(conn, track_id: int, old_status: str, new_status: str,
                     operator: str = "system", remark: str = None):
    conn.execute(
        "INSERT INTO status_logs (track_id, old_status, new_status, operator, remark) VALUES (?, ?, ?, ?, ?)",
        (track_id, old_status, new_status, operator, remark)
    )


def update_track_status(track_id: int, new_status: str, operator: str = "system", remark: str = None):
    with get_conn() as conn:
        row = conn.execute("SELECT process_status FROM review_tracks WHERE id = ?", (track_id,)).fetchone()
        old_status = row["process_status"] if row else None
        conn.execute(
            "UPDATE review_tracks SET process_status = ?, updated_at = datetime('now','localtime') WHERE id = ?",
            (new_status, track_id)
        )
        write_status_log(conn, track_id, old_status, new_status, operator, remark)


def add_authorization_note(track_id: int, note: str, impact_scope: str = None, operator: str = "复核人"):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT process_status, source, source_row, file_name, track_name FROM review_tracks WHERE id = ?",
            (track_id,)
        ).fetchone()
        if not row:
            return None
        old_status = row["process_status"]
        scope_parts = []
        if impact_scope:
            scope_parts.append(impact_scope)
        scope_parts.append(f"来源:{row['source']}")
        scope_parts.append(f"来源行:{row['source_row']}")
        if row["file_name"]:
            scope_parts.append(f"文件:{row['file_name']}")
        if row["track_name"]:
            scope_parts.append(f"曲目:{row['track_name']}")
        final_scope = "；".join(scope_parts)
        conn.execute(
            """UPDATE review_tracks SET
                authorization_note = ?,
                impact_scope = COALESCE(?, impact_scope),
                process_status = 'reconciled',
                updated_at = datetime('now','localtime')
            WHERE id = ?""",
            (note, final_scope, track_id)
        )
        write_status_log(
            conn, track_id, old_status, "reconciled", operator,
            f"补授权备注对齐；影响范围已记录"
        )
        return True


def row_to_dict(row) -> dict:
    d = dict(row)
    d["status_label"] = status_label(d["process_status"])
    d["status_color"] = status_color(d["process_status"])
    return d
