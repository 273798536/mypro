from __future__ import annotations
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from typing import Optional, List
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AllocationStatus
from app.schemas import AuditTrailOut
from app.services import audit as audit_svc
from app.services import export as export_svc

router = APIRouter(tags=["导出与审计"])


@router.get("/export", response_class=StreamingResponse)
def export_allocations(status: Optional[AllocationStatus] = None, db: Session = Depends(get_db)):
    data = export_svc.export_allocations(db, status)
    return StreamingResponse(
        iter([data]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=pnl_allocation.xlsx"},
    )


@router.get("/audit", response_model=List[AuditTrailOut])
def list_audits(allocation_id: Optional[int] = None, db: Session = Depends(get_db)):
    return audit_svc.list_audits(db, allocation_id)
