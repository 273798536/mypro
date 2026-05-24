from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.price_adjustment import PriceAdjustment
from app.models.audit import ChangeHistory
from app.schemas.price_adjustment import (
    PriceAdjustmentCreate,
    PriceAdjustmentUpdate,
    PriceAdjustmentResponse,
)
from app.services.auth import AuthService
from app.services.audit import AuditService
from app.services.status import StatusService

router = APIRouter()


@router.get("/", response_model=List[PriceAdjustmentResponse])
def list_price_adjustments(
    batch_no: Optional[str] = None,
    adjustment_no: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    query = db.query(PriceAdjustment)
    
    if batch_no:
        query = query.filter(PriceAdjustment.batch_no.contains(batch_no))
    if adjustment_no:
        query = query.filter(PriceAdjustment.adjustment_no.contains(adjustment_no))
    if status:
        query = query.filter(PriceAdjustment.status == status)
    
    records = query.offset(skip).limit(limit).all()
    return [_enrich_response(r, db, current_user) for r in records]


@router.get("/{record_id}", response_model=PriceAdjustmentResponse)
def get_price_adjustment(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    record = db.query(PriceAdjustment).filter(PriceAdjustment.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return _enrich_response(record, db, current_user)


@router.post("/", response_model=PriceAdjustmentResponse, status_code=201)
def create_price_adjustment(
    data: PriceAdjustmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    existing = db.query(PriceAdjustment).filter(PriceAdjustment.adjustment_no == data.adjustment_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="Adjustment number already exists")
    
    record = PriceAdjustment(**data.model_dump())
    record.created_by = current_user.id
    
    db.add(record)
    db.commit()
    db.refresh(record)
    
    AuditService.log_action(
        db=db,
        action="create",
        entity_type="price_adjustment",
        entity_id=record.id,
        user=current_user,
        new_values=AuditService.mask_sensitive_data(data.model_dump()),
    )
    
    return _enrich_response(record, db, current_user)


@router.put("/{record_id}", response_model=PriceAdjustmentResponse)
def update_price_adjustment(
    record_id: int,
    data: PriceAdjustmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    record = db.query(PriceAdjustment).filter(PriceAdjustment.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    if not StatusService.can_edit(record):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot edit record in status: {record.status.value}"
        )
    
    old_data = {
        "original_price": record.original_price,
        "adjusted_price": record.adjusted_price,
        "price_difference": record.price_difference,
    }
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)
    
    record.updated_by = current_user.id
    record.version += 1
    
    db.commit()
    db.refresh(record)
    
    return _enrich_response(record, db, current_user)


def _enrich_response(record: PriceAdjustment, db: Session, current_user: User) -> PriceAdjustmentResponse:
    from app.models.user import UserRole
    response = PriceAdjustmentResponse.model_validate(record)
    
    if record.handler_user:
        response.handler_name = record.handler_user.full_name
    if record.approver_user:
        response.approver_name = record.approver_user.full_name
    if record.import_source:
        response.import_source_name = record.import_source.source_filename
    if record.rework_order:
        response.rework_order_no = record.rework_order.rework_no
    
    if not current_user.has_permission(UserRole.PRODUCTION_MANAGER):
        response = AuditService.mask_sensitive_data(response.model_dump())
        response = PriceAdjustmentResponse(**response)
    
    changes = db.query(ChangeHistory).filter(
        ChangeHistory.entity_type == "price_adjustment",
        ChangeHistory.entity_id == record.id
    ).order_by(ChangeHistory.version).all()
    
    response.change_history = [
        {
            "version": c.version,
            "field": c.field_name if not c.is_sensitive_field else "***",
            "old_value": c.old_value if not c.is_sensitive_field else "***",
            "new_value": c.new_value if not c.is_sensitive_field else "***",
            "is_manual": c.is_manual_change,
            "reason": c.change_reason,
            "changed_at": c.changed_at.isoformat() if c.changed_at else None,
        }
        for c in changes
    ]
    
    return response
