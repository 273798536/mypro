from typing import List, Optional
from collections import defaultdict
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.enums import ReceiptStatus
from app.models import ExceptionReceipt
from app.schemas import CitySummaryItem, ExportSummaryItem

router = APIRouter(prefix="/reports", tags=["报表管理"])


@router.get("/city-summary", response_model=List[CitySummaryItem])
async def get_city_summary(
    city: Optional[str] = Query(None, description="指定城市"),
    db: Session = Depends(get_db)
):
    query = db.query(ExceptionReceipt)
    if city:
        query = query.filter(ExceptionReceipt.city == city)
    
    receipts = query.all()

    city_stats = defaultdict(lambda: {
        "total_count": 0,
        "pending_count": 0,
        "approved_count": 0,
        "rejected_count": 0,
        "frozen_count": 0,
        "total_refund_amount": 0,
        "total_compensate_amount": 0,
        "total_amount_diff": 0,
        "manually_overruled_count": 0
    })

    for receipt in receipts:
        if not receipt.city:
            continue
            
        stats = city_stats[receipt.city]
        stats["total_count"] += 1
        stats["total_refund_amount"] += receipt.refund_amount or 0
        stats["total_compensate_amount"] += receipt.compensate_amount or 0
        stats["total_amount_diff"] += receipt.amount_diff or 0

        if receipt.current_status == ReceiptStatus.PENDING:
            stats["pending_count"] += 1
        elif receipt.current_status == ReceiptStatus.APPROVED:
            stats["approved_count"] += 1
        elif receipt.current_status == ReceiptStatus.REJECTED:
            stats["rejected_count"] += 1

        if receipt.is_frozen:
            stats["frozen_count"] += 1

        if receipt.is_manually_overruled:
            stats["manually_overruled_count"] += 1

    summary_items = []
    for city_name, stats in city_stats.items():
        summary_items.append(CitySummaryItem(
            city=city_name,
            **stats
        ))

    return summary_items


@router.get("/export-summary", response_model=List[ExportSummaryItem])
async def get_export_summary(
    city: Optional[str] = Query(None, description="城市"),
    is_frozen: Optional[bool] = Query(None, description="是否冻结"),
    db: Session = Depends(get_db)
):
    query = db.query(ExceptionReceipt)
    
    if city:
        query = query.filter(ExceptionReceipt.city == city)
    if is_frozen is not None:
        query = query.filter(ExceptionReceipt.is_frozen == is_frozen)
    
    receipts = query.order_by(ExceptionReceipt.id.desc()).all()

    export_items = []
    for receipt in receipts:
        export_items.append(ExportSummaryItem(
            receipt_no=receipt.receipt_no,
            order_no=receipt.order_no,
            city=receipt.city or "未知",
            leader_name=receipt.leader_name or "未知",
            exception_type=receipt.exception_type.value,
            current_status=receipt.current_status.value,
            status_before_freeze=receipt.status_before_freeze.value if receipt.status_before_freeze else None,
            is_frozen=receipt.is_frozen,
            is_manually_overruled=receipt.is_manually_overruled,
            manual_review_reason=receipt.manual_review_reason,
            refund_amount=receipt.refund_amount,
            compensate_amount=receipt.compensate_amount,
            amount_diff=receipt.amount_diff,
            responsibility=receipt.responsibility,
            latest_review_remark=receipt.latest_review_remark,
            reviewed_at=receipt.reviewed_at,
            created_at=receipt.created_at
        ))

    return export_items
