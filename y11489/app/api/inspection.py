from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.inspection import InspectionRecord
from app.models.audit import ChangeHistory
from app.schemas.inspection import (
    InspectionRecordCreate,
    InspectionRecordUpdate,
    InspectionRecordResponse,
)
from app.services.auth import AuthService
from app.services.audit import AuditService
from app.services.status import StatusService

router = APIRouter()


@router.get("/", response_model=List[InspectionRecordResponse])
def list_inspections(
    batch_no: Optional[str] = None,
    machine_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    query = db.query(InspectionRecord)
    
    if batch_no:
        query = query.filter(InspectionRecord.batch_no.contains(batch_no))
    if machine_id:
        query = query.filter(InspectionRecord.machine_id.contains(machine_id))
    if status:
        query = query.filter(InspectionRecord.status == status)
    
    records = query.offset(skip).limit(limit).all()
    return [_enrich_response(r, db) for r in records]


@router.get("/{record_id}", response_model=InspectionRecordResponse)
def get_inspection(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    record = db.query(InspectionRecord).filter(InspectionRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return _enrich_response(record, db)


@router.post("/", response_model=InspectionRecordResponse, status_code=201)
def create_inspection(
    data: InspectionRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    record = InspectionRecord(**data.model_dump())
    record.created_by = current_user.id
    record.original_yield_rate = record.yield_rate
    record.original_defect_count = record.defect_count
    
    db.add(record)
    db.commit()
    db.refresh(record)
    
    AuditService.log_action(
        db=db,
        action="create",
        entity_type="inspection",
        entity_id=record.id,
        user=current_user,
        new_values=data.model_dump(),
    )
    
    return _enrich_response(record, db)


@router.put("/{record_id}", response_model=InspectionRecordResponse)
def update_inspection(
    record_id: int,
    data: InspectionRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    record = db.query(InspectionRecord).filter(InspectionRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    if not StatusService.can_edit(record):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot edit record in status: {record.status.value}"
        )
    
    old_data = {
        "defect_count": record.defect_count,
        "yield_rate": record.yield_rate,
        "judge_result": record.judge_result,
    }
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)
    
    record.updated_by = current_user.id
    record.version += 1
    
    if data.is_manual_adjustment:
        AuditService.record_changes_from_dict(
            db=db,
            entity_type="inspection",
            entity_id=record_id,
            old_data=old_data,
            new_data={
                "defect_count": data.defect_count or record.defect_count,
                "yield_rate": data.yield_rate or record.yield_rate,
                "judge_result": data.judge_result or record.judge_result,
            },
            user=current_user,
            version=record.version,
            is_manual_change=True,
            change_reason=data.adjustment_reason,
        )
    
    db.commit()
    db.refresh(record)
    
    return _enrich_response(record, db)


def _enrich_response(record: InspectionRecord, db: Session) -> InspectionRecordResponse:
    response = InspectionRecordResponse.model_validate(record)
    
    if record.inspector_user:
        response.inspector_name = record.inspector_user.full_name
    if record.import_source:
        response.import_source_name = record.import_source.source_filename
    if record.shift:
        response.shift_info = {
            "id": record.shift.id,
            "shift_name": record.shift.shift_name,
            "shift_date": record.shift.shift_date.isoformat() if record.shift.shift_date else None,
        }
    
    changes = db.query(ChangeHistory).filter(
        ChangeHistory.entity_type == "inspection",
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
