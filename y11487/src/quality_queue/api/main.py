from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, datetime
import io
import csv

from ..models import (
    get_db, init_db, QueueStatus, RetryCategory,
    CompensationQueue
)
from ..services import QueueService, DataService, ExportService, DataValidator

app = FastAPI(
    title="小厂质检返工重试补偿队列 API",
    description="接住抽检表、返工单、机台班次和短信截图，支持回执提交、排队、限次重试、人工接管、补偿入账、关闭",
    version="1.0.0"
)


@app.on_event("startup")
async def startup_event():
    init_db()


def get_current_operator(
    x_operator: Optional[str] = Header("system", description="操作员名称"),
    x_role: Optional[str] = Header("worker", description="操作员角色: worker/supervisor/manager")
):
    return {"operator": x_operator, "role": x_role}


class ShiftCreate(BaseModel):
    shift_code: str
    machine_no: str
    shift_date: date
    shift_type: str
    operator: Optional[str] = ""
    team_leader: Optional[str] = ""
    target_quantity: Optional[int] = 0
    actual_quantity: Optional[int] = 0
    defect_quantity: Optional[int] = 0


class InspectionCreate(BaseModel):
    inspection_no: str
    shift_code: Optional[str] = None
    machine_no: str
    inspection_date: date
    inspector: Optional[str] = ""
    batch_no: Optional[str] = ""
    style_no: Optional[str] = ""
    fabric_type: Optional[str] = ""
    sample_size: int
    defect_count: Optional[int] = 0
    defect_rate: Optional[float] = 0.0
    is_qualified: Optional[bool] = True


class ReworkCreate(BaseModel):
    rework_no: str
    inspection_no: Optional[str] = None
    shift_code: Optional[str] = None
    parent_rework_no: Optional[str] = None
    rework_date: date
    machine_no: str
    defect_type: str
    defect_description: Optional[str] = ""
    rework_quantity: int
    rework_operator: Optional[str] = ""
    rework_team: Optional[str] = ""
    compensation_amount: Optional[float] = 0.0
    responsible_shift_code: Optional[str] = ""


class ExceptionCreate(BaseModel):
    record_no: Optional[str] = None
    source: str = "sms"
    inspection_no: Optional[str] = None
    rework_no: Optional[str] = None
    shift_code: Optional[str] = None
    record_date: Optional[date] = None
    machine_no: Optional[str] = ""
    defect_type: Optional[str] = ""
    description: Optional[str] = ""
    photo_path: Optional[str] = ""
    sms_content: Optional[str] = ""
    sender: Optional[str] = ""


class CompensateRequest(BaseModel):
    amount: Optional[float] = None
    quantity: Optional[int] = None


class CloseRequest(BaseModel):
    reason: str


class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


