from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.core.security import get_current_user, require_permission
from app.core.export_service import ExportService
from app.models.user import User
from app.schemas.common import ResponseModel, PaginatedResponse

router = APIRouter(prefix="/export", tags=["导出管理"])


@router.post("/excel", response_model=ResponseModel)
def export_excel(
    ledger_ids: List[int],
    mask_sensitive: bool = True,
    include_history: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("export"))
):
    try:
        service = ExportService(db, current_user)
        result = service.export_to_excel(ledger_ids, mask_sensitive, include_history)
        return ResponseModel(data=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/verify/{export_no}", response_model=ResponseModel)
def verify_export(
    export_no: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("export"))
):
    try:
        service = ExportService(db, current_user)
        result = service.verify_export_consistency(export_no)
        return ResponseModel(data=result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/history", response_model=ResponseModel)
def get_export_history(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_all"))
):
    service = ExportService(db, current_user)
    result = service.get_export_history(start_date, end_date, page, page_size)
    return ResponseModel(data=PaginatedResponse(
        total=result["total"],
        page=page,
        page_size=page_size,
        items=result["items"]
    ))
