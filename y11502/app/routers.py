from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import json
from app.database import get_db
from app.models import QueueStatus
from app.schemas import (
    MaintenanceOrderResponse, SparePartScanResponse, CustomerReceiptResponse,
    SupplierStatementResponse, ApprovalEmailResponse, AsyncTaskResponse,
    CompensationQueueResponse, CompensationRecordResponse, ImportResponse,
    QueueStatsResponse, ServiceMetricsResponse, ManualHandleRequest
)
from app.services import (
    import_maintenance_orders, import_spare_part_scans, import_customer_receipts,
    import_supplier_statements, import_approval_emails,
    create_compensation_queue, process_queue_item, get_all_pending_items,
    create_queue_async_task, execute_async_task, process_all_pending_async_tasks,
    recover_queue_from_async_tasks,
    manual_handle_queue, get_queue_stats, get_retry_category_stats,
    get_dead_letter_stats, get_recovery_stats, recover_async_tasks,
    generate_idempotent_key
)

router = APIRouter()


@router.post("/import/maintenance-orders", response_model=ImportResponse)
async def upload_maintenance_orders(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    content = await file.read()
    try:
        data = json.loads(content.decode('utf-8'))
        if not isinstance(data, list):
            data = [data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件解析失败: {str(e)}")

    success, failed, errors = import_maintenance_orders(db, data, file.filename)

    return ImportResponse(
        success=True,
        message=f"维修单导入完成",
        total_count=len(data),
        success_count=success,
        failed_count=failed,
        details=errors
    )


@router.post("/import/spare-part-scans", response_model=ImportResponse)
async def upload_spare_part_scans(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    content = await file.read()
    try:
        data = json.loads(content.decode('utf-8'))
        if not isinstance(data, list):
            data = [data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件解析失败: {str(e)}")

    success, failed, errors = import_spare_part_scans(db, data, file.filename)

    return ImportResponse(
        success=True,
        message=f"备件扫码导入完成",
        total_count=len(data),
        success_count=success,
        failed_count=failed,
        details=errors
    )


@router.post("/import/customer-receipts", response_model=ImportResponse)
async def upload_customer_receipts(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    content = await file.read()
    try:
        data = json.loads(content.decode('utf-8'))
        if not isinstance(data, list):
            data = [data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件解析失败: {str(e)}")

    success, failed, errors = import_customer_receipts(db, data, file.filename)

    return ImportResponse(
        success=True,
        message=f"客户签收导入完成",
        total_count=len(data),
        success_count=success,
        failed_count=failed,
        details=errors
    )


@router.post("/import/supplier-statements", response_model=ImportResponse)
async def upload_supplier_statements(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    content = await file.read()
    try:
        data = json.loads(content.decode('utf-8'))
        if not isinstance(data, list):
            data = [data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件解析失败: {str(e)}")

    success, failed, errors = import_supplier_statements(db, data, file.filename)

    return ImportResponse(
        success=True,
        message=f"供应商对账单导入完成",
        total_count=len(data),
        success_count=success,
        failed_count=failed,
        details=errors
    )


@router.post("/import/approval-emails", response_model=ImportResponse)
async def upload_approval_emails(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    content = await file.read()
    try:
        data = json.loads(content.decode('utf-8'))
        if not isinstance(data, list):
            data = [data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件解析失败: {str(e)}")

    success, failed, errors = import_approval_emails(db, data, file.filename)

    return ImportResponse(
        success=True,
        message=f"审批邮件导入完成",
        total_count=len(data),
        success_count=success,
        failed_count=failed,
        details=errors
    )


@router.get("/import/supplier-statements", response_model=List[SupplierStatementResponse])
def list_supplier_statements(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    from app.models import SupplierStatement
    return db.query(SupplierStatement).offset(skip).limit(limit).all()


@router.get("/import/approval-emails", response_model=List[ApprovalEmailResponse])
def list_approval_emails(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    from app.models import ApprovalEmail
    return db.query(ApprovalEmail).offset(skip).limit(limit).all()


@router.post("/queue/submit", response_model=CompensationQueueResponse)
def submit_compensation(
    order_no: str,
    part_code: str,
    quantity: int,
    max_retry: int = 3,
    db: Session = Depends(get_db)
):
    queue_item, is_new = create_compensation_queue(db, order_no, part_code, quantity, max_retry)
    if not is_new:
        queue_item.status = QueueStatus.RETRYING
    return queue_item


@router.get("/queue/{queue_id}", response_model=CompensationQueueResponse)
def get_queue_item(queue_id: int, db: Session = Depends(get_db)):
    from app.models import CompensationQueue
    item = db.query(CompensationQueue).filter(CompensationQueue.id == queue_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="队列项不存在")
    return item


@router.get("/queue/idempotent/{idempotent_key}", response_model=CompensationQueueResponse)
def get_by_idempotent_key(idempotent_key: str, db: Session = Depends(get_db)):
    from app.services import get_queue_by_idempotent_key
    item = get_queue_by_idempotent_key(db, idempotent_key)
    if not item:
        raise HTTPException(status_code=404, detail="队列项不存在")
    return item


@router.post("/queue/{queue_id}/process")
def process_item(queue_id: int, db: Session = Depends(get_db)):
    success = process_queue_item(db, queue_id)
    return {"success": success, "queue_id": queue_id}


@router.post("/queue/process-pending")
def process_pending_items(db: Session = Depends(get_db)):
    items = get_all_pending_items(db)
    processed = []
    for item in items:
        success = process_queue_item(db, item.id)
        processed.append({"id": item.id, "status": item.status, "success": success})
    return {"processed_count": len(processed), "details": processed}


@router.post("/queue/{queue_id}/create-async-task")
def create_async_task_for_queue(queue_id: int, db: Session = Depends(get_db)):
    try:
        task = create_queue_async_task(db, queue_id)
        return {"success": True, "task_id": task.task_id, "queue_id": queue_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/async-tasks/{task_id}/execute")
def execute_task(task_id: int, db: Session = Depends(get_db)):
    from app.models import AsyncTask
    task = db.query(AsyncTask).filter(AsyncTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    success = execute_async_task(db, task_id)
    return {"success": success, "task_id": task.task_id, "status": task.status}


@router.post("/async-tasks/process-all")
def process_all_tasks(db: Session = Depends(get_db)):
    success, manual, failed = process_all_pending_async_tasks(db)
    return {
        "success_count": success,
        "waiting_manual_count": manual,
        "failed_count": failed,
        "total_processed": success + manual + failed
    }


@router.get("/async-tasks", response_model=List[AsyncTaskResponse])
def list_async_tasks(
    status: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    from app.models import AsyncTask
    query = db.query(AsyncTask)
    if status:
        query = query.filter(AsyncTask.status == status)
    return query.offset(skip).limit(limit).all()


@router.post("/recovery/queue-from-tasks")
def recover_queue_tasks(db: Session = Depends(get_db)):
    recovered = recover_queue_from_async_tasks(db)
    return {"recovered_count": recovered}


@router.post("/queue/{queue_id}/manual", response_model=CompensationQueueResponse)
def manual_handle(
    queue_id: int,
    request: ManualHandleRequest,
    db: Session = Depends(get_db)
):
    item = manual_handle_queue(db, queue_id, request.handler, request.note, request.action)
    if not item:
        raise HTTPException(status_code=404, detail="队列项不存在")
    return item


@router.get("/queue", response_model=List[CompensationQueueResponse])
def list_queue(
    status: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    from app.models import CompensationQueue
    query = db.query(CompensationQueue)
    if status:
        query = query.filter(CompensationQueue.status == status)
    return query.offset(skip).limit(limit).all()


@router.get("/stats/queue", response_model=QueueStatsResponse)
def get_queue_statistics(db: Session = Depends(get_db)):
    stats = get_queue_stats(db)
    return QueueStatsResponse(
        pending=stats.get("pending", 0),
        retrying=stats.get("retrying", 0),
        waiting_manual=stats.get("waiting_manual", 0),
        dead_letter=stats.get("dead_letter", 0),
        compensated=stats.get("compensated", 0),
        closed=stats.get("closed", 0)
    )


@router.get("/stats/service-metrics", response_model=ServiceMetricsResponse)
def get_service_metrics(db: Session = Depends(get_db)):
    retry_cats = get_retry_category_stats(db)
    dead_letter = get_dead_letter_stats(db)
    recovery = get_recovery_stats(db)

    return ServiceMetricsResponse(
        retry_categories=retry_cats,
        dead_letter=dead_letter,
        recovery=recovery
    )


@router.post("/recovery/async-tasks")
def recover_tasks(db: Session = Depends(get_db)):
    recovered = recover_async_tasks(db)
    return {"recovered_count": recovered}


@router.get("/compensation-records", response_model=List[CompensationRecordResponse])
def list_compensation_records(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    from app.models import CompensationRecord
    return db.query(CompensationRecord).offset(skip).limit(limit).all()


@router.get("/tools/generate-key")
def generate_key(order_no: str, part_code: str, quantity: int):
    key = generate_idempotent_key(order_no, part_code, quantity)
    return {"idempotent_key": key}
