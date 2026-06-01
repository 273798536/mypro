import json
from datetime import datetime

from db import get_conn, hash_content
from versioning import compare_versions


def generate_report(audio_file_id: int, report_type: str = "full") -> dict:
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("SELECT * FROM audio_files WHERE id = ?", (audio_file_id,))
    audio = dict(cur.fetchone())

    report_sections = {}

    if report_type in ("full", "summary"):
        cur.execute(
            "SELECT COUNT(*) as cnt FROM beat_markers WHERE audio_file_id = ?",
            (audio_file_id,),
        )
        beat_count = cur.fetchone()["cnt"]

        cur.execute(
            "SELECT COUNT(*) as cnt FROM action_annotations WHERE audio_file_id = ?",
            (audio_file_id,),
        )
        annotation_count = cur.fetchone()["cnt"]

        cur.execute(
            "SELECT COUNT(*) as cnt FROM action_annotations WHERE audio_file_id = ? AND is_manual_override = 1",
            (audio_file_id,),
        )
        manual_override_count = cur.fetchone()["cnt"]

        report_sections["summary"] = {
            "audio_file": audio["filename"],
            "duration_sec": audio["duration_sec"],
            "bpm": audio["bpm"],
            "total_beats": beat_count,
            "total_annotations": annotation_count,
            "manual_overrides": manual_override_count,
            "annotation_coverage": f"{annotation_count / beat_count * 100:.1f}%" if beat_count > 0 else "0%",
        }

    if report_type in ("full", "issues"):
        cur.execute(
            "SELECT * FROM issues WHERE audio_file_id = ? AND resolved = 0 ORDER BY severity, detected_at",
            (audio_file_id,),
        )
        issues = [dict(row) for row in cur.fetchall()]
        report_sections["issues"] = {
            "total_unresolved": len(issues),
            "by_severity": {
                "high": len([i for i in issues if i["severity"] == "high"]),
                "medium": len([i for i in issues if i["severity"] == "medium"]),
                "low": len([i for i in issues if i["severity"] == "low"]),
            },
            "by_type": {},
            "details": issues,
        }
        for issue in issues:
            t = issue["issue_type"]
            report_sections["issues"]["by_type"][t] = report_sections["issues"]["by_type"].get(t, 0) + 1

    if report_type in ("full", "drift"):
        cur.execute(
            "SELECT * FROM drift_events WHERE audio_file_id = ? AND resolved = 0",
            (audio_file_id,),
        )
        drift_events = [dict(row) for row in cur.fetchall()]
        report_sections["drift"] = {
            "total_unresolved": len(drift_events),
            "max_drift_sec": max((d["drift_sec"] for d in drift_events), default=0),
            "events": drift_events,
        }

    if report_type in ("full", "versions"):
        version_comparisons = compare_versions(audio_file_id)
        report_sections["version_changes"] = {
            "total_manual_overrides": len(version_comparisons),
            "details": version_comparisons,
        }

    if report_type == "full":
        cur.execute(
            """SELECT b.beat_index, b.timestamp_sec, b.is_downbeat,
                      a.action_name, a.performer, a.notes, a.version, a.is_manual_override
               FROM beat_markers b
               LEFT JOIN action_annotations a ON a.beat_marker_id = b.id
               WHERE b.audio_file_id = ?
               ORDER BY b.beat_index""",
            (audio_file_id,),
        )
        report_sections["timeline"] = [dict(row) for row in cur.fetchall()]

    conn.close()

    report = {
        "report_type": report_type,
        "audio_file_id": audio_file_id,
        "audio_file": audio["filename"],
        "generated_at": datetime.now().isoformat(),
        "sections": report_sections,
    }

    return report


def save_report(report: dict) -> int:
    conn = get_conn()
    cur = conn.cursor()
    content = json.dumps(report, ensure_ascii=False, indent=2)
    content_hash = hash_content({"type": report["report_type"], "audio_file_id": report["audio_file_id"], "content_snapshot": content})

    cur.execute(
        "SELECT id FROM reports WHERE content_hash = ?",
        (content_hash,),
    )
    existing = cur.fetchone()
    if existing:
        conn.close()
        return existing["id"]

    cur.execute(
        """INSERT INTO reports (audio_file_id, report_type, content, generated_at, content_hash)
           VALUES (?, ?, ?, ?, ?)""",
        (
            report["audio_file_id"],
            report["report_type"],
            content,
            report["generated_at"],
            content_hash,
        ),
    )
    conn.commit()
    report_id = cur.lastrowid
    conn.close()
    return report_id


def generate_all_reports(audio_file_id: int) -> dict:
    results = {}
    for rtype in ("summary", "issues", "drift", "versions", "full"):
        report = generate_report(audio_file_id, rtype)
        report_id = save_report(report)
        results[rtype] = {"report_id": report_id, "generated_at": report["generated_at"]}
    return results
