from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth import get_current_active_user, require_roles, can_review, get_visible_fields_for_role
from ..models import User, UserRole, Material, RecordStatus
from ..schemas import MaterialCreate, MaterialUpdate, MaterialResponse, RecordStatusTransition
from ..utils import (
    log_operation, object_to_dict, is_batch_frozen, can_modify_record,
    can_transition_record_status, filter_response_data
)

router = APIRouter(prefix="/materials", tags=["物料清单"])


@router.post("", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
async def create_material(
    material_in: MaterialCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR))
):
    if is_batch_frozen(db, material_in.batch_id):
        raise HTTPException(status_code=400, detail="Cannot add material to frozen or completed batch")
    
    db_material = Material(**material_in.model_dump(), created_by=current_user.id)
    db.add(db_material)
    db.commit()
    db.refresh(db_material)
    
    log_operation(
        db, "CREATE", "materials", db_material.id,
        new_value=object_to_dict(db_material),
        created_by=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    return db_material


@router.get("")
async def list_materials(
    batch_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Material)
    if batch_id:
        query = query.filter(Material.batch_id == batch_id)
    materials = query.offset(skip).limit(limit).all()
    visible_fields = get_visible_fields_for_role(current_user.role, "material")
    return filter_response_data([object_to_dict(m) for m in materials], visible_fields)


@router.get("/{material_id}")
async def get_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    visible_fields = get_visible_fields_for_role(current_user.role, "material")
    return filter_response_data(object_to_dict(material), visible_fields)


@router.put("/{material_id}", response_model=MaterialResponse)
async def update_material(
    material_id: int,
    material_in: MaterialUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR))
):
    db_material = db.query(Material).filter(Material.id == material_id).first()
    if not db_material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    if not can_modify_record(db, db_material.batch_id, db_material.status):
        raise HTTPException(status_code=400, detail="Cannot modify frozen or reviewed record")
    
    old_value = object_to_dict(db_material)
    update_data = material_in.model_dump(exclude_unset=True)
    
    if "status" in update_data:
        del update_data["status"]
    
    for field, value in update_data.items():
        setattr(db_material, field, value)
    
    db.commit()
    db.refresh(db_material)
    
    log_operation(
        db, "UPDATE", "materials", material_id,
        old_value=old_value, new_value=object_to_dict(db_material),
        created_by=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    return db_material


@router.post("/{material_id}/transition", response_model=MaterialResponse)
async def transition_material_status(
    material_id: int,
    transition: RecordStatusTransition,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_material = db.query(Material).filter(Material.id == material_id).first()
    if not db_material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    target_status = transition.target_status
    
    if target_status in [RecordStatus.REVIEWED, RecordStatus.FROZEN] and not can_review(current_user):
        raise HTTPException(status_code=403, detail="Only reviewer or supervisor can review or freeze record")
    
    if is_batch_frozen(db, db_material.batch_id):
        raise HTTPException(status_code=400, detail="Cannot change status in frozen or completed batch")
    
    if not can_transition_record_status(db_material.status, target_status):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {db_material.status.value} to {target_status.value}"
        )
    
    old_value = object_to_dict(db_material)
    old_status = db_material.status
    db_material.status = target_status
    
    db.commit()
    db.refresh(db_material)
    
    log_operation(
        db, f"STATUS_CHANGE_{old_status.value}_to_{target_status.value}",
        "materials", material_id,
        old_value=old_value, new_value=object_to_dict(db_material),
        created_by=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    return db_material


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material(
    material_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPERVISOR))
):
    db_material = db.query(Material).filter(Material.id == material_id).first()
    if not db_material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    if is_batch_frozen(db, db_material.batch_id):
        raise HTTPException(status_code=400, detail="Cannot delete record in frozen or completed batch")
    
    old_value = object_to_dict(db_material)
    db.delete(db_material)
    db.commit()
    
    log_operation(
        db, "DELETE", "materials", material_id,
        old_value=old_value,
        created_by=current_user.id,
        ip_address=request.client.host if request.client else None
    )
