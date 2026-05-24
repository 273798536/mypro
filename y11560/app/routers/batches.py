from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import AuditBatch, BatchStatus, User, DirtyRecord, StateTransition
from ..schemas import (
    BatchCreate, BatchUpdateStatus, BatchSummary, BatchDetail,
    BatchRecordsCreate, StateTransitionDiff
)
from ..permissions import get_current_user_with_permission, Permission
from ..state_machine import (
    submit_batch, start_review, approve_batch, reject_batch,
    freeze_batch, unfreeze_batch, archive_batch, unarchive_batch,
    get_batch_transitions
)
from ..diff_tracker import get_batch_transition_diffs
from ..dirty_records import detect_dirty_records_for_batch

router = APIRouter(prefix="/batches", tags=["batches"])


@router.get("", response_model=List[BatchSummary])
def list_batches(
    status: Optional[BatchStatus] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.VIEW_BATCH))
):
    query = db.query(AuditBatch)
    if status:
        query = query.filter(AuditBatch.status == status)
    
    batches = query.order_by(AuditBatch.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for batch in batches:
        dirty_records = db.query(DirtyRecord).filter(DirtyRecord.batch_id == batch.id).all()
        result.append(BatchSummary(
            id=batch.id,
            batch_no=batch.batch_no,
            audit_date=batch.audit_date,
            status=batch.status,
            created_at=batch.created_at,
            checkin_count=len(batch.checkins),
            deposit_count=len(batch.deposits),
            room_change_count=len(batch.room_changes),
            dirty_record_count=len(dirty_records),
            unresolved_dirty_count=sum(1 for d in dirty_records if not d.is_resolved)
        ))
    return result


@router.post("", response_model=BatchDetail)
def create_batch(
    batch_data: BatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.CREATE_BATCH))
):
    existing = db.query(AuditBatch).filter(AuditBatch.batch_no == batch_data.batch_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="Batch number already exists")
    
    batch = AuditBatch(
        batch_no=batch_data.batch_no,
        audit_date=batch_data.audit_date,
        created_by=current_user.id
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


@router.get("/{batch_id}", response_model=BatchDetail)
def get_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.VIEW_BATCH))
):
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


@router.post("/{batch_id}/submit", response_model=BatchDetail)
def submit_for_review(
    batch_id: int,
    data: BatchUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.SUBMIT_BATCH))
):
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    success, msg = submit_batch(db, batch, current_user, data.reason)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    
    detect_dirty_records_for_batch(db, batch_id)
    return batch


@router.post("/{batch_id}/start-review", response_model=BatchDetail)
def start_review_process(
    batch_id: int,
    data: BatchUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.REVIEW_BATCH))
):
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    success, msg = start_review(db, batch, current_user, data.reason)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return batch


@router.post("/{batch_id}/approve", response_model=BatchDetail)
def approve(
    batch_id: int,
    data: BatchUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.APPROVE_BATCH))
):
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    success, msg = approve_batch(db, batch, current_user, data.reason)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return batch


@router.post("/{batch_id}/reject", response_model=BatchDetail)
def reject(
    batch_id: int,
    data: BatchUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.REJECT_BATCH))
):
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    success, msg = reject_batch(db, batch, current_user, data.reason)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return batch


@router.post("/{batch_id}/freeze", response_model=BatchDetail)
def freeze(
    batch_id: int,
    data: BatchUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.FREEZE_BATCH))
):
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    success, msg = freeze_batch(db, batch, current_user, data.reason)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return batch


@router.post("/{batch_id}/unfreeze", response_model=BatchDetail)
def unfreeze(
    batch_id: int,
    data: BatchUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.UNFREEZE_BATCH))
):
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    success, msg = unfreeze_batch(db, batch, current_user, data.reason)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return batch


@router.post("/{batch_id}/archive", response_model=BatchDetail)
def archive(
    batch_id: int,
    data: BatchUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.ARCHIVE_BATCH))
):
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    success, msg = archive_batch(db, batch, current_user, data.reason)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return batch


@router.post("/{batch_id}/unarchive", response_model=BatchDetail)
def unarchive(
    batch_id: int,
    data: BatchUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.UNARCHIVE_BATCH))
):
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    success, msg = unarchive_batch(db, batch, current_user, data.reason)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return batch


@router.get("/{batch_id}/transitions", response_model=List[StateTransitionDiff])
def get_transitions(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.VIEW_BATCH))
):
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    return get_batch_transition_diffs(db, batch_id)


@router.post("/{batch_id}/detect-dirty")
def detect_dirty(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_with_permission(Permission.EDIT_BATCH))
):
    batch = db.query(AuditBatch).filter(AuditBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    new_dirty = detect_dirty_records_for_batch(db, batch_id)
    return {"new_dirty_records": len(new_dirty)}
