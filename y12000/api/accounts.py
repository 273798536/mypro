from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from database import get_db
import models
import schemas

router = APIRouter()


@router.get("/", response_model=List[schemas.Account])
def get_accounts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    accounts = db.query(models.Account).offset(skip).limit(limit).all()
    return accounts


@router.get("/{account_id}", response_model=schemas.Account)
def get_account(account_id: str, db: Session = Depends(get_db)):
    account = db.query(models.Account).filter(models.Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="账户不存在")
    return account


@router.get("/no/{account_no}", response_model=schemas.Account)
def get_account_by_no(account_no: str, db: Session = Depends(get_db)):
    account = db.query(models.Account).filter(models.Account.account_no == account_no).first()
    if not account:
        raise HTTPException(status_code=404, detail="账户不存在")
    return account


@router.post("/", response_model=schemas.Account)
def create_account(account: schemas.AccountCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Account).filter(models.Account.account_no == account.account_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="账户号已存在")
    
    db_account = models.Account(
        id=str(uuid.uuid4()),
        **account.model_dump()
    )
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account


@router.put("/{account_id}", response_model=schemas.Account)
def update_account(account_id: str, account_update: schemas.AccountUpdate, db: Session = Depends(get_db)):
    account = db.query(models.Account).filter(models.Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="账户不存在")
    
    for key, value in account_update.model_dump(exclude_unset=True).items():
        setattr(account, key, value)
    
    db.commit()
    db.refresh(account)
    return account


@router.delete("/{account_id}")
def delete_account(account_id: str, db: Session = Depends(get_db)):
    account = db.query(models.Account).filter(models.Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="账户不存在")
    
    db.delete(account)
    db.commit()
    return {"message": "删除成功"}


@router.post("/batch-import")
def batch_import_accounts(data: List[schemas.AccountCreate], db: Session = Depends(get_db)):
    success_count = 0
    failed_count = 0
    results = []
    
    for item in data:
        try:
            existing = db.query(models.Account).filter(models.Account.account_no == item.account_no).first()
            if existing:
                failed_count += 1
                results.append({"account_no": item.account_no, "status": "failed", "reason": "账户号已存在"})
                continue
            
            db_account = models.Account(id=str(uuid.uuid4()), **item.model_dump())
            db.add(db_account)
            success_count += 1
            results.append({"account_no": item.account_no, "status": "success"})
        except Exception as e:
            failed_count += 1
            results.append({"account_no": item.account_no, "status": "failed", "reason": str(e)})
    
    db.commit()
    return {
        "success_count": success_count,
        "failed_count": failed_count,
        "results": results
    }
