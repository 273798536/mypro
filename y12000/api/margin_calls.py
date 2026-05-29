from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta

from database import get_db
import models
import schemas
from margin_calculator import calculate_margin_ratio, create_margin_call

router = APIRouter()


@router.get("/", response_model=List[schemas.MarginCall])
def get_margin_calls(skip: int = 0, limit: int = 100, account_id: str = None, status: str = None, 
                     call_date: str = None, risk_level: str = None, db: Session = Depends(get_db)):
    query = db.query(models.MarginCall)
    if account_id:
        query = query.filter(models.MarginCall.account_id == account_id)
    if status:
        query = query.filter(models.MarginCall.status == status)
    if call_date:
        query = query.filter(models.MarginCall.call_date == call_date)
    if risk_level:
        query = query.filter(models.MarginCall.risk_level == risk_level)
    
    calls = query.order_by(models.MarginCall.call_date.desc()).offset(skip).limit(limit).all()
    return calls


@router.get("/{call_id}", response_model=schemas.MarginCall)
def get_margin_call(call_id: str, db: Session = Depends(get_db)):
    call = db.query(models.MarginCall).filter(models.MarginCall.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="追保记录不存在")
    return call


@router.get("/{call_id}/details", response_model=List[schemas.MarginCallDetail])
def get_margin_call_details(call_id: str, db: Session = Depends(get_db)):
    details = db.query(models.MarginCallDetail).filter(
        models.MarginCallDetail.margin_call_id == call_id
    ).all()
    return details


@router.get("/account/{account_id}", response_model=List[schemas.MarginCall])
def get_margin_calls_by_account(account_id: str, db: Session = Depends(get_db)):
    calls = db.query(models.MarginCall).filter(
        models.MarginCall.account_id == account_id
    ).order_by(models.MarginCall.call_date.desc()).all()
    return calls


@router.post("/calculate")
def calculate_margin_call(request: schemas.MarginCallCalculationRequest, db: Session = Depends(get_db)):
    result = calculate_margin_ratio(
        db, 
        request.account_id, 
        request.call_date, 
        request.snapshot_date
    )
    if not result:
        raise HTTPException(status_code=404, detail="账户不存在")
    return result


@router.post("/generate", response_model=schemas.MarginCall)
def generate_margin_call(request: schemas.MarginCallCalculationRequest, db: Session = Depends(get_db)):
    call = create_margin_call(
        db, 
        request.account_id, 
        request.call_date, 
        request.snapshot_date
    )
    if not call:
        raise HTTPException(status_code=404, detail="账户不存在或计算失败")
    return call


@router.put("/{call_id}", response_model=schemas.MarginCall)
def update_margin_call(call_id: str, call_update: schemas.MarginCallUpdate, db: Session = Depends(get_db)):
    call = db.query(models.MarginCall).filter(models.MarginCall.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="追保记录不存在")
    
    for key, value in call_update.model_dump(exclude_unset=True).items():
        setattr(call, key, value)
    
    db.commit()
    db.refresh(call)
    return call


@router.patch("/{call_id}/status")
def update_margin_call_status(call_id: str, status: str, remark: str = None, changed_by: str = "system", db: Session = Depends(get_db)):
    call = db.query(models.MarginCall).filter(models.MarginCall.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="追保记录不存在")
    
    old_status = call.status
    call.status = status
    if remark:
        call.remark = (call.remark or "") + f"\n[{datetime.now()}] {changed_by}: {remark}"
    
    db.commit()
    db.refresh(call)
    
    return {
        "id": call_id,
        "old_status": old_status,
        "new_status": status,
        "changed_by": changed_by,
        "changed_at": datetime.now(),
        "message": "状态更新成功"
    }


@router.patch("/details/{detail_id}/modify")
def modify_margin_call_detail(detail_id: str, collateral_rate: float, modified_by: str = "operator", db: Session = Depends(get_db)):
    detail = db.query(models.MarginCallDetail).filter(models.MarginCallDetail.id == detail_id).first()
    if not detail:
        raise HTTPException(status_code=404, detail="追保明细不存在")
    
    if not detail.is_modified:
        detail.original_collateral_rate = detail.collateral_rate
    
    detail.collateral_rate = collateral_rate
    detail.collateral_value = detail.market_value * collateral_rate
    detail.is_modified = True
    detail.modified_by = modified_by
    detail.modified_at = datetime.now()
    
    call = db.query(models.MarginCall).filter(models.MarginCall.id == detail.margin_call_id).first()
    if call:
        all_details = db.query(models.MarginCallDetail).filter(
            models.MarginCallDetail.margin_call_id == detail.margin_call_id
        ).all()
        account = db.query(models.Account).filter(models.Account.id == call.account_id).first()
        if account:
            total_collateral = account.available_cash + sum(d.collateral_value for d in all_details)
            if account.total_debt > 0:
                call.margin_ratio = round((total_collateral / account.total_debt) * 100, 2)
    
    db.commit()
    db.refresh(detail)
    
    return {
        "id": detail_id,
        "message": "明细修改成功",
        "is_modified": True,
        "modified_by": modified_by
    }


@router.post("/batch-generate")
def batch_generate_margin_calls(call_date: str, snapshot_date: str = None, db: Session = Depends(get_db)):
    accounts = db.query(models.Account).filter(models.Account.status == "active").all()
    results = []
    
    for account in accounts:
        try:
            call = create_margin_call(db, account.id, call_date, snapshot_date)
            if call and call.risk_level in ["warning", "danger"]:
                results.append({
                    "account_id": account.id,
                    "account_no": account.account_no,
                    "customer_name": account.customer_name,
                    "margin_ratio": call.margin_ratio,
                    "risk_level": call.risk_level,
                    "status": "generated"
                })
        except Exception as e:
            results.append({
                "account_id": account.id,
                "account_no": account.account_no,
                "customer_name": account.customer_name,
                "status": "failed",
                "reason": str(e)
            })
    
    return {
        "total_accounts": len(accounts),
        "call_count": len([r for r in results if r.get("status") == "generated"]),
        "results": results
    }


@router.delete("/{call_id}")
def delete_margin_call(call_id: str, db: Session = Depends(get_db)):
    call = db.query(models.MarginCall).filter(models.MarginCall.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="追保记录不存在")
    
    db.query(models.MarginCallDetail).filter(
        models.MarginCallDetail.margin_call_id == call_id
    ).delete()
    
    db.delete(call)
    db.commit()
    return {"message": "删除成功"}
