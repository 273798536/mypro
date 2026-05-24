import uuid
import os
from datetime import datetime
from typing import List, Optional
from io import BytesIO

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import engine, get_db
from models import (
    Batch, AbnormalRecord, RecordState, BatchState, DataSource,
    Attachment, OriginalFile
)
from schemas import (
    BatchCreate, BatchUpdate, BatchResponse, BatchDetailResponse,
    AbnormalRecordResponse, AbnormalRecordDetailResponse,
    AbnormalRecordUpdate, ReviewRequest, OverrideRequest,
    StateChangeRequest, ImportResult, ExportSummary
)
from state_machine import (
    transition_record_state, transition_batch_state,
    InvalidStateTransitionError
)
from import_service import import_file_to_batch, ImportError
from export_service import generate_export_summary, export_to_excel
from models import Base
from permissions import check_permission

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="会议室占用异常回执状态机 API",
    description="处理预约日历、门禁刷卡、临时取消消息等数据的异常回执状态管理系统",
    version="1.0.0"
)

UPLOAD_DIR = "attachments"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def generate_batch_id() -> str:
    return f"BATCH_{uuid.uuid4().hex[:8].upper()}"


@app.post("/api/batches", response_model=BatchResponse, tags=["批次管理"])
def create_batch(batch_data: BatchCreate, db: Session = Depends(get_db)):
    try:
        check_permission(batch_data.created_by, "batch:create")
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    batch_id = generate_batch_id()
    batch = Batch(
        id=batch_id,
        name=batch_data.name,
        description=batch_data.description,
        created_by=batch_data.created_by,
        state=BatchState.CREATED
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


@app.get("/api/batches", response_model=List[BatchResponse], tags=["批次管理"])
def list_batches(
    state: Optional[BatchState] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Batch)
    if state:
        query = query.filter(Batch.state == state)
    return query.order_by(Batch.created_at.desc()).offset(skip).limit(limit).all()


@app.get("/api/batches/{batch_id}", response_model=BatchDetailResponse, tags=["批次管理"])
def get_batch(batch_id: str, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    return BatchDetailResponse(
        id=batch.id,
        name=batch.name,
        description=batch.description,
        created_by=batch.created_by,
        state=batch.state,
        created_at=batch.created_at,
        updated_at=batch.updated_at,
        frozen_at=batch.frozen_at,
        frozen_by=batch.frozen_by,
        frozen_reason=batch.frozen_reason,
        settled_at=batch.settled_at,
        settled_by=batch.settled_by,
        extra_data=batch.extra_data or {},
        record_count=len(batch.records),
        state_logs=batch.state_logs,
        original_files=batch.original_files
    )


@app.post("/api/batches/{batch_id}/import", response_model=ImportResult, tags=["数据导入"])
def import_batch_data(
    batch_id: str,
    file: UploadFile = File(...),
    source_type: DataSource = Form(...),
    uploaded_by: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        check_permission(uploaded_by, "import:data")
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    try:
        content = file.file.read()
        result = import_file_to_batch(
            db, batch_id, content, file.filename, source_type, uploaded_by
        )
        return result
    except ImportError as e:
        raise HTTPException(status_code=400, detail=e.message)


@app.get("/api/batches/{batch_id}/records", response_model=List[AbnormalRecordResponse], tags=["记录管理"])
def list_batch_records(
    batch_id: str,
    state: Optional[RecordState] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    query = db.query(AbnormalRecord).filter(AbnormalRecord.batch_id == batch_id)
    if state:
        query = query.filter(AbnormalRecord.state == state)
    return query.order_by(AbnormalRecord.created_at.desc()).offset(skip).limit(limit).all()


@app.get("/api/records/{record_id}", response_model=AbnormalRecordDetailResponse, tags=["记录管理"])
def get_record(record_id: str, db: Session = Depends(get_db)):
    record = db.query(AbnormalRecord).filter(AbnormalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    return record


@app.get("/api/batches/{batch_id}/records-by-appointment", tags=["记录管理"])
def get_records_by_appointment(batch_id: str, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    records = db.query(AbnormalRecord).filter(AbnormalRecord.batch_id == batch_id).all()

    grouped = {}
    for record in records:
        appt_id = record.appointment_id or f"unknown_{record.id}"
        if appt_id not in grouped:
            grouped[appt_id] = {
                "appointment_id": record.appointment_id,
                "room_code": record.room_code,
                "appointment_date": record.appointment_date.isoformat() if record.appointment_date else None,
                "sources": {},
                "record_ids": []
            }
        grouped[appt_id]["sources"][record.source.value] = {
            "record_id": record.id,
            "state": record.state.value,
            "has_access": record.has_access_record,
            "has_cancel": record.has_cancel_message,
            "booker": record.booker,
            "cost": record.actual_cost or record.estimated_cost
        }
        grouped[appt_id]["record_ids"].append(record.id)

    return {
        "batch_id": batch_id,
        "total_groups": len(grouped),
        "total_records": len(records),
        "groups": list(grouped.values())
    }


@app.patch("/api/records/{record_id}", response_model=AbnormalRecordResponse, tags=["记录管理"])
def update_record(
    record_id: str,
    update_data: AbnormalRecordUpdate,
    db: Session = Depends(get_db)
):
    record = db.query(AbnormalRecord).filter(AbnormalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(record, field, value)

    record.updated_at = datetime.now()
    db.commit()
    db.refresh(record)
    return record


@app.post("/api/records/submit-review", tags=["复核管理"])
def submit_for_review(request: ReviewRequest, db: Session = Depends(get_db)):
    try:
        check_permission(request.operator, "record:submit")
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    results = []
    for record_id in request.record_ids:
        record = db.query(AbnormalRecord).filter(AbnormalRecord.id == record_id).first()
        if not record:
            results.append({"id": record_id, "success": False, "error": "记录不存在"})
            continue

        try:
            transition_record_state(
                db, record, RecordState.PENDING_REVIEW, request.operator, request.reason
            )
            db.commit()
            results.append({"id": record_id, "success": True, "new_state": RecordState.PENDING_REVIEW.value})
        except InvalidStateTransitionError as e:
            results.append({"id": record_id, "success": False, "error": str(e)})

    return {"results": results}


@app.post("/api/records/review", tags=["复核管理"])
def review_records(request: ReviewRequest, db: Session = Depends(get_db)):
    try:
        check_permission(request.operator, "record:review")
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    results = []
    target_state = RecordState.APPROVED if request.approved else RecordState.REJECTED

    for record_id in request.record_ids:
        record = db.query(AbnormalRecord).filter(AbnormalRecord.id == record_id).first()
        if not record:
            results.append({"id": record_id, "success": False, "error": "记录不存在"})
            continue

        try:
            transition_record_state(
                db, record, target_state, request.operator, request.reason
            )
            record.reviewer = request.operator
            record.review_time = datetime.now()
            record.review_reason = request.reason
            db.commit()
            results.append({"id": record_id, "success": True, "new_state": target_state.value})
        except InvalidStateTransitionError as e:
            results.append({"id": record_id, "success": False, "error": str(e)})

    return {"results": results}


@app.post("/api/records/{record_id}/override", tags=["复核管理"])
def override_record(
    record_id: str,
    request: OverrideRequest,
    db: Session = Depends(get_db)
):
    try:
        check_permission(request.operator, "record:override")
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    record = db.query(AbnormalRecord).filter(AbnormalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    try:
        transition_record_state(
            db, record, request.new_state, request.operator, request.reason,
            force=True, log_data={"manual_override": True}
        )
        record.manual_override = True
        record.override_reason = request.reason
        record.override_by = request.operator
        record.override_time = datetime.now()
        if request.remark:
            record.final_remark = request.remark
        db.commit()
        db.refresh(record)
        return {"success": True, "record_id": record_id, "new_state": request.new_state.value}
    except InvalidStateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/records/{record_id}/attachments", tags=["附件管理"])
def upload_attachment(
    record_id: str,
    file: UploadFile = File(...),
    uploaded_by: str = Form(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    try:
        check_permission(uploaded_by, "attachment:upload")
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    record = db.query(AbnormalRecord).filter(AbnormalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    file_ext = os.path.splitext(file.filename)[1]
    stored_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, stored_filename)

    content = file.file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    attachment = Attachment(
        record_id=record_id,
        file_name=file.filename,
        file_path=file_path,
        file_type=file.content_type,
        file_size=len(content),
        uploaded_by=uploaded_by,
        description=description
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return {"id": attachment.id, "file_name": attachment.file_name, "uploaded_at": attachment.uploaded_at}


@app.post("/api/batches/{batch_id}/freeze", tags=["批次状态管理"])
def freeze_batch(
    batch_id: str,
    request: StateChangeRequest,
    db: Session = Depends(get_db)
):
    try:
        check_permission(request.operator, "batch:freeze")
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    try:
        transition_batch_state(
            db, batch, BatchState.FROZEN, request.operator, request.reason
        )
        batch.frozen_at = datetime.now()
        batch.frozen_by = request.operator
        batch.frozen_reason = request.reason
        db.commit()
        db.refresh(batch)
        return {"success": True, "batch_id": batch_id, "state": BatchState.FROZEN.value}
    except InvalidStateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/batches/{batch_id}/settle", tags=["批次状态管理"])
def settle_batch(
    batch_id: str,
    request: StateChangeRequest,
    db: Session = Depends(get_db)
):
    try:
        check_permission(request.operator, "batch:settle")
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    try:
        transition_batch_state(
            db, batch, BatchState.SETTLED, request.operator, request.reason
        )
        batch.settled_at = datetime.now()
        batch.settled_by = request.operator
        db.commit()
        db.refresh(batch)
        return {"success": True, "batch_id": batch_id, "state": BatchState.SETTLED.value}
    except InvalidStateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/batches/{batch_id}/recall", tags=["批次状态管理"])
def recall_batch(
    batch_id: str,
    request: StateChangeRequest,
    db: Session = Depends(get_db)
):
    try:
        check_permission(request.operator, "batch:recall")
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    try:
        transition_batch_state(
            db, batch, BatchState.RECALLED, request.operator, request.reason
        )
        db.commit()
        db.refresh(batch)
        return {"success": True, "batch_id": batch_id, "state": BatchState.RECALLED.value}
    except InvalidStateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/batches/{batch_id}/archive", tags=["批次状态管理"])
def archive_batch(
    batch_id: str,
    request: StateChangeRequest,
    db: Session = Depends(get_db)
):
    try:
        check_permission(request.operator, "batch:archive")
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    try:
        transition_batch_state(
            db, batch, BatchState.ARCHIVED, request.operator, request.reason
        )
        db.commit()
        db.refresh(batch)
        return {"success": True, "batch_id": batch_id, "state": BatchState.ARCHIVED.value}
    except InvalidStateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/batches/{batch_id}/unfreeze", tags=["批次状态管理"])
def unfreeze_batch(
    batch_id: str,
    request: StateChangeRequest,
    db: Session = Depends(get_db)
):
    try:
        check_permission(request.operator, "batch:unfreeze")
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    if batch.state != BatchState.FROZEN:
        raise HTTPException(status_code=400, detail="批次未处于冻结状态")

    try:
        transition_batch_state(
            db, batch, BatchState.PENDING_REVIEW, request.operator, request.reason
        )
        db.commit()
        db.refresh(batch)
        return {"success": True, "batch_id": batch_id, "state": BatchState.PENDING_REVIEW.value}
    except InvalidStateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/batches/{batch_id}/export/summary", response_model=ExportSummary, tags=["导出管理"])
def get_export_summary(
    batch_id: str,
    exported_by: str = Query(...),
    db: Session = Depends(get_db)
):
    try:
        check_permission(exported_by, "export:data")
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    try:
        return generate_export_summary(db, batch_id, exported_by)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/batches/{batch_id}/export/excel", tags=["导出管理"])
def export_batch_excel(
    batch_id: str,
    exported_by: str = Query(...),
    db: Session = Depends(get_db)
):
    try:
        check_permission(exported_by, "export:data")
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

    try:
        import urllib.parse
        summary = generate_export_summary(db, batch_id, exported_by)
        excel_content = export_to_excel(summary)
        filename = f"异常回执报告_{batch_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
        encoded_filename = urllib.parse.quote(filename)

        return StreamingResponse(
            BytesIO(excel_content),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/stats/overview", tags=["统计分析"])
def get_overview_stats(db: Session = Depends(get_db)):
    total_batches = db.query(Batch).count()
    total_records = db.query(AbnormalRecord).count()

    batch_stats = {}
    for state in BatchState:
        count = db.query(Batch).filter(Batch.state == state).count()
        batch_stats[state.value] = count

    record_stats = {}
    for state in RecordState:
        count = db.query(AbnormalRecord).filter(AbnormalRecord.state == state).count()
        record_stats[state.value] = count

    manual_override_count = db.query(AbnormalRecord).filter(
        AbnormalRecord.manual_override == True
    ).count()

    return {
        "total_batches": total_batches,
        "total_records": total_records,
        "batch_stats": batch_stats,
        "record_stats": record_stats,
        "manual_override_count": manual_override_count
    }


@app.get("/api/health", tags=["系统"])
def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}
