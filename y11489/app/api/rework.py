from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.rework import ReworkOrder
from app.models.audit import ChangeHistory
from app.schemas.rework import (
    ReworkOrderCreate,
    ReworkOrderUpdate,
    ReworkOrderResponse,
)
from app.services.auth import AuthService
from app.services.audit import AuditService
from app.services.status import StatusService

router = APIRouter()


@router.get("/", response_model=List[ReworkOrderResponse])
def list_reworks(
    batch_no: Optional[str] = None,
    rework_no: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    query = db.query(ReworkOrder)
    
    if batch_no:
        query = query.filter(ReworkOrder.batch_no.contains(batch_no))
    if rework_no:
        query = query.filter(ReworkOrder.rework_no.contains(rework_no))
    if status:
        query = query.filter(ReworkOrder.status == status)
    
    records = query.offset(skip).limit(limit).all()
    return [_enrich_response(r, db) for r in records]


@router.get("/{record_id}", response_model=ReworkOrderResponse)
def get_rework(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    record = db.query(ReworkOrder).filter(ReworkOrder.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return _enrich_response(record, db)


@router.post("/", response_model=ReworkOrderResponse, status_code=201)
def create_rework(
    data: ReworkOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    existing = db.query(ReworkOrder).filter(ReworkOrder.rework_no == data.rework_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="Rework number already exists")
    
    record = ReworkOrder(**data.model_dump())
    record.created_by = current_user.id
    
    db.add(record)
    db.commit()
    db.refresh(record)
    
    AuditService.log_action(
        db=db,
        action="create",
        entity_type="rework",
        entity_id=record.id,
        user=current_user,
        new_values=data.model_dump(),
    )
    
    return _enrich_response(record, db)


@router.put("/{record_id}", response_model=ReworkOrderResponse)
def update_rework(
    record_id: int,
    data: ReworkOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    record = db.query(ReworkOrder).filter(ReworkOrder.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    if not StatusService.can_edit(record):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot edit record in status: {record.status.value}"
        )
    
    old_data = {
        "rework_count": record.rework_count,
        "rework_pass_count": record.rework_pass_count,
        "rework_fail_count": record.rework_fail_count,
    }
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)
    
    record.updated_by = current_user.id
    record.version += 1
    
    if data.is_manual_adjustment:
        AuditService.record_changes_from_dict(
            db=db,
            entity_type="rework",
            entity_id=record_id,
            old_data=old_data,
            new_data={
                "rework_count": data.rework_count or record.rework_count,
                "rework_pass_count": data.rework_pass_count or record.rework_pass_count,
                "rework_fail_count": data.rework_fail_count or record.rework_fail_count,
            },
            user=current_user,
            version=record.version,
            is_manual_change=True,
            change_reason=data.adjustment_reason,
        )
    
    db.commit()
    db.refresh(record)
    
    return _enrich_response(record, db)


def _enrich_response(record: ReworkOrder, db: Session) -> ReworkOrderResponse:
    response = ReworkOrderResponse.model_validate(record)
    
    if record.responsible_user:
        response.responsible_person_name = record.responsible_user.full_name
    if record.handler_user:
        response.handler_name = record.handler_user.full_name
    if record.responsible_shift:
        response.shift_info = {
            "id": record.responsible_shift.id,
            "shift_name": record.responsible_shift.shift_name,
            "shift_date": record.responsible_shift.shift_date.isoformat() if record.responsible_shift.shift_date else None,
        }
    if record.import_source:
        response.import_source_name = record.import_source.source_filename
    if record.original_inspection:
        response.inspection_info = {
            "id": record.original_inspection.id,
            "batch_no": record.original_inspection.batch_no,
            "yield_rate": record.original_inspection.yield_rate,
        }
    
    changes = db.query(ChangeHistory).filter(
        ChangeHistory.entity_type == "rework",
        ChangeHistory.entity_id == record.id
    ).order_by(ChangeHistory.version).all()
    
    response.change_history = [
        {
            "version": c.version,
            "field": c.field_name,
            "old_value": c.old_value,
            "new_value": c.new_value,
            "is_manual": c.is_manual_change,
            "reason": c.change_reason,
            "changed_at": c.changed_at.isoformat() if c.changed_at else None,
        }
        for c in changes
    ]
    
    return response
