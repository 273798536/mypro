from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.models.user import User, UserRole
from app.models.ledger import (
    EquipmentLedger, LedgerStatus, RecordType, 
    DirtyRecordType, DuplicateHandling
)
from app.schemas.ledger import (
    LedgerCreate, LedgerUpdate, LedgerResponse, LedgerListResponse,
    SubmitRequest, RejectRequest, DirtyRecordHandleRequest, DuplicateHandleRequest,
    OutboundOrderCreate, OutboundOrderResponse,
    ReturnPhotoCreate, ReturnPhotoResponse,
    MaintenanceEstimateCreate, MaintenanceEstimateResponse,
    SupplierStatementCreate, SupplierStatementResponse
)
from app.core.security import (
    get_current_user, can_edit, can_review, can_second_confirm, can_view_all,
    apply_field_masking
)
from app.services.audit_service import (
    create_audit_log, ledger_to_dict, get_audit_logs_by_ledger, AuditAction
)
from app.services.dirty_record_service import analyze_dirty_record
from app.services.duplicate_service import find_duplicate_by_batch
from app.services.export_service import export_to_excel, export_summary, export_finance_view

router = APIRouter(prefix="/ledger", tags=["设备台账"])


@router.get("", response_model=LedgerListResponse)
def list_ledgers(
    skip: int = 0,
    limit: int = 100,
    status: Optional[LedgerStatus] = None,
    record_type: Optional[RecordType] = None,
    is_dirty: Optional[bool] = None,
    is_duplicate: Optional[bool] = None,
    batch_number: Optional[str] = None,
    customer_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(can_view_all)
):
    query = db.query(EquipmentLedger)
    
    if status:
        query = query.filter(EquipmentLedger.status == status)
    if record_type:
        query = query.filter(EquipmentLedger.record_type == record_type)
    if is_dirty is not None:
        query = query.filter(EquipmentLedger.is_dirty == is_dirty)
    if is_duplicate is not None:
        query = query.filter(EquipmentLedger.is_duplicate == is_duplicate)
    if batch_number:
        query = query.filter(EquipmentLedger.batch_number.contains(batch_number))
    if customer_name:
        query = query.filter(EquipmentLedger.customer_name.contains(customer_name))
    
    total = query.count()
    records = query.order_by(EquipmentLedger.created_at.desc()).offset(skip).limit(limit).all()
    
    if current_user.role == UserRole.READ_ONLY:
        masked_records = []
        for record in records:
            record_dict = LedgerResponse.from_orm(record).dict()
            masked_dict = apply_field_masking(record_dict, current_user.role)
            masked_records.append(masked_dict)
        return {"total": total, "items": masked_records}
    
    return {"total": total, "items": records}


@router.get("/{ledger_id}", response_model=LedgerResponse)
def get_ledger(
    ledger_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(can_view_all)
):
    ledger = db.query(EquipmentLedger).filter(EquipmentLedger.id == ledger_id).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    
    if current_user.role == UserRole.READ_ONLY:
        record_dict = LedgerResponse.from_orm(ledger).dict()
        return apply_field_masking(record_dict, current_user.role)
    
    return ledger


