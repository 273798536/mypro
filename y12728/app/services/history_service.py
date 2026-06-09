from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import ImportBatch, ScoreRecord, DataIssue


def list_history_batches(
    db: Session,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    q = db.query(ImportBatch)
    if start_date:
        try:
            sd = datetime.strptime(start_date, "%Y-%m-%d")
            q = q.filter(ImportBatch.created_at >= sd)
        except ValueError:
            pass
    if end_date:
        try:
            ed = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            q = q.filter(ImportBatch.created_at < ed)
        except ValueError:
            pass
    q = q.order_by(ImportBatch.created_at.desc()).limit(limit)
    batches = q.all()

    result = []
    for b in batches:
        rec_count = db.query(func.count(ScoreRecord.id)).filter(ScoreRecord.batch_id == b.id).scalar() or 0
        pass_count = (
            db.query(func.count(ScoreRecord.id))
            .filter(ScoreRecord.batch_id == b.id, ScoreRecord.status == "approved")
            .scalar() or 0
        )
        pending_count = (
            db.query(func.count(ScoreRecord.id))
            .filter(ScoreRecord.batch_id == b.id, ScoreRecord.status.in_(["pending", "corrected"]))
            .scalar() or 0
        )
        issue_count = db.query(func.count(DataIssue.id)).filter(DataIssue.batch_id == b.id).scalar() or 0

        result.append({
            "batch_no": b.batch_no,
            "file_name": b.file_name,
            "created_at": b.created_at,
            "total_records": rec_count,
            "pass_count": pass_count,
            "pending_count": pending_count,
            "issue_count": issue_count,
        })
    return result


def compare_batches(
    db: Session,
    batch_a_no: str,
    batch_b_no: str,
) -> Dict[str, Any]:
    ba = db.query(ImportBatch).filter(ImportBatch.batch_no == batch_a_no).first()
    bb = db.query(ImportBatch).filter(ImportBatch.batch_no == batch_b_no).first()
    if not ba or not bb:
        return {}

    def _batch_records(batch_id):
        recs = db.query(ScoreRecord).filter(ScoreRecord.batch_id == batch_id).all()
        return {r.dedup_key: r for r in recs if r.dedup_key}

    map_a = _batch_records(ba.id)
    map_b = _batch_records(bb.id)

    keys_a = set(map_a.keys())
    keys_b = set(map_b.keys())

    only_in_a = [map_a[k] for k in (keys_a - keys_b)]
    only_in_b = [map_b[k] for k in (keys_b - keys_a)]
    common_keys = keys_a & keys_b

    changed = []
    for k in common_keys:
        ra, rb = map_a[k], map_b[k]
        diffs = {}
        if ra.score_origin != rb.score_origin:
            diffs["score_origin"] = {"from": ra.score_origin, "to": rb.score_origin}
        if ra.alarm_level != rb.alarm_level:
            diffs["alarm_level"] = {"from": ra.alarm_level, "to": rb.alarm_level}
        if ra.alarm_flag != rb.alarm_flag:
            diffs["alarm_flag"] = {"from": ra.alarm_flag, "to": rb.alarm_flag}
        if diffs:
            changed.append({"key": k, "record_a": ra, "record_b": rb, "diffs": diffs})

    unchanged_count = len(common_keys) - len(changed)

    return {
        "batch_a": {"batch_no": ba.batch_no, "file_name": ba.file_name, "created_at": ba.created_at},
        "batch_b": {"batch_no": bb.batch_no, "file_name": bb.file_name, "created_at": bb.created_at},
        "only_in_a": only_in_a,
        "only_in_b": only_in_b,
        "changed": changed,
        "unchanged_count": unchanged_count,
        "common_count": len(common_keys),
    }
