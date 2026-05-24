from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.report_service import ReportService
from app.models.enums import QueueStatus

router = APIRouter(prefix="/reports", tags=["区域售后报表"])


@router.get("/status-summary")
def get_region_status_summary(
    region: Optional[str] = None,
    db: Session = Depends(get_db),
):
    service = ReportService(db)
    return service.get_region_status_summary(region)


@router.get("/retryable-items")
def get_retryable_items_report(
    region: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    service = ReportService(db)
    return service.get_retryable_items_report(region, limit)


@router.get("/dead-letter")
def get_dead_letter_report(
    region: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    service = ReportService(db)
    return service.get_dead_letter_report(region, limit)


@router.get("/manual-pending")
def get_manual_pending_report(
    region: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    service = ReportService(db)
    return service.get_manual_pending_report(region, limit)


@router.get("/recovery-backlog")
def get_recovery_backlog_report(db: Session = Depends(get_db)):
    service = ReportService(db)
    return service.get_recovery_backlog_report()


@router.get("/compensation-summary")
def get_compensation_summary(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db),
):
    service = ReportService(db)
    return service.get_compensation_summary(start_date, end_date, region)


@router.get("/export")
def export_queue_data(
    status: Optional[QueueStatus] = None,
    region: Optional[str] = None,
    include_history: bool = Query(False),
    db: Session = Depends(get_db),
):
    service = ReportService(db)
    data = service.export_queue_data(status, region, include_history)
    return JSONResponse(content={"data": data, "count": len(data)})


@router.get("/raw-data-audit/{appointment_no}")
def get_raw_data_audit(
    appointment_no: str,
    db: Session = Depends(get_db),
):
    service = ReportService(db)
    return service.get_raw_data_audit(appointment_no)
