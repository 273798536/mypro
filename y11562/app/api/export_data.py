from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.schemas import StatisticsSummary
from app.models.models import CompensationStatus
from app.services.export_service import (
    get_statistics_summary,
    export_night_audit_report,
    export_retryable_classification,
    export_dead_letter_report,
    export_recovery_report
)

router = APIRouter()


@router.get("/statistics", response_model=StatisticsSummary)
def get_statistics(db: Session = Depends(get_db)):
    return get_statistics_summary(db)


@router.get("/night-audit")
def download_night_audit_report(
    status: CompensationStatus = None,
    include_retryable: bool = False,
    include_dead_letter: bool = False,
    include_recovery: bool = False,
    db: Session = Depends(get_db)
):
    filepath = export_night_audit_report(
        db=db,
        status_filter=status,
        include_retryable=include_retryable,
        include_dead_letter=include_dead_letter,
        include_recovery=include_recovery
    )
    
    return FileResponse(
        path=filepath,
        filename=filepath.split("/")[-1],
        media_type="text/csv"
    )


@router.get("/retryable-classification")
def download_retryable_classification(
    db: Session = Depends(get_db)
):
    filepath = export_retryable_classification(db)
    
    return FileResponse(
        path=filepath,
        filename=filepath.split("/")[-1],
        media_type="text/csv"
    )


@router.get("/dead-letter")
def download_dead_letter_report(
    db: Session = Depends(get_db)
):
    filepath = export_dead_letter_report(db)
    
    return FileResponse(
        path=filepath,
        filename=filepath.split("/")[-1],
        media_type="text/csv"
    )


@router.get("/recovery")
def download_recovery_report(
    db: Session = Depends(get_db)
):
    filepath = export_recovery_report(db)
    
    return FileResponse(
        path=filepath,
        filename=filepath.split("/")[-1],
        media_type="text/csv"
    )
