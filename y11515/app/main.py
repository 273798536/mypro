import os
import json
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db, engine, Base
from app.models import (
    Batch, Record, OriginalRecordData, RecordAttachment, BatchAttachment,
    RecordState, RecordStateHistory, BatchStateHistory, OverrideRecord
)
from app.schemas import (
    BatchCreate, BatchResponse, BatchDetailResponse, BatchImportResponse,
    RecordResponse, RecordDetailResponse,
    AttachmentResponse, StateHistoryResponse, OverrideRecordResponse,
    ReviewRequest, FreezeRequest, UnfreezeRequest,
    ExportSummaryResponse, FailedRecordResponse, AttachmentTypeEnum
)
from app.state_machine import RecordStateMachine, BatchStateMachine, StateTransitionError

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="水务抢修材料异常回执状态机 API",
    description="处理水务抢修材料异常回执的完整状态机服务，包含批次管理、附件上传、复核改判、冻结结算等功能",
    version="1.0.0"
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "attachments"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "batches"), exist_ok=True)


@app.post("/api/batches", response_model=BatchImportResponse, summary="创建批次导入")
def create_batch(batch_data: BatchCreate, db: Session = Depends(get_db)):
    existing_batch = db.query(Batch).filter(Batch.batch_no == batch_data.batch_no).first()
    if existing_batch:
        raise HTTPException(
            status_code=400,
            detail=f"批次号 {batch_data.batch_no} 已存在，不允许重复提交"
        )

    batch = Batch(
        batch_no=batch_data.batch_no,
        source_file_name=batch_data.source_file_name,
        operator=batch_data.operator,
        station=batch_data.station,
        total_count=len(batch_data.records),
        status=RecordState.DRAFT
    )
    db.add(batch)
    db.flush()

    success_count = 0
    failed_count = 0
    failed_records = []

    for idx, record_data in enumerate(batch_data.records, 1):
        try:
            if not record_data.work_order_no:
                raise ValueError("派工单编号不能为空")

            is_negative = False
            if record_data.inventory_after is not None:
                is_negative = record_data.inventory_after < 0

            record = Record(
                batch_id=batch.id,
                original_row_no=record_data.original_row_no,
                work_order_no=record_data.work_order_no,
                valve_code=record_data.valve_code,
                valve_name=record_data.valve_name,
                inventory_before=record_data.inventory_before,
                used_quantity=record_data.used_quantity,
                inventory_after=record_data.inventory_after,
                is_negative_inventory=is_negative,
                repair_date=record_data.repair_date,
                site=record_data.site,
                construction_person=record_data.construction_person,
                status=RecordState.DRAFT
            )
            db.add(record)
            db.flush()

            original_data = OriginalRecordData(
                record_id=record.id,
                raw_data=record_data.raw_data,
                parsed_data=record_data.parsed_data or json.dumps(record_data.model_dump(), ensure_ascii=False, default=str),
                source_file=batch_data.source_file_name,
                source_row_no=record_data.original_row_no
            )
            db.add(original_data)

            success_count += 1
        except Exception as e:
            failed_count += 1
            failed_records.append(FailedRecordResponse(
                batch_no=batch_data.batch_no,
                original_row_no=record_data.original_row_no,
                work_order_no=record_data.work_order_no or f"row_{idx}",
                error_message=str(e)
            ))

    batch.success_count = success_count
    batch.failed_count = failed_count

    history = BatchStateHistory(
        batch_id=batch.id,
        from_state=None,
        to_state=RecordState.DRAFT,
        transition_type="create",
        operator=batch_data.operator,
        reason="批次创建"
    )
    db.add(history)

    db.commit()
    db.refresh(batch)

    return BatchImportResponse(
        batch_id=batch.id,
        batch_no=batch.batch_no,
        total_count=batch.total_count,
        success_count=batch.success_count,
        failed_count=batch.failed_count,
        failed_records=failed_records,
        created_at=batch.created_at
    )


@app.get("/api/batches", response_model=List[BatchResponse], summary="查询批次列表")
def list_batches(
    station: Optional[str] = None,
    status: Optional[str] = None,
    is_frozen: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Batch)
    if station:
        query = query.filter(Batch.station == station)
    if status:
        query = query.filter(Batch.status == status)
    if is_frozen is not None:
        query = query.filter(Batch.is_frozen == is_frozen)

    return query.order_by(Batch.created_at.desc()).offset(skip).limit(limit).all()


@app.get("/api/batches/{batch_id}", response_model=BatchDetailResponse, summary="获取批次详情")
def get_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return batch


