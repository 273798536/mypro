from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/history", tags=["history"])


@router.get("/", response_model=dict)
def list_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    sample_id: Optional[int] = None,
    action_type: Optional[str] = None,
    operator: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.ReviewHistory)

    if sample_id is not None:
        query = query.filter(models.ReviewHistory.sample_id == sample_id)
    if action_type:
        query = query.filter(models.ReviewHistory.action_type == action_type)
    if operator:
        query = query.filter(models.ReviewHistory.operator.like(f"%{operator}%"))

    total = query.count()
    items = query.order_by(models.ReviewHistory.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/sample/{sample_id}")
def get_sample_history(sample_id: int, db: Session = Depends(get_db)):
    histories = db.query(models.ReviewHistory).filter(
        models.ReviewHistory.sample_id == sample_id
    ).order_by(models.ReviewHistory.created_at.desc()).all()
    return histories


@router.post("/", response_model=schemas.ReviewHistory)
def create_history(history: schemas.ReviewHistoryCreate, db: Session = Depends(get_db)):
    db_history = models.ReviewHistory(**history.model_dump())
    db.add(db_history)
    db.commit()
    db.refresh(db_history)
    return db_history
