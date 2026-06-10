from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from .sample_import import get_sample_detail
from .. import models, schemas


VALID_TRANSITIONS = {
    "imported": ["reviewing", "rejected"],
    "reviewing": ["qc_passed", "needs_bio_review", "rejected"],
    "qc_passed": ["exported", "needs_bio_review"],
    "needs_bio_review": ["qc_passed", "rejected"],
    "rejected": [],
    "exported": [],
}


def can_transition(from_status: str, to_status: str) -> bool:
    return to_status in VALID_TRANSITIONS.get(from_status, [])


def add_qc_record(db: Session, qc_data: schemas.QCRecordCreate) -> Optional[models.QCRecord]:
    sample = get_sample_detail(db, qc_data.sample_id)
    if not sample:
        return None

    qc = models.QCRecord(
        sample_id=qc_data.sample_id,
        reviewer=qc_data.reviewer,
        quality_score=qc_data.quality_score,
        low_quality_flag=qc_data.low_quality_flag,
        contamination_check=qc_data.contamination_check,
        read_count=qc_data.read_count,
        mapping_rate=qc_data.mapping_rate,
        remarks=qc_data.remarks,
    )
    db.add(qc)

    sample.low_quality_reads = qc_data.low_quality_flag
    if qc_data.remarks:
        sample.low_quality_detail = qc_data.remarks

    if qc_data.quality_score is not None:
        if qc_data.quality_score >= 0.8 and not qc_data.low_quality_flag:
            sample.quality_rating = "high"
        elif qc_data.quality_score >= 0.5:
            sample.quality_rating = "medium"
        else:
            sample.quality_rating = "low"

    if sample.review_status == "imported":
        sample.review_status = "reviewing"
        _log_status(db, sample.id, "imported", "reviewing", qc_data.reviewer, "开始质控")

    db.commit()
    db.refresh(qc)
    return qc


def add_review_record(db: Session, review_data: schemas.ReviewRecordCreate) -> Optional[models.ReviewRecord]:
    sample = get_sample_detail(db, review_data.sample_id)
    if not sample:
        return None

    review = models.ReviewRecord(
        sample_id=review_data.sample_id,
        reviewer=review_data.reviewer,
        review_type=review_data.review_type,
        review_opinion=review_data.review_opinion,
        culture_record_check=review_data.culture_record_check,
        time_point_check=review_data.time_point_check,
        barcode_duplicate=review_data.barcode_duplicate,
        empty_field_found=review_data.empty_field_found,
        mixed_notes_found=review_data.mixed_notes_found,
        final_decision=review_data.final_decision,
    )
    db.add(review)

    if review_data.empty_field_found or review_data.mixed_notes_found or review_data.barcode_duplicate:
        sample.needs_teacher_review = True

    if review_data.final_decision == "qc_passed":
        sample.can_use_directly = not sample.needs_teacher_review
        _transition_status(db, sample, "qc_passed", review_data.reviewer, review_data.review_opinion)
    elif review_data.final_decision == "needs_bio_review":
        sample.needs_teacher_review = True
        sample.can_use_directly = False
        _transition_status(db, sample, "needs_bio_review", review_data.reviewer, review_data.review_opinion)
    elif review_data.final_decision == "rejected":
        sample.can_use_directly = False
        sample.unusable_reason = review_data.review_opinion
        _transition_status(db, sample, "rejected", review_data.reviewer, review_data.review_opinion)

    db.commit()
    db.refresh(review)
    return review


def update_sample_status(
    db: Session,
    sample_id: int,
    to_status: str,
    operator: str,
    reason: Optional[str] = None,
) -> Optional[models.Sample]:
    sample = get_sample_detail(db, sample_id)
    if not sample:
        return None
    _transition_status(db, sample, to_status, operator, reason)
    db.commit()
    db.refresh(sample)
    return sample


def batch_update_status(
    db: Session,
    sample_ids: List[int],
    to_status: str,
    operator: str,
    reason: Optional[str] = None,
) -> Dict[str, Any]:
    updated = []
    failed = []
    for sid in sample_ids:
        sample = get_sample_detail(db, sid)
        if not sample:
            failed.append({"sample_id": sid, "reason": "样本不存在"})
            continue
        if not can_transition(sample.review_status, to_status):
            failed.append({
                "sample_id": sid,
                "barcode": sample.barcode,
                "reason": f"无法从 {sample.review_status} 转为 {to_status}",
            })
            continue
        _transition_status(db, sample, to_status, operator, reason)
        updated.append(sid)
    db.commit()
    return {"updated": updated, "failed": failed}


def _transition_status(
    db: Session,
    sample: models.Sample,
    to_status: str,
    operator: str,
    reason: Optional[str] = None,
) -> bool:
    from_status = sample.review_status
    if not can_transition(from_status, to_status):
        return False
    sample.review_status = to_status
    if to_status == "qc_passed" and not sample.needs_teacher_review:
        sample.can_use_directly = True
    _log_status(db, sample.id, from_status, to_status, operator, reason)
    return True


def _log_status(
    db: Session,
    sample_id: int,
    from_status: str,
    to_status: str,
    operator: str,
    reason: Optional[str] = None,
):
    log = models.StatusLog(
        sample_id=sample_id,
        from_status=from_status,
        to_status=to_status,
        operator=operator,
        reason=reason,
    )
    db.add(log)


def get_qc_summary(db: Session, batch_id: Optional[str] = None) -> schemas.QCSummary:
    query = db.query(models.Sample)
    if batch_id:
        query = query.filter(models.Sample.import_batch_id == batch_id)
    samples = query.all()
    total = len(samples)
    return schemas.QCSummary(
        total_samples=total,
        qc_passed=sum(1 for s in samples if s.review_status == "qc_passed"),
        needs_teacher_review=sum(1 for s in samples if s.needs_teacher_review),
        rejected=sum(1 for s in samples if s.review_status == "rejected"),
        pending=sum(1 for s in samples if s.review_status in ("imported", "reviewing")),
        low_quality_reads_count=sum(1 for s in samples if s.low_quality_reads),
        direct_usable_count=sum(1 for s in samples if s.can_use_directly),
    )


def get_unusable_samples(db: Session, batch_id: Optional[str] = None) -> List[models.Sample]:
    query = db.query(models.Sample).filter(
        (models.Sample.review_status == "rejected") |
        (models.Sample.needs_teacher_review == True) |
        (models.Sample.low_quality_reads == True)
    )
    if batch_id:
        query = query.filter(models.Sample.import_batch_id == batch_id)
    return query.all()
