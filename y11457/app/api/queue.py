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
from app.utils import filter_response_by_role, filter_list_response_by_role, check_city_permission, filter_by_role, model_to_dict_safe
from app.models import CompensationQueue

router = APIRouter(prefix="/queue", tags=["补偿队列"])


@router.get("/")
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
    return filter_list_response_by_role(queues, current_user, "compensation_queues")


@router.get("/{queue_id}")
async def get_queue_item(
    queue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    queue = db.query(CompensationQueue).filter(CompensationQueue.id == queue_id).first()
    if not queue:
        raise HTTPException(status_code=404, detail="队列记录不存在")
    
    if not check_city_permission(current_user, queue.city):
        raise HTTPException(status_code=403, detail="无权限查看此城市的记录")
    
    return filter_response_by_role(queue, current_user, "compensation_queues")


@router.get("/{queue_id}/source")
async def get_queue_source(
    queue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    queue = db.query(CompensationQueue).filter(CompensationQueue.id == queue_id).first()
    if not queue:
        raise HTTPException(status_code=404, detail="队列记录不存在")
    
    if not check_city_permission(current_user, queue.city):
        raise HTTPException(status_code=403, detail="无权限查看此城市的记录")
    
    if current_user.role == UserRole.DATA_ENTRY or current_user.role == UserRole.READ_ONLY:
        return {
            "source_type": queue.source_type.value,
            "source_id": queue.source_id,
            "source_table": queue.source_table,
            "record": None,
            "message": "无权限查看源数据详情"
        }
    
    source_record = QueueService.get_source_record(db, queue)
    if not source_record:
        return {"source_type": queue.source_type.value, "source_id": queue.source_id, "record": None}
    
    source_data = model_to_dict_safe(source_record)
    filtered_source = filter_by_role(source_data, current_user.role, queue.source_table)
    
    return {
        "source_type": queue.source_type.value,
        "source_id": queue.source_id,
        "source_table": queue.source_table,
        "record": filtered_source
    }


@router.get("/{queue_id}/logs")
async def get_queue_logs(
    queue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    queue = db.query(CompensationQueue).filter(CompensationQueue.id == queue_id).first()
    if not queue:
        raise HTTPException(status_code=404, detail="队列记录不存在")
    
    if not check_city_permission(current_user, queue.city):
        raise HTTPException(status_code=403, detail="无权限查看此城市的记录")
    
    if current_user.role == UserRole.DATA_ENTRY or current_user.role == UserRole.READ_ONLY:
        return []
    
    logs = RetryLogService.get_by_queue_id(db, queue_id)
    return [model_to_dict_safe(log) for log in logs]


@router.get("/{queue_id}/diff")
async def get_queue_diff(
    queue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    queue = db.query(CompensationQueue).filter(CompensationQueue.id == queue_id).first()
    if not queue:
        raise HTTPException(status_code=404, detail="队列记录不存在")
    
    if not check_city_permission(current_user, queue.city):
        raise HTTPException(status_code=403, detail="无权限查看此城市的记录")
    
    if current_user.role == UserRole.DATA_ENTRY or current_user.role == UserRole.READ_ONLY:
        return {
            "queue_no": queue.queue_no,
            "current_status": queue.status.value,
            "retry_count": queue.retry_count,
            "diff_history": [],
            "message": "无权限查看差异详情"
        }
    
    logs = RetryLogService.get_by_queue_id(db, queue_id)
    
    diff_history = []
    for log in logs:
        diff_entry = {
            "retry_number": log.retry_number,
            "action": log.action,
            "created_at": log.created_at.isoformat() if log.created_at else None,
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
    
    if not check_city_permission(current_user, queue.city):
        raise HTTPException(status_code=403, detail="无权限操作此城市的记录")
    
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
    
    queue = db.query(CompensationQueue).filter(CompensationQueue.id == request.queue_id).first()
    if not queue:
        raise HTTPException(status_code=404, detail="队列记录不存在")
    
    if not check_city_permission(current_user, queue.city):
        raise HTTPException(status_code=403, detail="无权限操作此城市的记录")
    
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
    
    queue = db.query(CompensationQueue).filter(CompensationQueue.id == request.queue_id).first()
    if queue and not check_city_permission(current_user, queue.city):
        raise HTTPException(status_code=403, detail="无权限操作此城市的记录")
    
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
    
    queue = db.query(CompensationQueue).filter(CompensationQueue.id == request.queue_id).first()
    if queue and not check_city_permission(current_user, queue.city):
        raise HTTPException(status_code=403, detail="无权限操作此城市的记录")
    
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
    
    queue = db.query(CompensationQueue).filter(CompensationQueue.id == request.queue_id).first()
    if queue and not check_city_permission(current_user, queue.city):
        raise HTTPException(status_code=403, detail="无权限操作此城市的记录")
    
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
