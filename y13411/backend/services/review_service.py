from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from models import Question, ParameterVersion, SupplementRecord, ChangeLog
from schemas import ReviewEntryResponse


def get_question_review(
    db: Session, question_id: Optional[int] = None, question_no: Optional[str] = None
) -> Optional[ReviewEntryResponse]:
    q = db.query(Question)
    if question_id:
        q = q.filter(Question.id == question_id)
    elif question_no:
        q = q.filter(Question.question_no == question_no)
    else:
        return None

    question = q.first()
    if not question:
        return None

    parameters = (
        db.query(ParameterVersion)
        .filter(ParameterVersion.question_id == question.id)
        .order_by(ParameterVersion.version_no.desc(), ParameterVersion.created_at.desc())
        .all()
    )

    supplements = (
        db.query(SupplementRecord)
        .filter(SupplementRecord.question_id == question.id)
        .order_by(SupplementRecord.recorded_at.desc())
        .all()
    )

    param_ids = [p.id for p in parameters]
    change_logs: List[ChangeLog] = []
    logs_q = db.query(ChangeLog)
    logs_q = logs_q.filter(
        (ChangeLog.target_type == "question") & (ChangeLog.target_id == question.id)
        | (ChangeLog.target_type == "parameter") & (ChangeLog.target_id.in_(param_ids))
        | (ChangeLog.target_type == "supplement")
    )
    change_logs = logs_q.order_by(ChangeLog.changed_at.desc()).all()

    return ReviewEntryResponse(
        question=question,
        parameters=parameters,
        supplements=supplements,
        change_logs=change_logs,
    )


def list_all_questions(
    db: Session, skip: int = 0, limit: int = 100,
    category: Optional[str] = None, keyword: Optional[str] = None
) -> List[Question]:
    q = db.query(Question).filter(Question.is_active == True)
    if category:
        q = q.filter(Question.category == category)
    if keyword:
        q = q.filter(
            (Question.question_no.contains(keyword))
            | (Question.title.contains(keyword))
        )
    return q.order_by(Question.question_no).offset(skip).limit(limit).all()


def list_change_logs(
    db: Session, skip: int = 0, limit: int = 200,
    target_type: Optional[str] = None, batch_no: Optional[str] = None,
    changed_by: Optional[str] = None
) -> List[ChangeLog]:
    q = db.query(ChangeLog)
    if target_type:
        q = q.filter(ChangeLog.target_type == target_type)
    if batch_no:
        q = q.filter(ChangeLog.batch_no == batch_no)
    if changed_by:
        q = q.filter(ChangeLog.changed_by == changed_by)
    return q.order_by(ChangeLog.changed_at.desc()).offset(skip).limit(limit).all()


def list_parameter_versions(
    db: Session, question_id: int
) -> List[ParameterVersion]:
    return (
        db.query(ParameterVersion)
        .filter(ParameterVersion.question_id == question_id)
        .order_by(ParameterVersion.version_no.desc(), ParameterVersion.created_at.desc())
        .all()
    )
