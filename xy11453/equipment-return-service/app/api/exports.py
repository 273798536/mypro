from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os

from app.database import get_db
from app.export_service import generate_export

router = APIRouter(prefix="/exports", tags=["exports"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
EXPORT_DIR = os.path.join(BASE_DIR, "..", "data", "exports")
os.makedirs(EXPORT_DIR, exist_ok=True)


EXPORT_TYPES = [
    "warehouse_orders",
    "return_records",
    "repair_estimates",
    "deposit_deductions",
    "import_records",
    "async_tasks",
    "replay_exceptions",
    "full_reconciliation"
]


@router.post("/")
def create_export(
    export_type: str,
    customer_id: str = None,
    include_evidence: bool = True,
    db: Session = Depends(get_db)
):
    if export_type not in EXPORT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid export type. Must be one of: {EXPORT_TYPES}")

    file_path = generate_export(
        db,
        export_type=export_type,
        customer_id=customer_id,
        include_evidence=include_evidence
    )

    return {
        "export_type": export_type,
        "file_path": file_path,
        "filename": os.path.basename(file_path)
    }


@router.get("/download/{filename}")
def download_export(filename: str):
    file_path = os.path.join(EXPORT_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Export file not found")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="text/csv"
    )


@router.get("/types")
def list_export_types():
    return {"export_types": EXPORT_TYPES}


@router.get("/files")
def list_export_files():
    if not os.path.exists(EXPORT_DIR):
        return {"files": []}
    
    files = []
    for filename in sorted(os.listdir(EXPORT_DIR), reverse=True):
        filepath = os.path.join(EXPORT_DIR, filename)
        if os.path.isfile(filepath):
            stat = os.stat(filepath)
            files.append({
                "filename": filename,
                "size": stat.st_size,
                "created_at": stat.st_ctime
            })
    
    return {"files": files}
