from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List

from app.database import get_db
from app.schemas import ExportRequest
from app.services.export_service import ExportService

router = APIRouter(prefix="/export", tags=["数据导出"])


@router.post("/excel")
def export_excel(
    filters: ExportRequest,
    db: Session = Depends(get_db)
):
    output = ExportService.export_to_excel(db, filters)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"回执队列数据_{timestamp}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/data")
def get_export_data(
    status: Optional[str] = None,
    source_type: Optional[str] = None,
    is_dirty: Optional[bool] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    filters = ExportRequest(
        status=status.split(",") if status else None,
        source_type=source_type.split(",") if source_type else None,
        is_dirty=is_dirty,
        start_date=start_date,
        end_date=end_date
    )
    return ExportService.get_export_data(db, filters)
