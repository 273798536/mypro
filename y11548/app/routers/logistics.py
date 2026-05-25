from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth import get_current_active_user, require_roles, can_review, get_visible_fields_for_role
from ..models import User, UserRole, LogisticsReceipt, RecordStatus
from ..schemas import LogisticsReceiptCreate, LogisticsReceiptUpdate, LogisticsReceiptResponse, RecordStatusTransition
from ..utils import (
    log_operation, object_to_dict, is_batch_frozen, can_modify_record,
    can_transition_record_status, filter_response_data
)

router = APIRouter(prefix="/logistics", tags=["物流签收"])


@router.post("", response_model=LogisticsReceiptResponse, status_code=status.HTTP_201_CREATED)
async def create_logistics(
    logistics_in: LogisticsReceiptCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR))
):
    if is_batch_frozen(db, logistics_in.batch_id):
        raise HTTPException(status_code=400, detail="Cannot add logistics to frozen or completed batch")
    
    db_logistics = LogisticsReceipt(**logistics_in.model_dump(), created_by=current_user.id)
    db.add(db_logistics)
    db.commit()
    db.refresh(db_logistics)
    
    log_operation(
        db, "CREATE", "logistics_receipts", db_logistics.id,
        new_value=object_to_dict(db_logistics),
        created_by=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    return db_logistics


@router.get("")
async def list_logistics(
    batch_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(LogisticsReceipt)
    if batch_id:
        query = query.filter(LogisticsReceipt.batch_id == batch_id)
    logistics = query.offset(skip).limit(limit).all()
    visible_fields = get_visible_fields_for_role(current_user.role, "logistics")
    return filter_response_data([object_to_dict(l) for l in logistics], visible_fields)


@router.get("/{logistics_id}")
async def get_logistics(
    logistics_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    logistics = db.query(LogisticsReceipt).filter(LogisticsReceipt.id == logistics_id).first()
    if not logistics:
        raise HTTPException(status_code=404, detail="Logistics receipt not found")
    visible_fields = get_visible_fields_for_role(current_user.role, "logistics")
    return filter_response_data(object_to_dict(logistics), visible_fields)


@router.put("/{logistics_id}", response_model=LogisticsReceiptResponse)
async def update_logistics(
    logistics_id: int,
    logistics_in: LogisticsReceiptUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR))
):
    db_logistics = db.query(LogisticsReceipt).filter(LogisticsReceipt.id == logistics_id).first()
    if not db_logistics:
        raise HTTPException(status_code=404, detail="Logistics receipt not found")
    
    if not can_modify_record(db, db_logistics.batch_id, db_logistics.status):
        raise HTTPException(status_code=400, detail="Cannot modify frozen or reviewed record")
    
    old_value = object_to_dict(db_logistics)
    update_data = logistics_in.model_dump(exclude_unset=True)
    
    if "status" in update_data:
        del update_data["status"]
    
    for field, value in update_data.items():
        setattr(db_logistics, field, value)
    
    db.commit()
    db.refresh(db_logistics)
    
    log_operation(
        db, "UPDATE", "logistics_receipts", logistics_id,
        old_value=old_value, new_value=object_to_dict(db_logistics),
        created_by=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    return db_logistics


@router.post("/{logistics_id}/transition", response_model=LogisticsReceiptResponse)
async def transition_logistics_status(
    logistics_id: int,
    transition: RecordStatusTransition,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_logistics = db.query(LogisticsReceipt).filter(LogisticsReceipt.id == logistics_id).first()
    if not db_logistics:
        raise HTTPException(status_code=404, detail="Logistics receipt not found")
    
    target_status = transition.target_status
    
    if target_status in [RecordStatus.REVIEWED, RecordStatus.FROZEN] and not can_review(current_user):
        raise HTTPException(status_code=403, detail="Only reviewer or supervisor can review or freeze record")
    
    if is_batch_frozen(db, db_logistics.batch_id):
        raise HTTPException(status_code=400, detail="Cannot change status in frozen or completed batch")
    
    if not can_transition_record_status(db_logistics.status, target_status):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {db_logistics.status.value} to {target_status.value}"
        )
    
    old_value = object_to_dict(db_logistics)
    old_status = db_logistics.status
    db_logistics.status = target_status
    
    db.commit()
    db.refresh(db_logistics)
    
    log_operation(
        db, f"STATUS_CHANGE_{old_status.value}_to_{target_status.value}",
        "logistics_receipts", logistics_id,
        old_value=old_value, new_value=object_to_dict(db_logistics),
        created_by=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    return db_logistics
