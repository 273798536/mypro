from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from app.models.models import ScoreRecord, ImportBatch, DataIssue, ReviewLog


def trace_record(db: Session, record_id: int) -> Optional[Dict[str, Any]]:
    record = db.query(ScoreRecord).filter(ScoreRecord.id == record_id).first()
    if not record:
        return None

    batch = db.query(ImportBatch).filter(ImportBatch.id == record.batch_id).first()
    issues = db.query(DataIssue).filter(DataIssue.record_id == record_id).all()
    review_logs = (
        db.query(ReviewLog)
        .filter(ReviewLog.record_id == record_id)
        .order_by(ReviewLog.created_at.desc())
        .all()
    )

    related = []
    if record.duplicate_of_id:
        orig = db.query(ScoreRecord).filter(ScoreRecord.id == record.duplicate_of_id).first()
        if orig:
            related.append(orig)

    if record.dedup_key:
        same_key = (
            db.query(ScoreRecord)
            .filter(
                ScoreRecord.dedup_key == record.dedup_key,
                ScoreRecord.id != record_id,
            )
            .all()
        )
        seen_ids = {r.id for r in related}
        for sk in same_key:
            if sk.id not in seen_ids:
                related.append(sk)
                seen_ids.add(sk.id)

    return {
        "record": record,
        "source_batch": batch,
        "issues": issues,
        "review_logs": review_logs,
        "related_duplicates": related,
    }


def trace_by_identity(
    db: Session,
    student_id: Optional[str] = None,
    subject: Optional[str] = None,
    unit_name: Optional[str] = None,
) -> List[ScoreRecord]:
    q = db.query(ScoreRecord)
    conditions = []
    if student_id:
        conditions.append(ScoreRecord.student_id == student_id)
    if subject:
        conditions.append(ScoreRecord.subject == subject)
    if unit_name:
        conditions.append(ScoreRecord.unit_name == unit_name)
    if conditions:
        from sqlalchemy import and_
        q = q.filter(and_(*conditions))
    return q.order_by(ScoreRecord.created_at.desc()).all()
