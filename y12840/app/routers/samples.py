from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import io
import csv

from ..database import get_db
from .. import schemas
from ..services.sample_import import (
    import_samples,
    get_samples,
    get_sample_detail,
    get_import_batches,
    get_import_batch,
)

router = APIRouter(prefix="/api/samples", tags=["samples"])


@router.post("/import", response_model=schemas.ImportResult)
def import_samples_endpoint(
    rows: List[dict],
    imported_by: str = "system",
    file_name: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return import_samples(db, rows, imported_by=imported_by, file_name=file_name)


@router.post("/import/file", response_model=schemas.ImportResult)
async def import_samples_from_file(
    file: UploadFile = File(...),
    imported_by: str = "system",
    db: Session = Depends(get_db),
):
    content = await file.read()
    rows: List[dict] = []

    if file.filename and file.filename.endswith(".csv"):
        text = content.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
        for row in reader:
            rows.append(dict(row))
    else:
        raise HTTPException(status_code=400, detail="仅支持 CSV 格式文件")

    return import_samples(db, rows, imported_by=imported_by, file_name=file.filename)


@router.get("/", response_model=List[schemas.SampleOut])
def list_samples(
    status: Optional[str] = None,
    batch_id: Optional[str] = None,
    can_use_directly: Optional[bool] = None,
    needs_teacher_review: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return get_samples(db, status, batch_id, can_use_directly, needs_teacher_review, skip, limit)


@router.get("/{sample_id}", response_model=schemas.SampleDetailOut)
def sample_detail(sample_id: int, db: Session = Depends(get_db)):
    sample = get_sample_detail(db, sample_id)
    if not sample:
        raise HTTPException(status_code=404, detail="样本不存在")
    logs = [
        {
            "id": l.id,
            "from_status": l.from_status,
            "to_status": l.to_status,
            "operator": l.operator,
            "reason": l.reason,
            "created_at": l.created_at,
        }
        for l in sample.status_logs
    ]
    return schemas.SampleDetailOut(
        id=sample.id,
        barcode=sample.barcode,
        sample_name=sample.sample_name,
        material_source=sample.material_source,
        batch_id=sample.batch_id,
        culture_record=sample.culture_record,
        time_point=sample.time_point,
        notes=sample.notes,
        quality_rating=sample.quality_rating,
        low_quality_reads=sample.low_quality_reads,
        low_quality_detail=sample.low_quality_detail,
        review_status=sample.review_status,
        can_use_directly=sample.can_use_directly,
        needs_teacher_review=sample.needs_teacher_review,
        unusable_reason=sample.unusable_reason,
        import_batch_id=sample.import_batch_id,
        created_at=sample.created_at,
        updated_at=sample.updated_at,
        qc_records=sample.qc_records,
        reviews=sample.reviews,
        annotations=sample.annotations,
        diff_analyses=sample.diff_analyses,
        status_logs=logs,
    )


@router.get("/batches/", response_model=List[schemas.ImportBatchOut])
def list_batches(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return get_import_batches(db, skip, limit)


@router.get("/batches/{batch_id}", response_model=schemas.ImportBatchOut)
def batch_detail(batch_id: str, db: Session = Depends(get_db)):
    batch = get_import_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return batch
