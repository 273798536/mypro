from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os

from app.database import get_db
from app.schemas import (
    ManagerDashboardResponse,
    BatchDetailReport,
    ExportRequest,
)
from app.services import ReportService
from app.config import settings

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/dashboard", response_model=ManagerDashboardResponse)
def get_manager_dashboard(branch_id: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        service = ReportService(db)
        return service.get_manager_dashboard(branch_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/batch/{batch_id}", response_model=BatchDetailReport)
def get_batch_report(batch_id: int, db: Session = Depends(get_db)):
    try:
        service = ReportService(db)
        return service.get_batch_detail_report(batch_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/export")
def export_report(export_req: ExportRequest, db: Session = Depends(get_db)):
    try:
        service = ReportService(db)
        filepath = service.export_to_excel(
            batch_ids=export_req.batch_ids,
            include_records=export_req.include_records,
            include_history=export_req.include_history,
            include_failures=export_req.include_failures,
        )
        filename = os.path.basename(filepath)
        return FileResponse(
            filepath,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=filename,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
