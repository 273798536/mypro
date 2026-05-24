from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Query, Body
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os

from app.database import get_db, engine, Base, settings
from app.enums import BatchStatus, TaskStatus, TaskType, AttachmentType, DuplicateStrategy
from app.schemas import (
    Batch, BatchCreate, BatchUpdate, BatchReview, BatchFreeze, BatchCancel,
    BatchWithDetails, BatchList,
    WorkOrder, WorkOrderCreate, WorkOrderUpdate,
    Attachment, AttachmentCreate,
    ChangeLog,
    AsyncTask,
    ExportRequest,
)
from app.services import (
    batch_service,
    attachment_service,
    change_log_service,
    task_service,
    export_service,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="城市照明抢修异常回执状态机 API",
    description="处理同一路段反复熄灯工单的状态追踪和复核依据管理",
    version="1.0.0",
)


@app.get("/")
def root():
    return {
        "service": "城市照明抢修异常回执状态机服务",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/stats")
def get_statistics(db: Session = Depends(get_db)):
    return export_service.get_statistics(db)


@app.post("/batches", response_model=Batch, status_code=201)
def create_batch(batch_data: BatchCreate, db: Session = Depends(get_db)):
    try:
        return batch_service.create_batch(db, batch_data, created_by=batch_data.operator)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/batches", response_model=List[BatchList])
def list_batches(
    skip: int = 0,
    limit: int = 100,
    status: Optional[BatchStatus] = None,
    road_section: Optional[str] = None,
    db: Session = Depends(get_db),
):
    batches, total = batch_service.get_batches(db, skip, limit, status, road_section)
    return batches


@app.get("/batches/{batch_id}", response_model=BatchWithDetails)
def get_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = batch_service.get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return batch


@app.put("/batches/{batch_id}", response_model=Batch)
def update_batch(batch_id: int, batch_data: BatchUpdate, db: Session = Depends(get_db)):
    try:
        return batch_service.update_batch(db, batch_id, batch_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/batches/{batch_id}", status_code=204)
def delete_batch(batch_id: int, db: Session = Depends(get_db)):
    try:
        success = batch_service.delete_batch(db, batch_id)
        if not success:
            raise HTTPException(status_code=404, detail="批次不存在")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/batches/{batch_id}/submit", response_model=Batch)
def submit_batch(batch_id: int, db: Session = Depends(get_db)):
    try:
        return batch_service.submit_for_review(db, batch_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/batches/{batch_id}/review", response_model=Batch)
def review_batch(batch_id: int, review_data: BatchReview, db: Session = Depends(get_db)):
    try:
        return batch_service.review_batch(db, batch_id, review_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/batches/{batch_id}/freeze", response_model=Batch)
def freeze_batch(batch_id: int, freeze_data: BatchFreeze, db: Session = Depends(get_db)):
    try:
        return batch_service.freeze_batch(db, batch_id, freeze_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/batches/{batch_id}/unfreeze", response_model=Batch)
def unfreeze_batch(batch_id: int, db: Session = Depends(get_db)):
    try:
        return batch_service.unfreeze_batch(db, batch_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/batches/{batch_id}/settle", response_model=Batch)
def settle_batch(batch_id: int, db: Session = Depends(get_db)):
    try:
        return batch_service.settle_batch(db, batch_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/batches/{batch_id}/archive", response_model=Batch)
def archive_batch(batch_id: int, db: Session = Depends(get_db)):
    try:
        return batch_service.archive_batch(db, batch_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/batches/{batch_id}/cancel", response_model=Batch)
def cancel_batch(batch_id: int, cancel_data: BatchCancel, db: Session = Depends(get_db)):
    try:
        return batch_service.cancel_batch(db, batch_id, cancel_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/batches/{batch_id}/work-orders")
def add_work_orders(
    batch_id: int,
    work_orders: List[WorkOrderCreate],
    duplicate_strategy: DuplicateStrategy = DuplicateStrategy.IGNORE,
    db: Session = Depends(get_db),
):
    try:
        results, added, skipped = batch_service.add_work_orders(
            db, batch_id, work_orders, duplicate_strategy
        )
        return {"added": added, "skipped": skipped, "work_orders": results}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/batches/{batch_id}/work-orders", response_model=List[WorkOrder])
def list_work_orders(batch_id: int, db: Session = Depends(get_db)):
    batch = batch_service.get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return batch.work_orders


@app.get("/batches/{batch_id}/change-logs", response_model=List[ChangeLog])
def list_batch_change_logs(batch_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return change_log_service.get_change_logs_by_batch(db, batch_id, skip, limit)


@app.post("/batches/{batch_id}/attachments", response_model=Attachment, status_code=201)
async def upload_batch_attachment(
    batch_id: int,
    file: UploadFile = File(...),
    file_type: AttachmentType = AttachmentType.OTHER,
    description: Optional[str] = None,
    uploaded_by: Optional[str] = None,
    db: Session = Depends(get_db),
):
    batch = batch_service.get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    content = await file.read()
    file_path = attachment_service.save_uploaded_file(content, file.filename, batch_id=batch_id)

    attachment_data = AttachmentCreate(
        file_name=file.filename,
        file_path=file_path,
        file_size=len(content),
        file_type=file_type,
        description=description,
        uploaded_by=uploaded_by,
    )

    return attachment_service.create_attachment(db, attachment_data, batch_id=batch_id)


@app.get("/batches/{batch_id}/attachments", response_model=List[Attachment])
def list_batch_attachments(batch_id: int, file_type: Optional[AttachmentType] = None, db: Session = Depends(get_db)):
    return attachment_service.get_attachments_by_batch(db, batch_id, file_type)


@app.delete("/attachments/{attachment_id}", status_code=204)
def delete_attachment(attachment_id: int, db: Session = Depends(get_db)):
    try:
        success = attachment_service.delete_attachment(db, attachment_id)
        if not success:
            raise HTTPException(status_code=404, detail="附件不存在")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/export")
def export_batches(export_request: ExportRequest, db: Session = Depends(get_db)):
    try:
        filepath = export_service.export_batch_summary(
            db,
            batch_ids=export_request.batch_ids,
            include_frozen=export_request.include_frozen,
            include_change_logs=export_request.include_change_logs,
            format=export_request.format,
        )
        filename = os.path.basename(filepath)
        return {"filepath": filepath, "filename": filename}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/export/download/{filename}")
def download_export(filename: str):
    filepath = os.path.join(settings.EXPORT_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(filepath, filename=filename)


@app.post("/tasks", response_model=AsyncTask, status_code=201)
def create_task(task_type: TaskType, batch_id: Optional[int] = None, db: Session = Depends(get_db)):
    return task_service.create_task(db, task_type, batch_id)


@app.get("/tasks", response_model=List[AsyncTask])
def list_tasks(
    status: Optional[TaskStatus] = None,
    task_type: Optional[TaskType] = None,
    batch_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return task_service.get_tasks(db, status, task_type, batch_id, skip, limit)


@app.get("/tasks/{task_id}", response_model=AsyncTask)
def get_task(task_id: str, db: Session = Depends(get_db)):
    task = task_service.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@app.post("/tasks/{task_id}/retry", response_model=AsyncTask)
def retry_task(task_id: str, reset_retries: bool = False, db: Session = Depends(get_db)):
    try:
        return task_service.retry_task(db, task_id, reset_retries)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/tasks/{task_id}/manual", response_model=AsyncTask)
def mark_task_manual(task_id: str, message: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        return task_service.mark_task_manual(db, task_id, message)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/change-logs", response_model=List[ChangeLog])
def list_all_change_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return change_log_service.get_all_change_logs(db, skip, limit)
