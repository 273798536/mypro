from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.import_source import ImportSource
from app.schemas.import_source import ImportSourceResponse, ImportResult
from app.services.auth import AuthService
from app.services.import_service import ImportService

router = APIRouter()


@router.post("/{import_type}", response_model=ImportResult)
def import_data(
    import_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    if not file.filename or not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files are supported")
    
    return ImportService.import_file(db, file, import_type, current_user)


@router.get("/sources", response_model=List[ImportSourceResponse])
def list_import_sources(
    import_type: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    query = db.query(ImportSource)
    if import_type:
        query = query.filter(ImportSource.import_type == import_type)
    
    sources = query.order_by(ImportSource.created_at.desc()).offset(skip).limit(limit).all()
    return [_enrich_source(s) for s in sources]


@router.get("/sources/{source_id}", response_model=ImportSourceResponse)
def get_import_source(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_user),
):
    source = db.query(ImportSource).filter(ImportSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Import source not found")
    return _enrich_source(source)


def _enrich_source(source: ImportSource) -> ImportSourceResponse:
    response = ImportSourceResponse.model_validate(source)
    if source.uploader:
        response.uploader_name = source.uploader.full_name
    return response
