from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import schemas
from ..services.qc_review import (
    add_qc_record,
    add_review_record,
    update_sample_status,
    batch_update_status,
    get_qc_summary,
    get_unusable_samples,
    VALID_TRANSITIONS,
)

router = APIRouter(prefix="/api/qc", tags=["qc-review"])


@router.post("/qc-record", response_model=schemas.QCRecordOut)
def create_qc_record(data: schemas.QCRecordCreate, db: Session = Depends(get_db)):
    qc = add_qc_record(db, data)
    if not qc:
        raise HTTPException(status_code=404, detail="样本不存在")
    return qc


@router.post("/review", response_model=schemas.ReviewRecordOut)
def create_review_record(data: schemas.ReviewRecordCreate, db: Session = Depends(get_db)):
    review = add_review_record(db, data)
    if not review:
        raise HTTPException(status_code=404, detail="样本不存在")
    return review


@router.post("/status")
def change_status(data: schemas.StatusUpdate, db: Session = Depends(get_db)):
    sample = update_sample_status(db, data.sample_id, data.to_status, data.operator, data.reason)
    if not sample:
        raise HTTPException(status_code=404, detail="样本不存在")
    return {"sample_id": sample.id, "status": sample.review_status}


@router.post("/status/batch")
def batch_change_status(data: schemas.BatchStatusUpdate, db: Session = Depends(get_db)):
    return batch_update_status(db, data.sample_ids, data.to_status, data.operator, data.reason)


@router.get("/transitions")
def list_valid_transitions():
    return VALID_TRANSITIONS


@router.get("/summary", response_model=schemas.QCSummary)
def qc_summary(batch_id: Optional[str] = None, db: Session = Depends(get_db)):
    return get_qc_summary(db, batch_id)


@router.get("/unusable", response_model=List[schemas.SampleOut])
def list_unusable(batch_id: Optional[str] = None, db: Session = Depends(get_db)):
    return get_unusable_samples(db, batch_id)
