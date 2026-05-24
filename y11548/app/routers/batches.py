from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime
from ..database import get_db
from ..auth import get_current_active_user, require_roles, can_freeze
from ..models import User, UserRole, ExhibitionBatch, BatchStatus
from ..schemas import (
    ExhibitionBatchCreate, ExhibitionBatchUpdate, ExhibitionBatchResponse,
    BatchStatusTransition
)
from ..utils import (
    log_operation, object_to_dict, is_batch_frozen,
    can_transition_batch_status
)

router = APIRouter(prefix="/batches", tags=["展会批次"])


@router.post("", response_model=ExhibitionBatchResponse, status_code=status.HTTP_201_CREATED)
async def create_batch(
    batch_in: ExhibitionBatchCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR))
):
    existing = db.query(ExhibitionBatch).filter(ExhibitionBatch.batch_no == batch_in.batch_no).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Batch no {batch_in.batch_no} already exists")
    
    db_batch = ExhibitionBatch(**batch_in.model_dump(), created_by=current_user.id)
    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)
    
    log_operation(
        db, "CREATE", "exhibition_batches", db_batch.id,
        new_value=object_to_dict(db_batch),
        created_by=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    return db_batch


@router.get("", response_model=list[ExhibitionBatchResponse])
async def list_batches(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    batches = db.query(ExhibitionBatch).offset(skip).limit(limit).all()
    return batches


@router.get("/{batch_id}", response_model=ExhibitionBatchResponse)
async def get_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    batch = db.query(ExhibitionBatch).filter(ExhibitionBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


@router.put("/{batch_id}", response_model=ExhibitionBatchResponse)
async def update_batch(
    batch_id: int,
    batch_in: ExhibitionBatchUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR))
):
    db_batch = db.query(ExhibitionBatch).filter(ExhibitionBatch.id == batch_id).first()
    if not db_batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if is_batch_frozen(db, batch_id):
        raise HTTPException(status_code=400, detail="Cannot modify frozen or completed batch")
    
    old_value = object_to_dict(db_batch)
    
    update_data = batch_in.model_dump(exclude_unset=True)
    if "status" in update_data:
        del update_data["status"]
    
    for field, value in update_data.items():
        setattr(db_batch, field, value)
    
    db.commit()
    db.refresh(db_batch)
    
    log_operation(
        db, "UPDATE", "exhibition_batches", batch_id,
        old_value=old_value, new_value=object_to_dict(db_batch),
        created_by=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    return db_batch


@router.post("/{batch_id}/transition", response_model=ExhibitionBatchResponse)
async def transition_batch_status(
    batch_id: int,
    transition: BatchStatusTransition,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_batch = db.query(ExhibitionBatch).filter(ExhibitionBatch.id == batch_id).first()
    if not db_batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    target_status = transition.target_status
    
    if target_status in [BatchStatus.FROZEN, BatchStatus.COMPLETED] and not can_freeze(current_user):
        raise HTTPException(status_code=403, detail="Only supervisor can freeze or complete batch")
    
    if not can_transition_batch_status(db_batch.status, target_status):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {db_batch.status.value} to {target_status.value}"
        )
    
    old_value = object_to_dict(db_batch)
    old_status = db_batch.status
    db_batch.status = target_status
    
    if target_status == BatchStatus.FROZEN:
        db_batch.frozen_at = datetime.utcnow()
        db_batch.frozen_by = current_user.id
    
    db.commit()
    db.refresh(db_batch)
    
    log_operation(
        db, f"STATUS_CHANGE_{old_status.value}_to_{target_status.value}",
        "exhibition_batches", batch_id,
        old_value=old_value, new_value=object_to_dict(db_batch),
        created_by=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    return db_batch
