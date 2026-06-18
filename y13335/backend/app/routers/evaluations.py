from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/evaluations", tags=["evaluations"])


@router.get("/", response_model=dict)
def list_evaluations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    version_id: Optional[int] = None,
    sample_id: Optional[int] = None,
    is_pass: Optional[bool] = None,
    is_repeat_eval: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.EvaluationRecord)

    if version_id is not None:
        query = query.filter(models.EvaluationRecord.version_id == version_id)
    if sample_id is not None:
        query = query.filter(models.EvaluationRecord.sample_id == sample_id)
    if is_pass is not None:
        query = query.filter(models.EvaluationRecord.is_pass == is_pass)
    if is_repeat_eval is not None:
        query = query.filter(models.EvaluationRecord.is_repeat_eval == is_repeat_eval)

    total = query.count()
    items = query.order_by(models.EvaluationRecord.eval_time.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{eval_id}", response_model=schemas.EvaluationRecord)
def get_evaluation(eval_id: int, db: Session = Depends(get_db)):
    eval_record = db.query(models.EvaluationRecord).filter(models.EvaluationRecord.id == eval_id).first()
    if not eval_record:
        raise HTTPException(status_code=404, detail="Evaluation record not found")
    return eval_record


@router.post("/", response_model=schemas.EvaluationRecord)
def create_evaluation(eval_data: schemas.EvaluationRecordCreate, db: Session = Depends(get_db)):
    db_eval = models.EvaluationRecord(**eval_data.model_dump())
    db.add(db_eval)
    db.commit()
    db.refresh(db_eval)
    return db_eval


@router.post("/batch")
def batch_create_evaluations(eval_list: List[schemas.EvaluationRecordCreate], db: Session = Depends(get_db)):
    created = []
    for eval_data in eval_list:
        db_eval = models.EvaluationRecord(**eval_data.model_dump())
        db.add(db_eval)
        created.append(db_eval)
    db.commit()
    for item in created:
        db.refresh(item)
    return {"created": len(created), "items": created}


@router.get("/sample/{sample_id}")
def get_sample_evaluations(sample_id: int, db: Session = Depends(get_db)):
    evals = db.query(models.EvaluationRecord).filter(
        models.EvaluationRecord.sample_id == sample_id
    ).order_by(models.EvaluationRecord.eval_time.desc()).all()
    return evals
