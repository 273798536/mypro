from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session

from app.models.models import ScoreRecord, ReviewLog, DataIssue


VALID_STATUS_TRANSITIONS = {
    "pending": ["approved", "rejected", "corrected", "duplicate"],
    "corrected": ["approved", "rejected"],
    "duplicate": ["approved", "rejected", "merged"],
    "approved": ["rejected"],
    "rejected": ["approved"],
    "merged": ["approved"],
}


def _add_review_log(
    db: Session,
    record_id: int,
    action: str,
    from_status: Optional[str] = None,
    to_status: Optional[str] = None,
    field_name: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    operator: str = "teacher",
    note: Optional[str] = None,
):
    log = ReviewLog(
        record_id=record_id,
        action=action,
        from_status=from_status,
        to_status=to_status,
        field_name=field_name,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        operator=operator,
        note=note,
    )
    db.add(log)


def update_record_status(
    db: Session,
    record_id: int,
    new_status: str,
    operator: str = "teacher",
    review_note: Optional[str] = None,
) -> Optional[ScoreRecord]:
    record = db.query(ScoreRecord).filter(ScoreRecord.id == record_id).first()
    if not record:
        return None

    old_status = record.status
    allowed = VALID_STATUS_TRANSITIONS.get(old_status, [])
    if new_status not in allowed and new_status != old_status:
        return None

    record.status = new_status
    record.reviewed_by = operator
    record.reviewed_at = datetime.now()
    if review_note:
        record.review_note = (record.review_note or "") + f"\n[{operator}] {review_note}"

    _add_review_log(
        db,
        record_id=record_id,
        action="status_change",
        from_status=old_status,
        to_status=new_status,
        operator=operator,
        note=review_note,
    )

    db.commit()
    db.refresh(record)
    return record


def correct_record_fields(
    db: Session,
    record_id: int,
    operator: str = "teacher",
    score_corrected_value: Optional[float] = None,
    alarm_corrected_level: Optional[str] = None,
    review_note: Optional[str] = None,
) -> Optional[ScoreRecord]:
    record = db.query(ScoreRecord).filter(ScoreRecord.id == record_id).first()
    if not record:
        return None

    if score_corrected_value is not None:
        old_score = record.score_origin
        record.score_origin = score_corrected_value
        record.score_corrected_value = score_corrected_value
        _add_review_log(
            db,
            record_id=record_id,
            action="field_correction",
            field_name="score_origin",
            old_value=old_score,
            new_value=score_corrected_value,
            operator=operator,
            note=review_note,
        )

    if alarm_corrected_level is not None:
        old_alarm = record.alarm_level
        record.alarm_level = alarm_corrected_level
        record.alarm_corrected_level = alarm_corrected_level
        _add_review_log(
            db,
            record_id=record_id,
            action="field_correction",
            field_name="alarm_level",
            old_value=old_alarm,
            new_value=alarm_corrected_level,
            operator=operator,
            note=review_note,
        )

    record.corrected_by = operator
    record.corrected_at = datetime.now()
    if record.status == "pending":
        record.status = "corrected"
    if review_note:
        record.review_note = (record.review_note or "") + f"\n[{operator} 修正] {review_note}"

    db.commit()
    db.refresh(record)
    return record


def resolve_issue(
    db: Session,
    issue_id: int,
    note: Optional[str] = None,
    operator: str = "teacher",
) -> Optional[DataIssue]:
    issue = db.query(DataIssue).filter(DataIssue.id == issue_id).first()
    if not issue:
        return None
    issue.resolved = True
    issue.resolved_note = note
    db.commit()
    db.refresh(issue)
    return issue


def batch_approve(
    db: Session,
    record_ids: List[int],
    operator: str = "teacher",
    note: Optional[str] = None,
) -> int:
    count = 0
    for rid in record_ids:
        r = update_record_status(db, rid, "approved", operator, note)
        if r:
            count += 1
    return count


def get_review_logs(db: Session, record_id: int) -> List[ReviewLog]:
    return (
        db.query(ReviewLog)
        .filter(ReviewLog.record_id == record_id)
        .order_by(ReviewLog.created_at.desc())
        .all()
    )
