from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.data_import import DataImportService
from app.schemas.raw_data import ImportResult, RawDataRecordResponse
from app.models.enums import DataSourceType

router = APIRouter(prefix="/imports", tags=["数据导入"])


@router.post("/upload", response_model=ImportResult)
async def upload_and_import(
    source_type: DataSourceType = Form(...),
    imported_by: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    import tempfile
    import os

    suffix = os.path.splitext(file.filename)[1] if file.filename else ".csv"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        service = DataImportService(db)
        result = service.import_from_file(tmp_path, source_type, imported_by)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        os.unlink(tmp_path)


@router.post("/{source_type}", response_model=ImportResult)
def import_data(
    source_type: DataSourceType,
    data: List[dict],
    source_file: str = "api_upload",
    imported_by: str = None,
    db: Session = Depends(get_db),
):
    try:
        service = DataImportService(db)
        result = service.import_from_data(data, source_type, source_file, imported_by)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
