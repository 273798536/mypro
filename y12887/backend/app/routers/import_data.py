from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..schemas import ImportResultResponse, DataGapResponse
from ..utils.import_processor import DataImportProcessor
from ..models import DataGap

router = APIRouter()


@router.post("/upload", response_model=ImportResultResponse, summary="上传并导入数据文件")
async def upload_data(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    上传CSV或Excel文件进行数据导入

    - **file**: 数据文件（.csv, .xlsx, .xls）
    - 支持浮标数据缺失容错，能算的先算，缺口会列出来
    """
    allowed_extensions = {'.csv', '.xlsx', '.xls'}
    filename = file.filename or ''

    if not any(filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件格式。支持: {', '.join(allowed_extensions)}"
        )

    try:
        content = await file.read()
        processor = DataImportProcessor(db)
        result = processor.process(content, filename)
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导入失败: {str(e)}")


@router.get("/gaps", response_model=List[DataGapResponse], summary="获取数据缺口列表")
def get_data_gaps(
    batch_no: str = None,
    is_filled: bool = None,
    gap_type: str = None,
    db: Session = Depends(get_db)
):
    """
    获取数据缺口清单，供港口调度员补全

    - **batch_no**: 批次号过滤
    - **is_filled**: 是否已补全过滤
    - **gap_type**: 缺口类型过滤（buoy_missing/inspection_missing/calc_failure）
    """
    query = db.query(DataGap)

    if batch_no:
        query = query.filter(DataGap.batch_no == batch_no)
    if is_filled is not None:
        query = query.filter(DataGap.is_filled == is_filled)
    if gap_type:
        query = query.filter(DataGap.gap_type == gap_type)

    gaps = query.order_by(DataGap.created_at.desc()).all()
    return gaps


@router.put("/gaps/{gap_id}/fill", response_model=DataGapResponse, summary="补全数据缺口")
def fill_data_gap(
    gap_id: int,
    filled_by: str,
    fill_note: str = "",
    db: Session = Depends(get_db)
):
    """
    港口调度员补全数据缺口

    - **gap_id**: 缺口ID
    - **filled_by**: 补全人
    - **fill_note**: 补全说明
    """
    from datetime import datetime

    gap = db.query(DataGap).filter(DataGap.id == gap_id).first()
    if not gap:
        raise HTTPException(status_code=404, detail="数据缺口不存在")

    gap.is_filled = True
    gap.filled_by = filled_by
    gap.filled_at = datetime.now()
    gap.fill_note = fill_note

    db.commit()
    db.refresh(gap)
    return gap
