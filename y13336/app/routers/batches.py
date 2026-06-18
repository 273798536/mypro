import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import GrayBatch, BatchStatus
from app.schemas.schemas import GrayBatchCreate, GrayBatchOut

router = APIRouter()


@router.post("/", response_model=GrayBatchOut)
def create_batch(body: GrayBatchCreate, db: Session = Depends(get_db)):
    batch = GrayBatch(
        id=str(uuid.uuid4()),
        name=body.name,
        old_model_version=body.old_model_version,
        new_model_version=body.new_model_version,
        status=BatchStatus.draft,
        created_at=datetime.utcnow(),
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


@router.get("/", response_model=list[GrayBatchOut])
def list_batches(db: Session = Depends(get_db)):
    return db.query(GrayBatch).order_by(GrayBatch.created_at.desc()).all()


@router.get("/{batch_id}", response_model=GrayBatchOut)
def get_batch(batch_id: str, db: Session = Depends(get_db)):
    batch = db.query(GrayBatch).filter(GrayBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return batch


@router.post("/{batch_id}/complete", response_model=GrayBatchOut)
def complete_batch(batch_id: str, db: Session = Depends(get_db)):
    batch = db.query(GrayBatch).filter(GrayBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    batch.status = BatchStatus.completed
    batch.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(batch)
    return batch


@router.post("/{batch_id}/archive", response_model=GrayBatchOut)
def archive_batch(batch_id: str, db: Session = Depends(get_db)):
    batch = db.query(GrayBatch).filter(GrayBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    batch.status = BatchStatus.archived
    db.commit()
    db.refresh(batch)
    return batch
