from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.audit import AuditService

router = APIRouter()


@router.get("/history/{record_type}/{record_id}")
def get_record_history(
    record_type: str,
    record_id: str,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    service = AuditService(db)
    logs = service.get_record_history(
        record_type=record_type,
        record_id=record_id,
        limit=limit,
    )
    return {
        "record_type": record_type,
        "record_id": record_id,
        "count": len(logs),
        "history": logs,
    }


@router.get("/batch/{batch_no}")
def get_batch_history(
    batch_no: str,
    limit: int = 1000,
    db: Session = Depends(get_db),
):
    service = AuditService(db)
    logs = service.get_batch_history(
        batch_no=batch_no,
        limit=limit,
    )
    return {
        "batch_no": batch_no,
        "count": len(logs),
        "history": logs,
    }


@router.get("/operator/{operator}")
def get_operations_by_operator(
    operator: str,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    limit: int = 1000,
    db: Session = Depends(get_db),
):
    service = AuditService(db)
    logs = service.get_operations_by_operator(
        operator=operator,
        start_time=start_time,
        end_time=end_time,
        limit=limit,
    )
    return {
        "operator": operator,
        "count": len(logs),
        "operations": logs,
    }
