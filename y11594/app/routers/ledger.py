from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.core.security import get_current_user, require_permission, filter_by_permission
from app.core.state_machine import LedgerStateMachine
from app.core.ledger_service import LedgerService
from app.core.dirty_record_detector import DirtyRecordDetector
from app.models.user import User
from app.models.ledger import LedgerRecord, StatusHistory, DirtyRecord
from app.schemas.ledger import (
    LedgerCreate,
    LedgerUpdate,
    LedgerResponse,
    LedgerDetailResponse,
    StatusTransition,
    StatusHistoryResponse,
    DirtyRecordResponse,
    DirtyRecordResolve,
    ImportResult,
    LedgerQuery
)
from app.schemas.common import ResponseModel, PaginationParams, PaginatedResponse

router = APIRouter(prefix="/ledger", tags=["台账管理"])


@router.post("/create", response_model=ResponseModel)
def create_ledger(
    data: LedgerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("create"))
):
    try:
        service = LedgerService(db, current_user)
        ledger = service.create_ledger_from_sources(data.wave_no, data.sku_code, data.auto_detect)
        return ResponseModel(data={"ledger_no": ledger.ledger_no, "id": ledger.id})
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/list", response_model=ResponseModel)
def list_ledgers(
    wave_no: Optional[str] = None,
    sku_code: Optional[str] = None,
    picker_name: Optional[str] = None,
    status: Optional[str] = None,
    is_dirty: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(LedgerRecord).filter(LedgerRecord.is_deleted == False)
    
    if current_user.role == "entry":
        query = query.filter(LedgerRecord.status.in_(["draft", "rejected"]))
    elif current_user.role == "reviewer":
        query = query.filter(LedgerRecord.status.in_(["submitted", "reviewing", "rejected"]))
    elif current_user.role == "readonly":
        query = query.filter(LedgerRecord.status.in_(["audited", "exported"]))
    
    if wave_no:
        query = query.filter(LedgerRecord.wave_no.like(f"%{wave_no}%"))
    if sku_code:
        query = query.filter(LedgerRecord.sku_code.like(f"%{sku_code}%"))
    if picker_name:
        query = query.filter(LedgerRecord.picker_name.like(f"%{picker_name}%"))
    if status:
        query = query.filter(LedgerRecord.status == status)
    if is_dirty is not None:
        query = query.filter(LedgerRecord.is_dirty == is_dirty)
    
    total = query.count()
    records = query.order_by(LedgerRecord.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    return ResponseModel(data=PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[LedgerResponse.model_validate(r).model_dump() for r in records]
    ))


@router.get("/{ledger_id}", response_model=ResponseModel)
def get_ledger_detail(
    ledger_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        service = LedgerService(db, current_user)
        result = service.get_ledger_with_trace(ledger_id)
        return ResponseModel(data=result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/{ledger_id}", response_model=ResponseModel)
def update_ledger(
    ledger_id: int,
    data: LedgerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit"))
):
    try:
        service = LedgerService(db, current_user)
        ledger = service.update_ledger(ledger_id, data.model_dump(exclude_unset=True))
        return ResponseModel(data={"ledger_no": ledger.ledger_no, "version": ledger.version})
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/submit", response_model=ResponseModel)
def submit_ledger(
    data: StatusTransition,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("submit"))
):
    ledger = db.query(LedgerRecord).filter(LedgerRecord.id == data.ledger_id).first()
    if not ledger:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="台账记录不存在")
    
    sm = LedgerStateMachine(db, current_user)
    ledger = sm.submit(ledger, data.reason)
    return ResponseModel(data={"ledger_no": ledger.ledger_no, "status": ledger.status})


@router.post("/start-review", response_model=ResponseModel)
def start_review(
    data: StatusTransition,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("review"))
):
    ledger = db.query(LedgerRecord).filter(LedgerRecord.id == data.ledger_id).first()
    if not ledger:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="台账记录不存在")
    
    sm = LedgerStateMachine(db, current_user)
    ledger = sm.start_review(ledger, data.reason)
    return ResponseModel(data={"ledger_no": ledger.ledger_no, "status": ledger.status})


