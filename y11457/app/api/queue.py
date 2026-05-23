from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, RolePermission
from app.models import User, UserRole, CompensationStatus, RetryCategory
from app.schemas import (
    CompensationQueueResponse, RetryLogResponse,
    ExternalReceiptSubmit, ManualTakeoverRequest,
    CompensationCloseRequest, RetryRequest
)
from app.services import QueueService, RetryLogService, ExternalService
from app.models import CompensationQueue

router = APIRouter(prefix="/queue", tags=["补偿队列"])


@router.get("/", response_model=List[CompensationQueueResponse])
async def list_queue(
    status: Optional[CompensationStatus] = None,
    city: Optional[str] = None,
    retry_category: Optional[RetryCategory] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CompensationQueue)
    
    if current_user.role != UserRole.SUPERVISOR and current_user.city:
        query = query.filter(CompensationQueue.city == current_user.city)
    elif city:
        query = query.filter(CompensationQueue.city == city)
    
    if status:
        query = query.filter(CompensationQueue.status == status)
    if retry_category:
        query = query.filter(CompensationQueue.retry_category == retry_category)
    
    queues = query.order_by(CompensationQueue.created_at.desc()).offset(skip).limit(limit).all()
    return queues


@router.get("/{queue_id}", response_model=CompensationQueueResponse)
async def get_queue_item(
    queue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    queue = db.query(CompensationQueue).filter(CompensationQueue.id == queue_id).first()
    if not queue:
        raise HTTPException(status_code=404, detail="队列记录不存在")
    
    if current_user.role != UserRole.SUPERVISOR and current_user.city and queue.city != current_user.city:
        raise HTTPException(status_code=403, detail="无权限查看此记录")
    
    return queue


@router.get("/{queue_id}/source")
async def get_queue_source(
    queue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    queue = db.query(CompensationQueue).filter(CompensationQueue.id == queue_id).first()
    if not queue:
        raise HTTPException(status_code=404, detail="队列记录不存在")
    
    source_record = QueueService.get_source_record(db, queue)
    if not source_record:
        return {"source_type": queue.source_type.value, "source_id": queue.source_id, "record": None}
    
    return {
        "source_type": queue.source_type.value,
        "source_id": queue.source_id,
        "source_table": queue.source_table,
        "record": {c.name: getattr(source_record, c.name) for c in source_record.__table__.columns}
    }


@router.get("/{queue_id}/logs", response_model=List[RetryLogResponse])
async def get_queue_logs(
    queue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    queue = db.query(CompensationQueue).filter(CompensationQueue.id == queue_id).first()
    if not queue:
        raise HTTPException(status_code=404, detail="队列记录不存在")
    
    logs = RetryLogService.get_by_queue_id(db, queue_id)
    return logs


@router.get("/{queue_id}/diff")
async def get_queue_diff(
    queue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    queue = db.query(CompensationQueue).filter(CompensationQueue.id == queue_id).first()
    if not queue:
        raise HTTPException(status_code=404, detail="队列记录不存在")
    
    logs = RetryLogService.get_by_queue_id(db, queue_id)
    
    diff_history = []
    for log in logs:
        diff_entry = {
            "retry_number": log.retry_number,
            "action": log.action,
            "created_at": log.created_at,
            "operator": log.operator_name,
            "status_diff": {
                "before": log.status_before,
                "after": log.status_after
            },
            "error_message": log.error_message,
            "full_diff": log.diff_data
        }
        diff_history.append(diff_entry)
    
    return {
        "queue_no": queue.queue_no,
        "current_status": queue.status.value,
        "retry_count": queue.retry_count,
        "diff_history": diff_history
    }


@router.post("/process")
async def process_queue_item(
    request: RetryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not RolePermission.can_perform_action(current_user.role, "update"):
        raise HTTPException(status_code=403, detail="权限不足")
    
    queue = db.query(CompensationQueue).filter(CompensationQueue.id == request.queue_id).first()
    if not queue:
        raise HTTPException(status_code=404, detail="队列记录不存在")
    
    if current_user.role != UserRole.SUPERVISOR and current_user.city and queue.city != current_user.city:
        raise HTTPException(status_code=403, detail="无权限操作此记录")
    
    success, result = QueueService.process_queue(db, queue, current_user)
    db.commit()
    
    return {
        "success": success,
        "queue_id": request.queue_id,
        "queue_no": queue.queue_no,
        "new_status": queue.status.value,
        "result": result
    }


@router.post("/process-batch")
async def process_batch(
    city: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not RolePermission.can_perform_action(current_user.role, "update"):
        raise HTTPException(status_code=403, detail="权限不足")
    
    from datetime import datetime
    query = db.query(CompensationQueue).filter(
        CompensationQueue.status.in_([CompensationStatus.QUEUED, CompensationStatus.RETRYING]),
        CompensationQueue.next_retry_at <= datetime.utcnow()
    )
    
    if current_user.role != UserRole.SUPERVISOR and current_user.city:
        query = query.filter(CompensationQueue.city == current_user.city)
    elif city:
        query = query.filter(CompensationQueue.city == city)
    
    queues = query.limit(limit).all()
    
    results = []
    for queue in queues:
        success, result = QueueService.process_queue(db, queue, current_user)
        results.append({
            "queue_id": queue.id,
            "queue_no": queue.queue_no,
            "success": success,
            "new_status": queue.status.value
        })
    
    db.commit()
    
    return {
        "processed_count": len(results),
        "results": results
    }


@router.post("/external-receipt")
async def submit_external_receipt(
    request: ExternalReceiptSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not RolePermission.can_perform_action(current_user.role, "update"):
        raise HTTPException(status_code=403, detail="权限不足")
    
    try:
        queue = ExternalService.submit_external_receipt(
            db=db,
            queue_id=request.queue_id,
            receipt_id=request.receipt_id,
            receipt_status=request.receipt_status,
            receipt_data=request.receipt_data,
            operator=current_user
        )
        db.commit()
        
        return {
            "success": True,
            "queue_id": queue.id,
            "queue_no": queue.queue_no,
            "new_status": queue.status.value
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/manual-takeover")
async def manual_takeover(
    request: ManualTakeoverRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not RolePermission.can_perform_action(current_user.role, "manual_takeover"):
        raise HTTPException(status_code=403, detail="权限不足")
    
    try:
        queue = QueueService.manual_takeover(db, request.queue_id, request.reason, current_user)
        db.commit()
        
        return {
            "success": True,
            "queue_id": queue.id,
            "queue_no": queue.queue_no,
            "assigned_to": current_user.full_name,
            "new_status": queue.status.value
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/close")
async def close_queue(
    request: CompensationCloseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not RolePermission.can_perform_action(current_user.role, "close"):
        raise HTTPException(status_code=403, detail="权限不足")
    
    try:
        queue = QueueService.close_queue(db, request.queue_id, request.close_reason, current_user)
        db.commit()
        
        return {
            "success": True,
            "queue_id": queue.id,
            "queue_no": queue.queue_no,
            "closed_by": current_user.full_name,
            "close_reason": request.close_reason
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/force-retry")
async def force_retry(
    request: RetryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not RolePermission.can_perform_action(current_user.role, "retry"):
        raise HTTPException(status_code=403, detail="权限不足")
    
    try:
        success, result = QueueService.force_retry(db, request.queue_id, current_user)
        db.commit()
        
        queue = db.query(CompensationQueue).filter(CompensationQueue.id == request.queue_id).first()
        
        return {
            "success": success,
            "queue_id": request.queue_id,
            "queue_no": queue.queue_no if queue else None,
            "new_status": queue.status.value if queue else None,
            "result": result
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
