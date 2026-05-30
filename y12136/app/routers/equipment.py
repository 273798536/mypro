from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from ..database import get_db
from .. import schemas, crud

router = APIRouter(prefix="/api/equipment", tags=["设备档案"])


@router.post("/", response_model=schemas.EquipmentProfileResponse)
def create_equipment(
    equipment: schemas.EquipmentProfileCreate,
    db: Session = Depends(get_db)
):
    existing = crud.get_equipment_profile(db, equipment.equipment_id)
    if existing:
        raise HTTPException(status_code=400, detail="设备ID已存在")

    return crud.create_equipment_profile(db, equipment)


@router.get("/{equipment_id}", response_model=schemas.EquipmentProfileResponse)
def get_equipment(equipment_id: str, db: Session = Depends(get_db)):
    equipment = crud.get_equipment_profile(db, equipment_id)
    if not equipment:
        raise HTTPException(status_code=404, detail="设备档案不存在")
    return equipment


@router.get("/", response_model=List[schemas.EquipmentProfileResponse])
def list_equipments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    from ..models import EquipmentProfile
    return db.query(EquipmentProfile).offset(skip).limit(limit).all()


@router.put("/{equipment_id}")
def update_equipment(
    equipment_id: str,
    equipment_update: schemas.EquipmentProfileUpdate,
    db: Session = Depends(get_db)
):
    equipment, update_info = crud.update_equipment_profile(
        db, equipment_id, equipment_update
    )

    if not equipment:
        raise HTTPException(status_code=404, detail="设备档案不存在")

    return {
        "equipment": schemas.EquipmentProfileResponse.model_validate(equipment),
        "update_info": update_info
    }


@router.get("/{equipment_id}/history")
def get_equipment_history(
    equipment_id: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    history = crud.get_equipment_history(db, equipment_id, skip, limit)
    import json
    result = []
    for h in history:
        result.append({
            "id": h.id,
            "equipment_id": h.equipment_id,
            "version": h.version,
            "changed_fields": json.loads(h.changed_fields),
            "old_values": json.loads(h.old_values),
            "new_values": json.loads(h.new_values),
            "changed_by": h.changed_by,
            "changed_at": h.changed_at,
            "remarks": h.remarks
        })
    return result
