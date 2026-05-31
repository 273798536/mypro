from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import VelocityModel, VelocityLayer, DataStatus
from app.schemas import VelocityModelCreate, VelocityModelOut, VelocityLayerOut
from app.validators import validate_velocity_model

router = APIRouter()


@router.get("", response_model=List[VelocityModelOut])
def list_velocity_models(
    is_active: Optional[bool] = None,
    region: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(VelocityModel)
    if is_active is not None:
        query = query.filter(VelocityModel.is_active == is_active)
    if region:
        query = query.filter(VelocityModel.region == region)
    
    models = query.order_by(VelocityModel.created_at.desc()).offset(skip).limit(limit).all()
    return models


@router.post("", response_model=VelocityModelOut)
def create_velocity_model(model_in: VelocityModelCreate, db: Session = Depends(get_db)):
    existing = db.query(VelocityModel).filter(
        VelocityModel.model_name == model_in.model_name,
        VelocityModel.version == model_in.version
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"波速模型 {model_in.model_name} 版本 {model_in.version} 已存在"
        )
    
    layers_data = [layer.model_dump() for layer in model_in.layers]
    valid, errors = validate_velocity_model(layers_data)
    if not valid:
        raise HTTPException(status_code=400, detail=errors)
    
    model_data = model_in.model_dump(exclude={"layers"})
    model = VelocityModel(**model_data)
    
    for layer_data in layers_data:
        layer = VelocityLayer(**layer_data)
        model.layers.append(layer)
    
    db.add(model)
    db.commit()
    db.refresh(model)
    return model


@router.get("/{model_id}", response_model=VelocityModelOut)
def get_velocity_model(model_id: int, db: Session = Depends(get_db)):
    model = db.query(VelocityModel).filter(VelocityModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail=f"波速模型 {model_id} 不存在")
    return model


@router.get("/active", response_model=VelocityModelOut)
def get_active_velocity_model(db: Session = Depends(get_db)):
    model = db.query(VelocityModel).filter(VelocityModel.is_active == True).first()
    if not model:
        raise HTTPException(status_code=404, detail="没有激活的波速模型")
    return model


@router.patch("/{model_id}/activate", response_model=VelocityModelOut)
def activate_velocity_model(model_id: int, db: Session = Depends(get_db)):
    model = db.query(VelocityModel).filter(VelocityModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail=f"波速模型 {model_id} 不存在")
    
    if model.status == DataStatus.WRONG_VELOCITY:
        raise HTTPException(status_code=400, detail="波速模型状态为'波速版本错'，请先修正后再激活")
    
    db.query(VelocityModel).update({"is_active": False})
    
    model.is_active = True
    db.commit()
    db.refresh(model)
    return model


@router.patch("/{model_id}/status", response_model=VelocityModelOut)
def update_model_status(
    model_id: int,
    status: DataStatus,
    remark: Optional[str] = None,
    db: Session = Depends(get_db)
):
    model = db.query(VelocityModel).filter(VelocityModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail=f"波速模型 {model_id} 不存在")
    
    model.status = status
    if status == DataStatus.WRONG_VELOCITY:
        model.is_active = False
    
    db.commit()
    db.refresh(model)
    return model


@router.delete("/{model_id}")
def delete_velocity_model(model_id: int, db: Session = Depends(get_db)):
    model = db.query(VelocityModel).filter(VelocityModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail=f"波速模型 {model_id} 不存在")
    
    from app.models import InversionResult
    used = db.query(InversionResult).filter(
        InversionResult.velocity_model_id == model_id
    ).first()
    if used:
        raise HTTPException(status_code=400, detail=f"波速模型 {model.model_name} 已被反演使用，无法删除")
    
    db.delete(model)
    db.commit()
    return {"message": f"波速模型 {model.model_name} 已删除"}