@app.post("/api/v1/submit/shift", response_model=APIResponse)
def submit_shift(
    data: ShiftCreate,
    current_user: Dict = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """提交机台班次数据"""
    try:
        service = DataService(db)
        shift, dirty_records = service.create_machine_shift(data.dict())
        db.commit()

        dirty_info = [
            {
                "type": dr.dirty_type.value,
                "field": dr.field_name,
                "opinion": dr.processing_opinion
            }
            for dr in dirty_records
        ]

        return APIResponse(
            success=True,
            message=f"机台班次已创建: {shift.shift_code}",
            data={"shift_code": shift.shift_code, "dirty_records": dirty_info}
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/v1/submit/inspection", response_model=APIResponse)
def submit_inspection(
    data: InspectionCreate,
    current_user: Dict = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """提交抽检表数据"""
    try:
        data_service = DataService(db)
        inspection, dirty_records = data_service.create_inspection(data.dict())

        queue_service = QueueService(db, current_user["operator"], current_user["role"])
        queue_item = queue_service.submit_from_inspection(inspection.id)
        db.commit()

        dirty_info = [
            {
                "type": dr.dirty_type.value,
                "field": dr.field_name,
                "opinion": dr.processing_opinion
            }
            for dr in dirty_records
        ]

        return APIResponse(
            success=True,
            message="抽检表已提交",
            data={
                "queue_no": queue_item.queue_no,
                "inspection_no": inspection.inspection_no,
                "dirty_records": dirty_info
            }
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/v1/submit/rework", response_model=APIResponse)
def submit_rework(
    data: ReworkCreate,
    current_user: Dict = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """提交返工单数据"""
    try:
        data_service = DataService(db)
        rework, dirty_records = data_service.create_rework_order(data.dict())

        queue_service = QueueService(db, current_user["operator"], current_user["role"])
        queue_item = queue_service.submit_from_rework(rework.id)
        db.commit()

        dirty_info = [
            {
                "type": dr.dirty_type.value,
                "field": dr.field_name,
                "opinion": dr.processing_opinion
            }
            for dr in dirty_records
        ]

        return APIResponse(
            success=True,
            message="返工单已提交",
            data={
                "queue_no": queue_item.queue_no,
                "rework_no": rework.rework_no,
                "dirty_records": dirty_info
            }
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/v1/submit/exception", response_model=APIResponse)
def submit_exception(
    data: ExceptionCreate,
    current_user: Dict = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """提交异常记录（短信截图/照片）"""
    try:
        data_service = DataService(db)
        exception = data_service.create_exception_record(data.dict())

        queue_service = QueueService(db, current_user["operator"], current_user["role"])
        queue_item = queue_service.submit_from_exception(exception.id)
        db.commit()

        return APIResponse(
            success=True,
            message="异常记录已提交",
            data={
                "queue_no": queue_item.queue_no,
                "record_no": exception.record_no
            }
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/v1/queue/{queue_id}/process", response_model=APIResponse)
def process_queue(
    queue_id: int,
    current_user: Dict = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """处理队列项"""
    service = QueueService(db, current_user["operator"], current_user["role"])
    success, msg = service.process_queue(queue_id)
    db.commit()

    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return APIResponse(success=True, message=msg)


@app.post("/api/v1/queue/{queue_id}/retry", response_model=APIResponse)
def retry_queue(
    queue_id: int,
    error: str = "",
    current_user: Dict = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """重试队列项"""
    service = QueueService(db, current_user["operator"], current_user["role"])
    success, msg = service.retry_queue(queue_id, error)
    db.commit()

    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return APIResponse(success=True, message=msg)


@app.post("/api/v1/queue/{queue_id}/manual", response_model=APIResponse)
def take_manual(
    queue_id: int,
    note: str = "",
    current_user: Dict = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """人工接管队列项"""
    service = QueueService(db, current_user["operator"], current_user["role"])
    success, msg = service.take_manual(queue_id, note)
    db.commit()

    if not success:
        raise HTTPException(status_code=403, detail=msg)
    return APIResponse(success=True, message=msg)


@app.post("/api/v1/queue/{queue_id}/compensate", response_model=APIResponse)
def compensate(
    queue_id: int,
    req: CompensateRequest,
    current_user: Dict = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """补偿入账"""
    service = QueueService(db, current_user["operator"], current_user["role"])
    success, msg = service.compensate(queue_id, req.amount, req.quantity)
    db.commit()

    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return APIResponse(success=True, message=msg)


@app.post("/api/v1/queue/{queue_id}/close", response_model=APIResponse)
def close_queue(
    queue_id: int,
    req: CloseRequest,
    current_user: Dict = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """关闭队列项"""
    service = QueueService(db, current_user["operator"], current_user["role"])
    success, msg = service.close_queue(queue_id, req.reason)
    db.commit()

    if not success:
        raise HTTPException(status_code=403, detail=msg)
    return APIResponse(success=True, message=msg)


@app.post("/api/v1/queue/{queue_id}/recover", response_model=APIResponse)
def recover_dead_letter(
    queue_id: int,
    current_user: Dict = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """从死信队列恢复"""
    service = QueueService(db, current_user["operator"], current_user["role"])
    success, msg = service.recover_dead_letter(queue_id)
    db.commit()

    if not success:
        raise HTTPException(status_code=403, detail=msg)
    return APIResponse(success=True, message=msg)


class TransferManualRequest(BaseModel):
    reason: Optional[str] = ""


@app.post("/api/v1/queue/{queue_id}/transfer-manual", response_model=APIResponse)
def transfer_to_manual(
    queue_id: int,
    req: TransferManualRequest,
    current_user: Dict = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """系统转入人工处理（无需特殊权限，用于重缺陷自动流转"""
    service = QueueService(db, current_user["operator"], current_user["role"])
    success, msg = service.transfer_to_manual(queue_id, req.reason)
    db.commit()

    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return APIResponse(success=True, message=msg)


@app.get("/api/v1/queue")
def list_queue(
    status: Optional[str] = None,
    category: Optional[str] = None,
    machine_no: Optional[str] = None,
    shift_code: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: Dict = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """列出队列项"""
    service = QueueService(db, current_user["operator"], current_user["role"])
    items = service.list_queue(
        status=QueueStatus(status) if status else None,
        category=RetryCategory(category) if category else None,
        machine_no=machine_no,
        shift_code=shift_code,
        limit=limit,
        offset=offset
    )

    return {
        "total": len(items),
        "items": [
            {
                "id": item.id,
                "queue_no": item.queue_no,
                "status": item.status.value if item.status else None,
                "retry_category": item.retry_category.value if item.retry_category else None,
                "machine_no": item.machine_no,
                "responsible_shift_code": item.responsible_shift_code,
                "original_shift_code": item.original_shift_code,
                "defect_type": item.defect_type,
                "retry_count": item.retry_count,
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in items
        ]
    }


@app.get("/api/v1/queue/{queue_id}")
def get_queue_detail(
    queue_id: int,
    current_user: Dict = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """获取队列项详情"""
    service = ExportService(db)
    detail = service.get_queue_detail(queue_id)

    if not detail:
        raise HTTPException(status_code=404, detail="队列项不存在")

    return detail


@app.get("/api/v1/manager/summary")
def get_manager_summary(
    current_user: Dict = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """生产经理视图 - 汇总统计"""
    service = QueueService(db, current_user["operator"], current_user["role"])
    return service.get_manager_summary()


@app.get("/api/v1/export/csv")
def export_csv(
    status: Optional[str] = None,
    current_user: Dict = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """导出为 CSV"""
    service = ExportService(db)
    csv_content = service.export_queue_to_csv(status)

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=queue.csv"}
    )


@app.get("/api/v1/dirty")
def list_dirty_records(
    dirty_type: Optional[str] = None,
    source: Optional[str] = None,
    is_corrected: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: Dict = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """列出脏记录"""
    from ..models import DirtyType, RecordSource

    validator = DataValidator(db)
    records = validator.get_dirty_records(
        source_type=RecordSource(source) if source else None,
        dirty_type=DirtyType(dirty_type) if dirty_type else None,
        is_corrected=is_corrected,
        limit=limit,
        offset=offset
    )

    return {
        "total": len(records),
        "items": [
            {
                "id": r.id,
                "source_type": r.source_type.value,
                "dirty_type": r.dirty_type.value,
                "source_id": r.source_id,
                "field_name": r.field_name,
                "original_value": r.original_value,
                "corrected_value": r.corrected_value,
                "processing_opinion": r.processing_opinion,
                "is_corrected": r.is_corrected,
                "corrected_by": r.corrected_by,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in records
        ]
    }


class DirtyCorrectRequest(BaseModel):
    corrected_value: str


@app.post("/api/v1/dirty/{dirty_id}/correct", response_model=APIResponse)
def correct_dirty_record(
    dirty_id: int,
    req: DirtyCorrectRequest,
    current_user: Dict = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """修正脏记录"""
    validator = DataValidator(db)
    success, msg = validator.correct_dirty_record(
        dirty_id, req.corrected_value, current_user["operator"]
    )

    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return APIResponse(success=True, message=msg)


class ReceiptSubmitRequest(BaseModel):
    source_type: str
    payload: Dict[str, Any]
    source_system: Optional[str] = "external"
    callback_url: Optional[str] = None


@app.post("/api/v1/receipt/submit", response_model=APIResponse)
def submit_receipt(
    req: ReceiptSubmitRequest,
    current_user: Dict = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """提交外部回执"""
    from ..services import ReceiptProcessor

    processor = ReceiptProcessor(db)
    receipt = processor.submit_receipt(
        source_type=req.source_type,
        payload=req.payload,
        source_system=req.source_system,
        callback_url=req.callback_url
    )
    db.commit()

    return APIResponse(
        success=True,
        message="回执已提交",
        data={"receipt_no": receipt.receipt_no}
    )


@app.post("/api/v1/receipt/process", response_model=APIResponse)
def process_receipts(
    limit: int = 100,
    current_user: Dict = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """处理待处理的回执"""
    from ..services import ReceiptProcessor

    processor = ReceiptProcessor(db)
    processed = processor.process_pending_receipts(limit)

    return APIResponse(
        success=True,
        message=f"处理完成",
        data={"processed": processed}
    )


@app.get("/api/v1/receipt")
def list_receipts(
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: Dict = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """列出回执"""
    from ..models import ExternalReceipt, ReceiptStatus

    query = db.query(ExternalReceipt)
    if status:
        query = query.filter(ExternalReceipt.status == ReceiptStatus(status))

    receipts = query.order_by(ExternalReceipt.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "total": len(receipts),
        "items": [
            {
                "id": r.id,
                "receipt_no": r.receipt_no,
                "source_system": r.source_system,
                "source_type": r.source_type.value if r.source_type else None,
                "status": r.status.value if r.status else None,
                "retry_count": r.retry_count,
                "queue_item_id": r.queue_item_id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "processed_at": r.processed_at.isoformat() if r.processed_at else None,
            }
            for r in receipts
        ]
    }


@app.post("/api/v1/worker/process-once", response_model=APIResponse)
def worker_process_once(
    batch_size: int = 10,
    current_user: Dict = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """执行一次队列处理"""
    from ..services import QueueWorker

    worker = QueueWorker(db, batch_size=batch_size)
    processed = worker.process_once()
    db.commit()

    return APIResponse(
        success=True,
        message=f"处理完成",
        data={"processed": processed}
    )


@app.get("/api/v1/worker")
def list_workers(
    current_user: Dict = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """列出所有 Worker 状态"""
    from ..models import WorkerState

    workers = db.query(WorkerState).all()

    return {
        "total": len(workers),
        "items": [
            {
                "worker_id": w.worker_id,
                "status": w.status.value if w.status else None,
                "processed_count": w.processed_count,
                "error_count": w.error_count,
                "current_queue_id": w.current_queue_id,
                "last_heartbeat": w.last_heartbeat.isoformat() if w.last_heartbeat else None,
            }
            for w in workers
        ]
    }


@app.get("/api/v1/history/{resource_type}/{resource_id}")
def get_data_history(
    resource_type: str,
    resource_id: str,
    limit: int = 20,
    current_user: Dict = Depends(get_current_operator),
    db: Session = Depends(get_db)
):
    """查看数据变更历史"""
    from ..models import DataHistory

    histories = db.query(DataHistory).filter(
        DataHistory.resource_type == resource_type,
        DataHistory.resource_id == resource_id
    ).order_by(DataHistory.version.desc()).limit(limit).all()

    return {
        "total": len(histories),
        "items": [
            {
                "version": h.version,
                "change_reason": h.change_reason,
                "changed_by": h.changed_by,
                "data_snapshot": h.data_snapshot,
                "created_at": h.created_at.isoformat() if h.created_at else None,
            }
            for h in histories
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
