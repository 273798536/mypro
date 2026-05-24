from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import aiofiles

from app.database import get_db
from app.models import User, ReceiptStatus, AuditAction
from app.schemas import (
    ReceiptCreate, ReceiptUpdate, ReceiptResponse, ReceiptListResponse,
    BatchCreate, BatchResponse, AttachmentResponse, DirtyRecordResponse,
    StatusHistoryResponse, AuditLogResponse, ReviewRequest, FreezeRequest,
    DirtyFixRequest, SupervisorViewResponse
)
from app.auth import (
    get_current_user, allow_data_entry, allow_reviewer,
    allow_supervisor, allow_viewer
)
from app.crud import (
    create_receipt, get_receipt, get_receipts, update_receipt,
    create_batch, get_batch, get_batches, batch_create_receipts,
    create_attachment, get_attachments, get_dirty_records,
    fix_dirty_record, get_supervisor_view, get_material_history
)
from app.state_machine import ReceiptStateMachine, StateTransitionError
from app.config import settings

router = APIRouter(prefix="/receipts", tags=["回执管理"])


@router.post("/batches", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
def create_new_batch(
    batch_in: BatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_data_entry),
):
    batch = create_batch(db, batch_in, current_user)
    db.commit()
    db.refresh(batch)
    return batch


@router.get("/batches", response_model=dict)
def list_batches(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_viewer),
):
    batches, total = get_batches(db, skip=skip, limit=limit)
    return {"total": total, "page": skip // limit + 1, "page_size": limit, "items": batches}


@router.get("/batches/{batch_id}", response_model=BatchResponse)
def get_single_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_viewer),
):
    batch = get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return batch


@router.post("", response_model=ReceiptResponse, status_code=status.HTTP_201_CREATED)
def create_new_receipt(
    receipt_in: ReceiptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_data_entry),
):
    receipt = create_receipt(db, receipt_in, current_user)
    db.commit()
    db.refresh(receipt)
    return receipt


@router.post("/batch", response_model=List[ReceiptResponse])
def batch_create(
    batch_id: int,
    receipts_in: List[ReceiptCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_data_entry),
):
    batch = get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    receipts = batch_create_receipts(db, batch_id, receipts_in, current_user)
    db.commit()
    for receipt in receipts:
        db.refresh(receipt)
    return receipts


@router.get("", response_model=dict)
def list_receipts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[ReceiptStatus] = None,
    material_id: Optional[str] = None,
    platform: Optional[str] = None,
    has_dirty: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_viewer),
):
    receipts, total = get_receipts(
        db, skip=skip, limit=limit, status=status,
        material_id=material_id, platform=platform, has_dirty=has_dirty
    )
    return {
        "total": total,
        "page": skip // limit + 1,
        "page_size": limit,
        "items": [ReceiptListResponse.model_validate(r) for r in receipts]
    }


@router.get("/{receipt_id}", response_model=ReceiptResponse)
def get_single_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_viewer),
):
    receipt = get_receipt(db, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="回执不存在")
    return receipt


@router.put("/{receipt_id}", response_model=ReceiptResponse)
def update_single_receipt(
    receipt_id: int,
    receipt_in: ReceiptUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_data_entry),
):
    receipt = get_receipt(db, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="回执不存在")
    
    if receipt.status not in [ReceiptStatus.DRAFT, ReceiptStatus.REJECTED]:
        raise HTTPException(status_code=400, detail="当前状态不允许修改")
    
    receipt = update_receipt(db, receipt, receipt_in)
    db.commit()
    db.refresh(receipt)
    return receipt


@router.post("/{receipt_id}/submit", response_model=ReceiptResponse)
def submit_receipt(
    receipt_id: int,
    request: Optional[ReviewRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_data_entry),
):
    receipt = get_receipt(db, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="回执不存在")
    
    try:
        sm = ReceiptStateMachine(receipt, db, current_user)
        sm.submit(request.reason if request else None)
        db.commit()
        db.refresh(receipt)
    except StateTransitionError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    
    return receipt


@router.post("/{receipt_id}/start-review", response_model=ReceiptResponse)
def start_review(
    receipt_id: int,
    request: Optional[ReviewRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_reviewer),
):
    receipt = get_receipt(db, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="回执不存在")
    
    try:
        sm = ReceiptStateMachine(receipt, db, current_user)
        sm.start_review(request.reason if request else None)
        receipt.reviewed_by = current_user.id
        db.commit()
        db.refresh(receipt)
    except StateTransitionError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    
    return receipt


@router.post("/{receipt_id}/approve", response_model=ReceiptResponse)
def approve_receipt(
    receipt_id: int,
    request: Optional[ReviewRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_reviewer),
):
    receipt = get_receipt(db, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="回执不存在")
    
    try:
        sm = ReceiptStateMachine(receipt, db, current_user)
        sm.approve(request.reason if request else None)
        if request and request.review_remark:
            receipt.review_remark = request.review_remark
        db.commit()
        db.refresh(receipt)
    except StateTransitionError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    
    return receipt


@router.post("/{receipt_id}/reject", response_model=ReceiptResponse)
def reject_receipt(
    receipt_id: int,
    request: Optional[ReviewRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_reviewer),
):
    receipt = get_receipt(db, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="回执不存在")
    
    try:
        sm = ReceiptStateMachine(receipt, db, current_user)
        sm.reject(request.reason if request else None)
        if request and request.review_remark:
            receipt.review_remark = request.review_remark
        db.commit()
        db.refresh(receipt)
    except StateTransitionError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    
    return receipt


