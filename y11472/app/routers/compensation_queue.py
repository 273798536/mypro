from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_
from app.database import get_db
from app.auth import get_current_active_user, require_roles
from app import models, schemas
from app.enums import UserRole, CompensationStatus
from app.services import CompensationQueueService, AuditService, ProcurementViewService
from app.system_checks import SystemChecker

router = APIRouter(prefix="/api/compensation-queue", tags=["补偿队列"])


@router.get("/", response_model=List[schemas.CompensationQueue])
def list_queue(
    skip: int = 0,
    limit: int = 100,
    status: Optional[CompensationStatus] = None,
    application_id: Optional[int] = None,
    is_frozen: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    query = db.query(models.CompensationQueue)

    if status:
        query = query.filter(models.CompensationQueue.status == status)
    if application_id:
        query = query.filter(models.CompensationQueue.application_id == application_id)
    if is_frozen is not None:
        query = query.filter(models.CompensationQueue.is_frozen == is_frozen)

    return query.order_by(desc(models.CompensationQueue.created_at)).offset(skip).limit(limit).all()


@router.get("/stats", response_model=schemas.QueueStats)
def get_queue_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.PROCUREMENT_STAFF, UserRole.ADMIN)),
):
    return ProcurementViewService.get_queue_stats(db)


@router.get("/retryable-categories", response_model=List[schemas.RetryableCategory])
def get_retryable_categories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.PROCUREMENT_STAFF, UserRole.ADMIN)),
):
    return ProcurementViewService.get_retryable_categories(db)


@router.get("/dead-letter-analysis", response_model=schemas.DeadLetterAnalysis)
def get_dead_letter_analysis(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.PROCUREMENT_STAFF, UserRole.ADMIN)),
):
    return ProcurementViewService.get_dead_letter_analysis(db)


@router.get("/{queue_id}", response_model=schemas.CompensationQueue)
def get_queue_item(
    queue_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    queue = db.query(models.CompensationQueue).filter(
        models.CompensationQueue.id == queue_id
    ).first()
    if not queue:
        raise HTTPException(status_code=404, detail="队列项不存在")
    return queue


@router.post("/{queue_id}/process", response_model=schemas.CompensationQueue)
def process_queue_item(
    queue_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.PROCUREMENT_STAFF, UserRole.ADMIN)),
):
    try:
        queue = CompensationQueueService.process_queue_item(db, queue_id, current_user)
        db.commit()
        db.refresh(queue)
        return queue
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{queue_id}/manual-review", response_model=schemas.CompensationQueue)
def manual_review(
    queue_id: int,
    change_reason: str = Query(..., description="人工介入原因"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.PROCUREMENT_STAFF, UserRole.ADMIN)),
):
    try:
        queue = CompensationQueueService.manual_review(db, queue_id, current_user, change_reason)
        db.commit()
        db.refresh(queue)
        return queue
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{queue_id}/manual-resolve", response_model=schemas.CompensationQueue)
def manual_resolve(
    queue_id: int,
    request: schemas.ManualResolveRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.PROCUREMENT_STAFF, UserRole.ADMIN)),
):
    try:
        queue = CompensationQueueService.manual_resolve(db, queue_id, current_user, request)
        db.commit()
        db.refresh(queue)
        return queue
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{queue_id}/freeze", response_model=schemas.CompensationQueue)
def freeze_queue(
    queue_id: int,
    request: schemas.FreezeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.PROCUREMENT_STAFF, UserRole.ADMIN)),
):
    try:
        queue = CompensationQueueService.freeze_queue(
            db, queue_id, current_user, request.hours, request.reason
        )
        db.commit()
        db.refresh(queue)
        return queue
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{queue_id}/unfreeze", response_model=schemas.CompensationQueue)
def unfreeze_queue(
    queue_id: int,
    change_reason: str = Query("人工解冻", description="解冻原因"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.PROCUREMENT_STAFF, UserRole.ADMIN)),
):
    try:
        queue = CompensationQueueService.unfreeze_queue(db, queue_id, current_user, change_reason)
        db.commit()
        db.refresh(queue)
        return queue
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{queue_id}/close", response_model=schemas.CompensationQueue)
def close_queue(
    queue_id: int,
    change_reason: str = Query(..., description="关闭原因"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.PROCUREMENT_STAFF, UserRole.ADMIN)),
):
    try:
        queue = CompensationQueueService.close_queue(db, queue_id, current_user, change_reason)
        db.commit()
        db.refresh(queue)
        return queue
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{queue_id}/recover-dead-letter", response_model=schemas.CompensationQueue)
def recover_dead_letter(
    queue_id: int,
    change_reason: str = Query(..., description="恢复原因"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.PROCUREMENT_STAFF, UserRole.ADMIN)),
):
    try:
        queue = CompensationQueueService.recover_dead_letter(db, queue_id, current_user, change_reason)
        db.commit()
        db.refresh(queue)
        return queue
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/process-pending")
def process_pending_queues(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.PROCUREMENT_STAFF, UserRole.ADMIN)),
):
    from datetime import datetime

    pending_queues = db.query(models.CompensationQueue).filter(
        and_(
            models.CompensationQueue.status.in_([
                CompensationStatus.QUEUED,
                CompensationStatus.RETRYING,
            ]),
            models.CompensationQueue.is_frozen == False,
            or_(
                models.CompensationQueue.next_retry_at == None,
                models.CompensationQueue.next_retry_at <= datetime.now(),
            ),
        )
    ).all()

    results = []
    for queue in pending_queues[:10]:
        try:
            CompensationQueueService.process_queue_item(db, queue.id, current_user)
            results.append({"queue_no": queue.queue_no, "status": "processed"})
        except Exception as e:
            results.append({"queue_no": queue.queue_no, "status": "error", "error": str(e)})

    db.commit()
    return {"processed": len(results), "results": results}


@router.get("/system-checks/run", response_model=List[schemas.SystemCheckResult])
def run_system_checks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(UserRole.ADMIN, UserRole.PROCUREMENT_STAFF)),
):
    return SystemChecker.run_all_checks(db, current_user)
