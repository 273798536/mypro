import io
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import pandas as pd

from app.database import get_db
from app.schemas import BatchResponse, BatchImportResult
from app.services.import_service import ImportService

router = APIRouter(prefix="/batches", tags=["批次管理"])


@router.post("/import/leader-refunds", response_model=BatchImportResult)
async def import_leader_refunds(
    batch_no: str = Form(..., description="批次号(幂等键)"),
    operator: str = Form(..., description="操作人"),
    remark: str = Form(None, description="备注"),
    file: UploadFile = File(..., description="Excel文件"),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="只支持Excel文件")

    try:
        file_content = await file.read()
        df = pd.read_excel(io.BytesIO(file_content))
        rows_data = df.to_dict('records')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件解析失败: {str(e)}")

    import_service = ImportService(db)
    batch, failed_rows, is_duplicate = import_service.import_leader_refunds(
        batch_no=batch_no,
        source_file=file.filename,
        operator=operator,
        rows_data=rows_data,
        remark=remark
    )

    return BatchImportResult(
        batch_no=batch.batch_no,
        total_count=batch.total_count,
        success_count=batch.success_count,
        fail_count=batch.fail_count,
        failed_rows=failed_rows,
        is_duplicate_batch=is_duplicate
    )


@router.post("/import/warehouse-reviews", response_model=BatchImportResult)
async def import_warehouse_reviews(
    batch_no: str = Form(..., description="批次号(幂等键)"),
    operator: str = Form(..., description="操作人"),
    remark: str = Form(None, description="备注"),
    file: UploadFile = File(..., description="Excel文件"),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="只支持Excel文件")

    try:
        file_content = await file.read()
        df = pd.read_excel(io.BytesIO(file_content))
        rows_data = df.to_dict('records')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件解析失败: {str(e)}")

    import_service = ImportService(db)
    batch, failed_rows, is_duplicate = import_service.import_warehouse_reviews(
        batch_no=batch_no,
        source_file=file.filename,
        operator=operator,
        rows_data=rows_data,
        remark=remark
    )

    return BatchImportResult(
        batch_no=batch.batch_no,
        total_count=batch.total_count,
        success_count=batch.success_count,
        fail_count=batch.fail_count,
        failed_rows=failed_rows,
        is_duplicate_batch=is_duplicate
    )


@router.get("/", response_model=List[BatchResponse])
async def list_batches(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    from app.models import Batch
    batches = db.query(Batch).order_by(Batch.id.desc()).offset(skip).limit(limit).all()
    return batches


@router.get("/{batch_no}", response_model=BatchResponse)
async def get_batch(
    batch_no: str,
    db: Session = Depends(get_db)
):
    from app.models import Batch
    batch = db.query(Batch).filter(Batch.batch_no == batch_no).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return batch
