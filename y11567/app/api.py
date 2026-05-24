from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from .database import get_db, init_db
from .models import SourceType, WorkOrderStatus, DirtyType, RetryCategory
from .services.work_order_service import WorkOrderService
from .services.dirty_record_service import DirtyRecordService
from .services.report_service import ReportService
from .services.export_service import ExportService

app = FastAPI(
    title="城市照明抢修重试补偿队列 API",
    description="解决同一路段反复熄灯被拆成多个零散工单的问题，通过关联巡检照片、报修热线、备件批次、异常照片等线索，实现工单的统一管理和重试补偿机制",
    version="1.0.0"
)


class SubmitClueRequest(BaseModel):
    source_type: str = Field(..., description="数据来源类型: inspection/hotline/spare_part/exception_photo/sms")
    content: Dict[str, Any] = Field(..., description="线索内容")
    source_id: Optional[str] = None
    operator: str = "api"


class WorkOrderResponse(BaseModel):
    id: int
    order_no: str
    location: str
    status: str
    retry_count: int
    max_retries: int
    compensated_amount: float
    created_at: Optional[datetime]
    closed_at: Optional[datetime]


class ClueResponse(BaseModel):
    id: int
    work_order_id: int
    source_type: str
    source_id: Optional[str]
    location: str
    occurred_at: Optional[datetime]
    is_dirty: bool
    dirty_type: Optional[str]
    dirty_reason: Optional[str]
    created_at: datetime


class ManualTakeRequest(BaseModel):
    handler: str


class CompensateRequest(BaseModel):
    amount: float
    reason: str
    executor: str = "api"
    voucher_no: Optional[str] = None


class CloseRequest(BaseModel):
    operator: str = "api"
    remarks: Optional[str] = None


class CorrectClueRequest(BaseModel):
    corrected_content: Dict[str, Any]
    notes: str
    operator: str = "api"


class ResolveDeadLetterRequest(BaseModel):
    resolved_by: str
    notes: str
    recover_work_order: bool = False


@app.on_event("startup")
def on_startup():
    init_db()