@router.post("/{receipt_id}/freeze", response_model=ReceiptResponse)
def freeze_receipt(
    receipt_id: int,
    request: FreezeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_supervisor),
):
    receipt = get_receipt(db, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="回执不存在")
    
    try:
        sm = ReceiptStateMachine(receipt, db, current_user)
        sm.freeze(request.freeze_reason)
        db.commit()
        db.refresh(receipt)
    except StateTransitionError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    
    return receipt


@router.post("/{receipt_id}/unfreeze", response_model=ReceiptResponse)
def unfreeze_receipt(
    receipt_id: int,
    target_status: ReceiptStatus,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_supervisor),
):
    receipt = get_receipt(db, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="回执不存在")
    
    if receipt.status != ReceiptStatus.FROZEN:
        raise HTTPException(status_code=400, detail="回执未处于冻结状态")
    
    try:
        sm = ReceiptStateMachine(receipt, db, current_user)
        sm.unfreeze(target_status, reason)
        db.commit()
        db.refresh(receipt)
    except StateTransitionError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    
    return receipt


@router.post("/{receipt_id}/settle", response_model=ReceiptResponse)
def settle_receipt(
    receipt_id: int,
    request: Optional[ReviewRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_supervisor),
):
    receipt = get_receipt(db, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="回执不存在")
    
    try:
        sm = ReceiptStateMachine(receipt, db, current_user)
        sm.settle(request.reason if request else None)
        db.commit()
        db.refresh(receipt)
    except StateTransitionError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    
    return receipt


@router.post("/{receipt_id}/archive", response_model=ReceiptResponse)
def archive_receipt(
    receipt_id: int,
    request: Optional[ReviewRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_supervisor),
):
    receipt = get_receipt(db, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="回执不存在")
    
    try:
        sm = ReceiptStateMachine(receipt, db, current_user)
        sm.archive(request.reason if request else None)
        db.commit()
        db.refresh(receipt)
    except StateTransitionError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    
    return receipt


@router.post("/{receipt_id}/attachments", response_model=AttachmentResponse, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    receipt_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_data_entry),
):
    receipt = get_receipt(db, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="回执不存在")
    
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    file_ext = os.path.splitext(file.filename)[1]
    file_name = f"{receipt_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, file_name)
    
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    attachment = create_attachment(
        db, receipt_id, file.filename, file_path,
        len(content), file.content_type, current_user
    )
    db.commit()
    db.refresh(attachment)
    return attachment


@router.get("/{receipt_id}/attachments", response_model=List[AttachmentResponse])
def list_attachments(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_viewer),
):
    receipt = get_receipt(db, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="回执不存在")
    return get_attachments(db, receipt_id)


@router.get("/{receipt_id}/dirty-records", response_model=List[DirtyRecordResponse])
def list_dirty_records(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_viewer),
):
    receipt = get_receipt(db, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="回执不存在")
    return get_dirty_records(db, receipt_id)


@router.post("/{receipt_id}/dirty-records/{dirty_id}/fix", response_model=DirtyRecordResponse)
def fix_dirty(
    receipt_id: int,
    dirty_id: int,
    request: DirtyFixRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_reviewer),
):
    receipt = get_receipt(db, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="回执不存在")
    
    dirty_records = get_dirty_records(db, receipt_id)
    dirty_record = next((dr for dr in dirty_records if dr.id == dirty_id), None)
    if not dirty_record:
        raise HTTPException(status_code=404, detail="脏记录不存在")
    
    if request.updates:
        for field, value in request.updates.items():
            if hasattr(receipt, field):
                setattr(receipt, field, value)
    
    fixed = fix_dirty_record(db, dirty_record, request.fix_note, current_user)
    
    remaining_dirty = db.query(type(dirty_record)).filter(
        type(dirty_record).receipt_id == receipt_id,
        type(dirty_record).is_fixed == False
    ).count()
    receipt.has_dirty = remaining_dirty > 0
    
    db.commit()
    db.refresh(fixed)
    return fixed


@router.get("/{receipt_id}/status-history", response_model=List[StatusHistoryResponse])
def get_status_history(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_viewer),
):
    receipt = get_receipt(db, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="回执不存在")
    return receipt.status_histories


@router.get("/{receipt_id}/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_viewer),
):
    receipt = get_receipt(db, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="回执不存在")
    return receipt.audit_logs


@router.get("/material/{material_id}/history")
def get_material_timeline(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_viewer),
):
    receipts = get_material_history(db, material_id)
    return {
        "material_id": material_id,
        "history_count": len(receipts),
        "records": [
            {
                "receipt_no": r.receipt_no,
                "material_name": r.material_name,
                "original_material_name": r.original_material_name,
                "platform": r.platform,
                "report_date": r.report_date,
                "status": r.status,
                "daily_cost": r.daily_cost,
                "created_at": r.created_at,
            }
            for r in receipts
        ]
    }


@router.get("/supervisor/view")
def supervisor_view(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[ReceiptStatus] = None,
    has_dirty: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_supervisor),
):
    receipts, total = get_supervisor_view(
        db, skip=skip, limit=limit, status=status, has_dirty=has_dirty
    )
    items = [
        SupervisorViewResponse(
            id=r.id,
            receipt_no=r.receipt_no,
            material_id=r.material_id,
            material_name=r.material_name,
            platform=r.platform,
            prev_status=r.prev_status,
            current_status=r.status,
            freeze_reason=r.freeze_reason,
            review_remark=r.review_remark,
            report_date=r.report_date,
            daily_cost=r.daily_cost,
            cost_amount=r.cost_amount,
            has_dirty=r.has_dirty,
            created_at=r.created_at,
        )
        for r in receipts
    ]
    return {
        "total": total,
        "page": skip // limit + 1,
        "page_size": limit,
        "items": items
    }
