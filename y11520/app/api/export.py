from typing import Optional
from urllib.parse import quote
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import allow_all_roles, get_current_active_user
from app.models.enums import RecordStatus
from app.models.models import User
from app.schemas.schemas import SummaryStats, ExportSummaryItem
from app.services.export_service import ExportService

router = APIRouter(prefix="/export", tags=["导出汇总"])


@router.get("/stats", response_model=SummaryStats, dependencies=[Depends(allow_all_roles)])
async def get_statistics(
    region: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = ExportService(db)
    return service.get_summary_stats(region)


@router.get("/summary", response_model=list[ExportSummaryItem], dependencies=[Depends(allow_all_roles)])
async def get_export_summary(
    region: Optional[str] = None,
    status: Optional[RecordStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = ExportService(db)
    return service.get_export_summary(region, status)


@router.get("/download", dependencies=[Depends(allow_all_roles)])
async def download_excel(
    region: Optional[str] = None,
    status: Optional[RecordStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = ExportService(db)
    excel_data = service.export_to_excel(region, status)
    
    status_label = RecordStatus(status).value if status else "quanbu"
    filename_ascii = f"export_summary_{current_user.username}_{status_label}.xlsx"
    filename_cn = f"售后汇总_{current_user.username}_{RecordStatus(status).value if status else '全部'}.xlsx"
    filename_encoded = quote(filename_cn, safe="")
    
    return StreamingResponse(
        excel_data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename_ascii}\"; filename*=UTF-8''{filename_encoded}"
        }
    )
