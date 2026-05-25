import json
import os
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional

from .database import get_db, init_db
from .repository import DataRepository
from .data_importer import DataImporter
from .data_exporter import DataExporter
from .reconciliation import ReconciliationService
from .task_processor import create_task_processor
from .models import RecordType, ImportTask
from . import schemas
from .config import UPLOAD_DIR

app = FastAPI(title="智能柜补货验收回放链路 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

task_processor = create_task_processor()


def _task_to_response_dict(task: ImportTask) -> dict:
    from .repository import safe_json_loads
    task_dict = {
        "task_id": task.task_id,
        "record_type": task.record_type.value,
        "source_type": task.source_type.value,
        "source_file": task.source_file,
        "status": task.status.value,
        "total_count": task.total_count,
        "success_count": task.success_count,
        "duplicate_count": task.duplicate_count,
        "error_count": task.error_count,
        "retry_times": task.retry_times,
        "error_message": task.error_message,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "completed_at": task.completed_at,
        "pending_records": [],
    }
    for pr in task.pending_records:
        try:
            raw_data = safe_json_loads(pr.raw_data) if isinstance(pr.raw_data, str) else pr.raw_data
        except Exception:
            raw_data = {}
        pr_dict = {
            "id": pr.id,
            "task_id": pr.task_id,
            "source_file": pr.source_file,
            "source_row_number": pr.source_row_number,
            "record_type": pr.record_type.value,
            "raw_data": raw_data,
            "status": pr.status.value,
            "retry_times": pr.retry_times,
            "max_retry_times": pr.max_retry_times,
            "error_message": pr.error_message,
            "created_at": pr.created_at,
            "updated_at": pr.updated_at,
            "processed_at": pr.processed_at,
        }
        task_dict["pending_records"].append(pr_dict)
    return task_dict


@app.on_event("startup")
async def startup_event():
    init_db()
    task_processor.start()


@app.on_event("shutdown")
async def shutdown_event():
    task_processor.stop()


@app.get("/", tags=["系统"])
async def root():
    return {
        "service": "智能柜补货验收回放链路服务",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health", tags=["系统"])
async def health_check():
    return {"status": "healthy"}


@app.post("/api/import/inventory", response_model=schemas.TaskResponse, tags=["数据导入"])
async def import_inventory(
    request: schemas.ImportRequest,
    db: Session = Depends(get_db),
):
    importer = DataImporter(db)
    task = importer.import_from_api(RecordType.INVENTORY, request.records)
    return _task_to_response_dict(task)


@app.post("/api/import/replenishment", response_model=schemas.TaskResponse, tags=["数据导入"])
async def import_replenishment(
    request: schemas.ImportRequest,
    db: Session = Depends(get_db),
):
    importer = DataImporter(db)
    task = importer.import_from_api(RecordType.REPLENISHMENT, request.records)
    return _task_to_response_dict(task)


@app.post("/api/import/refund", response_model=schemas.TaskResponse, tags=["数据导入"])
async def import_refund(
    request: schemas.ImportRequest,
    db: Session = Depends(get_db),
):
    importer = DataImporter(db)
    task = importer.import_from_api(RecordType.REFUND, request.records)
    return _task_to_response_dict(task)


@app.post("/api/import/price-adjustment", response_model=schemas.TaskResponse, tags=["数据导入"])
async def import_price_adjustment(
    request: schemas.ImportRequest,
    db: Session = Depends(get_db),
):
    importer = DataImporter(db)
    task = importer.import_from_api(RecordType.PRICE_ADJUSTMENT, request.records)
    return _task_to_response_dict(task)


@app.post("/api/import/upload/{record_type}", response_model=schemas.TaskResponse, tags=["数据导入"])
async def upload_file(
    record_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    try:
        rtype = RecordType(record_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"无效的记录类型: {record_type}")

    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    importer = DataImporter(db)
    task = importer.import_from_file(rtype, file_path)
    return _task_to_response_dict(task)


@app.get("/api/tasks", response_model=schemas.TaskListResponse, tags=["任务管理"])
async def list_tasks(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    repo = DataRepository(db)
    tasks = repo.list_tasks(skip=skip, limit=limit)

    task_list = []
    for task in tasks:
        task_dict = {
            "task_id": task.task_id,
            "record_type": task.record_type.value,
            "source_type": task.source_type.value,
            "source_file": task.source_file,
            "status": task.status.value,
            "total_count": task.total_count,
            "success_count": task.success_count,
            "duplicate_count": task.duplicate_count,
            "error_count": task.error_count,
            "retry_times": task.retry_times,
            "error_message": task.error_message,
            "created_at": task.created_at,
            "updated_at": task.updated_at,
            "completed_at": task.completed_at,
        }
        task_list.append(task_dict)

    return {"total": len(task_list), "tasks": task_list}


@app.get("/api/tasks/{task_id}", response_model=schemas.TaskResponse, tags=["任务管理"])
async def get_task(task_id: str, db: Session = Depends(get_db)):
    repo = DataRepository(db)
    task = repo.get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return _task_to_response_dict(task)


@app.get("/api/tasks/{task_id}/logs", response_model=List[schemas.ProcessingLogResponse], tags=["任务管理"])
async def get_task_logs(task_id: str, db: Session = Depends(get_db)):
    repo = DataRepository(db)
    task = repo.get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return repo.get_task_logs(task.id)


@app.get("/api/tasks/{task_id}/duplicates", response_model=List[schemas.DuplicateRecordResponse], tags=["任务管理"])
async def get_task_duplicates(task_id: str, db: Session = Depends(get_db)):
    repo = DataRepository(db)
    task = repo.get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return repo.get_task_duplicates(task.id)


@app.post("/api/tasks/{task_id}/retry", response_model=schemas.TaskResponse, tags=["任务管理"])
async def retry_task(task_id: str, db: Session = Depends(get_db)):
    from .models import TaskStatus, PendingRecordStatus
    repo = DataRepository(db)
    task = repo.get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    if task.status not in [TaskStatus.WAITING_RETRY, TaskStatus.PERMANENT_FAILED, TaskStatus.WAITING_MANUAL]:
        raise HTTPException(status_code=400, detail="该任务状态不支持重试")

    task.retry_times = 0
    task.status = TaskStatus.PENDING
    task.error_message = None
    for pr in task.pending_records:
        if pr.status in [PendingRecordStatus.WAITING_RETRY, PendingRecordStatus.WAITING_MANUAL, PendingRecordStatus.PERMANENT_FAILED, PendingRecordStatus.ERROR]:
            pr.status = PendingRecordStatus.PENDING
            pr.retry_times = 0
            pr.error_message = None
    db.commit()
    db.refresh(task)
    return _task_to_response_dict(task)


@app.post("/api/tasks/{task_id}/manual-resolve", response_model=schemas.TaskResponse, tags=["任务管理"])
async def manual_resolve_task(
    task_id: str,
    resolution: str,
    db: Session = Depends(get_db),
):
    from .models import TaskStatus, PendingRecordStatus
    from datetime import datetime
    repo = DataRepository(db)
    task = repo.get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    task.status = TaskStatus.COMPLETED
    task.error_message = f"人工处理: {resolution}"
    for pr in task.pending_records:
        if pr.status in [PendingRecordStatus.WAITING_RETRY, PendingRecordStatus.WAITING_MANUAL, PendingRecordStatus.PERMANENT_FAILED]:
            pr.status = PendingRecordStatus.SUCCESS
            pr.error_message = f"人工处理: {resolution}"
            pr.processed_at = datetime.utcnow()
    db.commit()
    db.refresh(task)

    repo.add_log(task, f"人工处理完成: {resolution}", level="info")
    return _task_to_response_dict(task)


@app.get("/api/export/tasks/{task_id}", tags=["数据导出"])
async def export_task(
    task_id: str,
    format: str = "xlsx",
    db: Session = Depends(get_db),
):
    exporter = DataExporter(db)
    try:
        filepath = exporter.export_task_results(task_id, format)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    filename = os.path.basename(filepath)
    return FileResponse(
        filepath,
        media_type="application/octet-stream",
        filename=filename,
    )


@app.get("/api/export/records/{record_type}", tags=["数据导出"])
async def export_records(
    record_type: str,
    cabinet_id: Optional[str] = None,
    format: str = "xlsx",
    db: Session = Depends(get_db),
):
    try:
        rtype = RecordType(record_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"无效的记录类型: {record_type}")

    exporter = DataExporter(db)
    filepath = exporter.export_all_records(rtype, cabinet_id=cabinet_id, format=format)
    filename = os.path.basename(filepath)
    return FileResponse(
        filepath,
        media_type="application/octet-stream",
        filename=filename,
    )


@app.post("/api/reconciliation/{cabinet_id}", response_model=List[schemas.ReconciliationResponse], tags=["对账"])
async def reconcile_cabinet(cabinet_id: str, db: Session = Depends(get_db)):
    service = ReconciliationService(db)
    return service.reconcile_cabinet(cabinet_id)


@app.get("/api/reconciliation/{cabinet_id}/history", response_model=List[schemas.ReconciliationResponse], tags=["对账"])
async def get_reconciliation_history(
    cabinet_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    service = ReconciliationService(db)
    return service.get_reconciliation_history(cabinet_id, skip=skip, limit=limit)


@app.get("/api/reconciliation/{cabinet_id}/summary", response_model=schemas.ReconciliationSummary, tags=["对账"])
async def get_reconciliation_summary(cabinet_id: str, db: Session = Depends(get_db)):
    service = ReconciliationService(db)
    return service.get_reconciliation_summary(cabinet_id)


@app.get("/api/records/inventory/{cabinet_id}", response_model=List[schemas.InventoryRecordResponse], tags=["数据查询"])
async def get_inventory_records(
    cabinet_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    from .models import InventoryRecord
    records = (
        db.query(InventoryRecord)
        .filter(InventoryRecord.cabinet_id == cabinet_id)
        .order_by(InventoryRecord.record_time.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return records


@app.get("/api/records/detail/{record_type}/{record_id}", tags=["数据查询"])
async def get_record_detail(
    record_type: str,
    record_id: str,
    db: Session = Depends(get_db),
):
    from .models import InventoryRecord, ReplenishmentPhoto, RefundRecord, PriceAdjustment

    model_map = {
        "inventory": InventoryRecord,
        "replenishment": ReplenishmentPhoto,
        "refund": RefundRecord,
        "price_adjustment": PriceAdjustment,
    }
    model = model_map.get(record_type)
    if not model:
        raise HTTPException(status_code=400, detail=f"无效的记录类型: {record_type}")

    record = db.query(model).filter(model.record_id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    raw_data = json.loads(record.raw_data) if hasattr(record, 'raw_data') and record.raw_data else {}

    repo = DataRepository(db)
    task = db.query(ImportTask).filter(ImportTask.id == record.task_id).first() if hasattr(record, 'task_id') else None
    logs = repo.get_task_logs(task.id) if task else []

    record_dict = {c.name: getattr(record, c.name) for c in record.__table__.columns}
    if 'raw_data' in record_dict:
        del record_dict['raw_data']

    return {
        "record": record_dict,
        "raw_data": raw_data,
        "task": task,
        "logs": logs,
    }
