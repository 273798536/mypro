from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
import os
import shutil
from datetime import datetime

from app.database import get_db
from app.models import ExceptionBatch, ExceptionRecord, StatusHistory, FailedRecord, Attachment, OperationLog
from app.schemas import (
    BatchCreate,
    BatchResponse,
    BatchListResponse,
    BatchStatusUpdate,
    RecordResponse,
    RecordUpdate,
    RecordListResponse,
    StatusHistoryResponse,
    FailedRecordResponse,
    AttachmentResponse,
    AttachmentListResponse,
    OperationLogResponse,
)
from app.services import StateMachine

router = APIRouter(prefix="/batches", tags=["batches"])


@router.post("/", response_model=BatchResponse)
def create_batch(batch_data: BatchCreate, db: Session = Depends(get_db)):
    try:
        state_machine = StateMachine(db)
        batch = state_machine.create_batch(
            branch_id=batch_data.branch_id,
            branch_name=batch_data.branch_name,
            batch_date=batch_data.batch_date,
            start_date=batch_data.start_date,
            end_date=batch_data.end_date,
            operator=batch_data.operator,
        )
        return batch
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=BatchListResponse)
def list_batches(
    branch_id: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(ExceptionBatch)
    if branch_id:
        query = query.filter(ExceptionBatch.branch_id == branch_id)
    if status:
        query = query.filter(ExceptionBatch.status == status)

    total = query.count()
    items = query.order_by(ExceptionBatch.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return BatchListResponse(total=total, page=page, page_size=page_size, items=items)


@router.get("/{batch_id}", response_model=BatchResponse)
def get_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(ExceptionBatch).filter(ExceptionBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


@router.post("/{batch_id}/submit", response_model=BatchResponse)
def submit_batch(batch_id: int, update: BatchStatusUpdate, db: Session = Depends(get_db)):
    try:
        state_machine = StateMachine(db)
        return state_machine.submit_for_review(batch_id, update.operator)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{batch_id}/approve", response_model=BatchResponse)
def approve_batch(batch_id: int, update: BatchStatusUpdate, db: Session = Depends(get_db)):
    try:
        state_machine = StateMachine(db)
        return state_machine.review_approve(batch_id, update.operator, update.reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{batch_id}/reject", response_model=BatchResponse)
def reject_batch(batch_id: int, update: BatchStatusUpdate, db: Session = Depends(get_db)):
    if not update.reason:
        raise HTTPException(status_code=400, detail="Reject reason is required")
    try:
        state_machine = StateMachine(db)
        return state_machine.review_reject(batch_id, update.operator, update.reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{batch_id}/freeze", response_model=BatchResponse)
def freeze_batch(batch_id: int, update: BatchStatusUpdate, db: Session = Depends(get_db)):
    if not update.reason:
        raise HTTPException(status_code=400, detail="Freeze reason is required")
    try:
        state_machine = StateMachine(db)
        return state_machine.freeze_batch(batch_id, update.operator, update.reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{batch_id}/unfreeze", response_model=BatchResponse)
def unfreeze_batch(batch_id: int, update: BatchStatusUpdate, db: Session = Depends(get_db)):
    try:
        state_machine = StateMachine(db)
        return state_machine.unfreeze_batch(batch_id, update.operator)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{batch_id}/settle", response_model=BatchResponse)
def settle_batch(batch_id: int, update: BatchStatusUpdate, db: Session = Depends(get_db)):
    try:
        state_machine = StateMachine(db)
        return state_machine.settle_batch(batch_id, update.operator)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{batch_id}/revert", response_model=BatchResponse)
def revert_batch(batch_id: int, update: BatchStatusUpdate, db: Session = Depends(get_db)):
    if not update.reason:
        raise HTTPException(status_code=400, detail="Revert reason is required")
    try:
        state_machine = StateMachine(db)
        return state_machine.revert_batch(batch_id, update.operator, update.reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{batch_id}/archive", response_model=BatchResponse)
def archive_batch(batch_id: int, update: BatchStatusUpdate, db: Session = Depends(get_db)):
    try:
        state_machine = StateMachine(db)
        return state_machine.archive_batch(batch_id, update.operator)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{batch_id}/records", response_model=RecordListResponse)
def list_batch_records(
    batch_id: int,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(ExceptionRecord).filter(ExceptionRecord.batch_id == batch_id)
    if status:
        query = query.filter(ExceptionRecord.status == status)

    total = query.count()
    items = query.order_by(ExceptionRecord.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return RecordListResponse(total=total, page=page, page_size=page_size, items=items)


@router.get("/{batch_id}/history", response_model=List[StatusHistoryResponse])
def get_batch_history(batch_id: int, db: Session = Depends(get_db)):
    histories = (
        db.query(StatusHistory)
        .filter(StatusHistory.batch_id == batch_id)
        .order_by(StatusHistory.created_at.asc())
        .all()
    )
    return histories


@router.get("/{batch_id}/failures", response_model=List[FailedRecordResponse])
def get_batch_failures(batch_id: int, db: Session = Depends(get_db)):
    failures = (
        db.query(FailedRecord)
        .filter(FailedRecord.batch_id == batch_id)
        .order_by(FailedRecord.created_at.desc())
        .all()
    )
    return failures


@router.put("/records/{record_id}", response_model=RecordResponse)
def update_record(record_id: int, update: RecordUpdate, db: Session = Depends(get_db)):
    try:
        state_machine = StateMachine(db)
        return state_machine.modify_judgment(
            record_id=record_id,
            operator=update.operator,
            new_status=update.new_status,
            manual_reason=update.manual_reason,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/records/{record_id}", response_model=RecordResponse)
def get_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(ExceptionRecord).filter(ExceptionRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


@router.post("/{batch_id}/attachments", response_model=AttachmentResponse)
async def upload_attachment(
    batch_id: int,
    file: UploadFile = File(...),
    uploaded_by: str = Form(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    batch = db.query(ExceptionBatch).filter(ExceptionBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    upload_dir = f"./uploads/batch_{batch_id}"
    os.makedirs(upload_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
    safe_filename = f"{timestamp}_{file.filename}" if file.filename else f"{timestamp}_uploaded_file"
    file_path = os.path.join(upload_dir, safe_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size = os.path.getsize(file_path)
        
        attachment = Attachment(
            batch_id=batch_id,
            file_name=file.filename or safe_filename,
            file_path=file_path,
            file_type=file.content_type or "application/octet-stream",
            file_size=file_size,
            uploaded_by=uploaded_by,
            description=description,
        )
        db.add(attachment)
        
        state_machine = StateMachine(db)
        state_machine._add_operation_log(
            operator=uploaded_by,
            action="UPLOAD_ATTACHMENT",
            batch_id=batch_id,
            details={"file_name": file.filename, "file_size": file_size},
        )
        
        db.commit()
        db.refresh(attachment)
        return attachment
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


@router.post("/{batch_id}/attachments/supplement", response_model=AttachmentResponse)
async def supplement_attachment(
    batch_id: int,
    file: UploadFile = File(...),
    uploaded_by: str = Form(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    batch = db.query(ExceptionBatch).filter(ExceptionBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    upload_dir = f"./uploads/batch_{batch_id}"
    os.makedirs(upload_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_supplement_{file.filename}" if file.filename else f"{timestamp}_supplement"
    file_path = os.path.join(upload_dir, safe_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size = os.path.getsize(file_path)
        
        attachment = Attachment(
            batch_id=batch_id,
            file_name=file.filename or safe_filename,
            file_path=file_path,
            file_type=file.content_type or "application/octet-stream",
            file_size=file_size,
            uploaded_by=uploaded_by,
            description=description or "补传附件",
        )
        db.add(attachment)
        
        state_machine = StateMachine(db)
        state_machine._add_operation_log(
            operator=uploaded_by,
            action="SUPPLEMENT_ATTACHMENT",
            batch_id=batch_id,
            details={"file_name": file.filename, "file_size": file_size, "type": "supplement"},
        )
        
        db.commit()
        db.refresh(attachment)
        return attachment
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


@router.get("/{batch_id}/attachments", response_model=AttachmentListResponse)
def list_attachments(batch_id: int, db: Session = Depends(get_db)):
    attachments = (
        db.query(Attachment)
        .filter(Attachment.batch_id == batch_id)
        .order_by(Attachment.uploaded_at.desc())
        .all()
    )
    return AttachmentListResponse(total=len(attachments), items=attachments)


@router.get("/{batch_id}/attachments/{attachment_id}", response_model=AttachmentResponse)
def get_attachment(batch_id: int, attachment_id: int, db: Session = Depends(get_db)):
    attachment = (
        db.query(Attachment)
        .filter(Attachment.id == attachment_id, Attachment.batch_id == batch_id)
        .first()
    )
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    return attachment


@router.delete("/{batch_id}/attachments/{attachment_id}")
def delete_attachment(batch_id: int, attachment_id: int, operator: str = Query(...), db: Session = Depends(get_db)):
    attachment = (
        db.query(Attachment)
        .filter(Attachment.id == attachment_id, Attachment.batch_id == batch_id)
        .first()
    )
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    file_path = attachment.file_path
    if os.path.exists(file_path):
        os.remove(file_path)

    db.delete(attachment)
    
    state_machine = StateMachine(db)
    state_machine._add_operation_log(
        operator=operator,
        action="DELETE_ATTACHMENT",
        batch_id=batch_id,
        details={"attachment_id": attachment_id, "file_name": attachment.file_name},
    )
    
    db.commit()
    return {"message": "Attachment deleted successfully"}


@router.get("/{batch_id}/logs", response_model=List[OperationLogResponse])
def get_batch_logs(
    batch_id: int,
    action: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(OperationLog).filter(OperationLog.batch_id == batch_id)
    if action:
        query = query.filter(OperationLog.action == action)
    
    logs = query.order_by(OperationLog.created_at.desc()).limit(limit).all()
    return logs


@router.get("/logs/all", response_model=List[OperationLogResponse])
def list_all_logs(
    operator: Optional[str] = None,
    action: Optional[str] = None,
    batch_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    query = db.query(OperationLog)
    
    if operator:
        query = query.filter(OperationLog.operator == operator)
    if action:
        query = query.filter(OperationLog.action == action)
    if batch_id:
        query = query.filter(OperationLog.batch_id == batch_id)
    if start_date:
        query = query.filter(OperationLog.created_at >= start_date)
    if end_date:
        query = query.filter(OperationLog.created_at <= end_date)
    
    logs = query.order_by(OperationLog.created_at.desc()).limit(limit).all()
    return logs
