from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import ReviewRecord, QuestionItem, BatchStatus, AnomalyCategory, ResultGrade
from app.services.batch_service import update_batch_status
from app.schemas import ReviewRecordCreate, ReviewRecordUpdate
from datetime import datetime
from typing import List, Optional, Dict


def create_or_update_review(db: Session, review_in: ReviewRecordCreate) -> ReviewRecord:
    existing = db.query(ReviewRecord).filter(
        ReviewRecord.batch_id == review_in.batch_id,
        ReviewRecord.question_id == review_in.question_id
    ).first()

    if existing:
        existing.anomaly_category = review_in.anomaly_category
        existing.result_grade = review_in.result_grade
        existing.reviewer = review_in.reviewer
        existing.review_note = review_in.review_note
        existing.next_step = review_in.next_step
        existing.reviewed_at = datetime.utcnow()
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing

    review = ReviewRecord(
        batch_id=review_in.batch_id,
        question_id=review_in.question_id,
        anomaly_category=review_in.anomaly_category,
        result_grade=review_in.result_grade,
        reviewer=review_in.reviewer,
        review_note=review_in.review_note,
        next_step=review_in.next_step,
        reviewed_at=datetime.utcnow()
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


def update_review(db: Session, review_id: int, update_in: ReviewRecordUpdate) -> Optional[ReviewRecord]:
    review = db.query(ReviewRecord).filter(ReviewRecord.id == review_id).first()
    if not review:
        return None
    if update_in.anomaly_category is not None:
        review.anomaly_category = update_in.anomaly_category
    if update_in.result_grade is not None:
        review.result_grade = update_in.result_grade
    if update_in.reviewer is not None:
        review.reviewer = update_in.reviewer
    if update_in.review_note is not None:
        review.review_note = update_in.review_note
    if update_in.next_step is not None:
        review.next_step = update_in.next_step
    review.reviewed_at = datetime.utcnow()
    review.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(review)
    return review


def list_reviews(db: Session, batch_id: int, result_grade: Optional[ResultGrade] = None,
                 anomaly_category: Optional[AnomalyCategory] = None,
                 skip: int = 0, limit: int = 200) -> List[ReviewRecord]:
    from sqlalchemy.orm import joinedload
    query = db.query(ReviewRecord).options(joinedload(ReviewRecord.question)).filter(
        ReviewRecord.batch_id == batch_id
    )
    if result_grade:
        query = query.filter(ReviewRecord.result_grade == result_grade)
    if anomaly_category:
        query = query.filter(ReviewRecord.anomaly_category == anomaly_category)
    return query.order_by(ReviewRecord.updated_at.desc()).offset(skip).limit(limit).all()


def get_review_summary(db: Session, batch_id: int) -> Dict:
    total_q = db.query(func.count(QuestionItem.id)).filter(
        QuestionItem.batch_id == batch_id
    ).scalar() or 0

    def cnt(grade=None, anomaly=None):
        q = db.query(func.count(ReviewRecord.id)).filter(ReviewRecord.batch_id == batch_id)
        if grade:
            q = q.filter(ReviewRecord.result_grade == grade)
        if anomaly:
            q = q.filter(ReviewRecord.anomaly_category == anomaly)
        return q.scalar() or 0

    return {
        "total_questions": total_q,
        "usable_count": cnt(grade=ResultGrade.USABLE),
        "pending_count": cnt(grade=ResultGrade.PENDING),
        "recollect_count": cnt(grade=ResultGrade.RECOLLECT),
        "need_material_count": cnt(anomaly=AnomalyCategory.NEED_MATERIAL),
        "need_standard_count": cnt(anomaly=AnomalyCategory.NEED_STANDARD),
        "no_anomaly_count": cnt(anomaly=AnomalyCategory.NONE)
    }


def auto_initialize_reviews(db: Session, batch_id: int) -> int:
    questions = db.query(QuestionItem).filter(QuestionItem.batch_id == batch_id).all()
    created = 0
    for q in questions:
        exist = db.query(ReviewRecord).filter(
            ReviewRecord.batch_id == batch_id,
            ReviewRecord.question_id == q.id
        ).first()
        if not exist:
            r = ReviewRecord(
                batch_id=batch_id,
                question_id=q.id,
                anomaly_category=AnomalyCategory.NONE,
                result_grade=ResultGrade.PENDING,
                next_step="等待排课老师复核"
            )
            db.add(r)
            created += 1
    db.commit()
    if created > 0:
        update_batch_status(db, batch_id, BatchStatus.REVIEWING)
    return created


def mark_batch_completed(db: Session, batch_id: int) -> bool:
    update_batch_status(db, batch_id, BatchStatus.COMPLETED)
    return True
