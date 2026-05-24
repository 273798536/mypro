from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, LedgerRecord, DirtyRecord, ReturnApplication
from app.schemas import LedgerRecord as LedgerSchema, DirtyRecord as DirtySchema, ImportResult
from app.security import get_current_user, require_action, RolePermission, UserRole

router = APIRouter()


@router.get("/", response_model=List[LedgerSchema])
async def list_ledgers(
    skip: int = 0,
    limit: int = 100,
    is_closed: Optional[bool] = None,
    has_diff: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(LedgerRecord)
    
    if is_closed is not None:
        query = query.filter(LedgerRecord.is_closed == is_closed)
    if has_diff:
        query = query.filter(LedgerRecord.inventory_diff_quantity != 0)
    
    ledgers = query.order_by(LedgerRecord.created_at.desc()).offset(skip).limit(limit).all()
    return ledgers


@router.get("/{ledger_id}", response_model=LedgerSchema)
async def get_ledger(
    ledger_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ledger = db.query(LedgerRecord).filter(LedgerRecord.id == ledger_id).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    return ledger


@router.get("/application/{application_id}", response_model=LedgerSchema)
async def get_ledger_by_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ledger = db.query(LedgerRecord).filter(LedgerRecord.application_id == application_id).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    return ledger


@router.post("/{ledger_id}/close", response_model=LedgerSchema)
async def close_ledger(
    ledger_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_action("close"))
):
    ledger = db.query(LedgerRecord).filter(LedgerRecord.id == ledger_id).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    
    if ledger.is_closed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="台账已关闭"
        )
    
    ledger.is_closed = True
    ledger.closed_by = current_user.id
    ledger.closed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(ledger)
    return ledger


@router.get("/{ledger_id}/dirty-records", response_model=List[DirtySchema])
async def get_dirty_records(
    ledger_id: int,
    is_resolved: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ledger = db.query(LedgerRecord).filter(LedgerRecord.id == ledger_id).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    
    query = db.query(DirtyRecord).filter(DirtyRecord.application_id == ledger.application_id)
    if is_resolved is not None:
        query = query.filter(DirtyRecord.is_resolved == is_resolved)
    
    return query.all()


@router.post("/dirty-records/{record_id}/resolve")
async def resolve_dirty_record(
    record_id: int,
    handling_opinion: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_action("review"))
):
    dirty_record = db.query(DirtyRecord).filter(DirtyRecord.id == record_id).first()
    if not dirty_record:
        raise HTTPException(status_code=404, detail="脏记录不存在")
    
    dirty_record.is_resolved = True
    dirty_record.handled_by = current_user.id
    dirty_record.handled_at = datetime.utcnow()
    dirty_record.handling_opinion = handling_opinion
    
    db.commit()
    
    return {"message": "脏记录已处理", "record_id": record_id}


@router.get("/summary/by-role")
async def get_role_based_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total_applications = db.query(ReturnApplication).count()
    total_ledgers = db.query(LedgerRecord).count()
    closed_ledgers = db.query(LedgerRecord).filter(LedgerRecord.is_closed == True).count()
    dirty_records = db.query(DirtyRecord).filter(DirtyRecord.is_resolved == False).count()
    
    summary = {
        "total_applications": total_applications,
        "total_ledgers": total_ledgers,
        "closed_ledgers": closed_ledgers,
        "pending_dirty_records": dirty_records
    }
    
    if current_user.role in {UserRole.REVIEWER, UserRole.SUPERVISOR}:
        summary["pending_review"] = db.query(ReturnApplication).filter(
            ReturnApplication.status.in_(["submitted", "second_confirm"])
        ).count()
    
    if current_user.role == UserRole.SUPERVISOR:
        summary["rejected"] = db.query(ReturnApplication).filter(
            ReturnApplication.status == "rejected"
        ).count()
    
    return summary
