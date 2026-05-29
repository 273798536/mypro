from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from database import get_db
import models
import schemas

router = APIRouter()


@router.get("/", response_model=List[schemas.Position])
def get_positions(skip: int = 0, limit: int = 100, account_id: str = None, db: Session = Depends(get_db)):
    query = db.query(models.Position)
    if account_id:
        query = query.filter(models.Position.account_id == account_id)
    positions = query.offset(skip).limit(limit).all()
    return positions


@router.get("/{position_id}", response_model=schemas.Position)
def get_position(position_id: str, db: Session = Depends(get_db)):
    position = db.query(models.Position).filter(models.Position.id == position_id).first()
    if not position:
        raise HTTPException(status_code=404, detail="持仓不存在")
    return position


@router.get("/account/{account_id}", response_model=List[schemas.Position])
def get_positions_by_account(account_id: str, db: Session = Depends(get_db)):
    positions = db.query(models.Position).filter(models.Position.account_id == account_id).all()
    return positions


@router.post("/", response_model=schemas.Position)
def create_position(position: schemas.PositionCreate, db: Session = Depends(get_db)):
    db_position = models.Position(
        id=str(uuid.uuid4()),
        **position.model_dump()
    )
    db.add(db_position)
    db.commit()
    db.refresh(db_position)
    return db_position


@router.put("/{position_id}", response_model=schemas.Position)
def update_position(position_id: str, position_update: schemas.PositionUpdate, db: Session = Depends(get_db)):
    position = db.query(models.Position).filter(models.Position.id == position_id).first()
    if not position:
        raise HTTPException(status_code=404, detail="持仓不存在")
    
    for key, value in position_update.model_dump(exclude_unset=True).items():
        setattr(position, key, value)
    
    db.commit()
    db.refresh(position)
    return position


@router.delete("/{position_id}")
def delete_position(position_id: str, db: Session = Depends(get_db)):
    position = db.query(models.Position).filter(models.Position.id == position_id).first()
    if not position:
        raise HTTPException(status_code=404, detail="持仓不存在")
    
    db.delete(position)
    db.commit()
    return {"message": "删除成功"}


@router.post("/batch-import")
def batch_import_positions(data: List[schemas.PositionCreate], db: Session = Depends(get_db)):
    success_count = 0
    failed_count = 0
    results = []
    
    for item in data:
        try:
            db_position = models.Position(id=str(uuid.uuid4()), **item.model_dump())
            db.add(db_position)
            success_count += 1
            results.append({"stock_code": item.stock_code, "account_id": item.account_id, "status": "success"})
        except Exception as e:
            failed_count += 1
            results.append({"stock_code": item.stock_code, "account_id": item.account_id, "status": "failed", "reason": str(e)})
    
    db.commit()
    return {
        "success_count": success_count,
        "failed_count": failed_count,
        "results": results
    }
