from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/samples", tags=["samples"])


@router.get("/", response_model=dict)
def list_samples(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    source: Optional[str] = None,
    category: Optional[str] = None,
    keyword: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Sample)

    if source:
        query = query.filter(models.Sample.source == source)
    if category:
        query = query.filter(models.Sample.category == category)
    if keyword:
        query = query.filter(models.Sample.query.like(f"%{keyword}%"))

    total = query.count()
    items = query.order_by(models.Sample.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{sample_id}", response_model=schemas.Sample)
def get_sample(sample_id: int, db: Session = Depends(get_db)):
    sample = db.query(models.Sample).filter(models.Sample.id == sample_id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    return sample


@router.post("/", response_model=schemas.Sample)
def create_sample(sample: schemas.SampleCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Sample).filter(models.Sample.sample_id == sample.sample_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Sample ID already exists")

    db_sample = models.Sample(**sample.model_dump())
    db.add(db_sample)
    db.commit()
    db.refresh(db_sample)
    return db_sample


@router.put("/{sample_id}", response_model=schemas.Sample)
def update_sample(sample_id: int, sample: schemas.SampleCreate, db: Session = Depends(get_db)):
    db_sample = db.query(models.Sample).filter(models.Sample.id == sample_id).first()
    if not db_sample:
        raise HTTPException(status_code=404, detail="Sample not found")

    for key, value in sample.model_dump().items():
        setattr(db_sample, key, value)
    db_sample.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_sample)
    return db_sample


@router.delete("/{sample_id}")
def delete_sample(sample_id: int, db: Session = Depends(get_db)):
    db_sample = db.query(models.Sample).filter(models.Sample.id == sample_id).first()
    if not db_sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    db.delete(db_sample)
    db.commit()
    return {"message": "Sample deleted successfully"}
