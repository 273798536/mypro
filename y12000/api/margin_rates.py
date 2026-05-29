from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from database import get_db
import models
import schemas

router = APIRouter()


@router.get("/", response_model=List[schemas.MarginRate])
def get_margin_rates(skip: int = 0, limit: int = 100, stock_code: str = None, is_active: bool = None, db: Session = Depends(get_db)):
    query = db.query(models.MarginRate)
    if stock_code:
        query = query.filter(models.MarginRate.stock_code == stock_code)
    if is_active is not None:
        query = query.filter(models.MarginRate.is_active == is_active)
    rates = query.offset(skip).limit(limit).all()
    return rates


@router.get("/{rate_id}", response_model=schemas.MarginRate)
def get_margin_rate(rate_id: str, db: Session = Depends(get_db)):
    rate = db.query(models.MarginRate).filter(models.MarginRate.id == rate_id).first()
    if not rate:
        raise HTTPException(status_code=404, detail="折算率不存在")
    return rate


@router.post("/", response_model=schemas.MarginRate)
def create_margin_rate(rate: schemas.MarginRateCreate, db: Session = Depends(get_db)):
    db_rate = models.MarginRate(
        id=str(uuid.uuid4()),
        **rate.model_dump()
    )
    db.add(db_rate)
    db.commit()
    db.refresh(db_rate)
    return db_rate


@router.put("/{rate_id}", response_model=schemas.MarginRate)
def update_margin_rate(rate_id: str, rate_update: schemas.MarginRateUpdate, db: Session = Depends(get_db)):
    rate = db.query(models.MarginRate).filter(models.MarginRate.id == rate_id).first()
    if not rate:
        raise HTTPException(status_code=404, detail="折算率不存在")
    
    for key, value in rate_update.model_dump(exclude_unset=True).items():
        setattr(rate, key, value)
    
    db.commit()
    db.refresh(rate)
    return rate


@router.delete("/{rate_id}")
def delete_margin_rate(rate_id: str, db: Session = Depends(get_db)):
    rate = db.query(models.MarginRate).filter(models.MarginRate.id == rate_id).first()
    if not rate:
        raise HTTPException(status_code=404, detail="折算率不存在")
    
    db.delete(rate)
    db.commit()
    return {"message": "删除成功"}


@router.post("/batch-import")
def batch_import_rates(data: List[schemas.MarginRateCreate], db: Session = Depends(get_db)):
    success_count = 0
    failed_count = 0
    results = []
    
    for item in data:
        try:
            db_rate = models.MarginRate(id=str(uuid.uuid4()), **item.model_dump())
            db.add(db_rate)
            success_count += 1
            results.append({"stock_code": item.stock_code, "status": "success"})
        except Exception as e:
            failed_count += 1
            results.append({"stock_code": item.stock_code, "status": "failed", "reason": str(e)})
    
    db.commit()
    return {
        "success_count": success_count,
        "failed_count": failed_count,
        "results": results
    }
