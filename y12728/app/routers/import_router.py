from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import ImportBatch, ScoreRecord, DataIssue
from app.schemas import schemas
from app.services.batch_service import persist_import_batch

router = APIRouter(prefix="/api/import", tags=["导入"])


@router.post("/upload", response_model=schemas.ImportResult)
async def upload_excel(
    file: UploadFile = File(...),
    remark: Optional[str] = Form(None),
    uploaded_by: str = Form("teacher"),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(status_code=400, detail="仅支持 .xlsx/.xls/.csv 文件")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="空文件")

    try:
        batch, records, issues = persist_import_batch(
            db=db,
            filename=file.filename,
            content=content,
            uploaded_by=uploaded_by,
            remark=remark,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导入失败: {str(e)}")

    return schemas.ImportResult(
        batch_id=batch.id,
        batch_no=batch.batch_no,
        total_rows=batch.total_rows,
        valid_rows=batch.valid_rows,
        duplicate_rows=batch.duplicate_rows,
        issue_rows=batch.issue_rows,
        issues=issues,
    )


@router.get("/batches", response_model=List[schemas.ImportBatch])
def list_batches(db: Session = Depends(get_db)):
    batches = db.query(ImportBatch).order_by(ImportBatch.created_at.desc()).all()
    return batches


@router.get("/batches/{batch_id}", response_model=schemas.ImportBatchDetail)
def get_batch_detail(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    rec_count = db.query(ScoreRecord).filter(ScoreRecord.batch_id == batch_id).count()
    iss_count = db.query(DataIssue).filter(DataIssue.batch_id == batch_id).count()
    return schemas.ImportBatchDetail(
        id=batch.id,
        batch_no=batch.batch_no,
        file_name=batch.file_name,
        file_hash=batch.file_hash,
        uploaded_by=batch.uploaded_by,
        remark=batch.remark,
        total_rows=batch.total_rows,
        valid_rows=batch.valid_rows,
        duplicate_rows=batch.duplicate_rows,
        issue_rows=batch.issue_rows,
        created_at=batch.created_at,
        record_count=rec_count,
        issue_count=iss_count,
    )
