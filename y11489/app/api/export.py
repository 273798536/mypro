from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.export import ExportRecord
from app.schemas.export import ExportRequest, ExportResponse
from app.services.auth import AuthService
from app.services.export_service import ExportService

router = APIRouter()


@router.post("/", response_model=ExportResponse)
def create_export(
    req: ExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.require_role(UserRole.PRODUCTION_MANAGER)),
):
    export_record = ExportService.export_records(db, req, current_user)
    return _enrich_export(export_record)


@router.post("/freeze/{export_type}")
def freeze_before_export(
    export_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.require_role(UserRole.PRODUCTION_MANAGER)),
):
    return ExportService.freeze_before_export(db, export_type, current_user)


@router.get("/", response_model=List[ExportResponse])
def list_exports(
    export_type: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    query = db.query(ExportRecord)
    if export_type:
        query = query.filter(ExportRecord.export_type == export_type)
    
    exports = query.order_by(ExportRecord.exported_at.desc()).offset(skip).limit(limit).all()
    return [_enrich_export(e) for e in exports]


@router.get("/{export_id}", response_model=ExportResponse)
def get_export(
    export_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    export = db.query(ExportRecord).filter(ExportRecord.id == export_id).first()
    if not export:
        raise HTTPException(status_code=404, detail="Export not found")
    return _enrich_export(export)


@router.get("/{export_id}/download")
def download_export(
    export_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    file_path = ExportService.get_export_file_path(db, export_id)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Export file not found")
    
    return FileResponse(
        path=str(file_path),
        filename=file_path.name,
        media_type="application/octet-stream"
    )


def _enrich_export(export: ExportRecord) -> ExportResponse:
    response = ExportResponse.model_validate(export)
    if export.exporter:
        response.exporter_name = export.exporter.full_name
    response.download_url = f"/api/export/{export.id}/download"
    return response
