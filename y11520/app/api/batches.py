from datetime import datetime
from typing import Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    get_current_active_user, allow_entry, allow_review,
    allow_manager, allow_all_roles
)
from app.models.enums import RecordStatus, UserRole
from app.models.models import User, Batch, DirtyRecord
from app.schemas.schemas import (
    BatchCreate, BatchUpdate, BatchResponse, BatchDetailResponse,
    BatchDataUpload, BatchStatusChange, BatchReview,
    BatchFreeze, BatchUnfreeze, DirtyRecordResponse,
    DirtyRecordResolve, BatchListResponse, SummaryStats,
    BatchListResponseManager, BatchListResponseReadOnly,
    BatchResponseManager, BatchResponseReadOnly,
    BatchDetailResponseEntry, BatchDetailResponseReadOnly
)
from app.services.state_machine import StateMachine, StateTransitionError
from app.services.data_processor import DataProcessor
from app.services.export_service import ExportService

router = APIRouter(prefix="/batches", tags=["批次管理"])


def get_batch_list_response_model(user_role: UserRole):
    if user_role == UserRole.MANAGER:
        return BatchListResponseManager
    elif user_role == UserRole.READONLY:
        return BatchListResponseReadOnly
    return BatchListResponse


def get_batch_response_model(user_role: UserRole):
    if user_role == UserRole.MANAGER:
        return BatchResponseManager
    elif user_role == UserRole.READONLY:
        return BatchResponseReadOnly
    return BatchResponse


def get_batch_detail_response_model(user_role: UserRole):
    if user_role == UserRole.MANAGER or user_role == UserRole.REVIEW:
        return BatchDetailResponse
    elif user_role == UserRole.ENTRY:
        return BatchDetailResponseEntry
    return BatchDetailResponseReadOnly


