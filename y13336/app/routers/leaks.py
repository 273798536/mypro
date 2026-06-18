import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import LeakMark, GrayBatch, LeakStatus
from app.schemas.schemas import LeakMarkCreate, LeakMarkOut

router = APIRouter()


@router.post("/", response_model=LeakMarkOut)
def create_leak(body: LeakMarkCreate, db: Session = Depends(get_db)):
    batch = db.query(GrayBatch).filter(GrayBatch.id == body.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    mark = LeakMark(
        id=str(uuid.uuid4()),
        batch_id=body.batch_id,
        query_id=body.query_id,
        doc_id=body.doc_id,
        impact_scope=body.impact_scope,
        source_line=body.source_line,
        status=LeakStatus.suspected,
        operator=body.operator,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(mark)
    db.commit()
    db.refresh(mark)
    return mark


@router.get("/batch/{batch_id}", response_model=list[LeakMarkOut])
def list_leaks(batch_id: str, db: Session = Depends(get_db)):
    return db.query(LeakMark).filter(
        LeakMark.batch_id == batch_id,
    ).order_by(LeakMark.created_at.desc()).all()


@router.post("/{leak_id}/confirm", response_model=LeakMarkOut)
def confirm_leak(leak_id: str, db: Session = Depends(get_db)):
    mark = db.query(LeakMark).filter(LeakMark.id == leak_id).first()
    if not mark:
        raise HTTPException(status_code=404, detail="泄漏记录不存在")
    mark.status = LeakStatus.confirmed
    mark.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(mark)
    return mark


@router.post("/{leak_id}/false-positive", response_model=LeakMarkOut)
def mark_false_positive(leak_id: str, db: Session = Depends(get_db)):
    mark = db.query(LeakMark).filter(LeakMark.id == leak_id).first()
    if not mark:
        raise HTTPException(status_code=404, detail="泄漏记录不存在")
    mark.status = LeakStatus.false_positive
    mark.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(mark)
    return mark
