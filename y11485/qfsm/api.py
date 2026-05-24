from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from .database import get_db, init_db
from .models import BatchStatus, TaskStatus
from .schemas import (
    QualityBatch,
    QualityBatchCreate,
    QualityBatchDetail,
    ReviewRequest,
    FreezeRequest,
    UnfreezeRequest,
    ArchiveRequest,
    BatchHistory,
    HistoryDiffResponse,
    AsyncTask,
    AsyncTaskCreate,
    BatchListResponse,
    InspectionSheet,
    InspectionSheetCreate,
    ReworkOrder,
    ReworkOrderCreate,
    MachineShift,
    MachineShiftCreate,
    PriceAdjustment,
    PriceAdjustmentCreate,
    BatchAttachment,
    BatchAttachmentCreate,
    ExportRequest,
    ExportResponse,
    TaskFailRequest,
    TaskManualRequest,
    TaskCompleteRequest,
    TaskRetryRequest,
    ProcessTasksResponse,
)
from .services import BatchService, SourceDataService, AsyncTaskService, ExportService

app = FastAPI(
    title="小厂质检返工异常回执状态机 API",
    description="质检返工异常状态管理系统，支持批次创建、复核改判、冻结结算、撤回归档等核心功能",
    version="0.1.0",
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
def root():
    return {
        "name": "小厂质检返工异常回执状态机 API",
        "version": "0.1.0",
        "status": "running",
    }


@app.post("/api/batches", response_model=QualityBatch, status_code=201)
def create_batch(batch_data: QualityBatchCreate, db: Session = Depends(get_db)):
    service = BatchService(db)
    batch = service.create_batch(batch_data)
    return batch


@app.get("/api/batches", response_model=BatchListResponse)
def list_batches(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[BatchStatus] = None,
    batch_no: Optional[str] = None,
    db: Session = Depends(get_db),
):
    service = BatchService(db)
    total, batches = service.list_batches(skip=skip, limit=limit, status=status, batch_no=batch_no)
    return BatchListResponse(total=total, items=batches)


@app.get("/api/batches/{batch_id}", response_model=QualityBatchDetail)
def get_batch(batch_id: str, db: Session = Depends(get_db)):
    service = BatchService(db)
    batch = service.get_batch(batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    sources_detail = []
    for source in batch.sources:
        detail = {
            "id": source.id,
            "source_type": source.source_type,
            "source_data": source.source_data,
            "created_at": source.created_at,
        }
        if source.inspection:
            detail["inspection"] = {
                "batch_no": source.inspection.batch_no,
                "product_code": source.inspection.product_code,
                "pass_rate": source.inspection.pass_rate,
            }
        if source.rework:
            detail["rework"] = {
                "rework_no": source.rework.rework_no,
                "rework_pass_rate": source.rework.rework_pass_rate,
            }
        sources_detail.append(detail)

    result = QualityBatchDetail.model_validate(batch)
    result.sources_detail = sources_detail
    return result


@app.post("/api/batches/{batch_id}/submit-review", response_model=QualityBatch)
def submit_for_review(
    batch_id: str, operator: Optional[str] = None, db: Session = Depends(get_db)
):
    service = BatchService(db)
    batch = service.submit_for_review(batch_id, operator)
    if not batch:
        raise HTTPException(status_code=400, detail="提交失败，批次状态不正确")
    return batch


@app.post("/api/batches/{batch_id}/review", response_model=QualityBatch)
def review_batch(
    batch_id: str, review_data: ReviewRequest, db: Session = Depends(get_db)
):
    service = BatchService(db)
    batch = service.review_batch(batch_id, review_data)
    if not batch:
        raise HTTPException(status_code=400, detail="复核失败，批次状态不正确")
    return batch


@app.post("/api/batches/{batch_id}/freeze", response_model=QualityBatch)
def freeze_batch(
    batch_id: str, freeze_data: FreezeRequest, db: Session = Depends(get_db)
):
    service = BatchService(db)
    batch = service.freeze_batch(batch_id, freeze_data)
    if not batch:
        raise HTTPException(status_code=400, detail="冻结失败，批次状态不正确")
    return batch


@app.post("/api/batches/{batch_id}/unfreeze", response_model=QualityBatch)
def unfreeze_batch(
    batch_id: str, unfreeze_data: UnfreezeRequest, db: Session = Depends(get_db)
):
    service = BatchService(db)
    batch = service.unfreeze_batch(batch_id, unfreeze_data)
    if not batch:
        raise HTTPException(status_code=400, detail="解冻失败，批次状态不正确")
    return batch


@app.post("/api/batches/{batch_id}/archive", response_model=QualityBatch)
def archive_batch(
    batch_id: str, archive_data: ArchiveRequest, db: Session = Depends(get_db)
):
    service = BatchService(db)
    batch = service.archive_batch(batch_id, archive_data)
    if not batch:
        raise HTTPException(status_code=400, detail="归档失败，批次状态不正确")
    return batch


@app.post("/api/batches/{batch_id}/attachments", response_model=BatchAttachment, status_code=201)
def add_attachment(
    batch_id: str,
    attachment_data: BatchAttachmentCreate,
    db: Session = Depends(get_db),
):
    service = BatchService(db)
    attachment = service.add_attachment(batch_id, attachment_data.model_dump())
    if not attachment:
        raise HTTPException(status_code=400, detail="添加附件失败")
    return attachment


@app.get("/api/batches/{batch_id}/history", response_model=List[HistoryDiffResponse])
def get_batch_history(
    batch_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    service = BatchService(db)
    histories = service.get_history_with_diff(batch_id, skip=skip, limit=limit)
    return histories


@app.post("/api/inspections", response_model=InspectionSheet, status_code=201)
def create_inspection(
    data: InspectionSheetCreate, db: Session = Depends(get_db)
):
    service = SourceDataService(db)
    return service.create_inspection(data.model_dump())


@app.get("/api/inspections", response_model=List[InspectionSheet])
def list_inspections(
    batch_no: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    service = SourceDataService(db)
    return service.list_inspections(batch_no=batch_no, skip=skip, limit=limit)


@app.post("/api/reworks", response_model=ReworkOrder, status_code=201)
def create_rework(data: ReworkOrderCreate, db: Session = Depends(get_db)):
    service = SourceDataService(db)
    return service.create_rework(data.model_dump())


@app.get("/api/reworks", response_model=List[ReworkOrder])
def list_reworks(
    batch_no: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    service = SourceDataService(db)
    return service.list_reworks(batch_no=batch_no, skip=skip, limit=limit)


@app.post("/api/machine-shifts", response_model=MachineShift, status_code=201)
def create_machine_shift(data: MachineShiftCreate, db: Session = Depends(get_db)):
    service = SourceDataService(db)
    return service.create_machine_shift(data.model_dump())


@app.get("/api/machine-shifts", response_model=List[MachineShift])
def list_machine_shifts(
    machine_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    service = SourceDataService(db)
    return service.list_shifts(machine_id=machine_id, skip=skip, limit=limit)


@app.post("/api/price-adjustments", response_model=PriceAdjustment, status_code=201)
def create_price_adjustment(
    data: PriceAdjustmentCreate, db: Session = Depends(get_db)
):
    service = SourceDataService(db)
    return service.create_price_adjustment(data.model_dump())


@app.post("/api/tasks", response_model=AsyncTask, status_code=201)
def create_task(data: AsyncTaskCreate, db: Session = Depends(get_db)):
    service = AsyncTaskService(db)
    return service.create_task(data.model_dump())


@app.get("/api/tasks", response_model=List[AsyncTask])
def list_tasks(
    status: Optional[TaskStatus] = None,
    batch_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    service = AsyncTaskService(db)
    return service.list_tasks(status=status, batch_id=batch_id, skip=skip, limit=limit)


@app.get("/api/tasks/{task_id}", response_model=AsyncTask)
def get_task(task_id: str, db: Session = Depends(get_db)):
    service = AsyncTaskService(db)
    task = service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@app.post("/api/tasks/{task_id}/start", response_model=AsyncTask)
def start_task(task_id: str, db: Session = Depends(get_db)):
    service = AsyncTaskService(db)
    task = service.start_task(task_id)
    if not task:
        raise HTTPException(status_code=400, detail="任务状态不允许启动")
    return task


@app.post("/api/tasks/{task_id}/complete", response_model=AsyncTask)
def complete_task(task_id: str, request: TaskCompleteRequest, db: Session = Depends(get_db)):
    service = AsyncTaskService(db)
    task = service.complete_task(task_id, request.result)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@app.post("/api/tasks/{task_id}/fail", response_model=AsyncTask)
def fail_task(task_id: str, request: TaskFailRequest, db: Session = Depends(get_db)):
    service = AsyncTaskService(db)
    task = service.fail_task(task_id, request.error_message, request.is_permanent)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@app.post("/api/tasks/{task_id}/mark-manual", response_model=AsyncTask)
def mark_task_manual(task_id: str, request: TaskManualRequest, db: Session = Depends(get_db)):
    service = AsyncTaskService(db)
    task = service.mark_for_manual(task_id, request.reason)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@app.post("/api/tasks/{task_id}/retry", response_model=AsyncTask)
def retry_task(task_id: str, request: TaskRetryRequest, db: Session = Depends(get_db)):
    service = AsyncTaskService(db)
    task = service.retry_task(task_id, request.reset_retry_count)
    if not task:
        raise HTTPException(status_code=400, detail="任务状态不允许重试或任务不存在")
    return task


@app.post("/api/tasks/process-pending", response_model=ProcessTasksResponse)
def process_pending_tasks(db: Session = Depends(get_db)):
    service = AsyncTaskService(db)
    tasks = service.process_pending_tasks()
    return ProcessTasksResponse(
        processed_count=len(tasks),
        task_ids=[t.task_id for t in tasks],
    )


@app.post("/api/export", response_model=ExportResponse)
def export_batches(request: ExportRequest, db: Session = Depends(get_db)):
    service = ExportService(db)
    result = service.export_batches(
        batch_ids=request.batch_ids,
        start_date=request.start_date,
        end_date=request.end_date,
        status=request.status,
    )
    return ExportResponse(**result)


@app.get("/api/export/download/{filename}")
def download_export(filename: str):
    from .config import settings

    filepath = settings.EXPORT_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(filepath, filename=filename)


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}
