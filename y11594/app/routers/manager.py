from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.core.security import require_permission
from app.core.manager_view import ManagerViewService
from app.models.user import User
from app.schemas.common import ResponseModel

router = APIRouter(prefix="/manager", tags=["经理视图"])


@router.get("/overview", response_model=ResponseModel)
def get_overview(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_all"))
):
    service = ManagerViewService(db)
    result = service.get_role_view_overview(start_date, end_date)
    return ResponseModel(data=result)


@router.get("/change-reason-analysis", response_model=ResponseModel)
def get_change_reason_analysis(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_all"))
):
    service = ManagerViewService(db)
    result = service.get_change_reason_analysis(start_date, end_date)
    return ResponseModel(data=result)


@router.get("/sensitive-field-handling", response_model=ResponseModel)
def get_sensitive_field_handling(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_all"))
):
    service = ManagerViewService(db)
    result = service.get_sensitive_field_handling(start_date, end_date)
    return ResponseModel(data=result)


@router.get("/picker-ranking", response_model=ResponseModel)
def get_picker_ranking(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    top_n: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_all"))
):
    service = ManagerViewService(db)
    result = service.get_picker_performance_ranking(start_date, end_date, top_n)
    return ResponseModel(data=result)


@router.get("/dashboard", response_model=ResponseModel)
def get_full_dashboard(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_all"))
):
    service = ManagerViewService(db)
    result = service.get_full_manager_dashboard(start_date, end_date)
    return ResponseModel(data=result)
