import uuid
import shutil
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, Request, File, UploadFile, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .database import get_db, init_db
from .models import Batch, BatchStatus, AsyncTask, TaskStatus, Attachment
from .schemas import (
    BatchCreate, BatchUpdate, Batch as BatchSchema, BatchList,
    PaginatedResponse, StatusTransition, FreezeRequest, UnfreezeRequest,
    BatchDataAppend, ExportRequest, ExportResponse,
    TaskRetryRequest, TaskResolveRequest, AsyncTask as TaskSchema,
    AsyncTaskCreate
)
from .state_machine import StateMachine, StateTransitionError
from .audit_service import AuditService
from .task_processor import TaskProcessor
from .export_service import ExportService
from .task_handlers import register_handlers
from .config import settings

app = FastAPI(title="跨境小包清关异常回执状态机 API", version="1.0.0")


@app.on_event("startup")
def on_startup():
    init_db()


def get_task_processor(db: Session = Depends(get_db)) -> TaskProcessor:
    tp = TaskProcessor(db)
    register_handlers(tp)
    return tp


@app.get("/")
def root():
    return {
        "service": "customs-clearance-statemachine",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/batches", response_model=PaginatedResponse)
def list_batches(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[BatchStatus] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Batch)

    if status:
        query = query.filter(Batch.status == status)

    total = query.count()
    batches = query.order_by(Batch.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": batches
    }


@app.post("/batches", response_model=dict)
def create_batch(batch_data: BatchCreate, db: Session = Depends(get_db)):
    sm = StateMachine(db)
    try:
        batch, stats = sm.create_batch(batch_data)
        return {
            "batch_id": batch.id,
            "batch_no": batch.batch_no,
            "status": batch.status.value,
            "operation": stats
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/batches/{batch_id}", response_model=BatchSchema)
def get_batch(batch_id: str, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


@app.patch("/batches/{batch_id}", response_model=BatchSchema)
def update_batch(
    batch_id: str,
    update_data: BatchUpdate,
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    for key, value in update_data.model_dump(exclude_unset=True).items():
        setattr(batch, key, value)

    batch.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(batch)
    return batch


@app.post("/batches/{batch_id}/transition", response_model=BatchSchema)
def transition_status(
    batch_id: str,
    transition: StatusTransition,
    request: Request,
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    sm = StateMachine(db)
    try:
        batch = sm.transition(
            batch=batch,
            target_status=transition.target_status,
            changed_by=transition.changed_by,
            reason=transition.reason
        )
        db.commit()
        db.refresh(batch)
        return batch
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/batches/{batch_id}/freeze", response_model=BatchSchema)
def freeze_batch(
    batch_id: str,
    freeze_req: FreezeRequest,
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    sm = StateMachine(db)
    try:
        batch = sm.freeze_settlement(
            batch=batch,
            frozen_by=freeze_req.frozen_by,
            frozen_reason=freeze_req.frozen_reason
        )
        db.commit()
        db.refresh(batch)
        return batch
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/batches/{batch_id}/unfreeze", response_model=BatchSchema)
def unfreeze_batch(
    batch_id: str,
    unfreeze_req: UnfreezeRequest,
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    sm = StateMachine(db)
    try:
        batch = sm.unfreeze_settlement(
            batch=batch,
            unfrozen_by=unfreeze_req.unfrozen_by,
            reason=unfreeze_req.reason
        )
        db.commit()
        db.refresh(batch)
        return batch
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/batches/{batch_id}/archive", response_model=BatchSchema)
def archive_batch(
    batch_id: str,
    request: dict,
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    sm = StateMachine(db)
    try:
        batch = sm.archive(
            batch=batch,
            archived_by=request.get("archived_by", "system"),
            reason=request.get("reason")
        )
        db.commit()
        db.refresh(batch)
        return batch
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/batches/{batch_id}/cancel", response_model=BatchSchema)
def cancel_batch(
    batch_id: str,
    request: dict,
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    sm = StateMachine(db)
    try:
        batch = sm.cancel(
            batch=batch,
            cancelled_by=request.get("cancelled_by", "system"),
            reason=request.get("reason")
        )
        db.commit()
        db.refresh(batch)
        return batch
    except StateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/batches/{batch_id}/append", response_model=dict)
def append_batch_data(
    batch_id: str,
    data: BatchDataAppend,
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    sm = StateMachine(db)
    stats = sm.append_data(batch, data)
    return stats


@app.get("/batches/{batch_id}/history")
def get_batch_history(
    batch_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    audit = AuditService(db)
    return audit.get_changes_summary(batch_id)


@app.post("/batches/{batch_id}/export", response_model=ExportResponse)
def export_batch(
    batch_id: str,
    export_req: ExportRequest,
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    export_service = ExportService(db)
    result = export_service.export_to_excel(
        batch=batch,
        include_history=export_req.include_history,
        include_packages=export_req.include_packages
    )
    return result


@app.get("/batches/{batch_id}/export/download")
def download_export(
    batch_id: str,
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    export_service = ExportService(db)
    result = export_service.export_to_excel(batch=batch)

    return FileResponse(
        path=result["file_path"],
        filename=result["file_name"],
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@app.get("/tasks", response_model=List[TaskSchema])
def list_tasks(
    status: Optional[TaskStatus] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AsyncTask)
    if status:
        query = query.filter(AsyncTask.status == status)
    return query.order_by(AsyncTask.queued_at.desc()).all()


@app.get("/tasks/manual", response_model=List[TaskSchema])
def get_manual_tasks(tp: TaskProcessor = Depends(get_task_processor)):
    return tp.get_manual_tasks()


@app.post("/tasks", response_model=TaskSchema)
def create_task(
    task_data: AsyncTaskCreate,
    tp: TaskProcessor = Depends(get_task_processor)
):
    """创建异步任务
    任务类型: tax_calculation, abnormal_detection, data_reconciliation, export_generation
    """
    valid_task_types = ["tax_calculation", "abnormal_detection", "data_reconciliation", "export_generation"]
    if task_data.task_type not in valid_task_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid task type. Must be one of: {valid_task_types}"
        )

    payload = task_data.payload or {"batch_id": task_data.batch_id}
    return tp.create_task(
        batch_id=task_data.batch_id,
        task_type=task_data.task_type,
        created_by=task_data.created_by,
        payload=payload,
        max_retries=task_data.max_retries
    )


@app.post("/tasks/{task_id}/retry", response_model=TaskSchema)
def retry_task(
    task_id: str,
    retry_req: TaskRetryRequest,
    tp: TaskProcessor = Depends(get_task_processor)
):
    task = tp.db.query(AsyncTask).filter(AsyncTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    try:
        return tp.retry_task(task, retry_req.retried_by, retry_req.reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/tasks/{task_id}/resolve", response_model=TaskSchema)
def resolve_manual_task(
    task_id: str,
    resolve_req: TaskResolveRequest,
    tp: TaskProcessor = Depends(get_task_processor)
):
    task = tp.db.query(AsyncTask).filter(AsyncTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    try:
        return tp.resolve_manual_task(
            task, resolve_req.resolved_by, resolve_req.resolution, resolve_req.result
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/tasks/process", response_model=dict)
def process_pending_tasks(tp: TaskProcessor = Depends(get_task_processor)):
    count = tp.run_once()
    return {"processed_tasks": count}


@app.post("/tasks/recover", response_model=dict)
def recover_stuck_tasks(tp: TaskProcessor = Depends(get_task_processor)):
    count = tp.recover_tasks()
    return {"recovered_tasks": count}


@app.post("/batches/{batch_id}/attachments")
def upload_attachment(
    batch_id: str,
    file: UploadFile = File(...),
    uploaded_by: str = Form(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """补传附件到批次"""
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    upload_dir = settings.DATA_DIR / "attachments" / batch_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_ext = Path(file.filename).suffix if file.filename else ""
    dest_path = upload_dir / f"{uuid.uuid4().hex}{file_ext}"

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = dest_path.stat().st_size
    file_type = file.content_type or file_ext.lstrip('.') or "application/octet-stream"

    attachment = Attachment(
        id=str(uuid.uuid4()),
        batch_id=batch_id,
        file_name=file.filename or "unknown",
        file_type=file_type,
        file_size=file_size,
        file_path=str(dest_path),
        uploaded_by=uploaded_by,
        uploaded_at=datetime.utcnow(),
        description=description
    )
    db.add(attachment)

    audit = AuditService(db)
    audit.log_action(
        batch_id=batch_id,
        action="attachment_uploaded",
        old_status=batch.status.value,
        new_status=batch.status.value,
        changed_by=uploaded_by,
        reason=f"上传附件: {file.filename}",
        changes={
            "file_name": file.filename,
            "file_size": file_size,
            "description": description
        }
    )

    if batch.status == BatchStatus.CREATED:
        sm = StateMachine(db)
        sm.transition(
            batch=batch,
            target_status=BatchStatus.ATTACHMENTS_UPLOADED,
            changed_by=uploaded_by,
            reason="附件补传完成"
        )

    db.commit()
    db.refresh(attachment)

    return {
        "id": attachment.id,
        "file_name": attachment.file_name,
        "file_size": attachment.file_size,
        "uploaded_at": attachment.uploaded_at
    }


@app.get("/batches/{batch_id}/attachments")
def list_attachments(batch_id: str, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    return [
        {
            "id": att.id,
            "file_name": att.file_name,
            "file_type": att.file_type,
            "file_size": att.file_size,
            "uploaded_by": att.uploaded_by,
            "uploaded_at": att.uploaded_at,
            "description": att.description
        }
        for att in batch.attachments
    ]


@app.get("/batches/{batch_id}/attachments/{attachment_id}/download")
def download_attachment(
    batch_id: str,
    attachment_id: str,
    db: Session = Depends(get_db)
):
    attachment = (
        db.query(Attachment)
        .filter(Attachment.id == attachment_id, Attachment.batch_id == batch_id)
        .first()
    )
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    if not Path(attachment.file_path).exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=attachment.file_path,
        filename=attachment.file_name,
        media_type=attachment.file_type or "application/octet-stream"
    )