@router.post("", response_model=LedgerResponse)
def create_ledger(
    ledger_data: LedgerCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(can_edit)
):
    existing = db.query(EquipmentLedger).filter(
        EquipmentLedger.batch_number == ledger_data.batch_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="批次号已存在")
    
    ledger = EquipmentLedger(**ledger_data.dict(exclude={'change_reason'}))
    ledger.created_by = current_user.id
    ledger.status = LedgerStatus.DRAFT
    
    db.add(ledger)
    db.flush()
    
    create_audit_log(
        db, ledger.id, current_user, AuditAction.CREATE,
        new_values=ledger_to_dict(ledger),
        change_reason=ledger_data.change_reason,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    db.commit()
    db.refresh(ledger)
    return ledger


@router.put("/{ledger_id}", response_model=LedgerResponse)
def update_ledger(
    ledger_id: int,
    ledger_data: LedgerUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(can_edit)
):
    ledger = db.query(EquipmentLedger).filter(EquipmentLedger.id == ledger_id).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    
    if ledger.status not in [LedgerStatus.DRAFT, LedgerStatus.REJECTED]:
        raise HTTPException(status_code=400, detail="只有草稿或驳回状态可以编辑")
    
    previous_values = ledger_to_dict(ledger)
    update_data = ledger_data.dict(exclude_unset=True, exclude={'change_reason'})
    
    for key, value in update_data.items():
        setattr(ledger, key, value)
    
    create_audit_log(
        db, ledger.id, current_user, AuditAction.UPDATE,
        previous_values=previous_values,
        new_values=ledger_to_dict(ledger),
        change_reason=ledger_data.change_reason,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    db.commit()
    db.refresh(ledger)
    return ledger


@router.post("/{ledger_id}/submit", response_model=LedgerResponse)
def submit_ledger(
    ledger_id: int,
    submit_data: SubmitRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(can_edit)
):
    ledger = db.query(EquipmentLedger).filter(EquipmentLedger.id == ledger_id).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    
    if ledger.status != LedgerStatus.DRAFT:
        raise HTTPException(status_code=400, detail="只有草稿状态可以提交")
    
    previous_values = ledger_to_dict(ledger)
    ledger.status = LedgerStatus.SUBMITTED
    ledger.submitted_at = datetime.utcnow()
    
    dirty_analysis = analyze_dirty_record(db, ledger)
    if dirty_analysis['is_dirty']:
        ledger.is_dirty = True
        ledger.dirty_note = dirty_analysis['issues'][0]['description']
        ledger.dirty_type = DirtyRecordType(dirty_analysis['issues'][0]['type'])
        ledger.original_content = dirty_analysis['original_content']
    
    duplicate = find_duplicate_by_batch(db, ledger.batch_number, exclude_id=ledger.id)
    if duplicate:
        ledger.is_duplicate = True
        ledger.duplicate_note = f"检测到重复批次: {duplicate.batch_number}"
        ledger.original_batch_number = duplicate.batch_number
    
    create_audit_log(
        db, ledger.id, current_user, AuditAction.SUBMIT,
        previous_values=previous_values,
        new_values=ledger_to_dict(ledger),
        change_reason=submit_data.change_reason,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    db.commit()
    db.refresh(ledger)
    return ledger


@router.post("/{ledger_id}/reject", response_model=LedgerResponse)
def reject_ledger(
    ledger_id: int,
    reject_data: RejectRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(can_review)
):
    ledger = db.query(EquipmentLedger).filter(EquipmentLedger.id == ledger_id).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    
    if ledger.status != LedgerStatus.SUBMITTED:
        raise HTTPException(status_code=400, detail="只有已提交状态可以驳回")
    
    previous_values = ledger_to_dict(ledger)
    ledger.status = LedgerStatus.REJECTED
    ledger.rejection_reason = reject_data.rejection_reason
    ledger.reviewed_by = current_user.id
    ledger.reviewed_at = datetime.utcnow()
    
    create_audit_log(
        db, ledger.id, current_user, AuditAction.REJECT,
        previous_values=previous_values,
        new_values=ledger_to_dict(ledger),
        change_reason=reject_data.change_reason or reject_data.rejection_reason,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    db.commit()
    db.refresh(ledger)
    return ledger


@router.post("/{ledger_id}/review", response_model=LedgerResponse)
def review_ledger(
    ledger_id: int,
    submit_data: SubmitRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(can_review)
):
    ledger = db.query(EquipmentLedger).filter(EquipmentLedger.id == ledger_id).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    
    if ledger.status != LedgerStatus.SUBMITTED:
        raise HTTPException(status_code=400, detail="只有已提交状态可以审核")
    
    previous_values = ledger_to_dict(ledger)
    ledger.reviewed_by = current_user.id
    ledger.reviewed_at = datetime.utcnow()
    
    create_audit_log(
        db, ledger.id, current_user, AuditAction.REVIEW,
        previous_values=previous_values,
        new_values=ledger_to_dict(ledger),
        change_reason=submit_data.change_reason,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    db.commit()
    db.refresh(ledger)
    return ledger


@router.post("/{ledger_id}/second-confirm", response_model=LedgerResponse)
def second_confirm_ledger(
    ledger_id: int,
    submit_data: SubmitRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(can_second_confirm)
):
    ledger = db.query(EquipmentLedger).filter(EquipmentLedger.id == ledger_id).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    
    if ledger.status != LedgerStatus.SUBMITTED or not ledger.reviewed_by:
        raise HTTPException(status_code=400, detail="需要先审核后才能二次确认")
    
    previous_values = ledger_to_dict(ledger)
    ledger.status = LedgerStatus.SECOND_CONFIRMED
    ledger.second_confirmed_by = current_user.id
    ledger.second_confirmed_at = datetime.utcnow()
    
    create_audit_log(
        db, ledger.id, current_user, AuditAction.SECOND_CONFIRM,
        previous_values=previous_values,
        new_values=ledger_to_dict(ledger),
        change_reason=submit_data.change_reason,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    db.commit()
    db.refresh(ledger)
    return ledger


@router.post("/{ledger_id}/mark-audit-ready", response_model=LedgerResponse)
def mark_audit_ready(
    ledger_id: int,
    submit_data: SubmitRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(can_second_confirm)
):
    ledger = db.query(EquipmentLedger).filter(EquipmentLedger.id == ledger_id).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    
    if ledger.status != LedgerStatus.SECOND_CONFIRMED:
        raise HTTPException(status_code=400, detail="只有已二次确认状态可以标记为审计就绪")
    
    previous_values = ledger_to_dict(ledger)
    ledger.status = LedgerStatus.AUDIT_READY
    
    create_audit_log(
        db, ledger.id, current_user, AuditAction.MARK_AUDIT_READY,
        previous_values=previous_values,
        new_values=ledger_to_dict(ledger),
        change_reason=submit_data.change_reason,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    db.commit()
    db.refresh(ledger)
    return ledger


@router.post("/{ledger_id}/handle-dirty", response_model=LedgerResponse)
def handle_dirty_record(
    ledger_id: int,
    handle_data: DirtyRecordHandleRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(can_review)
):
    ledger = db.query(EquipmentLedger).filter(EquipmentLedger.id == ledger_id).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    
    if not ledger.is_dirty:
        raise HTTPException(status_code=400, detail="该记录不是脏数据")
    
    previous_values = ledger_to_dict(ledger)
    ledger.dirty_type = handle_data.dirty_type
    ledger.dirty_note = handle_data.dirty_note
    ledger.correction_note = handle_data.correction_note
    ledger.is_dirty = False
    
    create_audit_log(
        db, ledger.id, current_user, AuditAction.HANDLE_DIRTY,
        previous_values=previous_values,
        new_values=ledger_to_dict(ledger),
        change_reason=handle_data.correction_note,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    db.commit()
    db.refresh(ledger)
    return ledger


@router.post("/{ledger_id}/handle-duplicate", response_model=LedgerResponse)
def handle_duplicate_record(
    ledger_id: int,
    handle_data: DuplicateHandleRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(can_second_confirm)
):
    ledger = db.query(EquipmentLedger).filter(EquipmentLedger.id == ledger_id).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    
    if not ledger.is_duplicate:
        raise HTTPException(status_code=400, detail="该记录不是重复数据")
    
    previous_values = ledger_to_dict(ledger)
    ledger.duplicate_handling = handle_data.handling
    ledger.duplicate_note = handle_data.duplicate_note
    if handle_data.original_batch_number:
        ledger.original_batch_number = handle_data.original_batch_number
    ledger.is_duplicate = False
    
    create_audit_log(
        db, ledger.id, current_user, AuditAction.HANDLE_DUPLICATE,
        previous_values=previous_values,
        new_values=ledger_to_dict(ledger),
        change_reason=handle_data.duplicate_note,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    db.commit()
    db.refresh(ledger)
    return ledger


@router.get("/export/excel")
def export_ledger_excel(
    status: Optional[LedgerStatus] = None,
    record_type: Optional[RecordType] = None,
    is_dirty: Optional[bool] = None,
    is_duplicate: Optional[bool] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(can_view_all)
):
    output = export_to_excel(
        db, current_user.role, status, record_type,
        is_dirty, is_duplicate, start_date, end_date
    )
    
    filename = f"设备台账_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/summary")
def export_summary_excel(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(can_view_all)
):
    output = export_summary(db, current_user.role, start_date, end_date)
    
    filename = f"台账汇总_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/finance")
def export_finance_excel(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(can_view_all)
):
    output = export_finance_view(db, current_user.role, start_date, end_date)
    
    filename = f"财务视图_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/outbound-order", response_model=OutboundOrderResponse)
def create_outbound_order(
    order_data: OutboundOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(can_edit)
):
    from app.models.ledger import OutboundOrder
    
    ledger = db.query(EquipmentLedger).filter(
        EquipmentLedger.id == order_data.ledger_id
    ).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    
    order = OutboundOrder(**order_data.dict())
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.post("/return-photo", response_model=ReturnPhotoResponse)
def create_return_photo(
    photo_data: ReturnPhotoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(can_edit)
):
    from app.models.ledger import ReturnPhoto
    
    ledger = db.query(EquipmentLedger).filter(
        EquipmentLedger.id == photo_data.ledger_id
    ).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    
    photo = ReturnPhoto(**photo_data.dict())
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


@router.post("/maintenance-estimate", response_model=MaintenanceEstimateResponse)
def create_maintenance_estimate(
    estimate_data: MaintenanceEstimateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(can_edit)
):
    from app.models.ledger import MaintenanceEstimate
    
    ledger = db.query(EquipmentLedger).filter(
        EquipmentLedger.id == estimate_data.ledger_id
    ).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    
    estimate = MaintenanceEstimate(**estimate_data.dict())
    db.add(estimate)
    db.commit()
    db.refresh(estimate)
    return estimate


@router.post("/supplier-statement", response_model=SupplierStatementResponse)
def create_supplier_statement(
    statement_data: SupplierStatementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(can_edit)
):
    from app.models.ledger import SupplierStatement
    
    ledger = db.query(EquipmentLedger).filter(
        EquipmentLedger.id == statement_data.ledger_id
    ).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="台账记录不存在")
    
    statement = SupplierStatement(**statement_data.dict())
    db.add(statement)
    db.commit()
    db.refresh(statement)
    return statement
