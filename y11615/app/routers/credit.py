from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.models import CreditLimit, Customer
from app.schemas.schemas import CreditLimit as CreditSchema, CreditLimitCreate

router = APIRouter()


@router.get("/", response_model=List[CreditSchema], summary="获取信用额度列表")
def get_credit_limits(
    customer_id: Optional[int] = None,
    include_frozen: bool = False,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(CreditLimit)
    if customer_id:
        query = query.filter(CreditLimit.customer_id == customer_id)
    if not include_frozen:
        query = query.filter(CreditLimit.is_frozen == False)
    credits = query.order_by(CreditLimit.effective_date.desc()).offset(skip).limit(limit).all()
    return credits


@router.get("/{credit_id}", response_model=CreditSchema, summary="获取信用额度详情")
def get_credit_limit(credit_id: int, db: Session = Depends(get_db)):
    credit = db.query(CreditLimit).filter(CreditLimit.id == credit_id).first()
    if not credit:
        raise HTTPException(status_code=404, detail="信用额度不存在")
    return credit


@router.get("/customer/{customer_id}", response_model=Optional[CreditSchema], summary="获取客户当前信用额度")
def get_customer_credit(customer_id: int, db: Session = Depends(get_db)):
    credit = db.query(CreditLimit).filter(
        CreditLimit.customer_id == customer_id,
        CreditLimit.is_frozen == False
    ).order_by(CreditLimit.effective_date.desc()).first()
    return credit


@router.post("/", response_model=CreditSchema, summary="创建信用额度")
def create_credit_limit(credit: CreditLimitCreate, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == credit.customer_id).first()
    if not customer:
        raise HTTPException(status_code=400, detail="客户不存在")

    existing_active = db.query(CreditLimit).filter(
        CreditLimit.customer_id == credit.customer_id,
        CreditLimit.is_frozen == False
    ).first()
    if existing_active:
        existing_active.is_frozen = True
        existing_active.frozen_reason = "新额度生效，旧额度自动冻结"
        existing_active.frozen_date = credit.effective_date

    db_credit = CreditLimit(**credit.model_dump())
    db_credit.available_credit = credit.credit_limit
    db.add(db_credit)
    db.commit()
    db.refresh(db_credit)
    return db_credit


@router.post("/{credit_id}/freeze", summary="冻结信用额度")
def freeze_credit(credit_id: int, reason: str, db: Session = Depends(get_db)):
    credit = db.query(CreditLimit).filter(CreditLimit.id == credit_id).first()
    if not credit:
        raise HTTPException(status_code=404, detail="信用额度不存在")
    credit.is_frozen = True
    credit.frozen_reason = reason
    from datetime import date
    credit.frozen_date = date.today()
    db.commit()
    return {"success": True, "message": "信用额度已冻结"}


@router.post("/{credit_id}/unfreeze", summary="解冻信用额度")
def unfreeze_credit(credit_id: int, db: Session = Depends(get_db)):
    credit = db.query(CreditLimit).filter(CreditLimit.id == credit_id).first()
    if not credit:
        raise HTTPException(status_code=404, detail="信用额度不存在")
    credit.is_frozen = False
    credit.frozen_reason = None
    credit.frozen_date = None
    db.commit()
    return {"success": True, "message": "信用额度已解冻"}


@router.post("/update-usage", summary="更新所有客户信用使用情况")
def update_credit_usage(db: Session = Depends(get_db)):
    from app.services.ar_service import ARService
    service = ARService(db)
    updated = service.update_credit_usage()
    return {"updated": updated}
