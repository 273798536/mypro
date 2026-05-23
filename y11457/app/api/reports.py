from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import StringIO
import csv

from app.database import get_db
from app.auth import get_current_user
from app.models import User, UserRole, CompensationStatus
from app.schemas import (
    ReportSummary, RetryCategoryReport, DeadLetterReport,
    FailedRecordResponse
)
from app.services import ReportService, FailedRecordService
from app.models import FailedRecord

router = APIRouter(prefix="/reports", tags=["报表"])


@router.get("/summary", response_model=List[ReportSummary])
async def get_summary_report(
    city: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.SUPERVISOR and current_user.city:
        city = current_user.city
    
    summaries = ReportService.get_city_summary(db, city)
    return summaries


@router.get("/retry-categories", response_model=List[RetryCategoryReport])
async def get_retry_category_report(
    city: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.SUPERVISOR and current_user.city:
        city = current_user.city
    
    report = ReportService.get_retry_category_report(db, city)
    return report


@router.get("/dead-letters", response_model=List[DeadLetterReport])
async def get_dead_letter_report(
    city: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.SUPERVISOR and current_user.city:
        city = current_user.city
    
    report = ReportService.get_dead_letter_report(db, city)
    return report


@router.get("/issue-types")
async def get_issue_type_distribution(
    city: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.SUPERVISOR and current_user.city:
        city = current_user.city
    
    distribution = ReportService.get_issue_type_distribution(db, city)
    return distribution


@router.get("/failed-records", response_model=List[FailedRecordResponse])
async def get_failed_records(
    city: Optional[str] = None,
    unresolved_only: bool = True,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.SUPERVISOR and current_user.city:
        city = current_user.city
    
    query = db.query(FailedRecord)
    
    if city:
        query = query.filter(FailedRecord.city == city)
    
    if unresolved_only:
        query = query.filter(FailedRecord.is_resolved == False)
    
    records = query.order_by(FailedRecord.created_at.desc()).offset(skip).limit(limit).all()
    return records


@router.post("/failed-records/{record_id}/resolve")
async def resolve_failed_record(
    record_id: int,
    resolution_note: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == UserRole.READ_ONLY:
        raise HTTPException(status_code=403, detail="权限不足")
    
    try:
        record = FailedRecordService.resolve(db, record_id, resolution_note, current_user)
        db.commit()
        
        return {
            "success": True,
            "record_id": record.id,
            "resolved_by": current_user.full_name,
            "resolution_note": resolution_note
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/export/summary")
async def export_summary_report(
    city: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == UserRole.DATA_ENTRY:
        raise HTTPException(status_code=403, detail="权限不足")
    
    if current_user.role != UserRole.SUPERVISOR and current_user.city:
        city = current_user.city
    
    summaries = ReportService.get_city_summary(db, city)
    
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "城市", "总记录数", "已完成", "处理中", "失败", "死信",
        "总金额", "已完成金额", "待处理金额"
    ])
    
    for s in summaries:
        writer.writerow([
            s["city"], s["total_count"], s["completed_count"],
            s["pending_count"], s["failed_count"], s["dead_letter_count"],
            s["total_amount"], s["completed_amount"], s["pending_amount"]
        ])
    
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=summary_report.csv"}
    )


@router.get("/city-overview")
async def get_city_overview(
    city: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.SUPERVISOR and current_user.city:
        city = current_user.city
    
    from app.models import CompensationQueue
    from sqlalchemy import func
    
    base_query = db.query(CompensationQueue)
    if city:
        base_query = base_query.filter(CompensationQueue.city == city)
    
    total = base_query.count()
    total_amount = base_query.with_entities(func.sum(CompensationQueue.compensation_amount)).scalar() or 0
    
    status_stats = {}
    for status in CompensationStatus:
        count = base_query.filter(CompensationQueue.status == status).count()
        amount = base_query.filter(CompensationQueue.status == status).with_entities(
            func.sum(CompensationQueue.compensation_amount)
        ).scalar() or 0
        status_stats[status.value] = {
            "count": count,
            "amount": float(amount)
        }
    
    retry_categories = ReportService.get_retry_category_report(db, city)
    dead_letters = ReportService.get_dead_letter_report(db, city)
    issue_types = ReportService.get_issue_type_distribution(db, city)
    
    return {
        "city": city or "全部城市",
        "overview": {
            "total_count": total,
            "total_amount": float(total_amount),
            "by_status": status_stats
        },
        "retry_categories": retry_categories,
        "dead_letter_analysis": dead_letters,
        "issue_type_distribution": issue_types,
        "key_focus": {
            "retryable_count": sum(r["count"] for r in retry_categories if r["category"] == "retryable"),
            "manual_count": sum(r["count"] for r in retry_categories if r["category"] == "need_manual"),
            "dead_letter_count": sum(r["count"] for r in retry_categories if r["category"] == "non_retryable")
        }
    }
