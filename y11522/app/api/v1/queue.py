from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.queue_service import QueueService
from app.schemas.compensation_queue import (
    QueueItemResponse,
    QueueItemDetailResponse,
    QueueItemCreate,
    ReceiptSubmitRequest,
    ManualTakeoverRequest,
    CompensationRequest,
    CloseQueueRequest,
    StatusHistoryResponse,
)
from app.models.enums import QueueStatus, FailCategory

router = APIRouter(prefix="/queue", tags=["补偿队列"])


@router.post("/build/{appointment_no}", response_model=QueueItemResponse)
def build_queue_from_raw_data(
    appointment_no: str,
    operator: Optional[str] = None,
    db: Session = Depends(get_db),
):
    try:
        service = QueueService(db)
        item = service.build_queue_from_raw_data(appointment_no, operator)
        return item
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/", response_model=QueueItemResponse)
def create_queue_item(
    item_data: QueueItemCreate,
    operator: Optional[str] = None,
    db: Session = Depends(get_db),
):
    service = QueueService(db)
    return service.create_queue_item(item_data, operator)


@router.get("/", response_model=List[QueueItemResponse])
def list_queue_items(
    status: Optional[QueueStatus] = None,
    region: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    service = QueueService(db)
    return service.list_queue_items(status=status, region=region, skip=skip, limit=limit)


@router.get("/{queue_id}", response_model=QueueItemDetailResponse)
def get_queue_item(queue_id: int, db: Session = Depends(get_db)):
    service = QueueService(db)
    item = service.get_queue_item(queue_id)
    if not item:
        raise HTTPException(status_code=404, detail="队列项不存在")

    history = service.get_status_history(queue_id)
    item_data = QueueItemResponse.model_validate(item).model_dump()
    item_data["status_history"] = [StatusHistoryResponse.model_validate(h) for h in history]
    return item_data


@router.post("/{queue_id}/receipt", response_model=QueueItemResponse)
def submit_receipt(
    queue_id: int,
    request: ReceiptSubmitRequest,
    operator: Optional[str] = None,
    db: Session = Depends(get_db),
):
    try:
        service = QueueService(db)
        return service.submit_receipt(queue_id, request.receipt_data, operator)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{queue_id}/process", response_model=QueueItemResponse)
def mark_processing(
    queue_id: int,
    operator: Optional[str] = None,
    db: Session = Depends(get_db),
):
    try:
        service = QueueService(db)
        return service.mark_processing(queue_id, operator)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{queue_id}/fail", response_model=QueueItemResponse)
def mark_failed(
    queue_id: int,
    error: str,
    fail_category: FailCategory,
    operator: Optional[str] = None,
    db: Session = Depends(get_db),
):
    try:
        service = QueueService(db)
        return service.mark_failed(queue_id, error, fail_category, operator)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{queue_id}/retry", response_model=QueueItemResponse)
def retry_item(
    queue_id: int,
    operator: Optional[str] = None,
    db: Session = Depends(get_db),
):
    try:
        service = QueueService(db)
        return service.retry_item(queue_id, operator)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/retry/available", response_model=List[QueueItemResponse])
def get_items_for_retry(
    batch_size: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    service = QueueService(db)
    return service.get_items_for_retry(batch_size)


@router.post("/{queue_id}/manual", response_model=QueueItemResponse)
def manual_takeover(
    queue_id: int,
    request: ManualTakeoverRequest,
    db: Session = Depends(get_db),
):
    try:
        service = QueueService(db)
        return service.manual_takeover(queue_id, request.operator, request.note)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{queue_id}/compensation/start", response_model=QueueItemResponse)
def start_compensation(
    queue_id: int,
    request: CompensationRequest,
    db: Session = Depends(get_db),
):
    try:
        service = QueueService(db)
        return service.start_compensation(queue_id, request.amount, request.reason, request.operator)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{queue_id}/compensation/complete", response_model=QueueItemResponse)
def complete_compensation(
    queue_id: int,
    operator: str,
    db: Session = Depends(get_db),
):
    try:
        service = QueueService(db)
        return service.complete_compensation(queue_id, operator)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{queue_id}/close", response_model=QueueItemResponse)
def close_queue_item(
    queue_id: int,
    request: CloseQueueRequest,
    db: Session = Depends(get_db),
):
    try:
        service = QueueService(db)
        return service.close_queue_item(queue_id, request.reason, request.operator)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{queue_id}/history", response_model=List[StatusHistoryResponse])
def get_status_history(queue_id: int, db: Session = Depends(get_db)):
    service = QueueService(db)
    return service.get_status_history(queue_id)
