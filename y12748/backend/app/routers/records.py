from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from .. import schemas, crud

router = APIRouter(prefix="/api/records", tags=["题目记录"])


@router.get("", response_model=List[schemas.QuestionRecord])
def list_records(batch_id: Optional[int] = None,
                 status: Optional[str] = None,
                 has_issues: Optional[bool] = None,
                 skip: int = 0, limit: int = 500,
                 db: Session = Depends(get_db)):
    return crud.list_question_records(db, batch_id=batch_id, status=status,
                                      has_issues=has_issues, skip=skip, limit=limit)


@router.get("/{record_id}", response_model=schemas.QuestionRecord)
def get_record(record_id: int, db: Session = Depends(get_db)):
    record = crud.get_question_record(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    return record


@router.patch("/{record_id}", response_model=schemas.QuestionRecord)
def update_record_field(record_id: int, update: schemas.QuestionRecordUpdate,
                        db: Session = Depends(get_db)):
    record = crud.get_question_record(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    valid_fields = [
        "question_id", "question_content", "material_name", "material_type",
        "stress_level", "temperature", "lifetime_hours", "unit",
        "student_answer", "correct_answer", "constraint_condition", "remark", "source"
    ]
    if update.field_name not in valid_fields:
        raise HTTPException(status_code=400, detail=f"不支持修改字段: {update.field_name}")

    updated = crud.update_question_record_field(
        db, record_id, update.field_name, update.new_value, update.comment
    )
    if not updated:
        raise HTTPException(status_code=500, detail="更新失败")
    return updated


@router.post("/{record_id}/status", response_model=schemas.QuestionRecord)
def transition_status(record_id: int, transition: schemas.StatusTransition,
                      db: Session = Depends(get_db)):
    valid_transitions = {
        "pending": ["reviewing", "passed", "rejected"],
        "reviewing": ["passed", "rejected", "pending"],
        "passed": ["pending", "reviewing"],
        "rejected": ["pending", "reviewing", "passed"]
    }
    if transition.from_status not in valid_transitions:
        raise HTTPException(status_code=400, detail=f"无效的起始状态: {transition.from_status}")
    if transition.to_status not in valid_transitions[transition.from_status]:
        raise HTTPException(status_code=400,
                            detail=f"不允许的状态转换: {transition.from_status} -> {transition.to_status}")

    record = crud.get_question_record(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    if record.status != transition.from_status:
        raise HTTPException(status_code=400,
                            detail=f"当前状态不匹配: 期望 {transition.from_status}，实际 {record.status}")

    return crud.update_question_record_field(
        db, record_id, "status", transition.to_status, transition.comment
    )


@router.get("/{record_id}/corrections", response_model=List[schemas.CorrectionHistory])
def get_record_corrections(record_id: int, db: Session = Depends(get_db)):
    record = crud.get_question_record(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    return crud.get_correction_history(db, record_id=record_id)


@router.get("/{record_id}/review-results", response_model=List[schemas.ReviewResult])
def get_record_review_results(record_id: int, db: Session = Depends(get_db)):
    record = crud.get_question_record(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    return crud.list_review_results(db, record_id=record_id)
