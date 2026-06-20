import re
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

from .models import (
    EncoreRecord,
    Track,
    ArchiveStore,
    compute_hash,
    STATUS_OK,
    STATUS_EXPIRED,
    STATUS_MODIFIED,
    STATUS_MISMATCH,
    STATUS_PENDING,
    STATUS_LABELS,
)


EXPIRED_KEYWORDS = [
    "授权到期", "版权到期", "授权过期", "版权过期",
    "expired", "expire",
]

MODIFIED_KEYWORDS = [
    "后补", "补录", "改口径", "口径修改", "修订", "更正",
]


def parse_tracks_file(content: str) -> List[Track]:
    lines = [ln.strip() for ln in content.splitlines() if ln.strip()]
    tracks = []
    for ln in lines:
        parts = re.split(r"\s*[|,，\t]\s*", ln)
        title = parts[0].strip()
        artist = parts[1].strip() if len(parts) > 1 else ""
        duration = parts[2].strip() if len(parts) > 2 else ""
        note = parts[3].strip() if len(parts) > 3 else ""
        if re.match(r"^\d+[\.、]\s*", title):
            title = re.sub(r"^\d+[\.、]\s*", "", title)
        tracks.append(Track(title=title, artist=artist, duration=duration, note=note))
    return tracks


def detect_expired(*texts: str) -> bool:
    blob = "\n".join(texts).lower()
    return any(kw.lower() in blob for kw in EXPIRED_KEYWORDS)


def detect_modified(*texts: str) -> bool:
    blob = "\n".join(texts)
    return any(kw in blob for kw in MODIFIED_KEYWORDS)


def filename_matches_tracks(filename: str, tracks: List[Track]) -> Tuple[bool, str]:
    if not filename:
        return False, "文件名为空"
    if not tracks:
        return False, "曲目表为空"
    track_titles = {t.title for t in tracks}
    fn = os.path.splitext(os.path.basename(filename))[0]
    hits = 0
    for t in track_titles:
        if t and t in fn:
            hits += 1
    if hits == 0:
        return False, f"文件名 '{filename}' 未包含任何曲目名"
    ratio = hits / len(track_titles)
    if ratio < 0.5:
        return False, f"仅命中 {hits}/{len(track_titles)} 首曲目，匹配度不足"
    return True, f"匹配 {hits}/{len(track_titles)} 首曲目"


def compute_record_hashes(rec: EncoreRecord) -> None:
    rec.filename_hash = compute_hash(rec.filename)
    tracks_str = json.dumps([t.__dict__ for t in rec.tracks], ensure_ascii=False, sort_keys=True)
    rec.tracks_hash = compute_hash(tracks_str)
    combined = "|".join([
        rec.filename,
        tracks_str,
        rec.supplementary_note,
        rec.verbal_note,
        rec.rehearsal_note,
    ])
    rec.combined_hash = compute_hash(combined)


def evaluate_status(rec: EncoreRecord, prev: Optional[EncoreRecord] = None) -> None:
    rec.status = STATUS_PENDING
    reasons = []
    is_expired = detect_expired(
        rec.supplementary_note, rec.verbal_note, rec.rehearsal_note,
        *[t.note for t in rec.tracks],
    )
    is_modified_note = detect_modified(
        rec.supplementary_note, rec.verbal_note, rec.rehearsal_note,
    )
    ok_match, match_detail = filename_matches_tracks(rec.filename, rec.tracks)
    has_hash_change = (
        prev is not None
        and prev.combined_hash
        and rec.combined_hash != prev.combined_hash
    )

    if is_expired:
        rec.status = STATUS_EXPIRED
        reasons.append("检测到授权/版权到期关键字")
    elif is_modified_note or has_hash_change:
        rec.status = STATUS_MODIFIED
        if is_modified_note:
            reasons.append("检测到后补/改口径关键字")
        if has_hash_change:
            reasons.append("与上一版本材料口径有变更")
    elif not ok_match:
        rec.status = STATUS_MISMATCH
        reasons.append(match_detail)
    else:
        rec.status = STATUS_OK
        reasons.append("校验通过")

    if not ok_match and rec.status != STATUS_MISMATCH:
        reasons.append(match_detail)

    rec.status_detail = "；".join(reasons)


def build_change_log(rec: EncoreRecord, prev: Optional[EncoreRecord]) -> List[Dict[str, Any]]:
    log = list(prev.change_log) if prev else []
    entry = {"version": rec.version, "at": datetime.now().isoformat(timespec="seconds"), "diffs": []}
    if prev is None:
        entry["diffs"].append("初始版本")
        return [entry]
    if prev.filename != rec.filename:
        entry["diffs"].append(f"文件名: {prev.filename!r} -> {rec.filename!r}")
    if prev.tracks_hash != rec.tracks_hash:
        entry["diffs"].append("曲目表内容有变更")
    if prev.supplementary_note != rec.supplementary_note:
        entry["diffs"].append("后补备注有变更")
    if prev.verbal_note != rec.verbal_note:
        entry["diffs"].append("口头说明有变更")
    if prev.rehearsal_note != rec.rehearsal_note:
        entry["diffs"].append("排练/授权备注有变更")
    if not entry["diffs"]:
        entry["diffs"].append("无实质变更")
    log.append(entry)
    return log


