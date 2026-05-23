from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import os

from app.database import get_db
from app import crud, schemas
from app.import_service import save_uploaded_file, process_import_file

router = APIRouter(prefix="/imports", tags=["imports"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IMPORT_DIR = os.path.join(BASE_DIR, "..", "data", "imports")
os.makedirs(IMPORT_DIR, exist_ok=True)


@router.post("/upload")
async def upload_import_file(
    import_type: str = Form(..., description="warehouse_order, return_record, repair_estimate"),
    operator: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if import_type not in ["warehouse_order", "return_record", "repair_estimate"]:
        raise HTTPException(status_code=400, detail="Invalid import type")

    content = await file.read()
    file_path = save_uploaded_file(content, file.filename)

    result = process_import_file(db, file_path, import_type, operator)
    return result


@router.get("/records/", response_model=List[schemas.ImportRecordResponse])
def list_import_records(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return crud.import_record.get_multi(db, skip=skip, limit=limit)


@router.get("/records/{batch_no}")
def get_import_batch(batch_no: str, db: Session = Depends(get_db)):
    records = db.query(crud.ImportRecord).filter(
        crud.ImportRecord.import_batch_no == batch_no
    ).all()
    if not records:
        raise HTTPException(status_code=404, detail="Batch not found")
    return {
        "batch_no": batch_no,
        "source_file": records[0].source_file_name,
        "total_records": len(records),
        "success_count": sum(1 for r in records if r.is_success),
        "failed_count": sum(1 for r in records if not r.is_success),
        "records": [
            {
                "row_number": r.row_number,
                "is_success": r.is_success,
                "error_message": r.error_message,
                "raw_data": r.raw_data,
                "parsed_data": r.parsed_data
            }
            for r in records
        ]
    }
