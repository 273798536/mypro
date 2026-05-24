from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.schemas import (
    ReceiptQueueResponse, ReceiptQueueListResponse,
    LogisticsReceiptCreate, BorrowRecordCreate,
    StoreTransferCreate, ManualReviewRequest,
    CompensationRequest, CloseRequest, RetryRequest,
    DeadLetterRecoverRequest
)
from app.services.queue_service import QueueService

router = APIRouter(prefix="/queue", tags=["回执队列"])


@router.post("/logistics", response_model=ReceiptQueueResponse)
def submit_logistics(
    data: LogisticsReceiptCreate,
    db: Session = Depends(get_db)
):
    try:
        return QueueService.submit_logistics_receipt(db, data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/borrow", response_model=ReceiptQueueResponse)
def submit_borrow(
    data: BorrowRecordCreate,
    db: Session = Depends(get_db)
):
    try:
        return QueueService.submit_borrow_record(db, data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/store-transfer", response_model=ReceiptQueueResponse)
def submit_store_transfer(
    data: StoreTransferCreate,
    db: Session = Depends(get_db)
):
    try:
        return QueueService.submit_store_transfer(db, data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{queue_id}", response_model=ReceiptQueueResponse)
def get_queue_item(
    queue_id: int,
    db: Session = Depends(get_db)
):
    item = QueueService.get_queue_item(db, queue_id)
    if not item:
        raise HTTPException(status_code=404, detail="队列项不存在")
    return item


@router.get("/no/{queue_no}", response_model=ReceiptQueueResponse)
def get_queue_by_no(
    queue_no: str,
    db: Session = Depends(get_db)
):
    item = QueueService.get_queue_by_no(db, queue_no)
    if not item:
        raise HTTPException(status_code=404, detail="队列项不存在")
    return item


@router.get("", response_model=ReceiptQueueListResponse)
def list_queue(
    status: Optional[str] = None,
    source_type: Optional[str] = None,
    is_dirty: Optional[bool] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db)
):
    status_list = status.split(",") if status else None
    source_list = source_type.split(",") if source_type else None

    items, total = QueueService.list_queue(
        db, status_list, source_list, is_dirty, page, page_size
    )

    return ReceiptQueueListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("/{queue_id}/retry", response_model=ReceiptQueueResponse)
def retry_queue_item(
    queue_id: int,
    data: RetryRequest,
    db: Session = Depends(get_db)
):
    try:
        return QueueService.process_retry(db, queue_id, data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{queue_id}/manual-review", response_model=ReceiptQueueResponse)
def manual_review(
    queue_id: int,
    data: ManualReviewRequest,
    db: Session = Depends(get_db)
):
    try:
        return QueueService.manual_review(db, queue_id, data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{queue_id}/compensate", response_model=ReceiptQueueResponse)
def compensate(
    queue_id: int,
    data: CompensationRequest,
    db: Session = Depends(get_db)
):
    try:
        return QueueService.compensate(db, queue_id, data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{queue_id}/close", response_model=ReceiptQueueResponse)
def close_queue_item(
    queue_id: int,
    data: CloseRequest,
    db: Session = Depends(get_db)
):
    try:
        return QueueService.close(db, queue_id, data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{queue_id}/recover", response_model=ReceiptQueueResponse)
def recover_dead_letter(
    queue_id: int,
    data: DeadLetterRecoverRequest,
    db: Session = Depends(get_db)
):
    try:
        return QueueService.recover_dead_letter(db, queue_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
