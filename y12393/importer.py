import json
from datetime import datetime
from pathlib import Path

from db import get_conn, hash_content


def import_audio_file(meta: dict) -> int:
    conn = get_conn()
    cur = conn.cursor()
    content_hash = hash_content(meta)
    cur.execute(
        "SELECT id FROM audio_files WHERE content_hash = ?",
        (content_hash,),
    )
    row = cur.fetchone()
    if row:
        conn.close()
        return row["id"]
    cur.execute(
        """INSERT INTO audio_files (filename, duration_sec, bpm, import_time, content_hash)
           VALUES (?, ?, ?, ?, ?)""",
        (
            meta["filename"],
            meta.get("duration_sec"),
            meta.get("bpm"),
            datetime.now().isoformat(),
            content_hash,
        ),
    )
    conn.commit()
    audio_id = cur.lastrowid
    conn.close()
    return audio_id


def import_beat_markers(audio_file_id: int, markers: list) -> list:
    conn = get_conn()
    cur = conn.cursor()
    inserted = []
    for m in markers:
        try:
            cur.execute(
                """INSERT INTO beat_markers (audio_file_id, beat_index, timestamp_sec, is_downbeat, source)
                   VALUES (?, ?, ?, ?, ?)
                   ON CONFLICT(audio_file_id, beat_index) DO NOTHING""",
                (
                    audio_file_id,
                    m["beat_index"],
                    m["timestamp_sec"],
                    int(m.get("is_downbeat", False)),
                    m.get("source", "auto"),
                ),
            )
            if cur.rowcount > 0:
                inserted.append(m["beat_index"])
        except Exception:
            pass
    conn.commit()
    conn.close()
    return inserted


def import_annotations(audio_file_id: int, annotations: list) -> dict:
    conn = get_conn()
    cur = conn.cursor()
    result = {"created": [], "skipped_duplicates": [], "skipped_seen": [], "updated": []}

    for ann in annotations:
        cur.execute(
            "SELECT id FROM beat_markers WHERE audio_file_id = ? AND beat_index = ?",
            (audio_file_id, ann["beat_index"]),
        )
        marker_row = cur.fetchone()
        if not marker_row:
            result["skipped_duplicates"].append(
                {"beat_index": ann["beat_index"], "reason": "beat_marker_not_found"}
            )
            continue
        beat_marker_id = marker_row["id"]

        content_hash = hash_content(
            {
                "audio_file_id": audio_file_id,
                "beat_index": ann["beat_index"],
                "action_name": ann.get("action_name"),
                "performer": ann.get("performer"),
                "notes": ann.get("notes"),
            }
        )

        cur.execute(
            "SELECT id, version, action_name, performer, notes, is_manual_override, content_hash FROM action_annotations WHERE audio_file_id = ? AND beat_marker_id = ?",
            (audio_file_id, beat_marker_id),
        )
        existing_same_beat = cur.fetchone()

        if existing_same_beat and existing_same_beat["content_hash"] == content_hash:
            result["skipped_duplicates"].append(
                {"beat_index": ann["beat_index"], "annotation_id": existing_same_beat["id"], "reason": "exact_same_content"}
            )
            continue

        if existing_same_beat:
            cur.execute(
                "SELECT content_hash FROM annotation_history WHERE annotation_id = ? AND content_hash IS NOT NULL",
                (existing_same_beat["id"],),
            )
            seen_hashes = {row["content_hash"] for row in cur.fetchall()}
            seen_hashes.add(existing_same_beat["content_hash"])

            if content_hash in seen_hashes:
                result["skipped_seen"].append(
                    {"beat_index": ann["beat_index"], "annotation_id": existing_same_beat["id"], "reason": "content_previously_applied"}
                )
                continue

        cur.execute(
            "SELECT id FROM action_annotations WHERE content_hash = ?",
            (content_hash,),
        )
        if cur.fetchone():
            result["skipped_duplicates"].append(
                {"beat_index": ann["beat_index"], "reason": "hash_exists_globally"}
            )
            continue

        if existing_same_beat:
            old = existing_same_beat
            new_version = old["version"] + 1
            now = datetime.now().isoformat()
            prev_content_hash = old["content_hash"]

            fields_to_check = [
                ("action_name", old["action_name"], ann.get("action_name")),
                ("performer", old["performer"], ann.get("performer")),
                ("notes", old["notes"], ann.get("notes")),
            ]
            for field_name, old_val, new_val in fields_to_check:
                if str(old_val) != str(new_val):
                    cur.execute(
                        """INSERT INTO annotation_history
                           (annotation_id, field_name, old_value, new_value, changed_by, changed_at, change_reason, content_hash)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                        (
                            old["id"],
                            field_name,
                            str(old_val) if old_val is not None else None,
                            str(new_val) if new_val is not None else None,
                            ann.get("changed_by", "system"),
                            now,
                            ann.get("change_reason"),
                            prev_content_hash,
                        ),
                    )

            cur.execute(
                """UPDATE action_annotations
                   SET action_name = ?, performer = ?, notes = ?,
                       is_manual_override = ?, updated_at = ?, version = ?, content_hash = ?
                   WHERE id = ?""",
                (
                    ann.get("action_name"),
                    ann.get("performer"),
                    ann.get("notes"),
                    int(ann.get("is_manual_override", old["is_manual_override"])),
                    now,
                    new_version,
                    content_hash,
                    old["id"],
                ),
            )
            result["updated"].append(
                {"beat_index": ann["beat_index"], "annotation_id": old["id"], "new_version": new_version}
            )
        else:
            now = datetime.now().isoformat()
            cur.execute(
                """INSERT INTO action_annotations
                   (audio_file_id, beat_marker_id, action_name, performer, notes,
                    is_manual_override, created_at, updated_at, version, content_hash)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)""",
                (
                    audio_file_id,
                    beat_marker_id,
                    ann.get("action_name"),
                    ann.get("performer"),
                    ann.get("notes"),
                    int(ann.get("is_manual_override", False)),
                    now,
                    now,
                    content_hash,
                ),
            )
            result["created"].append(
                {"beat_index": ann["beat_index"], "annotation_id": cur.lastrowid}
            )

    conn.commit()
    conn.close()
    return result


def import_from_sample_dir(sample_dir: str, annotation_suffix: str = "") -> dict:
    base = Path(sample_dir)
    result = {"audio_files": [], "markers": {}, "annotations": {}}

    audio_path = base / "audio_files.json"
    if not audio_path.exists():
        return result

    with open(audio_path, "r", encoding="utf-8") as f:
        audio_list = json.load(f)

    for audio_meta in audio_list:
        audio_id = import_audio_file(audio_meta)
        result["audio_files"].append(
            {"id": audio_id, "filename": audio_meta["filename"]}
        )

        markers_path = base / "beat_markers" / f"{audio_meta['filename']}.json"
        if markers_path.exists():
            with open(markers_path, "r", encoding="utf-8") as f:
                markers = json.load(f)
            inserted = import_beat_markers(audio_id, markers)
            result["markers"][audio_meta["filename"]] = inserted

        ann_filename = f"{audio_meta['filename']}{annotation_suffix}.json"
        ann_path = base / "annotations" / ann_filename
        if ann_path.exists():
            with open(ann_path, "r", encoding="utf-8") as f:
                annotations = json.load(f)
            ann_result = import_annotations(audio_id, annotations)
            result["annotations"][audio_meta["filename"]] = ann_result

    return result
