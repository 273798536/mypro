from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import QueueStatus, RetryCategory
from app.schemas import (
    QueueSubmitRequest, QueueRetryRequest, ManualDecisionRequest,
    FreezeRequest, CloseRequest, CancelRequest, DeadLetterRecoveryRequest,
    QueueDetailResponse, PaginatedResponse, FinanceSummaryResponse
)
from app.services import QueueService
from app.export_service import ExportService

router = APIRouter(prefix="/api/v1/return-compensation", tags=["return-compensation"])


@router.post("/submit", response_model=dict)
def submit_queue(request: QueueSubmitRequest, db: Session = Depends(get_db)):
    try:
        service = QueueService(db)
        queue, is_new = service.submit(request)
        return {
            "success": True,
            "data": {
                "queue_id": queue.id,
                "batch_no": queue.batch_no,
                "status": queue.status.value,
                "is_new": is_new
            },
            "message": "提交成功" if is_new else "重复提交已处理"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"系统错误: {str(e)}")


@router.post("/{queue_id}/process", response_model=dict)
def process_queue(queue_id: int, db: Session = Depends(get_db)):
    try:
        service = QueueService(db)
        queue = service.process_queue(queue_id)
        return {
            "success": True,
            "data": {
                "queue_id": queue.id,
                "status": queue.status.value,
                "deposit_amount": queue.deposit_amount,
                "compensation_amount": queue.compensation_amount,
                "actual_deduction": queue.actual_deduction
            },
            "message": "处理成功"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"系统错误: {str(e)}")


@router.post("/{queue_id}/retry", response_model=dict)
def retry_queue(queue_id: int, request: QueueRetryRequest, db: Session = Depends(get_db)):
    try:
        service = QueueService(db)
        queue = service.retry(queue_id, request)
        return {
            "success": True,
            "data": {
                "queue_id": queue.id,
                "status": queue.status.value,
                "retry_count": queue.retry_count
            },
            "message": "重试已触发"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"系统错误: {str(e)}")


@router.post("/{queue_id}/manual-decision", response_model=dict)
def manual_decision(queue_id: int, request: ManualDecisionRequest, db: Session = Depends(get_db)):
    try:
        service = QueueService(db)
        queue = service.manual_decision(queue_id, request)
        return {
            "success": True,
            "data": {
                "queue_id": queue.id,
                "status": queue.status.value,
                "manual_decision": queue.manual_decision,
                "compensation_amount": queue.compensation_amount,
                "actual_deduction": queue.actual_deduction
            },
            "message": "人工决策已记录"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"系统错误: {str(e)}")


@router.post("/{queue_id}/freeze", response_model=dict)
def freeze_queue(queue_id: int, request: FreezeRequest, db: Session = Depends(get_db)):
    try:
        service = QueueService(db)
        queue = service.freeze(queue_id, request)
        return {
            "success": True,
            "data": {
                "queue_id": queue.id,
                "is_frozen": queue.is_frozen,
                "frozen_at": queue.frozen_at,
                "frozen_reason": queue.frozen_reason
            },
            "message": "队列已冻结"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"系统错误: {str(e)}")


@router.post("/{queue_id}/unfreeze", response_model=dict)
def unfreeze_queue(queue_id: int, operator: str, db: Session = Depends(get_db)):
    try:
        service = QueueService(db)
        queue = service.unfreeze(queue_id, operator)
        return {
            "success": True,
            "data": {
                "queue_id": queue.id,
                "is_frozen": queue.is_frozen,
                "status": queue.status.value
            },
            "message": "队列已解冻"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"系统错误: {str(e)}")


@router.post("/{queue_id}/close", response_model=dict)
def close_queue(queue_id: int, request: CloseRequest, db: Session = Depends(get_db)):
    try:
        service = QueueService(db)
        queue = service.close(queue_id, request)
        return {
            "success": True,
            "data": {
                "queue_id": queue.id,
                "status": queue.status.value,
                "closed_at": queue.closed_at,
                "closed_by": queue.closed_by
            },
            "message": "队列已关闭"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"系统错误: {str(e)}")


@router.post("/{queue_id}/cancel", response_model=dict)
def cancel_queue(queue_id: int, request: CancelRequest, db: Session = Depends(get_db)):
    try:
        service = QueueService(db)
        queue = service.cancel(queue_id, request)
        return {
            "success": True,
            "data": {
                "queue_id": queue.id,
                "status": queue.status.value
            },
            "message": "队列已撤回"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"系统错误: {str(e)}")


@router.post("/dead-letter/recover", response_model=dict)
def recover_dead_letters(request: DeadLetterRecoveryRequest, db: Session = Depends(get_db)):
    try:
        service = QueueService(db)
        queues = service.recover_dead_letters(request)
        return {
            "success": True,
            "data": {
                "recovered_count": len(queues),
                "queue_ids": [q.id for q in queues]
            },
            "message": f"已恢复 {len(queues)} 条死信记录"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"系统错误: {str(e)}")


@router.get("/{queue_id}", response_model=QueueDetailResponse)
def get_queue_detail(queue_id: int, db: Session = Depends(get_db)):
    service = QueueService(db)
    queue = service.get_queue(queue_id)
    if not queue:
        raise HTTPException(status_code=404, detail="队列记录不存在")
    return queue


@router.get("", response_model=PaginatedResponse)
def list_queues(
    status: Optional[QueueStatus] = None,
    retry_category: Optional[RetryCategory] = None,
    customer_id: Optional[str] = None,
    is_frozen: Optional[bool] = None,
    is_manual: Optional[bool] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db)
):
    service = QueueService(db)
    items, total = service.list_queues(
        status=status,
        retry_category=retry_category,
        customer_id=customer_id,
        is_frozen=is_frozen,
        is_manual=is_manual,
        page=page,
        page_size=page_size
    )
    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items
    )


@router.get("/finance/summary", response_model=FinanceSummaryResponse)
def get_finance_summary(db: Session = Depends(get_db)):
    service = QueueService(db)
    return service.get_finance_summary()


@router.get("/dead-letter/categories", response_model=dict)
def get_dead_letter_categories(db: Session = Depends(get_db)):
    service = QueueService(db)
    categories = service.get_dead_letter_retry_categories()
    return {
        "success": True,
        "data": categories
    }


@router.get("/export/queues")
def export_queues(
    status: Optional[QueueStatus] = None,
    retry_category: Optional[RetryCategory] = None,
    customer_id: Optional[str] = None,
    is_frozen: Optional[bool] = None,
    is_manual: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    service = ExportService(db)
    excel_data = service.export_queues_to_excel(
        status=status,
        retry_category=retry_category,
        customer_id=customer_id,
        is_frozen=is_frozen,
        is_manual=is_manual
    )
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=return_compensation_queues.xlsx"}
    )


@router.get("/export/history")
def export_operation_history(queue_id: Optional[int] = None, db: Session = Depends(get_db)):
    service = ExportService(db)
    excel_data = service.export_operation_history_to_excel(queue_id=queue_id)
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=operation_history.xlsx"}
    )


@router.get("/export/finance-report")
def export_finance_report(db: Session = Depends(get_db)):
    service = ExportService(db)
    excel_data = service.export_finance_report()
    return Response(
        content=excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=finance_report.xlsx"}
    )
