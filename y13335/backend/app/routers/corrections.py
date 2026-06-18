from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/corrections", tags=["corrections"])


@router.get("/", response_model=dict)
def list_corrections(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    sample_id: Optional[int] = None,
    version_id: Optional[int] = None,
    source: Optional[str] = None,
    process_status: Optional[str] = None,
    correction_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.ManualCorrection)

    if sample_id is not None:
        query = query.filter(models.ManualCorrection.sample_id == sample_id)
    if version_id is not None:
        query = query.filter(models.ManualCorrection.version_id == version_id)
    if source:
        query = query.filter(models.ManualCorrection.source == source)
    if process_status:
        query = query.filter(models.ManualCorrection.process_status == process_status)
    if correction_type:
        query = query.filter(models.ManualCorrection.correction_type == correction_type)

    total = query.count()
    items = query.order_by(models.ManualCorrection.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{correction_id}", response_model=schemas.ManualCorrection)
def get_correction(correction_id: int, db: Session = Depends(get_db)):
    correction = db.query(models.ManualCorrection).filter(models.ManualCorrection.id == correction_id).first()
    if not correction:
        raise HTTPException(status_code=404, detail="Correction not found")
    return correction


@router.post("/", response_model=schemas.ManualCorrection)
def create_correction(correction: schemas.ManualCorrectionCreate, db: Session = Depends(get_db)):
    db_correction = models.ManualCorrection(**correction.model_dump())
    db.add(db_correction)

    history = models.ReviewHistory(
        sample_id=correction.sample_id,
        action_type="correction_created",
        after_data=correction.correction_data,
        operator=correction.operator,
        remark=f"人工修正已录入，来源: {correction.source}",
    )
    db.add(history)

    db.commit()
    db.refresh(db_correction)
    return db_correction


@router.put("/{correction_id}", response_model=schemas.ManualCorrection)
def update_correction(
    correction_id: int,
    update_data: schemas.ManualCorrectionUpdate,
    db: Session = Depends(get_db),
):
    db_correction = db.query(models.ManualCorrection).filter(models.ManualCorrection.id == correction_id).first()
    if not db_correction:
        raise HTTPException(status_code=404, detail="Correction not found")

    before_data = {
        "process_status": db_correction.process_status,
        "correction_data": db_correction.correction_data,
        "operator": db_correction.operator,
    }

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(db_correction, key, value)
    db_correction.updated_at = datetime.utcnow()

    after_data = {
        "process_status": db_correction.process_status,
        "correction_data": db_correction.correction_data,
        "operator": db_correction.operator,
    }

    history = models.ReviewHistory(
        sample_id=db_correction.sample_id,
        action_type="correction_updated",
        before_data=before_data,
        after_data=after_data,
        operator=update_data.operator or db_correction.operator,
        remark="人工修正已更新",
    )
    db.add(history)

    db.commit()
    db.refresh(db_correction)
    return db_correction


@router.get("/sample/{sample_id}")
def get_sample_corrections(sample_id: int, db: Session = Depends(get_db)):
    corrections = db.query(models.ManualCorrection).filter(
        models.ManualCorrection.sample_id == sample_id
    ).order_by(models.ManualCorrection.created_at.desc()).all()
    return corrections


@router.get("/sources/summary")
def get_source_summary(db: Session = Depends(get_db)):
    from sqlalchemy import func
    results = db.query(
        models.ManualCorrection.source,
        func.count(models.ManualCorrection.id).label("count"),
        func.sum(func.case((models.ManualCorrection.process_status == "processed", 1), else_=0)).label("processed_count")
    ).group_by(models.ManualCorrection.source).all()

    return [
        {"source": r[0], "total_count": r[1], "processed_count": r[2]}
        for r in results
    ]
