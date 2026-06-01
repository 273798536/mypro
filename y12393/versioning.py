from db import get_conn


def get_annotation_history(annotation_id: int) -> list:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """SELECT field_name, old_value, new_value, changed_by, changed_at, change_reason
           FROM annotation_history
           WHERE annotation_id = ?
           ORDER BY changed_at""",
        (annotation_id,),
    )
    history = [dict(row) for row in cur.fetchall()]
    conn.close()
    return history


def compare_versions(audio_file_id: int) -> list:
    conn = get_conn()
    cur = conn.cursor()
    comparisons = []

    cur.execute(
        """SELECT a.id, a.version, a.action_name, a.performer, a.notes,
                  a.is_manual_override, a.updated_at, b.beat_index, b.timestamp_sec
           FROM action_annotations a
           JOIN beat_markers b ON a.beat_marker_id = b.id
           WHERE a.audio_file_id = ? AND a.is_manual_override = 1
           ORDER BY b.beat_index""",
        (audio_file_id,),
    )
    for row in cur.fetchall():
        history = get_annotation_history(row["id"])
        entry = {
            "annotation_id": row["id"],
            "beat_index": row["beat_index"],
            "timestamp_sec": row["timestamp_sec"],
            "current_version": row["version"],
            "current_action": row["action_name"],
            "current_performer": row["performer"],
            "current_notes": row["notes"],
            "is_manual_override": True,
        }
        if history:
            entry["change_history"] = history
            entry["impact"] = _assess_impact(history)
        else:
            entry["change_history"] = []
            entry["impact"] = "info: 首次导入即为人工改动，暂无变更历史"
        comparisons.append(entry)

    conn.close()
    return comparisons


def _assess_impact(history: list) -> str:
    changed_fields = set(h["field_name"] for h in history)
    if "action_name" in changed_fields:
        return "high: 动作名称被修改，可能影响编舞同步"
    if "performer" in changed_fields:
        return "medium: 表演者被修改，可能影响排练分工"
    if "notes" in changed_fields:
        return "low: 备注被修改，需确认动作细节"
    return "unknown"


def get_all_versions_for_beat(audio_file_id: int, beat_index: int) -> dict:
    conn = get_conn()
    cur = conn.cursor()

    cur.execute(
        "SELECT id FROM beat_markers WHERE audio_file_id = ? AND beat_index = ?",
        (audio_file_id, beat_index),
    )
    marker = cur.fetchone()
    if not marker:
        conn.close()
        return {}

    cur.execute(
        """SELECT id, action_name, performer, notes, is_manual_override,
                  version, created_at, updated_at
           FROM action_annotations
           WHERE audio_file_id = ? AND beat_marker_id = ?""",
        (audio_file_id, marker["id"]),
    )
    annotation = cur.fetchone()
    if not annotation:
        conn.close()
        return {}

    history = get_annotation_history(annotation["id"])
    conn.close()

    return {
        "current": dict(annotation),
        "history": history,
    }
