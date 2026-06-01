from datetime import datetime

from db import get_conn


DRIFT_THRESHOLD_SEC = 0.15


def check_missing_fields(audio_file_id: int) -> list:
    conn = get_conn()
    cur = conn.cursor()
    issues = []

    cur.execute(
        """SELECT a.id, a.beat_marker_id, a.action_name, a.performer, a.notes,
                  b.beat_index, b.timestamp_sec
           FROM action_annotations a
           JOIN beat_markers b ON a.beat_marker_id = b.id
           WHERE a.audio_file_id = ?""",
        (audio_file_id,),
    )
    for row in cur.fetchall():
        if not row["action_name"]:
            issues.append(
                {
                    "issue_type": "missing_field",
                    "severity": "high",
                    "description": f"节拍{row['beat_index']}（{row['timestamp_sec']}s）动作名称缺失",
                    "beat_marker_id": row["beat_marker_id"],
                    "annotation_id": row["id"],
                }
            )
        if not row["performer"]:
            issues.append(
                {
                    "issue_type": "missing_field",
                    "severity": "medium",
                    "description": f"节拍{row['beat_index']}（{row['timestamp_sec']}s）表演者缺失",
                    "beat_marker_id": row["beat_marker_id"],
                    "annotation_id": row["id"],
                }
            )
        if not row["notes"]:
            issues.append(
                {
                    "issue_type": "missing_field",
                    "severity": "low",
                    "description": f"节拍{row['beat_index']}（{row['timestamp_sec']}s）备注缺失",
                    "beat_marker_id": row["beat_marker_id"],
                    "annotation_id": row["id"],
                }
            )

    conn.close()
    return issues


def check_unannotated_beats(audio_file_id: int) -> list:
    conn = get_conn()
    cur = conn.cursor()
    issues = []

    cur.execute(
        """SELECT b.id, b.beat_index, b.timestamp_sec, b.is_downbeat
           FROM beat_markers b
           LEFT JOIN action_annotations a ON a.beat_marker_id = b.id
           WHERE b.audio_file_id = ? AND a.id IS NULL""",
        (audio_file_id,),
    )
    for row in cur.fetchall():
        severity = "high" if row["is_downbeat"] else "medium"
        issues.append(
            {
                "issue_type": "unannotated_beat",
                "severity": severity,
                "description": f"节拍{row['beat_index']}（{row['timestamp_sec']}s）未标注动作{'（重拍）' if row['is_downbeat'] else ''}",
                "beat_marker_id": row["id"],
            }
        )

    conn.close()
    return issues


def check_beat_drift(audio_file_id: int, bpm: float = None) -> list:
    conn = get_conn()
    cur = conn.cursor()
    drift_issues = []

    if not bpm:
        cur.execute("SELECT bpm FROM audio_files WHERE id = ?", (audio_file_id,))
        row = cur.fetchone()
        if not row or not row["bpm"]:
            conn.close()
            return drift_issues
        bpm = row["bpm"]

    expected_interval = 60.0 / bpm

    cur.execute(
        "SELECT id, beat_index, timestamp_sec FROM beat_markers WHERE audio_file_id = ? ORDER BY beat_index",
        (audio_file_id,),
    )
    markers = cur.fetchall()

    for i in range(1, len(markers)):
        actual_interval = markers[i]["timestamp_sec"] - markers[i - 1]["timestamp_sec"]
        drift = abs(actual_interval - expected_interval)
        if drift > DRIFT_THRESHOLD_SEC:
            cur.execute(
                """SELECT id FROM drift_events
                   WHERE audio_file_id = ? AND beat_marker_id = ? AND abs(drift_sec - ?) < 0.001 AND resolved = 0""",
                (audio_file_id, markers[i]["id"], drift),
            )
            if cur.fetchone():
                continue

            now = datetime.now().isoformat()
            expected_ts = markers[i - 1]["timestamp_sec"] + expected_interval
            cur.execute(
                """INSERT INTO drift_events
                   (audio_file_id, beat_marker_id, expected_timestamp, actual_timestamp, drift_sec, detected_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    audio_file_id,
                    markers[i]["id"],
                    expected_ts,
                    markers[i]["timestamp_sec"],
                    drift,
                    now,
                ),
            )
            drift_issues.append(
                {
                    "issue_type": "beat_drift",
                    "severity": "high" if drift > DRIFT_THRESHOLD_SEC * 3 else "medium",
                    "description": (
                        f"节拍{markers[i]['beat_index']}漂移{drift:.3f}s "
                        f"（期望间隔{expected_interval:.3f}s，实际{actual_interval:.3f}s）"
                    ),
                    "beat_marker_id": markers[i]["id"],
                }
            )

    cur.execute(
        """SELECT a.id, a.beat_marker_id, a.version, b.beat_index
           FROM action_annotations a
           JOIN beat_markers b ON a.beat_marker_id = b.id
           JOIN drift_events d ON d.beat_marker_id = b.id AND d.resolved = 0
           WHERE a.audio_file_id = ?""",
        (audio_file_id,),
    )
    for row in cur.fetchall():
        drift_issues.append(
            {
                "issue_type": "drift_with_annotation",
                "severity": "high",
                "description": (
                    f"节拍{row['beat_index']}存在漂移且已有动作标注（版本{row['version']}），"
                    f"请确认动作同步是否受影响"
                ),
                "beat_marker_id": row["beat_marker_id"],
                "annotation_id": row["id"],
            }
        )

    conn.commit()
    conn.close()
    return drift_issues


def run_all_checks(audio_file_id: int) -> list:
    all_issues = []
    all_issues.extend(check_missing_fields(audio_file_id))
    all_issues.extend(check_unannotated_beats(audio_file_id))
    all_issues.extend(check_beat_drift(audio_file_id))
    return all_issues


def save_issues(audio_file_id: int, issues: list) -> list:
    conn = get_conn()
    cur = conn.cursor()
    saved = []
    now = datetime.now().isoformat()
    for issue in issues:
        cur.execute(
            """SELECT id FROM issues
               WHERE audio_file_id = ? AND issue_type = ? AND description = ? AND resolved = 0""",
            (audio_file_id, issue["issue_type"], issue["description"]),
        )
        if cur.fetchone():
            continue
        cur.execute(
            """INSERT INTO issues (audio_file_id, issue_type, severity, description,
               beat_marker_id, annotation_id, detected_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                audio_file_id,
                issue["issue_type"],
                issue["severity"],
                issue["description"],
                issue.get("beat_marker_id"),
                issue.get("annotation_id"),
                now,
            ),
        )
        saved.append({"id": cur.lastrowid, **issue})
    conn.commit()
    conn.close()
    return saved
