from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.enums import ReceiptStatus
from app.models import ExceptionReceipt
from app.schemas import (
    ExceptionReceiptResponse,
    ExceptionReceiptDetail,
    ReviewRequest,
    OverruleRequest,
    FreezeRequest,
    UnfreezeRequest,
    CancelRequest,
    ArchiveRequest
)
from app.services.review_service import ReviewService

router = APIRouter(prefix="/receipts", tags=["回执管理"])


@router.get("/", response_model=List[ExceptionReceiptResponse])
async def list_receipts(
    city: Optional[str] = Query(None, description="城市"),
    status: Optional[ReceiptStatus] = Query(None, description="状态"),
    is_frozen: Optional[bool] = Query(None, description="是否冻结"),
    is_manually_overruled: Optional[bool] = Query(None, description="是否人工改判"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(ExceptionReceipt)
    
    if city:
        query = query.filter(ExceptionReceipt.city == city)
    if status:
        query = query.filter(ExceptionReceipt.current_status == status)
    if is_frozen is not None:
        query = query.filter(ExceptionReceipt.is_frozen == is_frozen)
    if is_manually_overruled is not None:
        query = query.filter(ExceptionReceipt.is_manually_overruled == is_manually_overruled)
    
    receipts = query.order_by(ExceptionReceipt.id.desc()).offset(skip).limit(limit).all()
    return receipts


@router.get("/{receipt_id}", response_model=ExceptionReceiptDetail)
async def get_receipt_detail(
    receipt_id: int,
    db: Session = Depends(get_db)
):
    receipt = db.query(ExceptionReceipt).filter(ExceptionReceipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="回执不存在")
    return receipt


@router.post("/review")
async def batch_review(
    request: ReviewRequest,
    db: Session = Depends(get_db)
):
    review_service = ReviewService(db)
    result = review_service.batch_review(
        receipt_ids=request.receipt_ids,
        review_result=request.review_result,
        operator=request.operator,
        review_channel=request.review_channel,
        review_remark=request.review_remark,
        compensate_amount=request.compensate_amount,
        responsibility=request.responsibility
    )
    return result


@router.post("/overrule")
async def overrule_receipt(
    request: OverruleRequest,
    db: Session = Depends(get_db)
):
    review_service = ReviewService(db)
    success = review_service.overrule(
        receipt_id=request.receipt_id,
        new_status=request.new_status,
        overrule_reason=request.overrule_reason,
        operator=request.operator,
        new_compensate_amount=request.new_compensate_amount,
        new_responsibility=request.new_responsibility
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="改判失败，可能是状态不允许或回执已冻结")
    
    return {"success": True, "message": "改判成功"}


@router.post("/freeze")
async def batch_freeze(
    request: FreezeRequest,
    db: Session = Depends(get_db)
):
    review_service = ReviewService(db)
    result = review_service.batch_freeze(
        receipt_ids=request.receipt_ids,
        freeze_reason=request.freeze_reason,
        operator=request.operator
    )
    return result


@router.post("/unfreeze")
async def batch_unfreeze(
    request: UnfreezeRequest,
    db: Session = Depends(get_db)
):
    review_service = ReviewService(db)
    result = review_service.batch_unfreeze(
        receipt_ids=request.receipt_ids,
        unfreeze_reason=request.unfreeze_reason,
        operator=request.operator
    )
    return result


@router.post("/cancel")
async def batch_cancel(
    request: CancelRequest,
    db: Session = Depends(get_db)
):
    review_service = ReviewService(db)
    result = review_service.batch_cancel(
        receipt_ids=request.receipt_ids,
        cancel_reason=request.cancel_reason,
        operator=request.operator
    )
    return result


@router.post("/archive")
async def batch_archive(
    request: ArchiveRequest,
    db: Session = Depends(get_db)
):
    review_service = ReviewService(db)
    result = review_service.batch_archive(
        receipt_ids=request.receipt_ids,
        operator=request.operator,
        archive_remark=request.archive_remark
    )
    return result