@app.post("/clues/submit", summary="提交线索回执", description="提交巡检照片、报修热线、备件批次等线索，自动关联或创建工单")
def submit_clue(request: SubmitClueRequest, db: Session = Depends(get_db)):
    try:
        source_type_enum = SourceType(request.source_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"无效的来源类型: {request.source_type}")
    
    if "location" not in request.content:
        raise HTTPException(status_code=400, detail="缺少必填字段: location")
    
    service = WorkOrderService(db)
    try:
        wo, clue, is_new = service.submit_clue(
            source_type=source_type_enum,
            content=request.content,
            source_id=request.source_id,
            operator=request.operator
        )
        return {
            "success": True,
            "is_new_work_order": is_new,
            "work_order": {
                "id": wo.id,
                "order_no": wo.order_no,
                "location": wo.location,
                "status": wo.status.value
            },
            "clue_id": clue.id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/work-orders", summary="获取工单队列", response_model=List[WorkOrderResponse])
def get_work_orders(status: Optional[str] = None, limit: int = 100, db: Session = Depends(get_db)):
    service = WorkOrderService(db)
    status_enum = WorkOrderStatus(status) if status else None
    work_orders = service.get_queue(status=status_enum, limit=limit)
    return [
        WorkOrderResponse(
            id=wo.id,
            order_no=wo.order_no,
            location=wo.location,
            status=wo.status.value,
            retry_count=wo.retry_count,
            max_retries=wo.max_retries,
            compensated_amount=wo.compensated_amount,
            created_at=wo.created_at,
            closed_at=wo.closed_at
        )
        for wo in work_orders
    ]


@app.get("/work-orders/{work_order_id}", summary="获取工单详情")
def get_work_order_detail(work_order_id: int, db: Session = Depends(get_db)):
    wo_service = WorkOrderService(db)
    report_service = ReportService(db)
    
    wo = wo_service.get_work_order(work_order_id)
    if not wo:
        raise HTTPException(status_code=404, detail="工单不存在")
    
    chain = report_service.get_work_order_clue_chain(work_order_id)
    history = wo_service.get_history(work_order_id)
    
    return {
        "work_order": {
            "id": wo.id,
            "order_no": wo.order_no,
            "location": wo.location,
            "status": wo.status.value,
            "retry_count": wo.retry_count,
            "max_retries": wo.max_retries,
            "compensated_amount": wo.compensated_amount,
            "manual_handler": wo.manual_handler,
            "created_at": wo.created_at,
            "closed_at": wo.closed_at
        },
        "clue_chain": chain.get("clues", []),
        "operation_history": history
    }


@app.get("/work-orders/{work_order_id}/clues", summary="获取工单的线索列表", response_model=List[ClueResponse])
def get_work_order_clues(work_order_id: int, db: Session = Depends(get_db)):
    service = WorkOrderService(db)
    clues = service.get_clues_by_work_order(work_order_id)
    return [
        ClueResponse(
            id=c.id,
            work_order_id=c.work_order_id,
            source_type=c.source_type.value,
            source_id=c.source_id,
            location=c.location,
            occurred_at=c.occurred_at,
            is_dirty=c.is_dirty,
            dirty_type=c.dirty_type.value if c.dirty_type else None,
            dirty_reason=c.dirty_reason,
            created_at=c.created_at
        )
        for c in clues
    ]


@app.post("/work-orders/{work_order_id}/retry", summary="执行工单重试")
def retry_work_order(work_order_id: int, operator: str = "api", db: Session = Depends(get_db)):
    service = WorkOrderService(db)
    success, msg = service.process_retry(work_order_id, operator)
    if not success and "不存在" in msg:
        raise HTTPException(status_code=404, detail=msg)
    return {"success": success, "message": msg}


@app.post("/retry/batch", summary="批量执行可重试工单")
def batch_retry(operator: str = "api", db: Session = Depends(get_db)):
    service = WorkOrderService(db)
    retry_queue = service.get_retry_queue()
    
    results = []
    for wo in retry_queue:
        success, msg = service.process_retry(wo.id, operator)
        results.append({
            "work_order_id": wo.id,
            "order_no": wo.order_no,
            "success": success,
            "message": msg
        })
    
    return {
        "total": len(retry_queue),
        "success_count": sum(1 for r in results if r["success"]),
        "results": results
    }


@app.post("/work-orders/{work_order_id}/manual", summary="人工接管工单")
def take_manual(work_order_id: int, request: ManualTakeRequest, db: Session = Depends(get_db)):
    service = WorkOrderService(db)
    success, msg = service.take_manual(work_order_id, request.handler)
    if not success:
        raise HTTPException(status_code=404, detail=msg)
    return {"success": True, "message": msg}


@app.post("/work-orders/{work_order_id}/compensate", summary="补偿入账")
def compensate(work_order_id: int, request: CompensateRequest, db: Session = Depends(get_db)):
    service = WorkOrderService(db)
    success, msg = service.compensate(
        work_order_id, request.amount, request.reason,
        request.executor, request.voucher_no
    )
    if not success:
        raise HTTPException(status_code=404, detail=msg)
    return {"success": True, "message": msg}


@app.post("/work-orders/{work_order_id}/close", summary="关闭工单")
def close_work_order(work_order_id: int, request: CloseRequest, db: Session = Depends(get_db)):
    service = WorkOrderService(db)
    success, msg = service.close(work_order_id, request.operator, request.remarks)
    if not success:
        raise HTTPException(status_code=404, detail=msg)
    return {"success": True, "message": msg}


@app.get("/dirty-clues", summary="获取脏记录列表")
def get_dirty_clues(dirty_type: Optional[str] = None, db: Session = Depends(get_db)):
    service = DirtyRecordService(db)
    dt_enum = DirtyType(dirty_type) if dirty_type else None
    clues = service.get_dirty_clues(dt_enum)
    return [
        {
            "id": c.id,
            "work_order_id": c.work_order_id,
            "source_type": c.source_type.value,
            "location": c.location,
            "dirty_type": c.dirty_type.value if c.dirty_type else None,
            "dirty_reason": c.dirty_reason,
            "original_content": c.original_content,
            "created_at": c.created_at
        }
        for c in clues
    ]


@app.get("/dirty-clues/summary", summary="脏记录统计")
def get_dirty_summary(db: Session = Depends(get_db)):
    service = DirtyRecordService(db)
    return service.get_dirty_summary()


@app.post("/dirty-clues/{clue_id}/correct", summary="修正脏记录")
def correct_clue(clue_id: int, request: CorrectClueRequest, db: Session = Depends(get_db)):
    service = DirtyRecordService(db)
    success, msg = service.correct_clue(
        clue_id, request.corrected_content, request.notes, request.operator
    )
    if not success:
        raise HTTPException(status_code=404, detail=msg)
    return {"success": True, "message": msg}


@app.get("/stats/retry-categories", summary="重试分类统计")
def get_retry_category_stats(days: int = 7, db: Session = Depends(get_db)):
    service = ReportService(db)
    return service.get_retry_category_summary(days)


@app.get("/stats/dead-letters", summary="死信处理统计")
def get_dead_letter_stats(db: Session = Depends(get_db)):
    service = ReportService(db)
    return service.get_dead_letter_summary()


@app.get("/stats/recovery", summary="恢复后续跑统计")
def get_recovery_stats(days: int = 7, db: Session = Depends(get_db)):
    service = ReportService(db)
    return service.get_recovery_summary(days)


@app.get("/stats/full", summary="完整统计报告")
def get_full_stats(db: Session = Depends(get_db)):
    service = ReportService(db)
    return service.get_full_report()


@app.get("/dead-letters", summary="获取死信列表")
def get_dead_letters(db: Session = Depends(get_db)):
    from .models import DeadLetter
    dls = db.query(DeadLetter).all()
    return [
        {
            "id": dl.id,
            "work_order_id": dl.work_order_id,
            "order_no": dl.order_no,
            "location": dl.location,
            "last_error": dl.last_error,
            "category": dl.category.value if dl.category else None,
            "retry_count": dl.retry_count,
            "resolved": dl.resolved,
            "arrived_at": dl.arrived_at,
            "resolved_at": dl.resolved_at
        }
        for dl in dls
    ]


@app.post("/dead-letters/{dl_id}/resolve", summary="解决死信")
def resolve_dead_letter(dl_id: int, request: ResolveDeadLetterRequest, db: Session = Depends(get_db)):
    service = ReportService(db)
    success, msg = service.resolve_dead_letter(
        dl_id, request.resolved_by, request.notes, request.recover_work_order
    )
    if not success:
        raise HTTPException(status_code=404, detail=msg)
    return {"success": True, "message": msg}


@app.get("/export/work-orders", summary="导出所有工单")
def export_work_orders(format: str = "json", db: Session = Depends(get_db)):
    service = ExportService(db)
    try:
        if format == "json":
            filepath = service.export_work_orders_json()
        elif format == "csv":
            filepath = service.export_work_orders_csv()
        elif format == "excel":
            filepath = service.export_work_orders_excel()
        else:
            raise HTTPException(status_code=400, detail=f"不支持的格式: {format}")
        
        return FileResponse(
            filepath,
            media_type="application/octet-stream",
            filename=filepath.split("/")[-1]
        )
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"缺少依赖: {e}")


@app.get("/export/work-orders/{work_order_id}", summary="导出单个工单")
def export_single_work_order(work_order_id: int, format: str = "json", db: Session = Depends(get_db)):
    service = ExportService(db)
    try:
        filepath = service.export_single_work_order(work_order_id, format=format)
        return FileResponse(
            filepath,
            media_type="application/octet-stream",
            filename=filepath.split("/")[-1]
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/export/list", summary="列出导出文件")
def list_exports(db: Session = Depends(get_db)):
    service = ExportService(db)
    return service.list_exports()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