@router.post("/confirm", response_model=ResponseModel)
def confirm_ledger(
    data: StatusTransition,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("confirm"))
):
    ledger = db.query(LedgerRecord).filter(LedgerRecord.id == data.ledger_id).first()
    if not ledger:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="台账记录不存在")
    
    sm = LedgerStateMachine(db, current_user)
    ledger = sm.confirm(ledger, data.reason)
    return ResponseModel(data={"ledger_no": ledger.ledger_no, "status": ledger.status})


@router.post("/reject", response_model=ResponseModel)
def reject_ledger(
    data: StatusTransition,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("reject"))
):
    ledger = db.query(LedgerRecord).filter(LedgerRecord.id == data.ledger_id).first()
    if not ledger:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="台账记录不存在")
    
    sm = LedgerStateMachine(db, current_user)
    ledger = sm.reject(ledger, data.reason, data.note or "")
    return ResponseModel(data={"ledger_no": ledger.ledger_no, "status": ledger.status})


@router.post("/second-confirm", response_model=ResponseModel)
def second_confirm(
    data: StatusTransition,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("second_confirm"))
):
    ledger = db.query(LedgerRecord).filter(LedgerRecord.id == data.ledger_id).first()
    if not ledger:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="台账记录不存在")
    
    sm = LedgerStateMachine(db, current_user)
    ledger = sm.second_confirm(ledger, data.reason, data.note or "")
    return ResponseModel(data={"ledger_no": ledger.ledger_no, "status": ledger.status})


@router.post("/back-to-draft", response_model=ResponseModel)
def back_to_draft(
    data: StatusTransition,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("edit"))
):
    ledger = db.query(LedgerRecord).filter(LedgerRecord.id == data.ledger_id).first()
    if not ledger:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="台账记录不存在")
    
    sm = LedgerStateMachine(db, current_user)
    ledger = sm.back_to_draft(ledger, data.reason)
    return ResponseModel(data={"ledger_no": ledger.ledger_no, "status": ledger.status})


@router.get("/{ledger_id}/history", response_model=ResponseModel)
def get_status_history(
    ledger_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    histories = db.query(StatusHistory).filter(
        StatusHistory.ledger_id == ledger_id
    ).order_by(StatusHistory.operate_time).all()
    
    return ResponseModel(data=[StatusHistoryResponse.model_validate(h).model_dump() for h in histories])


@router.get("/dirty/list", response_model=ResponseModel)
def list_dirty_records(
    ledger_id: Optional[int] = None,
    is_resolved: Optional[bool] = None,
    dirty_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_all"))
):
    query = db.query(DirtyRecord)
    
    if ledger_id:
        query = query.filter(DirtyRecord.ledger_id == ledger_id)
    if is_resolved is not None:
        query = query.filter(DirtyRecord.is_resolved == is_resolved)
    if dirty_type:
        query = query.filter(DirtyRecord.dirty_type == dirty_type)
    
    total = query.count()
    records = query.order_by(DirtyRecord.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    return ResponseModel(data=PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[DirtyRecordResponse.model_validate(r).model_dump() for r in records]
    ))


@router.post("/dirty/{dirty_id}/resolve", response_model=ResponseModel)
def resolve_dirty_record(
    dirty_id: int,
    data: DirtyRecordResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("confirm"))
):
    try:
        detector = DirtyRecordDetector(db)
        dirty = detector.resolve_dirty_record(
            dirty_id,
            data.handle_opinion,
            current_user.full_name,
            data.resolved_value
        )
        return ResponseModel(data={"dirty_id": dirty.id, "is_resolved": dirty.is_resolved})
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/import", response_model=ResponseModel)
def import_ledgers(
    records: List[LedgerCreate],
    check_duplicate: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("create"))
):
    service = LedgerService(db, current_user)
    result = service.manual_import(
        [r.model_dump() for r in records],
        check_duplicate=check_duplicate
    )
    return ResponseModel(data=result)
