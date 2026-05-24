from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import (
    get_current_active_user,
    RoleChecker
)
from app.models.auth import User
from app.models.business import CompensationQueue, FailedRecord
from app.schemas.business import (
    CompensationQueueItem,
    QueueStatisticsResponse,
    FailedRecordItem,
    ManualHandleRequest
)
from app.schemas.common import DataResponse, ListResponse
from app.services.queue_service import CompensationQueueService, QueueStatus

router = APIRouter()
allow_supervisor = RoleChecker(["supervisor"])
allow_reviewer = RoleChecker(["reviewer", "supervisor"])


@router.get("/statistics", response_model=DataResponse[QueueStatisticsResponse])
async def get_queue_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_reviewer)
) -> Any:
    queue_service = CompensationQueueService(db)
    stats = queue_service.get_queue_statistics()
    return DataResponse(success=True, data=stats)


@router.get("/", response_model=ListResponse[CompensationQueueItem])
async def get_queue_items(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    business_type: Optional[str] = Query(None),
    error_code: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_reviewer)
) -> Any:
    query = db.query(CompensationQueue)
    
    if status:
        query = query.filter(CompensationQueue.status == status)
    if business_type:
        query = query.filter(CompensationQueue.business_type == business_type)
    if error_code:
        query = query.filter(CompensationQueue.error_code == error_code)
    
    total = query.count()
    items = query.order_by(CompensationQueue.updated_at.desc())\
        .offset((page - 1) * page_size)\
        .limit(page_size)\
        .all()
    
    return ListResponse(
        success=True,
        data=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/dead-letter", response_model=ListResponse[CompensationQueueItem])
async def get_dead_letter_queue(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_supervisor)
) -> Any:
    queue_service = CompensationQueueService(db)
    items = queue_service.get_dead_letter_queue(skip=(page - 1) * page_size, limit=page_size)
    total = db.query(CompensationQueue).filter(CompensationQueue.status == QueueStatus.DEAD_LETTER).count()
    
    return ListResponse(
        success=True,
        data=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.post("/{queue_id}/manual-handle", response_model=DataResponse)
async def manual_handle_queue_item(
    queue_id: int,
    request: ManualHandleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_supervisor)
) -> Any:
    queue_service = CompensationQueueService(db)
    result = queue_service.manual_handle(queue_id, current_user, request.action, request.note)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "处理失败"))
    
    return DataResponse(success=True, message=result.get("message", "处理成功"))


@router.post("/dead-letter/retry-all", response_model=DataResponse)
async def retry_all_dead_letters(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_supervisor)
) -> Any:
    queue_service = CompensationQueueService(db)
    result = queue_service.retry_all_dead_letters(current_user)
    return DataResponse(success=True, data=result, message=f"已重试 {result['retried_count']}/{result['total_count']} 条死信")


@router.post("/{queue_id}/process", response_model=DataResponse)
async def process_queue_item(
    queue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_supervisor)
) -> Any:
    queue_service = CompensationQueueService(db)
    result = queue_service.process_item(queue_id)
    
    if not result["success"]:
        return DataResponse(success=False, message=result.get("error", "处理失败"))
    
    return DataResponse(success=True, data=result.get("data"), message="处理成功")


@router.get("/failed-records", response_model=ListResponse[FailedRecordItem])
async def get_failed_records(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    business_type: Optional[str] = Query(None),
    is_resolved: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_reviewer)
) -> Any:
    query = db.query(FailedRecord)
    
    if business_type:
        query = query.filter(FailedRecord.business_type == business_type)
    if is_resolved:
        query = query.filter(FailedRecord.is_resolved == is_resolved)
    
    total = query.count()
    items = query.order_by(FailedRecord.created_at.desc())\
        .offset((page - 1) * page_size)\
        .limit(page_size)\
        .all()
    
    return ListResponse(
        success=True,
        data=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.post("/failed-records/{failed_id}/resolve", response_model=DataResponse)
async def resolve_failed_record(
    failed_id: int,
    resolution_note: str = Query(..., description="处理说明"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: bool = Depends(allow_supervisor)
) -> Any:
    from app.services.idempotent_service import IdempotentService
    
    failed = IdempotentService.resolve_failed_record(
        db=db,
        failed_id=failed_id,
        user_id=current_user.id,
        resolution_note=resolution_note
    )
    
    if not failed:
        raise HTTPException(status_code=404, detail="失败记录不存在")
    
    return DataResponse(success=True, message="标记为已解决")