@router.get("", dependencies=[Depends(allow_all_roles)])
async def list_batches(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[RecordStatus] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Batch)
    if status:
        query = query.filter(Batch.status == status)
    if region:
        query = query.filter(Batch.region == region)
    
    total = query.count()
    items = query.order_by(Batch.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()
    
    response_model = get_batch_list_response_model(current_user.role)
    
    if current_user.role == UserRole.MANAGER:
        return BatchListResponseManager(
            items=[BatchResponseManager.model_validate(item) for item in items],
            total=total,
            page=page,
            page_size=page_size
        )
    elif current_user.role == UserRole.READONLY:
        return BatchListResponseReadOnly(
            items=[BatchResponseReadOnly.model_validate(item) for item in items],
            total=total,
            page=page,
            page_size=page_size
        )
    
    return BatchListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("", dependencies=[Depends(allow_entry)])
async def create_batch(
    batch_in: BatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    existing = db.query(Batch).filter(Batch.batch_no == batch_in.batch_no).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"批次号 {batch_in.batch_no} 已存在"
        )
    
    batch = Batch(
        batch_no=batch_in.batch_no,
        name=batch_in.name,
        region=batch_in.region,
        remark=batch_in.remark,
        created_by=current_user.id
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    
    response_model = get_batch_response_model(current_user.role)
    return response_model.model_validate(batch)


@router.get("/{batch_id}", dependencies=[Depends(allow_all_roles)])
async def get_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    response_model = get_batch_detail_response_model(current_user.role)
    return response_model.model_validate(batch)


@router.put("/{batch_id}", dependencies=[Depends(allow_entry)])
async def update_batch(
    batch_id: int,
    batch_in: BatchUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    if batch.status not in [RecordStatus.DRAFT, RecordStatus.REJECTED]:
        raise HTTPException(
            status_code=400,
            detail="只能编辑草稿或被驳回状态的批次"
        )
    
    update_data = batch_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(batch, field, value)
    
    db.commit()
    db.refresh(batch)
    
    response_model = get_batch_response_model(current_user.role)
    return response_model.model_validate(batch)


@router.post("/{batch_id}/upload", dependencies=[Depends(allow_entry)])
async def upload_batch_data(
    batch_id: int,
    data_in: BatchDataUpload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    if batch.status not in [RecordStatus.DRAFT, RecordStatus.REJECTED]:
        raise HTTPException(
            status_code=400,
            detail="只能上传草稿或被驳回状态的批次数据"
        )
    
    processor = DataProcessor(db, batch_id)
    
    if data_in.appointment_orders:
        processor.process_appointment_orders(data_in.appointment_orders)
    
    if data_in.technician_locations:
        processor.process_technician_locations(data_in.technician_locations)
    
    if data_in.user_reviews:
        processor.process_user_reviews(data_in.user_reviews)
    
    if data_in.external_receipts:
        processor.process_external_receipts(data_in.external_receipts)
    
    processor.run_all_checks()
    processor.recalculate_batch_summary(batch_id)
    
    db.commit()
    db.refresh(batch)
    
    response_model = get_batch_detail_response_model(current_user.role)
    return response_model.model_validate(batch)


@router.post("/{batch_id}/submit", dependencies=[Depends(allow_entry)])
async def submit_for_review(
    batch_id: int,
    status_change: BatchStatusChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    try:
        batch = StateMachine.submit_for_review(
            db, batch, current_user, status_change.manual_reason
        )
        db.commit()
        db.refresh(batch)
        
        response_model = get_batch_response_model(current_user.role)
        return response_model.model_validate(batch)
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{batch_id}/review", dependencies=[Depends(allow_review)])
async def review_batch(
    batch_id: int,
    review_in: BatchReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    try:
        batch = StateMachine.review(
            db, batch, current_user,
            review_in.result, review_in.comment, review_in.manual_reason
        )
        db.commit()
        db.refresh(batch)
        
        response_model = get_batch_response_model(current_user.role)
        return response_model.model_validate(batch)
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{batch_id}/freeze", dependencies=[Depends(allow_manager)])
async def freeze_batch(
    batch_id: int,
    freeze_in: BatchFreeze,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    try:
        batch = StateMachine.freeze(
            db, batch, current_user,
            freeze_in.freeze_reason, freeze_in.manual_reason
        )
        db.commit()
        db.refresh(batch)
        return BatchResponseManager.model_validate(batch)
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{batch_id}/unfreeze", dependencies=[Depends(allow_manager)])
async def unfreeze_batch(
    batch_id: int,
    unfreeze_in: BatchUnfreeze,
    target_status: Optional[RecordStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    try:
        batch = StateMachine.unfreeze(
            db, batch, current_user,
            unfreeze_in.unfreeze_reason, target_status, unfreeze_in.manual_reason
        )
        db.commit()
        db.refresh(batch)
        return BatchResponseManager.model_validate(batch)
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{batch_id}/settle", dependencies=[Depends(allow_manager)])
async def settle_batch(
    batch_id: int,
    status_change: BatchStatusChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    try:
        batch = StateMachine.settle(db, batch, current_user, status_change.manual_reason)
        db.commit()
        db.refresh(batch)
        return BatchResponseManager.model_validate(batch)
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{batch_id}/archive", dependencies=[Depends(allow_manager)])
async def archive_batch(
    batch_id: int,
    status_change: BatchStatusChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    try:
        batch = StateMachine.archive(db, batch, current_user, status_change.manual_reason)
        db.commit()
        db.refresh(batch)
        return BatchResponseManager.model_validate(batch)
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{batch_id}/dirty-records", response_model=list[DirtyRecordResponse], dependencies=[Depends(allow_all_roles)])
async def list_dirty_records(
    batch_id: int,
    resolved: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    query = db.query(DirtyRecord).filter(DirtyRecord.batch_id == batch_id)
    if resolved is not None:
        query = query.filter(DirtyRecord.is_resolved == resolved)
    
    return query.all()


@router.patch("/dirty-records/{record_id}/resolve", response_model=DirtyRecordResponse, dependencies=[Depends(allow_review)])
async def resolve_dirty_record(
    record_id: int,
    resolve_in: DirtyRecordResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    dirty_record = db.query(DirtyRecord).filter(DirtyRecord.id == record_id).first()
    if not dirty_record:
        raise HTTPException(status_code=404, detail="脏记录不存在")
    
    dirty_record.is_resolved = True
    dirty_record.resolved_by = current_user.id
    dirty_record.resolved_at = datetime.utcnow()
    dirty_record.handling_opinion = resolve_in.handling_opinion
    
    if resolve_in.corrected_value:
        dirty_record.corrected_value = resolve_in.corrected_value
        
        if resolve_in.apply_correction and dirty_record.target_model and dirty_record.target_record_id:
            processor = DataProcessor(db, dirty_record.batch_id)
            processor.apply_correction_to_target(dirty_record)
    
    processor = DataProcessor(db, dirty_record.batch_id)
    processor.recalculate_batch_summary(dirty_record.batch_id)
    
    db.commit()
    db.refresh(dirty_record)
    return dirty_record


@router.post("/{batch_id}/recalculate", dependencies=[Depends(allow_review)])
async def recalculate_summary(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    processor = DataProcessor(db, batch_id)
    summary = processor.recalculate_batch_summary(batch_id)
    
    db.commit()
    
    return {
        "message": "汇总已重新计算",
        "summary": summary
    }
