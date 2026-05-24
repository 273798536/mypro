from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import DashboardResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["项目经理仪表盘"])


@router.get("", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db)):
    return DashboardService.get_dashboard(db)
