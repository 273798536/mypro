from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
from pathlib import Path
import uuid

from database import get_db
import schemas
import models
import config
from services import BatchService, ExportService

router = APIRouter(prefix="/api/v1", tags=["batches"])

@router.post("/batches", response_model=schemas.Batch, status_code=201)
def create_batch(batch_data: schemas.BatchCreate, db: Session = Depends(get_db)):
    service = BatchService(db)
    try:
        batch = service.create_batch(batch_data)
        return batch
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/batches/{batch_no}", response_model=schemas.Batch)
def get_batch(batch_no: str, db: Session = Depends(get_db)):
    service = BatchService(db)
    batch = service.get_batch(batch_no)
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch {batch_no} not found")
    return batch

@router.get("/batches", response_model=schemas.BatchList)
def list_batches(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    service = BatchService(db)
    total, batches = service.list_batches(skip=skip, limit=limit, status=status)
    return {"total": total, "items": batches}

@router.post("/batches/{batch_no}/submit", response_model=schemas.Batch)
def submit_batch(batch_no: str, submit_data: schemas.BatchSubmit, db: Session = Depends(get_db)):
    service = BatchService(db)
    try:
        batch, errors = service.submit_batch(batch_no, submit_data)
        return batch
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/batches/{batch_no}/withdraw", response_model=schemas.Batch)
def withdraw_batch(batch_no: str, withdraw_data: schemas.BatchWithdraw, db: Session = Depends(get_db)):
    service = BatchService(db)
    try:
        batch = service.withdraw_batch(batch_no, withdraw_data)
        return batch
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/batches/{batch_no}/freeze", response_model=schemas.Batch)
def freeze_batch(batch_no: str, freeze_data: schemas.BatchFreeze, db: Session = Depends(get_db)):
    service = BatchService(db)
    try:
        batch = service.freeze_batch(batch_no, freeze_data)
        return batch
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/batches/{batch_no}/revise", response_model=schemas.Batch)
def revise_batch(batch_no: str, revise_data: schemas.BatchRevise, db: Session = Depends(get_db)):
    service = BatchService(db)
    try:
        batch = service.revise_batch(batch_no, revise_data)
        return batch
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/batches/{batch_no}/judge", response_model=schemas.Batch)
def judge_batch(batch_no: str, judge_data: schemas.BatchJudge, db: Session = Depends(get_db)):
    service = BatchService(db)
    try:
        batch = service.judge_batch(batch_no, judge_data)
        return batch
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/batches/{batch_no}/logs", response_model=List[schemas.OperationLog])
def get_operation_logs(batch_no: str, db: Session = Depends(get_db)):
    service = BatchService(db)
    logs = service.get_operation_logs(batch_no)
    return logs

@router.post("/batches/{batch_no}/photos", response_model=schemas.Photo, status_code=201)
async def upload_photo(
    batch_no: str,
    photo_type: str = Query(..., description="Photo type: receipt, abnormal, sms"),
    upload_operator: Optional[str] = Query(None),
    remark: Optional[str] = Query(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    service = BatchService(db)
    batch = service.get_batch(batch_no)
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch {batch_no} not found")

    if photo_type not in [config.PhotoType.RECEIPT, config.PhotoType.ABNORMAL, config.PhotoType.SMS]:
        raise HTTPException(status_code=400, detail="Invalid photo type")

    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    saved_filename = f"{batch_no}_{photo_type}_{uuid.uuid4().hex}{file_ext}"
    saved_path = config.UPLOAD_DIR / saved_filename

    file_content = await file.read()
    with open(saved_path, "wb") as f:
        f.write(file_content)

    photo = models.Photo(
        batch_id=batch.id,
        photo_type=photo_type,
        file_path=str(saved_path),
        file_name=file.filename,
        file_size=len(file_content),
        upload_operator=upload_operator,
        remark=remark
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)

    return photo

@router.post("/batches/{batch_no}/export")
def export_batch(batch_no: str, db: Session = Depends(get_db)):
    service = ExportService(db)
    try:
        filepath = service.export_batch_to_excel(batch_no)
        filename = os.path.basename(filepath)
        return FileResponse(
            filepath,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=filename
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/reconcile")
def reconcile(
    start_date: Optional[str] = Query(None, description="Start date in ISO format"),
    end_date: Optional[str] = Query(None, description="End date in ISO format"),
    db: Session = Depends(get_db)
):
    service = ExportService(db)
    start_dt = datetime.fromisoformat(start_date) if start_date else None
    end_dt = datetime.fromisoformat(end_date) if end_date else None
    result = service.reconcile_batches(start_dt, end_dt)
    return result

@router.get("/idempotency/{key}")
def check_idempotency(key: str, db: Session = Depends(get_db)):
    service = BatchService(db)
    is_duplicate, batch, message = service.check_idempotency(key)
    return {
        "is_duplicate": is_duplicate,
        "existing_batch_no": batch.batch_no if batch else None,
        "message": message
    }
