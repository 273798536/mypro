from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ExceptionBatch, ExceptionRecord, StatusHistory, FailedRecord
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