@app.post("/api/batches/{batch_id}/submit", summary="提交批次审核")
def submit_batch(batch_id: int, operator: str = Form(...), db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    if batch.is_frozen:
        raise HTTPException(status_code=400, detail="批次已冻结，无法提交")

    if batch.status not in [RecordState.DRAFT, RecordState.REJECTED]:
        raise HTTPException(status_code=400, detail=f"当前状态 {batch.status} 不允许提交")

    try:
        records = db.query(Record).filter(Record.batch_id == batch_id).all()
        for record in records:
            if record.status in [RecordState.DRAFT, RecordState.REJECTED, RecordState.WITHDRAWN]:
                RecordStateMachine.submit(db, record, operator)

        BatchStateMachine.transition(
            db, batch, RecordState.SUBMITTED, operator,
            reason="批次提交审核", transition_type="batch_submit"
        )
        db.commit()

        return {"message": "批次提交成功", "batch_id": batch_id, "status": RecordState.SUBMITTED}
    except StateTransitionError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/batches/{batch_id}/attachments", response_model=AttachmentResponse, summary="批次附件补传")
def upload_batch_attachment(
    batch_id: int,
    file: UploadFile = File(...),
    attachment_type: AttachmentTypeEnum = Form(...),
    uploaded_by: str = Form(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    file_path = os.path.join(UPLOAD_DIR, "batches", f"{batch_id}_{datetime.now().timestamp()}_{file.filename}")
    with open(file_path, "wb") as f:
        f.write(file.file.read())

    file_size = os.path.getsize(file_path)

    attachment = BatchAttachment(
        batch_id=batch_id,
        attachment_type=attachment_type.value,
        file_name=file.filename,
        file_path=file_path,
        file_size=file_size,
        uploaded_by=uploaded_by,
        description=description
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return attachment


@app.post("/api/batches/{batch_id}/freeze", summary="冻结批次结算")
def freeze_batch(batch_id: int, request: FreezeRequest, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    if batch.is_frozen:
        raise HTTPException(status_code=400, detail="批次已处于冻结状态")

    try:
        BatchStateMachine.freeze(db, batch, request.operator, request.reason)
        db.commit()
        return {
            "message": "批次冻结成功",
            "batch_id": batch_id,
            "is_frozen": True,
            "frozen_at": batch.frozen_at,
            "frozen_by": batch.frozen_by,
            "freeze_reason": batch.freeze_reason,
            "status_before_freeze": batch.state_histories[-1].from_state if batch.state_histories else None
        }
    except StateTransitionError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/batches/{batch_id}/unfreeze", summary="解冻批次")
def unfreeze_batch(batch_id: int, request: UnfreezeRequest, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    if not batch.is_frozen:
        raise HTTPException(status_code=400, detail="批次未处于冻结状态")

    try:
        BatchStateMachine.unfreeze(db, batch, request.operator, request.reason)
        db.commit()
        return {
            "message": "批次解冻成功",
            "batch_id": batch_id,
            "is_frozen": False,
            "unfrozen_at": batch.unfrozen_at,
            "unfrozen_by": batch.unfrozen_by,
            "unfreeze_reason": batch.unfreeze_reason,
            "current_status": batch.status
        }
    except StateTransitionError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/batches/{batch_id}/archive", summary="撤回归档批次")
def archive_batch(batch_id: int, operator: str = Form(...), reason: Optional[str] = Form(None), db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    try:
        records = db.query(Record).filter(Record.batch_id == batch_id).all()
        for record in records:
            if record.status != RecordState.ARCHIVED:
                if batch.is_frozen:
                    RecordStateMachine.force_archive(
                        db, record, operator,
                        reason or f"冻结批次归档: {batch.freeze_reason}"
                    )
                else:
                    RecordStateMachine.archive(db, record, operator, reason or "批次归档")

        if batch.is_frozen:
            BatchStateMachine.force_archive(
                db, batch, operator,
                reason or "冻结批次归档"
            )
        else:
            BatchStateMachine.archive(db, batch, operator, reason)

        db.commit()

        return {"message": "批次归档成功", "batch_id": batch_id, "status": RecordState.ARCHIVED}
    except StateTransitionError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/batches/{batch_id}/export", summary="导出批次汇总")
def export_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    records = db.query(Record).filter(Record.batch_id == batch_id).all()

    approved_count = sum(1 for r in records if r.status == RecordState.APPROVED)
    rejected_count = sum(1 for r in records if r.status == RecordState.REJECTED)
    submitted_count = sum(1 for r in records if r.status == RecordState.SUBMITTED)
    frozen_count = sum(1 for r in records if r.status == RecordState.FROZEN)
    withdrawn_count = sum(1 for r in records if r.status == RecordState.WITHDRAWN)

    status_before_freeze = None
    if batch.is_frozen and batch.state_histories:
        for h in reversed(batch.state_histories):
            if h.transition_type == "freeze":
                status_before_freeze = h.from_state
                break

    record_details = []
    for record in records:
        overrides = db.query(OverrideRecord).filter(OverrideRecord.record_id == record.id).all()
        state_histories = db.query(RecordStateHistory).filter(RecordStateHistory.record_id == record.id).all()

        record_details.append({
            "record_id": record.id,
            "original_row_no": record.original_row_no,
            "work_order_no": record.work_order_no,
            "valve_code": record.valve_code,
            "valve_name": record.valve_name,
            "inventory_before": record.inventory_before,
            "used_quantity": record.used_quantity,
            "inventory_after": record.inventory_after,
            "is_negative_inventory": record.is_negative_inventory,
            "status": record.status,
            "original_status": record.original_status,
            "review_reason": record.review_reason,
            "override_count": len(overrides),
            "overrides": [
                {
                    "original_status": o.original_status,
                    "new_status": o.new_status,
                    "reason": o.override_reason,
                    "operator": o.operator,
                    "created_at": o.created_at
                }
                for o in overrides
            ],
            "state_history_count": len(state_histories)
        })

    return ExportSummaryResponse(
        batch_no=batch.batch_no,
        station=batch.station,
        operator=batch.operator,
        export_time=datetime.now(),
        total_count=batch.total_count,
        approved_count=approved_count,
        rejected_count=rejected_count,
        submitted_count=submitted_count,
        frozen_count=frozen_count,
        withdrawn_count=withdrawn_count,
        is_frozen=batch.is_frozen,
        status_before_freeze=status_before_freeze,
        freeze_reason=batch.freeze_reason,
        frozen_at=batch.frozen_at,
        frozen_by=batch.frozen_by,
        records=record_details
    )


@app.get("/api/records", response_model=List[RecordResponse], summary="查询记录列表")
def list_records(
    batch_id: Optional[int] = None,
    work_order_no: Optional[str] = None,
    status: Optional[str] = None,
    is_negative: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Record)
    if batch_id:
        query = query.filter(Record.batch_id == batch_id)
    if work_order_no:
        query = query.filter(Record.work_order_no == work_order_no)
    if status:
        query = query.filter(Record.status == status)
    if is_negative is not None:
        query = query.filter(Record.is_negative_inventory == is_negative)

    return query.order_by(Record.created_at.desc()).offset(skip).limit(limit).all()


@app.get("/api/records/{record_id}", response_model=RecordDetailResponse, summary="获取记录详情")
def get_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(Record).filter(Record.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    site_photo = db.query(RecordAttachment).filter(
        RecordAttachment.record_id == record_id,
        RecordAttachment.attachment_type == "site_photo"
    ).first()

    handover_paper = db.query(RecordAttachment).filter(
        RecordAttachment.record_id == record_id,
        RecordAttachment.attachment_type == "handover_paper"
    ).first()

    override_count = db.query(OverrideRecord).filter(OverrideRecord.record_id == record_id).count()
    state_history_count = db.query(RecordStateHistory).filter(RecordStateHistory.record_id == record_id).count()

    return RecordDetailResponse(
        id=record.id,
        batch_id=record.batch_id,
        original_row_no=record.original_row_no,
        work_order_no=record.work_order_no,
        valve_code=record.valve_code,
        valve_name=record.valve_name,
        inventory_before=record.inventory_before,
        used_quantity=record.used_quantity,
        inventory_after=record.inventory_after,
        is_negative_inventory=record.is_negative_inventory,
        repair_date=record.repair_date,
        site=record.site,
        construction_person=record.construction_person,
        status=record.status,
        original_status=record.original_status,
        review_reason=record.review_reason,
        created_at=record.created_at,
        updated_at=record.updated_at,
        has_site_photo=site_photo is not None,
        has_handover_paper=handover_paper is not None,
        override_count=override_count,
        state_history_count=state_history_count
    )


@app.post("/api/records/{record_id}/review", summary="复核改判记录")
def review_record(record_id: int, request: ReviewRequest, db: Session = Depends(get_db)):
    record = db.query(Record).filter(Record.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    batch = db.query(Batch).filter(Batch.id == record.batch_id).first()
    if batch and batch.is_frozen:
        raise HTTPException(status_code=400, detail="所属批次已冻结，无法改判")

    try:
        record, override, history = RecordStateMachine.override(
            db, record, request.new_status.value,
            request.operator, request.reason, request.permission_level
        )
        db.commit()

        return {
            "message": "复核改判成功",
            "record_id": record_id,
            "original_status": override.original_status,
            "new_status": override.new_status,
            "reason": override.override_reason,
            "operator": override.operator,
            "permission_level": override.permission_level
        }
    except StateTransitionError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/records/{record_id}/withdraw", summary="撤回记录")
def withdraw_record(record_id: int, operator: str = Form(...), reason: Optional[str] = Form(None), db: Session = Depends(get_db)):
    record = db.query(Record).filter(Record.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    batch = db.query(Batch).filter(Batch.id == record.batch_id).first()
    if batch and batch.is_frozen:
        raise HTTPException(status_code=400, detail="所属批次已冻结，无法撤回")

    try:
        record, history = RecordStateMachine.withdraw(db, record, operator, reason)
        db.commit()

        return {
            "message": "记录撤回成功",
            "record_id": record_id,
            "status": record.status,
            "withdrawn_by": operator,
            "reason": reason
        }
    except StateTransitionError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/records/{record_id}/attachments", response_model=AttachmentResponse, summary="记录附件补传")
def upload_record_attachment(
    record_id: int,
    file: UploadFile = File(...),
    attachment_type: AttachmentTypeEnum = Form(...),
    uploaded_by: str = Form(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    record = db.query(Record).filter(Record.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    batch = db.query(Batch).filter(Batch.id == record.batch_id).first()
    if batch and batch.is_frozen:
        raise HTTPException(status_code=400, detail="所属批次已冻结，无法上传附件")

    file_path = os.path.join(UPLOAD_DIR, "attachments", f"{record_id}_{datetime.now().timestamp()}_{file.filename}")
    with open(file_path, "wb") as f:
        f.write(file.file.read())

    file_size = os.path.getsize(file_path)

    attachment = RecordAttachment(
        record_id=record_id,
        attachment_type=attachment_type.value,
        file_name=file.filename,
        file_path=file_path,
        file_size=file_size,
        uploaded_by=uploaded_by,
        description=description
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return attachment


@app.get("/api/records/{record_id}/attachments", response_model=List[AttachmentResponse], summary="获取记录附件列表")
def get_record_attachments(record_id: int, db: Session = Depends(get_db)):
    record = db.query(Record).filter(Record.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    return db.query(RecordAttachment).filter(RecordAttachment.record_id == record_id).all()


@app.get("/api/records/{record_id}/history", response_model=List[StateHistoryResponse], summary="获取记录状态历史")
def get_record_history(record_id: int, db: Session = Depends(get_db)):
    record = db.query(Record).filter(Record.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    return db.query(RecordStateHistory).filter(RecordStateHistory.record_id == record_id).order_by(RecordStateHistory.created_at).all()


@app.get("/api/records/{record_id}/overrides", response_model=List[OverrideRecordResponse], summary="获取记录改判历史")
def get_record_overrides(record_id: int, db: Session = Depends(get_db)):
    record = db.query(Record).filter(Record.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    return db.query(OverrideRecord).filter(OverrideRecord.record_id == record_id).order_by(OverrideRecord.created_at).all()


@app.get("/api/batches/{batch_id}/failed-records", response_model=List[dict], summary="获取批次失败记录清单")
def get_failed_records(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    records = db.query(Record).filter(
        Record.batch_id == batch_id,
        Record.status.in_([RecordState.REJECTED, RecordState.WITHDRAWN])
    ).all()

    result = []
    for record in records:
        latest_history = db.query(RecordStateHistory).filter(
            RecordStateHistory.record_id == record.id
        ).order_by(RecordStateHistory.created_at.desc()).first()

        result.append({
            "record_id": record.id,
            "original_row_no": record.original_row_no,
            "work_order_no": record.work_order_no,
            "valve_code": record.valve_code,
            "status": record.status,
            "failure_reason": latest_history.reason if latest_history else None,
            "failed_at": latest_history.created_at if latest_history else None,
            "operator": latest_history.operator if latest_history else None
        })

    return result


@app.get("/api/health", summary="健康检查")
def health_check():
    return {"status": "healthy", "service": "水务抢修材料异常回执状态机 API", "timestamp": datetime.now()}
