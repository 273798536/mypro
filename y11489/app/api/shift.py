from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.machine_shift import MachineShift
from app.schemas.machine_shift import (
    MachineShiftCreate,
    MachineShiftUpdate,
    MachineShiftResponse,
)
from app.services.auth import AuthService
from app.services.audit import AuditService

router = APIRouter()


@router.get("/", response_model=List[MachineShiftResponse])
def list_shifts(
    machine_id: Optional[str] = None,
    shift_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    query = db.query(MachineShift)
    
    if machine_id:
        query = query.filter(MachineShift.machine_id.contains(machine_id))
    if shift_date:
        query = query.filter(MachineShift.shift_date == shift_date)
    
    records = query.offset(skip).limit(limit).all()
    return [_enrich_response(r) for r in records]


@router.get("/{record_id}", response_model=MachineShiftResponse)
def get_shift(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    record = db.query(MachineShift).filter(MachineShift.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return _enrich_response(record)


@router.post("/", response_model=MachineShiftResponse, status_code=201)
def create_shift(
    data: MachineShiftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    record = MachineShift(**data.model_dump())
    record.created_by = current_user.id
    
    db.add(record)
    db.commit()
    db.refresh(record)
    
    AuditService.log_action(
        db=db,
        action="create",
        entity_type="shift",
        entity_id=record.id,
        user=current_user,
        new_values=data.model_dump(),
    )
    
    return _enrich_response(record)


@router.put("/{record_id}", response_model=MachineShiftResponse)
def update_shift(
    record_id: int,
    data: MachineShiftUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    record = db.query(MachineShift).filter(MachineShift.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)
    
    record.updated_by = current_user.id
    
    db.commit()
    db.refresh(record)
    
    return _enrich_response(record)


def _enrich_response(record: MachineShift) -> MachineShiftResponse:
    response = MachineShiftResponse.model_validate(record)
    
    if record.shift_leader_user:
        response.shift_leader_name = record.shift_leader_user.full_name
    if record.operator_user:
        response.operator_name = record.operator_user.full_name
    if record.import_source:
        response.import_source_name = record.import_source.source_filename
    
    return response
