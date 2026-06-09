from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import os
import uuid
from app.database import get_db
from app.models import Batch, BatchStatus
from app.schemas import ImportResultResponse
from app.services.import_service import parse_data_file, UPLOAD_DIR

os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/api/import", tags=["数据导入"])


@router.post("/{batch_id}", response_model=ImportResultResponse)
async def import_data(
    batch_id: int,
    file: UploadFile = File(...),
    remark: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".xlsx", ".xls", ".csv"]:
        raise HTTPException(status_code=400, detail="仅支持 .xlsx, .xls, .csv 格式文件")

    safe_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    try:
        exp_count, curve_count, issues, warnings = parse_data_file(
            file_path, file.filename, batch, db
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件解析失败: {str(e)}")

    if remark:
        if batch.import_remark:
            batch.import_remark = batch.import_remark + f"\n[{file.filename}] {remark}"
        else:
            batch.import_remark = f"[{file.filename}] {remark}"

    if batch.status == BatchStatus.DRAFT:
        batch.status = BatchStatus.IMPORTED
        from app.services.status_service import advance_status
        try:
            from app.models import StatusTransition
            t = StatusTransition(
                batch_id=batch.id,
                from_status=BatchStatus.DRAFT,
                to_status=BatchStatus.IMPORTED,
                operator=batch.operator or "系统",
                remark=f"自动推进: 导入文件 {file.filename}"
            )
            db.add(t)
        except Exception:
            pass

    db.commit()
    db.refresh(batch)

    return ImportResultResponse(
        batch_id=batch.id,
        batch_no=batch.batch_no,
        experiment_records_imported=exp_count,
        temperature_points_imported=curve_count,
        issues_found=len(issues),
        warnings=warnings
    )