def archive_submit(
    store: ArchiveStore,
    record_id: str,
    filename: Optional[str] = None,
    tracks_content: Optional[str] = None,
    supplementary_note: Optional[str] = None,
    verbal_note: Optional[str] = None,
    rehearsal_note: Optional[str] = None,
    manual_annotations: Optional[List[str]] = None,
    delivery_checklist: Optional[List[Dict[str, Any]]] = None,
) -> Tuple[Optional[EncoreRecord], Dict[str, Any]]:
    if not record_id:
        return None, {"ok": False, "error": "record_id 不能为空"}
    prev = store.load(record_id)
    if tracks_content:
        tracks = parse_tracks_file(tracks_content)
        if not tracks:
            return None, {"ok": False, "error": "未解析到任何曲目，请检查曲目表格式"}
    else:
        if prev is None or not prev.tracks:
            return None, {"ok": False, "error": "首次提交必须提供曲目表内容"}
        tracks = list(prev.tracks)
    if prev is None:
        rec = EncoreRecord(record_id=record_id)
    else:
        rec = EncoreRecord(
            record_id=record_id,
            version=prev.version + 1,
            filename=prev.filename,
            tracks=list(prev.tracks),
            supplementary_note=prev.supplementary_note,
            verbal_note=prev.verbal_note,
            rehearsal_note=prev.rehearsal_note,
            status=prev.status,
            status_detail=prev.status_detail,
            filename_hash=prev.filename_hash,
            tracks_hash=prev.tracks_hash,
            combined_hash=prev.combined_hash,
            created_at=prev.created_at,
            manual_annotations=list(prev.manual_annotations),
            delivery_checklist=list(prev.delivery_checklist),
            change_log=list(prev.change_log),
        )
    if filename:
        rec.filename = filename
    rec.tracks = tracks
    if supplementary_note:
        rec.supplementary_note = supplementary_note
    if verbal_note:
        rec.verbal_note = verbal_note
    if rehearsal_note:
        rec.rehearsal_note = rehearsal_note
    if manual_annotations:
        for a in manual_annotations:
            if a not in rec.manual_annotations:
                rec.manual_annotations.append(a)
    if delivery_checklist:
        existing = {d.get("item") for d in rec.delivery_checklist}
        for d in delivery_checklist:
            if d.get("item") not in existing:
                rec.delivery_checklist.append(d)
                existing.add(d.get("item"))
    compute_record_hashes(rec)
    evaluate_status(rec, prev)
    rec.change_log = build_change_log(rec, prev)
    store.save(rec)
    meta = {
        "ok": True,
        "version": rec.version,
        "status": rec.status,
        "status_label": STATUS_LABELS.get(rec.status, rec.status),
        "track_count": len(rec.tracks),
    }
    return rec, meta


def build_page_summary(store: ArchiveStore, record_id: str) -> Dict[str, Any]:
    rec = store.load(record_id)
    if rec is None:
        return {"ok": False, "error": f"记录 {record_id} 不存在"}
    versions = store.load_all_versions(record_id)
    track_dicts = [t.__dict__ for t in rec.tracks]
    tracks_str = json.dumps(track_dicts, ensure_ascii=False, sort_keys=True)
    verify_tracks_hash = compute_hash(tracks_str)
    verify_filename_hash = compute_hash(rec.filename)
    combined_verify = "|".join([
        rec.filename,
        tracks_str,
        rec.supplementary_note,
        rec.verbal_note,
        rec.rehearsal_note,
    ])
    verify_combined_hash = compute_hash(combined_verify)
    consistency = {
        "filename_hash_match": verify_filename_hash == rec.filename_hash,
        "tracks_hash_match": verify_tracks_hash == rec.tracks_hash,
        "combined_hash_match": verify_combined_hash == rec.combined_hash,
    }
    all_match = all(consistency.values())
    return {
        "ok": True,
        "record_id": record_id,
        "latest_version": rec.version,
        "status": rec.status,
        "status_label": STATUS_LABELS.get(rec.status, rec.status),
        "status_detail": rec.status_detail,
        "filename": rec.filename,
        "track_count": len(rec.tracks),
        "tracks": track_dicts,
        "supplementary_note": rec.supplementary_note,
        "verbal_note": rec.verbal_note,
        "rehearsal_note": rec.rehearsal_note,
        "manual_annotations": rec.manual_annotations,
        "delivery_checklist": rec.delivery_checklist,
        "filename_hash": rec.filename_hash,
        "tracks_hash": rec.tracks_hash,
        "combined_hash": rec.combined_hash,
        "consistency_check": {
            **consistency,
            "all_match": all_match,
        },
        "versions": [
            {
                "version": v.version,
                "status": v.status,
                "status_label": STATUS_LABELS.get(v.status, v.status),
                "status_detail": v.status_detail,
                "filename": v.filename,
                "track_count": len(v.tracks),
                "updated_at": v.updated_at,
                "combined_hash": v.combined_hash,
            }
            for v in versions
        ],
        "change_log": rec.change_log,
        "created_at": rec.created_at,
        "updated_at": rec.updated_at,
        "_schema_version": 2,
    }
